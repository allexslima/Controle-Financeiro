"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Bank, Transaction, Category } from "@/types/finance";
import { showSuccess, showError } from "@/utils/toast";
import { addMonths, parseISO, isAfter, isSameDay } from "date-fns";
import { 
  supabase, 
  safeDbRun,
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
  refreshFromDatabase: () => Promise<void>;
  addBank: (bank: Bank) => void;
  removeBank: (id: string) => void;
  updateBank: (bank: Bank) => void;
  addTransaction: (transaction: Transaction) => void;
  deleteTransaction: (id: string, mode?: 'single' | 'future' | 'all') => void;
  updateTransaction: (transaction: Transaction, mode?: 'single' | 'future') => void;
  addCategory: (category: Category) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  undo: () => void;
  canUndo: boolean;
  importFullData: (data: HistoryState) => void;
  reorderTransactionSection: (transactionIds: string[]) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const BANKS_STORAGE_KEY = "finance_io_banks";
const TRANSACTIONS_STORAGE_KEY = "finance_io_transactions";
const CATEGORIES_STORAGE_KEY = "finance_io_categories";

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

const DEFAULT_BANKS: Bank[] = [
  { id: "1", name: "Nubank", balance: 0, color: "#8a05be", type: "account" },
  { id: "2", name: "Itaú", balance: 0, color: "#ec7000", type: "account" },
  { id: "3", name: "XP Visa", balance: 0, color: "#000000", type: "credit_card", closingDay: 15, dueDay: 22 },
];

export const FinanceProvider = ({ children }: { children: React.ReactNode }) => {
  const [banks, setBanks] = useState<Bank[]>(() => {
    const saved = localStorage.getItem(BANKS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_BANKS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((t: Transaction, index: number) => ({
        ...t,
        order: t.order !== undefined ? t.order : index
      }));
    }
    return [];
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  const [history, setHistory] = useState<HistoryState[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('connecting');
  const isFetchingRef = React.useRef(false);
  const lastRefreshTimeRef = React.useRef(0);

  // Salvar no localStorage sempre como cache offline
  useEffect(() => {
    localStorage.setItem(BANKS_STORAGE_KEY, JSON.stringify(banks));
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  }, [banks, transactions, categories]);

  // Carregar dados do Supabase de forma segura, com paginação total e sem loop
  const refreshFromDatabase = useCallback(async () => {
    const now = Date.now();
    if (isFetchingRef.current || (now - lastRefreshTimeRef.current < 2000)) {
      return;
    }

    isFetchingRef.current = true;
    lastRefreshTimeRef.current = now;

    try {
      const [banksRes, catRes] = await Promise.all([
        supabase.from('banks').select('*'),
        supabase.from('categories').select('*'),
      ]);

      if (
        banksRes.error?.code === 'PGRST205' || 
        catRes.error?.code === 'PGRST205'
      ) {
        setSyncStatus('needs_tables');
        return;
      }

      if (banksRes.error || catRes.error) {
        setSyncStatus('error');
        return;
      }

      // Buscar TODAS as transações em páginas para não cortar além do limite de 1000
      let allTxRows: any[] = [];
      let from = 0;
      const PAGE_SIZE = 1000;
      let hasError = false;

      while (true) {
        const txRes = await supabase
          .from('transactions')
          .select('*')
          .order('order', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (txRes.error) {
          if (txRes.error.code === 'PGRST205') {
            setSyncStatus('needs_tables');
            return;
          }
          console.warn('Erro ao carregar lote de transações:', txRes.error);
          hasError = true;
          break;
        }

        const batch = txRes.data || [];
        allTxRows = allTxRows.concat(batch);

        if (batch.length < PAGE_SIZE) {
          break;
        }
        from += PAGE_SIZE;
      }

      if (hasError) {
        setSyncStatus('error');
        return;
      }

      setSyncStatus('connected');

      const dbBanks = (banksRes.data || []).map(mapBankFromDb);
      const dbCategories = (catRes.data || []).map(mapCategoryFromDb);
      const dbTransactions = allTxRows.map(mapTransactionFromDb);

      if (dbBanks.length > 0) {
        setBanks(dbBanks);
        localStorage.setItem(BANKS_STORAGE_KEY, JSON.stringify(dbBanks));
      }
      if (dbCategories.length > 0) {
        setCategories(dbCategories);
        localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(dbCategories));
      }
      if (dbTransactions.length > 0) {
        setTransactions(dbTransactions);
        localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(dbTransactions));
      }
    } catch (err) {
      console.warn('Falha na sincronização com Supabase:', err);
      setSyncStatus('error');
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    refreshFromDatabase();

    let debounceTimer: any = null;
    const triggerDebouncedRefresh = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        refreshFromDatabase();
      }, 3000);
    };

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'banks' },
        triggerDebouncedRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        triggerDebouncedRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        triggerDebouncedRefresh
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [refreshFromDatabase]);

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
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setBanks(lastState.banks);
    setTransactions(lastState.transactions);
    setCategories(lastState.categories);
    setHistory(prev => prev.slice(0, -1));

    safeDbRun(supabase.from('banks').upsert(lastState.banks.map(mapBankToDb)));
    safeDbRun(supabase.from('transactions').upsert(lastState.transactions.map(mapTransactionToDb)));
    safeDbRun(supabase.from('categories').upsert(lastState.categories.map(mapCategoryToDb)));

    showSuccess("Ação desfeita!");
  };

  const importFullData = async (data: HistoryState) => {
    saveHistory();
    if (data.banks) {
      setBanks(data.banks);
      safeDbRun(supabase.from('banks').upsert(data.banks.map(mapBankToDb)));
    }
    if (data.transactions) {
      setTransactions(data.transactions);
      safeDbRun(supabase.from('transactions').upsert(data.transactions.map(mapTransactionToDb)));
    }
    if (data.categories) {
      setCategories(data.categories);
      safeDbRun(supabase.from('categories').upsert(data.categories.map(mapCategoryToDb)));
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

  const addBank = (newBank: Bank) => {
    saveHistory();
    setBanks(prev => [...prev, newBank]);
    safeDbRun(supabase.from('banks').insert(mapBankToDb(newBank)));
  };

  const removeBank = (id: string) => {
    saveHistory();
    setBanks(prev => prev.filter(b => b.id !== id));
    setTransactions(prev => prev.filter(t => t.bankId !== id && t.destinationBankId !== id));

    safeDbRun(supabase.from('banks').delete().eq('id', id));
    safeDbRun(supabase.from('transactions').delete().or(`bank_id.eq.${id},destination_bank_id.eq.${id}`));
  };

  const updateBank = (updatedBank: Bank) => {
    saveHistory();
    setBanks(prev => prev.map(b => b.id === updatedBank.id ? updatedBank : b));
    safeDbRun(supabase.from('banks').upsert(mapBankToDb(updatedBank)));
  };

  const addTransaction = (t: Transaction) => {
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

    safeDbRun(supabase.from('transactions').insert(newTransactions.map(mapTransactionToDb)));
    safeDbRun(supabase.from('banks').upsert(updatedBanks.map(mapBankToDb)));
  };

  const deleteTransaction = (
    id: string,
    mode: "single" | "future" | "all" = "single"
  ) => {
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

    safeDbRun(supabase.from('transactions').delete().in('id', idsToDelete));
    safeDbRun(supabase.from('banks').upsert(updatedBanks.map(mapBankToDb)));
  };

  const updateTransaction = (
    updated: Transaction,
    mode: "single" | "future" = "single"
  ) => {
    saveHistory();
    const original = transactions.find((t) => t.id === updated.id);
    if (!original) return;

    let updatedBanks = [...banks];
    let toUpsertTransactions: Transaction[] = [];

    if (mode === "single" || !original.groupId) {
      updatedBanks = applyTransactionToBalance(original, true, updatedBanks);
      updatedBanks = applyTransactionToBalance(updated, false, updatedBanks);
      setBanks(updatedBanks);
      setTransactions(prev =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      );
      toUpsertTransactions = [updated];
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

    safeDbRun(supabase.from('transactions').upsert(toUpsertTransactions.map(mapTransactionToDb)));
    safeDbRun(supabase.from('banks').upsert(updatedBanks.map(mapBankToDb)));
  };

  const addCategory = (cat: Category) => {
    saveHistory();
    setCategories(prev => [...prev, cat]);
    safeDbRun(supabase.from('categories').insert(mapCategoryToDb(cat)));
    showSuccess("Categoria adicionada!");
  };

  const updateCategory = (cat: Category) => {
    saveHistory();
    setCategories(prev => prev.map(c => c.id === cat.id ? cat : c));
    safeDbRun(supabase.from('categories').upsert(mapCategoryToDb(cat)));
    showSuccess("Categoria atualizada!");
  };

  const deleteCategory = (id: string) => {
    if (categories.length <= 1) {
      showError("Você precisa de pelo menos uma categoria.");
      return;
    }
    saveHistory();
    setCategories(prev => prev.filter(c => c.id !== id));
    safeDbRun(supabase.from('categories').delete().eq('id', id));
    showSuccess("Categoria removida!");
  };

  const reorderTransactionSection = (transactionIds: string[]) => {
    saveHistory();
    const updated = transactions.map((t) => {
      const index = transactionIds.indexOf(t.id);
      if (index !== -1) {
        return { ...t, order: index };
      }
      return t;
    });
    setTransactions(updated);

    const reorderedItems = updated.filter(t => transactionIds.includes(t.id));
    safeDbRun(supabase.from('transactions').upsert(reorderedItems.map(mapTransactionToDb)));
  };

  return (
    <FinanceContext.Provider
      value={{
        banks,
        transactions,
        categories,
        syncStatus,
        refreshFromDatabase,
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