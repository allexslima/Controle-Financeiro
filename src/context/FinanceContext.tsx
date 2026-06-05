"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Bank, Transaction } from "@/types/finance";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";

interface FinanceContextType {
  banks: Bank[];
  transactions: Transaction[];
  loading: boolean;
  addBank: (bank: Bank) => Promise<void>;
  removeBank: (id: string) => Promise<void>;
  updateBank: (bank: Bank) => Promise<void>;
  addTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider = ({ children }: { children: React.ReactNode }) => {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: banksData, error: banksError } = await supabase
        .from('banks')
        .select('*');
      
      if (banksError) throw banksError;
      setBanks(banksData || []);

      const { data: transData, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
      
      if (transError) throw transError;
      setTransactions(transData || []);
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const addBank = async (newBank: Bank) => {
    try {
      const { error } = await supabase.from('banks').insert([newBank]);
      if (error) throw error;
      setBanks(prev => [...prev, newBank]);
      showSuccess(`Banco ${newBank.name} adicionado!`);
    } catch (error: any) {
      showError("Erro ao adicionar banco");
    }
  };

  const removeBank = async (id: string) => {
    try {
      const { error } = await supabase.from('banks').delete().eq('id', id);
      if (error) throw error;
      setBanks(prev => prev.filter(b => b.id !== id));
      setTransactions(prev => prev.filter(t => t.bankId !== id && t.destinationBankId !== id));
      showSuccess("Banco removido!");
    } catch (error: any) {
      showError("Erro ao remover banco");
    }
  };

  const updateBank = async (updatedBank: Bank) => {
    try {
      const { error } = await supabase.from('banks').update(updatedBank).eq('id', updatedBank.id);
      if (error) throw error;
      setBanks(prev => prev.map(b => b.id === updatedBank.id ? updatedBank : b));
      showSuccess(`${updatedBank.name} atualizado!`);
    } catch (error: any) {
      showError("Erro ao atualizar banco");
    }
  };

  const addTransaction = async (t: Transaction) => {
    try {
      const { error } = await supabase.from('transactions').insert([t]);
      if (error) throw error;
      
      setTransactions(prev => [t, ...prev]);
      
      // Atualização de saldo local
      const bank = banks.find(b => b.id === t.bankId);
      if (bank) {
        let newBalance = bank.balance;
        if (t.method === 'income') newBalance += t.amount;
        else newBalance -= t.amount;
        await updateBank({ ...bank, balance: newBalance });
      }

      if (t.method === 'transfer' && t.destinationBankId) {
        const destBank = banks.find(b => b.id === t.destinationBankId);
        if (destBank) {
          await updateBank({ ...destBank, balance: destBank.balance + t.amount });
        }
      }

      showSuccess("Transação registrada!");
    } catch (error: any) {
      showError("Erro ao registrar transação");
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const t = transactions.find(item => item.id === id);
      if (!t) return;

      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;

      const bank = banks.find(b => b.id === t.bankId);
      if (bank) {
        let newBalance = bank.balance;
        if (t.method === 'income') newBalance -= t.amount;
        else newBalance += t.amount;
        await updateBank({ ...bank, balance: newBalance });
      }

      setTransactions(prev => prev.filter(item => item.id !== id));
      showSuccess("Transação excluída!");
    } catch (error: any) {
      showError("Erro ao excluir transação");
    }
  };

  const updateTransaction = async (updated: Transaction) => {
    try {
      const { error } = await supabase.from('transactions').update(updated).eq('id', updated.id);
      if (error) throw error;
      
      setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
      showSuccess("Transação atualizada!");
    } catch (error: any) {
      showError("Erro ao atualizar transação");
    }
  };

  return (
    <FinanceContext.Provider value={{ 
      banks, transactions, loading, addBank, removeBank, updateBank, addTransaction, deleteTransaction, updateTransaction 
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