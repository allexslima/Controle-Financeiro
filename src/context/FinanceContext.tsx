"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Bank, Transaction } from "@/types/finance";
import { showSuccess } from "@/utils/toast";
import { addMonths, parseISO, isAfter, isSameDay } from "date-fns";

interface FinanceContextType {
  banks: Bank[];
  transactions: Transaction[];
  addBank: (bank: Bank) => void;
  removeBank: (id: string) => void;
  updateBank: (bank: Bank) => void;
  addTransaction: (transaction: Transaction) => void;
  deleteTransaction: (id: string, mode?: 'single' | 'future' | 'all') => void;
  updateTransaction: (transaction: Transaction, mode?: 'single' | 'future') => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const BANKS_STORAGE_KEY = 'finance_io_banks';
const TRANSACTIONS_STORAGE_KEY = 'finance_io_transactions';

export const FinanceProvider = ({ children }: { children: React.ReactNode }) => {
  const [banks, setBanks] = useState<Bank[]>(() => {
    const savedBanks = localStorage.getItem(BANKS_STORAGE_KEY);
    if (savedBanks) return JSON.parse(savedBanks);
    
    return [
      { id: '1', name: 'Nubank', balance: 0, color: '#8a05be', type: 'account' },
      { id: '2', name: 'Itaú', balance: 0, color: '#ec7000', type: 'account' },
      { id: '3', name: 'XP Visa', balance: 0, color: '#000000', type: 'credit_card', closingDay: 15, dueDay: 22 },
    ];
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const savedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    return savedTransactions ? JSON.parse(savedTransactions) : [];
  });

  useEffect(() => {
    localStorage.setItem(BANKS_STORAGE_KEY, JSON.stringify(banks));
  }, [banks]);

  useEffect(() => {
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
  }, [transactions]);

  const applyTransactionToBalance = (transaction: Transaction, reverse = false) => {
    setBanks(prevBanks => prevBanks.map(bank => {
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
    }));
  };

  const addBank = (newBank: Bank) => setBanks(prev => [...prev, newBank]);

  const removeBank = (id: string) => {
    setBanks(prev => prev.filter(b => b.id !== id));
    setTransactions(prev => prev.filter(t => t.bankId !== id && t.destinationBankId !== id));
  };

  const updateBank = (updatedBank: Bank) => {
    setBanks(prev => prev.map(b => b.id === updatedBank.id ? updatedBank : b));
  };

  const addTransaction = (t: Transaction) => {
    const newTransactions: Transaction[] = [];
    const count = t.installments || (t.isRecurring ? 12 : 1);
    const baseDate = typeof t.date === 'string' ? parseISO(t.date) : new Date(t.date);
    const groupId = (t.installments || t.isRecurring) ? Math.random().toString(36).substr(2, 9) : undefined;

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
      applyTransactionToBalance(installmentTransaction);
    }

    setTransactions(prev => [...newTransactions, ...prev]);
  };

  const deleteTransaction = (id: string, mode: 'single' | 'future' | 'all' = 'single') => {
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

    toDelete.forEach(t => applyTransactionToBalance(t, true));
    const idsToDelete = toDelete.map(t => t.id);
    setTransactions(prev => prev.filter(t => !idsToDelete.includes(t.id)));
    showSuccess(toDelete.length > 1 ? "Transações excluídas!" : "Transação excluída!");
  };

  const updateTransaction = (updated: Transaction, mode: 'single' | 'future' = 'single') => {
    const original = transactions.find(t => t.id === updated.id);
    if (!original) return;

    if (mode === 'single' || !original.groupId) {
      applyTransactionToBalance(original, true);
      applyTransactionToBalance(updated);
      setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
    } else {
      // Modo 'future': atualiza esta e todas as próximas do mesmo grupo
      const related = transactions.filter(t => 
        t.groupId === original.groupId && 
        (isAfter(parseISO(t.date), parseISO(original.date)) || isSameDay(parseISO(t.date), parseISO(original.date)))
      );

      const updatedTransactions = transactions.map(t => {
        const isRelated = related.find(r => r.id === t.id);
        if (isRelated) {
          applyTransactionToBalance(t, true);
          const newT = { 
            ...t, 
            description: updated.description, 
            amount: updated.amount,
            category: updated.category,
            bankId: updated.bankId,
            destinationBankId: updated.destinationBankId,
            method: updated.method
          };
          applyTransactionToBalance(newT);
          return newT;
        }
        return t;
      });

      setTransactions(updatedTransactions);
    }
    showSuccess("Transação atualizada!");
  };

  return (
    <FinanceContext.Provider value={{ 
      banks, transactions, addBank, removeBank, updateBank, addTransaction, deleteTransaction, updateTransaction 
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