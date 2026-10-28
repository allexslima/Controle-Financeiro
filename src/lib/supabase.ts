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

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isAuthOrJwtError = (error: any): boolean => {
  if (!error) return false;
  const msg = String(error.message || error.details || error.hint || '').toLowerCase();
  const code = String(error.code || '').toUpperCase();
  return (
    code === 'PGRST301' ||
    code === '401' ||
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
    return 'Sessão expirada. Acesse o menu e faça login novamente se necessário.';
  }
  if (isNetworkOrAdblockError(error)) {
    return 'Requisição bloqueada por extensão de segurança ou bloqueador de anúncios do navegador.';
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('load failed')) {
    return 'Falha de comunicação com a nuvem. Verifique sua conexão com a internet ou se a rede permite acesso ao Supabase.';
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
});

export const mapBankToDb = (bank: Bank) => ({
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
});

export const mapCategoryFromDb = (row: any): Category => ({
  id: row.id,
  name: row.name,
  color: row.color,
  icon: row.icon ?? undefined,
});

export const mapCategoryToDb = (category: Category) => ({
  id: category.id,
  name: category.name || 'Geral',
  color: category.color || '#94a3b8',
  icon: category.icon ?? null,
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
});

export const mapTransactionToDb = (t: Transaction) => ({
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
});
