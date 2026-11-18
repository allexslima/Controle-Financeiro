"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Bank, Transaction, Category } from "@/types/finance";
import { showSuccess, showError } from "@/utils/toast";
import { addMonths, parseISO, isAfter, isSameDay } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { 
  supabase, 
  safeDbRun,
  getVerifiedSession,
  getFriendlyErrorMessage,
  mapBankFromDb, 
  mapBankToDb, 
  mapCategoryFromDb, 
  mapCategoryToDb, 
  mapTransactionFromDb, 
  mapTransactionToDb 
} from "@/lib/supabase";

interface HistoryState {
  banks: Bank[];
  transactions: Transaction[];
  categories: Category[];
}

export type SyncStatus = 'connecting' | 'connected' | 'needs_tables' | 'error';

interface FinanceContextType {
  banks: Bank[];
  transactions: Transaction[];
  categories: Category[];
  syncStatus: SyncStatus;
  syncErrorMessage: string | null;
  isRefreshing: boolean;
  hasUnsyncedChanges: boolean;
  refreshFromDatabase: (force?: boolean) => Promise<void>;
  repairConnection: () => Promise<void>;
  pushLocalToDatabase: () => Promise<void>;
  addBank: (bank: Bank) => void;
  removeBank: (id: string) => void;
  updateBank: (bank: Bank) => void;
  addTransaction: (transaction: Transaction) => Transaction[];
  deleteTransaction: (id: string, mode?: 'single' | 'future' | 'all') => void;
  updateTransaction: (transaction: Transaction, mode?: 'single' | 'future') => void;
  addCategory: (category: Category) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  undo: () => void;
  canUndo: boolean;
  importFullData: (data: Partial<HistoryState>) => Promise<{ success: boolean; error?: string }>;
  reorderTransactionSection: (transactionIds: string[]) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const LEGACY_STORAGE_KEYS = [
  "finance_io_banks",
  "finance_io_transactions",
  "finance_io_categories",
  "finance_io_has_unsynced",
];

const getUserStorageKeys = (uid: string) => ({
  banks: `finance_io_banks_${uid}`,
  transactions: `finance_io_transactions_${uid}`,
  categories: `finance_io_categories_${uid}`,
  unsynced: `finance_io_has_unsynced_${uid}`,
});

const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat-1", name: "Alimentação", color: "#ef4444" },
  { id: "cat-2", name: "Transporte", color: "#3b82f6" },
  { id: "cat-3", name: "Lazer", color: "#f59e0b" },
  { id: "cat-4", name: "Saúde", color: "#10b981" },
  { id: "cat-5", name: "Educação", color: "#8b5cf6" },
  { id: "cat-6", name: "Moradia", color: "#6366f1" },
  { id: "cat-7", name: "Geral", color: "#94a3b8" },
  { id: "cat-inv-apply", name: "Aplicação", color: "#0ea5e9" },
  { id: "cat-inv-redeem", name: "Resgate", color: "#f59e0b" },
];

export const FinanceProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [banks, setBanks] = useState<Bank[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryState[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('connecting');
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(false);

  const isFetchingRef = React.useRef(false);
  const isImportingRef = React.useRef(false);
  const lastRefreshTimeRef = React.useRef(0);

  // Carregar dados isolados do localStorage apenas do usuário autenticado e limpar estado ao sair
  useEffect(() => {
    if (!userId) {
      setLoadedUserId(null);
      setBanks([]);
      setTransactions([]);
      setCategories(DEFAULT_CATEGORIES);
      setHistory([]);
      setHasUnsyncedChanges(false);
      setSyncStatus('connecting');
      setSyncErrorMessage(null);
      isFetchingRef.current = false;
      lastRefreshTimeRef.current = 0;
      return;
    }

    // Remover chaves antigas globais (sem user_id) para evitar vazamento entre contas no mesmo navegador
    if (typeof window !== 'undefined') {
      LEGACY_STORAGE_KEYS.forEach((legacyKey) => {
        localStorage.removeItem(legacyKey);
      });

      const keys = getUserStorageKeys(userId);
      const savedBanks = localStorage.getItem(keys.banks);
      const savedTxs = localStorage.getItem(keys.transactions);
      const savedCats = localStorage.getItem(keys.categories);
      const savedUnsynced = localStorage.getItem(keys.unsynced) === 'true';

      setBanks(savedBanks ? JSON.parse(savedBanks) : []);
      if (savedTxs) {
        const parsed = JSON.parse(savedTxs);
        setTransactions(
          parsed.map((t: Transaction, index: number) => ({
            ...t,
            order: t.order !== undefined ? t.order : index,
          }))
        );
      } else {
        setTransactions([]);
      }
      setCategories(savedCats ? JSON.parse(savedCats) : DEFAULT_CATEGORIES);
      setHasUnsyncedChanges(savedUnsynced);
    }

    setHistory([]);
    lastRefreshTimeRef.current = 0;
    setLoadedUserId(userId);
  }, [userId]);

  // Persistir flag de alterações locais não sincronizadas apenas para o usuário carregado
  useEffect(() => {
    if (typeof window !== 'undefined' && userId && loadedUserId === userId) {
      const keys = getUserStorageKeys(userId);
      if (hasUnsyncedChanges) {
        localStorage.setItem(keys.unsynced, 'true');
      } else {
        localStorage.removeItem(keys.unsynced);
      }
    }
  }, [hasUnsyncedChanges, userId, loadedUserId]);

  // Salvar no localStorage isolado por usuário apenas quando o estado pertencer ao usuário atual
  useEffect(() => {
    if (typeof window !== 'undefined' && userId && loadedUserId === userId) {
      const keys = getUserStorageKeys(userId);
      localStorage.setItem(keys.banks, JSON.stringify(banks));
      localStorage.setItem(keys.transactions, JSON.stringify(transactions));
      localStorage.setItem(keys.categories, JSON.stringify(categories));
    }
  }, [banks, transactions, categories, userId, loadedUserId]);

  // Carregar dados do Supabase filtrados estritamente pelo user_id autenticado
  const refreshFromDatabase = useCallback(async (force = false) => {
    if (!userId || isImportingRef.current) return;

    const now = Date.now();
    if (isFetchingRef.current || (!force && (now - lastRefreshTimeRef.current < 2000))) {
      return;
    }

    isFetchingRef.current = true;
    lastRefreshTimeRef.current = now;
    setIsRefreshing(true);

    try {
      const { session, error: sessionErr } = await getVerifiedSession();
      if (!session?.access_token || !session.user?.id) {
        setSyncStatus('error');
        setSyncErrorMessage(
          sessionErr?.message || 'Sessão expirada. Saia da conta e entre novamente para sincronizar.'
        );
        return;
      }

      const activeUserId = session.user.id;

      const [banksRes, catRes] = await Promise.all([
        supabase.from('banks').select('*').eq('user_id', activeUserId),
        supabase.from('categories').select('*').eq('user_id', activeUserId),
      ]);

      if (
        banksRes.error?.code === 'PGRST205' || 
        catRes.error?.code === 'PGRST205'
      ) {
        setSyncStatus('needs_tables');
        setSyncErrorMessage('Tabelas ausentes no Supabase. Execute o script SQL no painel.');
        return;
      }

      if (banksRes.error || catRes.error) {
        const err = banksRes.error || catRes.error;
        const msg = getFriendlyErrorMessage(err);
        setSyncStatus('error');
        setSyncErrorMessage(msg);
        return;
      }

      // Buscar TODAS as transações do usuário em páginas para não cortar além do limite de 1000
      let allTxRows: any[] = [];
      let from = 0;
      const PAGE_SIZE = 1000;
      let hasTxError = false;

      while (true) {
        const txRes = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', activeUserId)
          .order('order', { ascending: true })
          .order('created_at', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (txRes.error) {
          if (txRes.error.code === 'PGRST205') {
            setSyncStatus('needs_tables');
            setSyncErrorMessage('Tabela de transações ausente.');
            return;
          }
          console.warn('Erro ao carregar lote de transações:', txRes.error);
          setSyncErrorMessage(getFriendlyErrorMessage(txRes.error));
          hasTxError = true;
          break;
        }

        const batch = txRes.data || [];
        allTxRows = allTxRows.concat(batch);

        if (batch.length < PAGE_SIZE) {
          break;
        }
        from += PAGE_SIZE;
      }

      if (hasTxError) {
        setSyncStatus('error');
        return;
      }

      const dbBanks = (banksRes.data || []).map(mapBankFromDb);
      const dbCategories = (catRes.data || []).map(mapCategoryFromDb);
      const dbTransactions = allTxRows.map(mapTransactionFromDb);

      const keys = getUserStorageKeys(activeUserId);

      // Sempre aplicar o estado exato da nuvem para este usuário (inclusive listas vazias para novos usuários)
      setBanks(dbBanks);
      localStorage.setItem(keys.banks, JSON.stringify(dbBanks));

      if (dbCategories.length > 0) {
        setCategories(dbCategories);
        localStorage.setItem(keys.categories, JSON.stringify(dbCategories));
      } else {
        // Novo usuário: inicializar categorias padrão vinculadas ao seu user_id
        const seededCats = DEFAULT_CATEGORIES.map(c => ({ ...c, userId: activeUserId }));
        setCategories(seededCats);
        localStorage.setItem(keys.categories, JSON.stringify(seededCats));
        await safeDbRun(
          supabase
            .from('categories')
            .upsert(seededCats.map(c => mapCategoryToDb(c, activeUserId)), { onConflict: 'user_id,id' })
        );
      }

      setTransactions(dbTransactions);
      localStorage.setItem(keys.transactions, JSON.stringify(dbTransactions));

      setSyncStatus('connected');
      setSyncErrorMessage(null);
      setHasUnsyncedChanges(false);
    } catch (err: any) {
      console.warn('Falha na sincronização com Supabase:', err);
      const msg = getFriendlyErrorMessage(err);
      setSyncStatus('error');
      setSyncErrorMessage(msg);
    } finally {
      isFetchingRef.current = false;
      setIsRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    // Sincronização inicial para o usuário autenticado
    refreshFromDatabase(true);

    // 1. Ouvir retorno ao aplicativo (quando o usuário volta ao computador ou troca de aba)
    const handleFocusOrVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshFromDatabase(true);
      }
    };
    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    // 2. Polling periódico de background (a cada 20 segundos enquanto a aba estiver visível)
    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshFromDatabase(false);
      }
    }, 20000);

    // 3. Supabase Realtime channel filtrado por usuário
    let debounceTimer: any = null;
    const triggerDebouncedRefresh = () => {
      if (isImportingRef.current) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!isImportingRef.current) {
          refreshFromDatabase(true);
        }
      }, 1000);
    };

    const channel = supabase
      .channel(`schema-db-changes-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'banks', filter: `user_id=eq.${userId}` },
        triggerDebouncedRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        triggerDebouncedRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories', filter: `user_id=eq.${userId}` },
        triggerDebouncedRefresh
      )
      .subscribe();

    return () => {
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      clearInterval(pollInterval);
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [userId, refreshFromDatabase]);

  const saveHistory = () => {
    setHistory(prev => [
      ...prev,
      {
        banks: JSON.parse(JSON.stringify(banks)),
        transactions: JSON.parse(JSON.stringify(transactions)),
        categories: JSON.parse(JSON.stringify(categories)),
      },
    ].slice(-10));
  };

  const undo = () => {
    if (history.length === 0 || !userId) return;
    const lastState = history[history.length - 1];

    // Identificar itens criados após o último estado para removê-los no Supabase
    const lastTxIds = new Set(lastState.transactions.map(t => t.id));
    const txIdsToDelete = transactions.filter(t => !lastTxIds.has(t.id)).map(t => t.id);

    const lastBankIds = new Set(lastState.banks.map(b => b.id));
    const bankIdsToDelete = banks.filter(b => !lastBankIds.has(b.id)).map(b => b.id);

    const lastCatIds = new Set(lastState.categories.map(c => c.id));
    const catIdsToDelete = categories.filter(c => !lastCatIds.has(c.id)).map(c => c.id);

    setBanks(lastState.banks);
    setTransactions(lastState.transactions);
    setCategories(lastState.categories);
    setHistory(prev => prev.slice(0, -1));

    if (txIdsToDelete.length > 0) {
      safeDbRun(supabase.from('transactions').delete().eq('user_id', userId).in('id', txIdsToDelete));
    }
    if (bankIdsToDelete.length > 0) {
      safeDbRun(supabase.from('banks').delete().eq('user_id', userId).in('id', bankIdsToDelete));
    }
    if (catIdsToDelete.length > 0) {
      safeDbRun(supabase.from('categories').delete().eq('user_id', userId).in('id', catIdsToDelete));
    }

    if (lastState.banks.length > 0) {
      safeDbRun(supabase.from('banks').upsert(lastState.banks.map(b => mapBankToDb(b, userId)), { onConflict: 'user_id,id' }));
    }
    if (lastState.categories.length > 0) {
      safeDbRun(supabase.from('categories').upsert(lastState.categories.map(c => mapCategoryToDb(c, userId)), { onConflict: 'user_id,id' }));
    }

    // Restaurar apenas transações alteradas ou que foram deletadas, evitando payloads gigantes
    const currentTxMap = new Map(transactions.map(t => [t.id, t]));
    const changedOrRestoredTxs = lastState.transactions.filter(t => {
      const current = currentTxMap.get(t.id);
      if (!current) return true;
      return current.amount !== t.amount || current.description !== t.description || current.bankId !== t.bankId || current.date !== t.date || current.category !== t.category;
    });
    if (changedOrRestoredTxs.length > 0) {
      safeDbRun(supabase.from('transactions').upsert(changedOrRestoredTxs.map(t => mapTransactionToDb(t, userId)), { onConflict: 'user_id,id' }));
    }

    showSuccess("Ação desfeita!");
  };

  const importFullData = async (data: Partial<HistoryState>): Promise<{ success: boolean; error?: string }> => {
    const { session, error: sessionErr } = await getVerifiedSession();
    if (!session?.access_token || !session.user?.id) {
      const msg = sessionErr?.message || 'Sessão expirada. Clique em Sair da conta e entre novamente antes de restaurar.';
      setSyncStatus('error');
      setSyncErrorMessage(msg);
      return { success: false, error: msg };
    }

    const activeUserId = session.user.id;

    const dedupeById = <T extends { id?: string }>(items: T[]): T[] => {
      const map = new Map<string, T>();
      items.forEach((item, idx) => {
        const safeId = item?.id ? String(item.id) : `imp-${Date.now()}-${idx}`;
        map.set(safeId, { ...item, id: safeId });
      });
      return Array.from(map.values());
    };

    const nextBanks: Bank[] = Array.isArray(data.banks)
      ? dedupeById(data.banks).map((b) => ({
          ...b,
          balance: Number(b.balance) || 0,
          userId: activeUserId,
        }))
      : banks;

    const nextCategories: Category[] = Array.isArray(data.categories) && data.categories.length > 0
      ? dedupeById(data.categories).map((c) => ({ ...c, userId: activeUserId }))
      : categories;

    const nextTransactions: Transaction[] = Array.isArray(data.transactions)
      ? dedupeById(data.transactions)
          .filter((t) => Boolean(t.bankId))
          .map((t, idx) => ({
            ...t,
            amount: Number(t.amount) || 0,
            order: t.order !== undefined && !isNaN(Number(t.order)) ? Number(t.order) : idx,
            userId: activeUserId,
          }))
      : transactions;

    saveHistory();
    isImportingRef.current = true;
    setIsRefreshing(true);

    try {
      // Atualizar estado local e localStorage imediatamente
      setBanks(nextBanks);
      setCategories(nextCategories);
      setTransactions(nextTransactions);

      const keys = getUserStorageKeys(activeUserId);
      localStorage.setItem(keys.banks, JSON.stringify(nextBanks));
      localStorage.setItem(keys.categories, JSON.stringify(nextCategories));
      localStorage.setItem(keys.transactions, JSON.stringify(nextTransactions));

      // 1. Enviar categorias
      if (nextCategories.length > 0) {
        const catRes = await safeDbRun(
          supabase
            .from('categories')
            .upsert(nextCategories.map(c => mapCategoryToDb(c, activeUserId)), { onConflict: 'user_id,id' })
        );
        if (catRes?.error) throw catRes.error;
      }

      // 2. Enviar bancos/contas/cartões
      if (nextBanks.length > 0) {
        const bankRes = await safeDbRun(
          supabase
            .from('banks')
            .upsert(nextBanks.map(b => mapBankToDb(b, activeUserId)), { onConflict: 'user_id,id' })
        );
        if (bankRes?.error) throw bankRes.error;
      }

      // 3. Enviar transações em lotes aguardando cada envio
      const BATCH_SIZE = 100;
      for (let i = 0; i < nextTransactions.length; i += BATCH_SIZE) {
        const slice = nextTransactions.slice(i, i + BATCH_SIZE);
        const txRes = await safeDbRun(
          supabase
            .from('transactions')
            .upsert(slice.map(t => mapTransactionToDb(t, activeUserId)), { onConflict: 'user_id,id' })
        );
        if (txRes?.error) throw txRes.error;
      }

      // 4. Remover registros antigos que não pertencem ao backup importado (somente após salvar o backup)
      if (Array.isArray(data.banks)) {
        const importedBankIds = new Set(nextBanks.map(b => b.id));
        const staleBankIds = banks.filter(b => !importedBankIds.has(b.id)).map(b => b.id);
        if (staleBankIds.length > 0) {
          const delBankRes = await safeDbRun(
            supabase.from('banks').delete().eq('user_id', activeUserId).in('id', staleBankIds)
          );
          if (delBankRes?.error) throw delBankRes.error;
        }
      }

      if (Array.isArray(data.transactions)) {
        const importedTxIds = new Set(nextTransactions.map(t => t.id));
        const staleTxIds = transactions.filter(t => !importedTxIds.has(t.id)).map(t => t.id);
        if (staleTxIds.length > 0) {
          const delTxRes = await safeDbRun(
            supabase.from('transactions').delete().eq('user_id', activeUserId).in('id', staleTxIds)
          );
          if (delTxRes?.error) throw delTxRes.error;
        }
      }

      lastRefreshTimeRef.current = Date.now();
      setSyncStatus('connected');
      setSyncErrorMessage(null);
      setHasUnsyncedChanges(false);
      return { success: true };
    } catch (err: any) {
      const msg = getFriendlyErrorMessage(err);
      setHasUnsyncedChanges(true);
      setSyncStatus('error');
      setSyncErrorMessage(msg);
      return { success: false, error: msg };
    } finally {
      isImportingRef.current = false;
      setIsRefreshing(false);
    }
  };

  const applyTransactionToBalance = (
    transaction: Transaction,
    reverse = false,
    currentBanks = banks
  ) => {
    return currentBanks.map(bank => {
      const multiplier = reverse ? -1 : 1;

      if (transaction.method === "investment_apply") {
        if (bank.id === transaction.bankId) {
          return {
            ...bank,
            balance: bank.balance - (transaction.amount * multiplier),
          };
        }
        if (bank.id === transaction.destinationBankId) {
          return {
            ...bank,
            balance: bank.balance + (transaction.amount * multiplier),
          };
        }
      }

      if (transaction.method === "investment_redeem") {
        if (bank.id === transaction.bankId) {
          return {
            ...bank,
            balance: bank.balance - (transaction.amount * multiplier),
          };
        }
        if (bank.id === transaction.destinationBankId) {
          return {
            ...bank,
            balance: bank.balance + (transaction.amount * multiplier),
          };
        }
      }

      if (bank.id === transaction.bankId) {
        let newBalance = bank.balance;
        if (transaction.method === "income") {
          if (bank.type === "credit_card") {
            newBalance -= (transaction.amount * multiplier);
          } else {
            newBalance += (transaction.amount * multiplier);
          }
        } else if (transaction.method === "credit") {
          newBalance += (transaction.amount * multiplier);
        } else {
          newBalance -= (transaction.amount * multiplier);
        }
        return { ...bank, balance: newBalance };
      }
      if (
        transaction.method === "transfer" &&
        bank.id === transaction.destinationBankId
      ) {
        if (bank.type === "credit_card") {
          return {
            ...bank,
            balance: bank.balance - (transaction.amount * multiplier),
          };
        }
        return {
          ...bank,
          balance: bank.balance + (transaction.amount * multiplier),
        };
      }
      return bank;
    });
  };

  const notifyMutationResult = (results: (any | undefined)[]) => {
    const failed = results.find(r => r?.error);
    if (failed?.error) {
      setHasUnsyncedChanges(true);
      setSyncStatus('error');
      const err = failed.error;
      const msg = getFriendlyErrorMessage(err);
      setSyncErrorMessage(msg);
      showError(`Salvo localmente! Falha na nuvem: ${msg}`);
    } else {
      setSyncStatus('connected');
      setSyncErrorMessage(null);
      setHasUnsyncedChanges(false);
    }
  };

  const repairConnection = async () => {
    setIsRefreshing(true);
    try {
      await refreshFromDatabase(true);
      if (syncStatus !== 'error') {
        showSuccess('Conexão restabelecida e dados sincronizados!');
      }
    } catch (err: any) {
      showError('Não foi possível sincronizar: ' + getFriendlyErrorMessage(err));
    } finally {
      setIsRefreshing(false);
    }
  };

  const pushLocalToDatabase = async () => {
    if (!userId) return;
    setIsRefreshing(true);
    try {
      if (banks.length > 0) {
        const res = await safeDbRun(supabase.from('banks').upsert(banks.map(b => mapBankToDb(b, userId)), { onConflict: 'user_id,id' }));
        if (res?.error) throw res.error;
      }
      if (categories.length > 0) {
        const res = await safeDbRun(supabase.from('categories').upsert(categories.map(c => mapCategoryToDb(c, userId)), { onConflict: 'user_id,id' }));
        if (res?.error) throw res.error;
      }
      if (transactions.length > 0) {
        const BATCH_SIZE = 100;
        for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
          const slice = transactions.slice(i, i + BATCH_SIZE);
          const res = await safeDbRun(supabase.from('transactions').upsert(slice.map(t => mapTransactionToDb(t, userId)), { onConflict: 'user_id,id' }));
          if (res?.error) throw res.error;
        }
      }
      setHasUnsyncedChanges(false);
      setSyncStatus('connected');
      setSyncErrorMessage(null);
      showSuccess('Todas as alterações locais foram salvas na nuvem com sucesso!');
    } catch (err: any) {
      const msg = getFriendlyErrorMessage(err);
      setSyncErrorMessage(msg);
      showError('Erro ao enviar dados locais: ' + msg);
    } finally {
      setIsRefreshing(false);
    }
  };

  const addBank = async (newBank: Bank) => {
    if (!userId) return;
    saveHistory();
    const bankWithUser = { ...newBank, userId };
    setBanks(prev => [...prev, bankWithUser]);
    const res = await safeDbRun(supabase.from('banks').insert(mapBankToDb(bankWithUser, userId)));
    notifyMutationResult([res]);
  };

  const removeBank = async (id: string) => {
    if (!userId) return;
    saveHistory();
    setBanks(prev => prev.filter(b => b.id !== id));
    setTransactions(prev => prev.filter(t => t.bankId !== id && t.destinationBankId !== id));

    const r1 = await safeDbRun(supabase.from('banks').delete().eq('user_id', userId).eq('id', id));
    const r2 = await safeDbRun(supabase.from('transactions').delete().eq('user_id', userId).or(`bank_id.eq.${id},destination_bank_id.eq.${id}`));
    notifyMutationResult([r1, r2]);
  };

  const updateBank = async (updatedBank: Bank) => {
    if (!userId) return;
    saveHistory();
    const bankWithUser = { ...updatedBank, userId };
    setBanks(prev => prev.map(b => b.id === updatedBank.id ? bankWithUser : b));
    const res = await safeDbRun(supabase.from('banks').upsert(mapBankToDb(bankWithUser, userId), { onConflict: 'user_id,id' }));
    notifyMutationResult([res]);
  };

  const addTransaction = (t: Transaction) => {
    if (!userId) return [];
    saveHistory();
    const newTransactions: Transaction[] = [];
    const count = t.installments || (t.isRecurring ? 12 : 1);
    const baseDate =
      typeof t.date === "string" ? parseISO(t.date) : new Date(t.date);
    const groupId =
      (t.installments || t.isRecurring) ? Math.random().toString(36).substr(2, 9) : undefined;

    let maxOrder = -1;
    if (transactions.length > 0) {
      maxOrder = Math.max(...transactions.map((tx) => tx.order ?? 0));
    }
    let order = maxOrder + 1;

    let updatedBanks = [...banks];
    for (let i = 0; i < count; i++) {
      const installmentDate = addMonths(baseDate, i);
      const installmentTransaction: Transaction = {
        ...t,
        id: Math.random().toString(36).substr(2, 9),
        groupId,
        description:
          count > 1 && t.installments
            ? `${t.description} (${i + 1}/${count})`
            : t.description,
        date: installmentDate.toISOString(),
        order: order,
        userId,
      };
      newTransactions.push(installmentTransaction);
      updatedBanks = applyTransactionToBalance(
        installmentTransaction,
        false,
        updatedBanks
      );
      order++;
    }

    setBanks(updatedBanks);
    setTransactions(prev => [...newTransactions, ...prev]);

    (async () => {
      const r1 = await safeDbRun(supabase.from('transactions').upsert(newTransactions.map(tx => mapTransactionToDb(tx, userId)), { onConflict: 'user_id,id' }));
      const r2 = await safeDbRun(supabase.from('banks').upsert(updatedBanks.map(b => mapBankToDb(b, userId)), { onConflict: 'user_id,id' }));
      notifyMutationResult([r1, r2]);
    })();

    return newTransactions;
  };

  const deleteTransaction = (
    id: string,
    mode: "single" | "future" | "all" = "single"
  ) => {
    if (!userId) return;
    saveHistory();
    const target = transactions.find((t) => t.id === id);
    if (!target) return;

    let toDelete: Transaction[] = [];
    if (mode === "single" || !target.groupId) {
      toDelete = [target];
    } else if (mode === "future") {
      toDelete = transactions.filter((t) =>
        t.groupId === target.groupId &&
        (isAfter(parseISO(t.date), parseISO(target.date)) ||
          isSameDay(parseISO(t.date), parseISO(target.date)))
      );
    } else if (mode === "all") {
      toDelete = transactions.filter((t) => t.groupId === target.groupId);
    }

    let updatedBanks = [...banks];
    toDelete.forEach((t) => {
      updatedBanks = applyTransactionToBalance(t, true, updatedBanks);
    });

    setBanks(updatedBanks);
    const idsToDelete = toDelete.map((t) => t.id);
    setTransactions(prev => prev.filter((t) => !idsToDelete.includes(t.id)));

    (async () => {
      const r1 = await safeDbRun(supabase.from('transactions').delete().eq('user_id', userId).in('id', idsToDelete));
      const r2 = await safeDbRun(supabase.from('banks').upsert(updatedBanks.map(b => mapBankToDb(b, userId)), { onConflict: 'user_id,id' }));
      notifyMutationResult([r1, r2]);
    })();
  };

  const updateTransaction = (
    updated: Transaction,
    mode: "single" | "future" = "single"
  ) => {
    if (!userId) return;
    saveHistory();
    const original = transactions.find((t) => t.id === updated.id);
    if (!original) return;

    let updatedBanks = [...banks];
    let toUpsertTransactions: Transaction[] = [];

    if (mode === "single" || !original.groupId) {
      updatedBanks = applyTransactionToBalance(original, true, updatedBanks);
      updatedBanks = applyTransactionToBalance(updated, false, updatedBanks);
      const updatedWithUser = { ...updated, userId };
      setBanks(updatedBanks);
      setTransactions(prev =>
        prev.map((t) => (t.id === updated.id ? updatedWithUser : t))
      );
      toUpsertTransactions = [updatedWithUser];
    } else {
      const related = transactions.filter((t) =>
        t.groupId === original.groupId &&
        (isAfter(parseISO(t.date), parseISO(original.date)) ||
          isSameDay(parseISO(t.date), parseISO(original.date)))
      );

      const updatedTransactions = transactions.map((t) => {
        const isRelated = related.find((r) => r.id === t.id);
        if (isRelated) {
          updatedBanks = applyTransactionToBalance(t, true, updatedBanks);
          const newT = {
            ...t,
            description: updated.description,
            amount: updated.amount,
            category: updated.category,
            bankId: updated.bankId,
            destinationBankId: updated.destinationBankId,
            method: updated.method,
            userId,
          };
          updatedBanks = applyTransactionToBalance(newT, false, updatedBanks);
          toUpsertTransactions.push(newT);
          return newT;
        }
        return t;
      });

      setBanks(updatedBanks);
      setTransactions(updatedTransactions);
    }

    (async () => {
      const r1 = await safeDbRun(supabase.from('transactions').upsert(toUpsertTransactions.map(tx => mapTransactionToDb(tx, userId)), { onConflict: 'user_id,id' }));
      const r2 = await safeDbRun(supabase.from('banks').upsert(updatedBanks.map(b => mapBankToDb(b, userId)), { onConflict: 'user_id,id' }));
      notifyMutationResult([r1, r2]);
    })();
  };

  const addCategory = async (cat: Category) => {
    if (!userId) return;
    saveHistory();
    const catWithUser = { ...cat, userId };
    setCategories(prev => [...prev, catWithUser]);
    const res = await safeDbRun(supabase.from('categories').insert(mapCategoryToDb(catWithUser, userId)));
    notifyMutationResult([res]);
    showSuccess("Categoria adicionada!");
  };

  const updateCategory = async (cat: Category) => {
    if (!userId) return;
    saveHistory();
    const catWithUser = { ...cat, userId };
    setCategories(prev => prev.map(c => c.id === cat.id ? catWithUser : c));
    const res = await safeDbRun(supabase.from('categories').upsert(mapCategoryToDb(catWithUser, userId), { onConflict: 'user_id,id' }));
    notifyMutationResult([res]);
    showSuccess("Categoria atualizada!");
  };

  const deleteCategory = async (id: string) => {
    if (!userId) return;
    if (categories.length <= 1) {
      showError("Você precisa de pelo menos uma categoria.");
      return;
    }
    saveHistory();
    setCategories(prev => prev.filter(c => c.id !== id));
    const res = await safeDbRun(supabase.from('categories').delete().eq('user_id', userId).eq('id', id));
    notifyMutationResult([res]);
    showSuccess("Categoria removida!");
  };

  const reorderTransactionSection = (transactionIds: string[]) => {
    if (!userId) return;
    saveHistory();
    const updated = transactions.map((t) => {
      const index = transactionIds.indexOf(t.id);
      if (index !== -1) {
        return { ...t, order: index, userId };
      }
      return t;
    });
    setTransactions(updated);

    const reorderedItems = updated.filter(t => transactionIds.includes(t.id));
    (async () => {
      const res = await safeDbRun(supabase.from('transactions').upsert(reorderedItems.map(tx => mapTransactionToDb(tx, userId)), { onConflict: 'user_id,id' }));
      notifyMutationResult([res]);
    })();
  };

  return (
    <FinanceContext.Provider
      value={{
        banks,
        transactions,
        categories,
        syncStatus,
        syncErrorMessage,
        isRefreshing,
        hasUnsyncedChanges,
        refreshFromDatabase,
        repairConnection,
        pushLocalToDatabase,
        addBank,
        removeBank,
        updateBank,
        addTransaction,
        deleteTransaction,
        updateTransaction,
        addCategory,
        updateCategory,
        deleteCategory,
        undo,
        canUndo: history.length > 0,
        importFullData,
        reorderTransactionSection,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("useFinance must be used within a FinanceProvider");
  return context;
};