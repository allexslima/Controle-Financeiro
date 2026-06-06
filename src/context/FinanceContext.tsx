"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Bank, Transaction } from "@/types/finance";
import { showSuccess } from "@/utils/toast";

interface FinanceContextType {
  banks: Bank[];
  transactions: Transaction[];
  addBank: (bank: Bank) => void;
  removeBank: (id: string) => void;
  updateBank: (bank: Bank) => void;
  addTransaction: (transaction: Transaction) => void;
  deleteTransaction: (id: string) => void;
  updateTransaction: (transaction: Transaction) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

// Chaves para o LocalStorage
const BANKS_STORAGE_KEY = 'finance_io_banks';
const TRANSACTIONS_STORAGE_KEY = 'finance_io_transactions';

export const FinanceProvider = ({ children }: { children: React.ReactNode }) => {
  // Inicializa o estado tentando carregar do LocalStorage
  const [banks, setBanks] = useState<Bank[]>(() => {
    const savedBanks = localStorage.getItem(BANKS_STORAGE_KEY);
    if (savedBanks) return JSON.parse(savedBanks);
    
    // Dados iniciais caso não haja nada salvo
    return [
      { id: '1', name: 'Nubank', balance: 0, color: '#8a05be', type: 'account' },
      { id: '2', name: 'Itaú', balance: 0, color: '#ec7000', type: 'account' },
      { id: '3', name: 'XP Visa', balance: 0, color: '#000000', type: 'credit_card', closingDay: 15 },
    ];
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const savedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    return savedTransactions ? JSON.parse(savedTransactions) : [];
  });

  // Salva no LocalStorage sempre que os bancos mudarem
  useEffect(() => {
    localStorage.setItem(BANKS_STORAGE_KEY, JSON.stringify(banks));
  }, [banks]);

  // Salva no LocalStorage sempre que as transações mudarem
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
        } else {
          newBalance -= (transaction.amount * multiplier);
        }
        return { ...bank, balance: newBalance };
      }
      
      if (transaction.method === 'transfer' && bank.id === transaction.destinationBankId) {
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
    showSuccess(`${updatedBank.name} atualizado com sucesso!`);
  };

  const addTransaction = (t: Transaction) => {
    setTransactions(prev => [t, ...prev]);
    applyTransactionToBalance(t);
  };

  const deleteTransaction = (id: string) => {
    const t = transactions.find(item => item.id === id);
    if (t) {
      applyTransactionToBalance(t, true);
      setTransactions(prev => prev.filter(item => item.id !== id));
      showSuccess("Transação excluída!");
    }
  };

  const updateTransaction = (updated: Transaction) => {
    const old = transactions.find(t => t.id === updated.id);
    if (old) {
      applyTransactionToBalance(old, true);
      applyTransactionToBalance(updated);
      setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
    }
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