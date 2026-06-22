"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Bank, Transaction, Category } from "@/types/finance";
import { showSuccess, showError } from "@/utils/toast";
import { addMonths, parseISO, isAfter, isSameDay } from "date-fns";
import LZString from "lz-string";

interface HistoryState {
  banks: Bank[];
  transactions: Transaction[];
  categories: Category[];
}

interface FinanceContextType {
  banks: Bank[];
  transactions: Transaction[];
  categories: Category[];
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
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const BANKS_STORAGE_KEY = 'finance_io_banks';
const TRANSACTIONS_STORAGE_KEY = 'finance_io_transactions';
const CATEGORIES_STORAGE_KEY = 'finance_io_categories';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Alimentação', color: '#ef4444' },
  { id: 'cat-2', name: 'Transporte', color: '#3b82f6' },
  { id: 'cat-3', name: 'Lazer', color: '#f59e0b' },
  { id: 'cat-4', name: 'Saúde', color: '#10b981' },
  { id: 'cat-5', name: 'Educação', color: '#8b5cf6' },
  { id: 'cat-6', name: 'Moradia', color: '#6366f1' },
  { id: 'cat-7', name: 'Geral', color: '#94a3b8' },
];

export const FinanceProvider = ({ children }: { children: React.ReactNode }) => {
  const [banks, setBanks] = useState<Bank[]>(() => {
    const saved = localStorage.getItem(BANKS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Nubank', balance: 0, color: '#8a05be', type: 'account' },
      { id: '2', name: 'Itaú', balance: 0, color: '#ec7000', type: 'account' },
      { id: '3', name: 'XP Visa', balance: 0, color: '#000000', type: 'credit_card', closingDay: 15, dueDay: 22 },
    ];
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  const [history, setHistory] = useState<HistoryState[]>([]);

  // Lógica de Importação via URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const importData = params.get('import');

    if (importData) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(importData);
        if (decompressed) {
          const parsed = JSON.parse(decompressed);
          
          // Pequeno delay para garantir que o app carregou
          setTimeout(() => {
            const confirmImport = window.confirm(
              "Dados de backup detectados no link! Deseja importar agora? \n\nATENÇÃO: Isso substituirá todos os seus dados atuais neste dispositivo."
            );

            if (confirmImport) {
              saveHistory();
              if (parsed.banks) setBanks(parsed.banks);
              if (parsed.transactions) setTransactions(parsed.transactions);
              if (parsed.categories) setCategories(parsed.categories);
              
              showSuccess("Dados importados com sucesso!");
              
              // Limpa a URL para não importar de novo ao atualizar
              const newUrl = window.location.origin + window.location.pathname;
              window.history.replaceState({}, document.title, newUrl);
            } else {
              // Limpa a URL mesmo se cancelar
              const newUrl = window.location.origin + window.location.pathname;
              window.history.replaceState({}, document.title, newUrl);
            }
          }, 500);
        }
      } catch (err) {
        console.error("Erro ao importar dados:", err);
        showError("O link de importação é inválido ou está corrompido.");
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(BANKS_STORAGE_KEY, JSON.stringify(banks));
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  }, [banks, transactions, categories]);

  const saveHistory = () => {
    setHistory(prev => [...prev, { 
      banks: JSON.parse(JSON.stringify(banks)), 
      transactions: JSON.parse(JSON.stringify(transactions)),
      categories: JSON.parse(JSON.stringify(categories))
    }].slice(-10));
  };

  const undo = () => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setBanks(lastState.banks);
    setTransactions(lastState.transactions);
    setCategories(lastState.categories);
    setHistory(prev => prev.slice(0, -1));
    showSuccess("Ação desfeita!");
  };

  const importFullData = (data: HistoryState) => {
    saveHistory();
    setBanks(data.banks);
    setTransactions(data.transactions);
    setCategories(data.categories);
  };

  const applyTransactionToBalance = (transaction: Transaction, reverse = false, currentBanks = banks) => {
    return currentBanks.map(bank => {
      const multiplier = reverse ? -1 : 1;
      if (bank.id === transaction.bankId) {
        let newBalance = bank.balance;
        if (transaction.method === 'income') {
          newBalance += (transaction.amount * multiplier);
        } else if (transaction.method === 'credit') {
          newBalance += (transaction.amount * multiplier);
        } else {
          newBalance -= (transaction.amount * multiplier);
        }
        return { ...bank, balance: newBalance };
      }
      if (transaction.method === 'transfer' && bank.id === transaction.destinationBankId) {
        if (bank.type === 'credit_card') {
          return { ...bank, balance: bank.balance - (transaction.amount * multiplier) };
        }
        return { ...bank, balance: bank.balance + (transaction.amount * multiplier) };
      }
      return bank;
    });
  };

  const addBank = (newBank: Bank) => {
    saveHistory();
    setBanks(prev => [...prev, newBank]);
  };

  const removeBank = (id: string) => {
    saveHistory();
    setBanks(prev => prev.filter(b => b.id !== id));
    setTransactions(prev => prev.filter(t => t.bankId !== id && t.destinationBankId !== id));
  };

  const updateBank = (updatedBank: Bank) => {
    saveHistory();
    setBanks(prev => prev.map(b => b.id === updatedBank.id ? updatedBank : b));
  };

  const addTransaction = (t: Transaction) => {
    saveHistory();
    const newTransactions: Transaction[] = [];
    const count = t.installments || (t.isRecurring ? 12 : 1);
    const baseDate = typeof t.date === 'string' ? parseISO(t.date) : new Date(t.date);
    const groupId = (t.installments || t.isRecurring) ? Math.random().toString(36).substr(2, 9) : undefined;

    let updatedBanks = [...banks];
    for (let i = 0; i < count; i++) {
      const installmentDate = addMonths(baseDate, i);
      const installmentTransaction: Transaction = {
        ...t,
        id: Math.random().toString(36).substr(2, 9),
        groupId,
        description: count > 1 && t.installments ? `${t.description} (${i + 1}/${count})` : t.description,
        date: installmentDate.toISOString(),
      };
      newTransactions.push(installmentTransaction);
      updatedBanks = applyTransactionToBalance(installmentTransaction, false, updatedBanks);
    }

    setBanks(updatedBanks);
    setTransactions(prev => [...newTransactions, ...prev]);
  };

  const deleteTransaction = (id: string, mode: 'single' | 'future' | 'all' = 'single') => {
    saveHistory();
    const target = transactions.find(t => t.id === id);
    if (!target) return;

    let toDelete: Transaction[] = [];
    if (mode === 'single' || !target.groupId) {
      toDelete = [target];
    } else if (mode === 'future') {
      toDelete = transactions.filter(t => 
        t.groupId === target.groupId && 
        (isAfter(parseISO(t.date), parseISO(target.date)) || isSameDay(parseISO(t.date), parseISO(target.date)))
      );
    } else if (mode === 'all') {
      toDelete = transactions.filter(t => t.groupId === target.groupId);
    }

    let updatedBanks = [...banks];
    toDelete.forEach(t => {
      updatedBanks = applyTransactionToBalance(t, true, updatedBanks);
    });

    setBanks(updatedBanks);
    const idsToDelete = toDelete.map(t => t.id);
    setTransactions(prev => prev.filter(t => !idsToDelete.includes(t.id)));
  };

  const updateTransaction = (updated: Transaction, mode: 'single' | 'future' = 'single') => {
    saveHistory();
    const original = transactions.find(t => t.id === updated.id);
    if (!original) return;

    let updatedBanks = [...banks];
    if (mode === 'single' || !original.groupId) {
      updatedBanks = applyTransactionToBalance(original, true, updatedBanks);
      updatedBanks = applyTransactionToBalance(updated, false, updatedBanks);
      setBanks(updatedBanks);
      setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
    } else {
      const related = transactions.filter(t => 
        t.groupId === original.groupId && 
        (isAfter(parseISO(t.date), parseISO(original.date)) || isSameDay(parseISO(t.date), parseISO(original.date)))
      );

      const updatedTransactions = transactions.map(t => {
        const isRelated = related.find(r => r.id === t.id);
        if (isRelated) {
          updatedBanks = applyTransactionToBalance(t, true, updatedBanks);
          const newT = { 
            ...t, 
            description: updated.description, 
            amount: updated.amount,
            category: updated.category,
            bankId: updated.bankId,
            destinationBankId: updated.destinationBankId,
            method: updated.method
          };
          updatedBanks = applyTransactionToBalance(newT, false, updatedBanks);
          return newT;
        }
        return t;
      });

      setBanks(updatedBanks);
      setTransactions(updatedTransactions);
    }
  };

  const addCategory = (cat: Category) => {
    saveHistory();
    setCategories(prev => [...prev, cat]);
    showSuccess("Categoria adicionada!");
  };

  const updateCategory = (cat: Category) => {
    saveHistory();
    setCategories(prev => prev.map(c => c.id === cat.id ? cat : c));
    showSuccess("Categoria atualizada!");
  };

  const deleteCategory = (id: string) => {
    if (categories.length <= 1) {
      showError("Você precisa de pelo menos uma categoria.");
      return;
    }
    saveHistory();
    setCategories(prev => prev.filter(c => c.id !== id));
    showSuccess("Categoria removida!");
  };

  return (
    <FinanceContext.Provider value={{ 
      banks, transactions, categories, addBank, removeBank, updateBank, 
      addTransaction, deleteTransaction, updateTransaction, 
      addCategory, updateCategory, deleteCategory, undo, canUndo: history.length > 0,
      importFullData
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("useFinance must be used within a FinanceProvider");
  return context;
};