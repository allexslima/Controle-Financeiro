import { createClient } from '@supabase/supabase-js';
import { Bank, Category, Transaction } from '@/types/finance';

const DEFAULT_SUPABASE_URL = 'https://vzzpvrlahbvbyccpwven.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_PJKCt300r0iq1GsjfJnadQ_eDYWgbj1';

function resolveSupabaseUrl(raw?: unknown): string {
  if (!raw || typeof raw !== 'string') {
    return DEFAULT_SUPABASE_URL;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return DEFAULT_SUPABASE_URL;
  }
  // If it's already an absolute HTTP/HTTPS URL
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      return DEFAULT_SUPABASE_URL;
    }
  }
  // If it contains a domain (e.g. "vzzpvrlahbvbyccpwven.supabase.co")
  if (trimmed.includes('.')) {
    const candidate = `https://${trimmed}`;
    try {
      new URL(candidate);
      return candidate;
    } catch {
      return DEFAULT_SUPABASE_URL;
    }
  }
  // If it's just the Supabase project reference (e.g. "vzzpvrlahbvbyccpwven")
  const candidate = `https://${trimmed}.supabase.co`;
  try {
    new URL(candidate);
    return candidate;
  } catch {
    return DEFAULT_SUPABASE_URL;
  }
}

function resolveSupabaseKey(raw?: unknown): string {
  if (!raw || typeof raw !== 'string') {
    return DEFAULT_SUPABASE_ANON_KEY;
  }
  const trimmed = raw.trim();
  return trimmed || DEFAULT_SUPABASE_ANON_KEY;
}

const supabaseUrl = resolveSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = resolveSupabaseKey(import.meta.env.VITE_SUPABASE_ANON_KEY);
const normalizedSupabaseUrl = supabaseUrl.replace(/\/+$/, '');

export interface JwtDebugClaims {
  sub?: string;
  role?: string;
  aud?: string;
  exp?: number;
}

export interface RestDebugInfo {
  path: string;
  method: string;
  route: 'proxy' | 'direct';
  status: number;
  jwtRole: string;
  jwtSub: string;
}

let lastRestDebug: RestDebugInfo | null = null;

export function getLastRestDebug(): RestDebugInfo | null {
  return lastRestDebug;
}

export function decodeJwtClaims(token: string): JwtDebugClaims | null {
  if (!token || token === supabaseAnonKey) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || !parts.every((part) => part.length > 0)) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = typeof atob === 'function' ? atob(padded) : '';
    if (!json) return null;
    const parsed = JSON.parse(json);
    return {
      sub: typeof parsed.sub === 'string' ? parsed.sub : undefined,
      role: typeof parsed.role === 'string' ? parsed.role : undefined,
      aud: typeof parsed.aud === 'string' ? parsed.aud : undefined,
      exp: typeof parsed.exp === 'number' ? parsed.exp : undefined,
    };
  } catch {
    return null;
  }
}

function isAuthenticatedUserJwt(token: string): { valid: boolean; claims: JwtDebugClaims | null } {
  const claims = decodeJwtClaims(token);
  if (!claims) return { valid: false, claims: null };
  const isAuthRole = claims.role === 'authenticated';
  const hasSub = Boolean(claims.sub && claims.sub.length > 0);
  return { valid: isAuthRole && hasSub, claims };
}

const supabaseFetch: typeof fetch = async (input, init) => {
  const rawUrl =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  const mergedHeaders = new Headers(input instanceof Request ? input.headers : undefined);
  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => {
      mergedHeaders.set(key, value);
    });
  }

  const plainHeaders: Record<string, string> = {};
  mergedHeaders.forEach((value, key) => {
    plainHeaders[key] = value;
  });

  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const isSupabaseTarget = rawUrl.startsWith(normalizedSupabaseUrl);

  let proxyUrl: string | null = null;
  if (typeof window !== 'undefined' && isSupabaseTarget) {
    const suffix = rawUrl.slice(normalizedSupabaseUrl.length);
    const normalizedSuffix = suffix.startsWith('/') ? suffix : `/${suffix}`;
    proxyUrl = `${window.location.origin}/api/supabase${normalizedSuffix}`;
  }

  let restClaims: JwtDebugClaims | null = null;
  const isRestCall = rawUrl.includes('/rest/v1/');

  // Bloquear qualquer chamada REST sem JWT de usuário autenticado (evita fallback para anon retornando [] ou 42501)
  if (isRestCall) {
    const authHeader = mergedHeaders.get('authorization') || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const token = match ? match[1].trim() : '';
    const { valid, claims } = isAuthenticatedUserJwt(token);
    restClaims = claims;
    if (!valid) {
      throw new Error(
        `JWT_SESSION_MISSING: Sessão de usuário não autenticada (role=${claims?.role || 'none'}). Saia da conta e entre novamente.`
      );
    }
  }

  const recordRestDebug = (route: 'proxy' | 'direct', status: number) => {
    if (!isRestCall) return;
    let shortPath = rawUrl;
    try {
      shortPath = new URL(rawUrl).pathname;
    } catch {
      // ignore
    }
    lastRestDebug = {
      path: shortPath,
      method,
      route,
      status,
      jwtRole: restClaims?.role || 'none',
      jwtSub: restClaims?.sub ? restClaims.sub.slice(0, 8) : 'none',
    };
  };

  const buildInit = (): RequestInit => {
    const reqInit: RequestInit = {
      method,
      headers: plainHeaders,
      cache: 'no-store',
    };
    if (init?.signal) {
      reqInit.signal = init.signal;
    }
    if (method !== 'GET' && method !== 'HEAD' && init?.body !== undefined) {
      reqInit.body = init.body;
    }
    return reqInit;
  };

  if (proxyUrl) {
    let proxyErrMsg = '';
    try {
      const proxyRes = await fetch(proxyUrl, { ...buildInit(), credentials: 'same-origin' });
      // Se o proxy não existir ou estiver fora do ar (404/502/503/504), tenta direto no Supabase
      if (![404, 502, 503, 504].includes(proxyRes.status)) {
        recordRestDebug('proxy', proxyRes.status);
        return proxyRes;
      }
      proxyErrMsg = `HTTP ${proxyRes.status}`;
    } catch (proxyErr: any) {
      proxyErrMsg = proxyErr?.message || String(proxyErr);
    }

    try {
      const directRes = await fetch(rawUrl, buildInit());
      recordRestDebug('direct', directRes.status);
      return directRes;
    } catch (directErr: any) {
      const directErrMsg = directErr?.message || String(directErr);
      let shortPath = rawUrl;
      try {
        shortPath = new URL(rawUrl).pathname;
      } catch {
        // ignore
      }
      throw new Error(
        `Failed to fetch (${shortPath} | proxy: ${proxyErrMsg} | direto: ${directErrMsg})`
      );
    }
  }

  const res = await fetch(rawUrl, buildInit());
  recordRestDebug('direct', res.status);
  return res;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: supabaseFetch,
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const getVerifiedSession = async (validateWithServer = false) => {
  const { data: { session }, error } = await supabase.auth.getSession();

  let activeSession = session;

  if (error || !activeSession?.access_token) {
    const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
    if (refreshErr || !refreshed.session?.access_token) {
      return {
        session: null,
        error: refreshErr || error || new Error('Sessão expirada. Saia da conta e entre novamente.'),
      };
    }
    activeSession = refreshed.session;
  } else {
    const expiresAtMs = activeSession.expires_at ? activeSession.expires_at * 1000 : null;
    if (expiresAtMs && expiresAtMs <= Date.now() + 30000) {
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
      if (!refreshErr && refreshed.session?.access_token) {
        activeSession = refreshed.session;
      }
    }
  }

  if (validateWithServer && activeSession?.access_token) {
    const { data: userData, error: userErr } = await supabase.auth.getUser(activeSession.access_token);
    if (userErr || !userData?.user) {
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
      if (refreshErr || !refreshed.session?.access_token) {
        return {
          session: null,
          error: userErr || refreshErr || new Error('Token de sessão inválido. Saia da conta e entre novamente.'),
        };
      }
      activeSession = refreshed.session;
    }
  }

  return { session: activeSession, error: null };
};

export const isAuthOrJwtError = (error: any): boolean => {
  if (!error) return false;
  const msg = String(error.message || error.details || error.hint || '').toLowerCase();
  const code = String(error.code || '').toUpperCase();
  return (
    code === 'PGRST301' ||
    code === '401' ||
    msg.includes('jwt_session_missing') ||
    msg.includes('jwt expired') ||
    msg.includes('invalid jwt') ||
    msg.includes('invalid claim')
  );
};

export const isNetworkOrAdblockError = (error: any): boolean => {
  if (!error) return false;
  const msg = String(error.message || error || '').toLowerCase();
  return (
    msg.includes('blocked_by_client') ||
    msg.includes('err_blocked_by_client')
  );
};

export const getFriendlyErrorMessage = (error: any): string => {
  if (!error) return 'Erro desconhecido.';
  const msg = String(error.message || error.details || error || '');
  const lower = msg.toLowerCase();
  const code = error.code ? `[${error.code}] ` : '';

  if (isAuthOrJwtError(error)) {
    return 'Sessão de usuário expirada ou ausente. Saia da conta e faça login novamente para sincronizar.';
  }
  if (isNetworkOrAdblockError(error)) {
    return 'Requisição bloqueada por extensão de segurança ou bloqueador de anúncios do navegador.';
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('load failed')) {
    return `Falha de comunicação com a nuvem (${msg}). Verifique sua conexão ou clique em "Testar Conexão em Tempo Real".`;
  }
  if (String(error.code || '') === '42501' || lower.includes('row-level security')) {
    const dbg = lastRestDebug
      ? ` [role=${lastRestDebug.jwtRole}, sub=${lastRestDebug.jwtSub}, via=${lastRestDebug.route}, http=${lastRestDebug.status}]`
      : '';
    return `${code}${msg}${dbg}`;
  }
  return `${code}${msg}`;
};

export const safeDbRun = async (promise: PromiseLike<any>) => {
  try {
    const res = await promise;
    if (res?.error) {
      console.warn('Supabase query error:', res.error);
    }
    return res;
  } catch (err: any) {
    console.warn('Supabase network error:', err);
    return { error: err };
  }
};

export const mapBankFromDb = (row: any): Bank => ({
  id: row.id,
  name: row.name,
  balance: Number(row.balance) || 0,
  color: row.color,
  type: row.type,
  closingDay: row.closing_day ?? undefined,
  dueDay: row.due_day ?? undefined,
  investmentType: row.investment_type ?? undefined,
  yieldType: row.yield_type ?? undefined,
  yieldRate: row.yield_rate !== null && row.yield_rate !== undefined ? Number(row.yield_rate) : undefined,
  yieldAmount: row.yield_amount !== null && row.yield_amount !== undefined ? Number(row.yield_amount) : undefined,
  userId: row.user_id ?? undefined,
});

export const mapBankToDb = (bank: Bank, userId?: string) => ({
  id: bank.id,
  name: bank.name || 'Conta',
  balance: Number.isFinite(Number(bank.balance)) ? Number(bank.balance) : 0,
  color: bank.color || '#3b82f6',
  type: bank.type || 'account',
  closing_day: bank.closingDay && !isNaN(Number(bank.closingDay)) ? Number(bank.closingDay) : null,
  due_day: bank.dueDay && !isNaN(Number(bank.dueDay)) ? Number(bank.dueDay) : null,
  investment_type: bank.investmentType ?? null,
  yield_type: bank.yieldType ?? null,
  yield_rate: bank.yieldRate !== undefined && bank.yieldRate !== null && !isNaN(Number(bank.yieldRate)) ? Number(bank.yieldRate) : null,
  yield_amount: bank.yieldAmount !== undefined && bank.yieldAmount !== null && !isNaN(Number(bank.yieldAmount)) ? Number(bank.yieldAmount) : null,
  ...(userId || bank.userId ? { user_id: userId || bank.userId } : {}),
});

export const mapCategoryFromDb = (row: any): Category => ({
  id: row.id,
  name: row.name,
  color: row.color,
  icon: row.icon ?? undefined,
  userId: row.user_id ?? undefined,
});

export const mapCategoryToDb = (category: Category, userId?: string) => ({
  id: category.id,
  name: category.name || 'Geral',
  color: category.color || '#94a3b8',
  icon: category.icon ?? null,
  ...(userId || category.userId ? { user_id: userId || category.userId } : {}),
});

export const mapTransactionFromDb = (row: any): Transaction => ({
  id: row.id,
  description: row.description,
  amount: Number(row.amount) || 0,
  method: row.method,
  category: row.category,
  date: row.date,
  bankId: row.bank_id,
  destinationBankId: row.destination_bank_id ?? undefined,
  installments: row.installments ?? undefined,
  isRecurring: row.is_recurring ?? false,
  groupId: row.group_id ?? undefined,
  isCompleted: row.is_completed ?? true,
  order: Number(row.order) || 0,
  userId: row.user_id ?? undefined,
});

export const mapTransactionToDb = (t: Transaction, userId?: string) => ({
  id: t.id,
  description: t.description || 'Lançamento',
  amount: Number.isFinite(Number(t.amount)) ? Number(t.amount) : 0,
  method: t.method || 'debit',
  category: t.category || 'cat-7',
  date: t.date || new Date().toISOString(),
  bank_id: t.bankId,
  destination_bank_id: t.destinationBankId ?? null,
  installments: t.installments && !isNaN(Number(t.installments)) ? Number(t.installments) : null,
  is_recurring: Boolean(t.isRecurring),
  group_id: t.groupId ?? null,
  is_completed: t.isCompleted ?? true,
  order: Number.isFinite(Number(t.order)) ? Number(t.order) : 0,
  ...(userId || t.userId ? { user_id: userId || t.userId } : {}),
});
