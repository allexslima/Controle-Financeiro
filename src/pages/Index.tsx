"use client";

import React, { useState, useMemo } from 'react';
import { Bank, Transaction } from "@/types/finance";
import BankCard from "@/components/BankCard";
import AddBankDialog from "@/components/AddBankDialog";
import AddCreditCardDialog from "@/components/AddCreditCardDialog";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import EditTransactionDialog from "@/components/EditTransactionDialog";
import TransactionList from "@/components/TransactionList";
import BankHistorySheet from "@/components/BankHistorySheet";
import Sidebar from "@/components/Sidebar";
import MonthNavigator from "@/components/MonthNavigator";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { TrendingUp, TrendingDown, CreditCard, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { showSuccess } from "@/utils/toast";
import { isSameMonth, parseISO } from "date-fns";

const Index = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [banks, setBanks] = useState<Bank[]>([
    { id: '1', name: 'Nubank', balance: 2500.50, color: '#8a05be', type: 'account' },
    { id: '2', name: 'Itaú', balance: 12400.00, color: '#ec7000', type: 'account' },
  ]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedBankForHistory, setSelectedBankForHistory] = useState<Bank | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Filtra transações pelo mês selecionado
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => isSameMonth(parseISO(t.date), currentDate));
  }, [transactions, currentDate]);

  const addBank = (newBank: Bank) => {
    setBanks([...banks, newBank]);
  };

  const removeBank = (id: string) => {
    setBanks(banks.filter(bank => bank.id !== id));
    setTransactions(transactions.filter(t => t.bankId !== id && t.destinationBankId !== id));
  };

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

  const addTransaction = (transaction: Transaction) => {
    setTransactions([transaction, ...transactions]);
    applyTransactionToBalance(transaction);
  };

  const deleteTransaction = (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
      applyTransactionToBalance(transaction, true);
      setTransactions(transactions.filter(t => t.id !== id));
      showSuccess("Transação excluída!");
    }
  };

  const updateTransaction = (updatedTransaction: Transaction) => {
    const oldTransaction = transactions.find(t => t.id === updatedTransaction.id);
    if (oldTransaction) {
      applyTransactionToBalance(oldTransaction, true);
      applyTransactionToBalance(updatedTransaction);
      setTransactions(transactions.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));
    }
  };

  const totalBalance = useMemo(() => 
    banks.filter(b => b.type === 'account').reduce((acc, bank) => acc + bank.balance, 0), 
  [banks]);

  const totalCredit = useMemo(() => 
    banks.filter(b => b.type === 'credit_card').reduce((acc, bank) => acc + bank.balance, 0), 
  [banks]);
  
  const monthlyIncome = useMemo(() => 
    filteredTransactions
      .filter(t => t.method === 'income')
      .reduce((acc, t) => acc + t.amount, 0), 
  [filteredTransactions]);

  const monthlyExpenses = useMemo(() => 
    filteredTransactions
      .filter(t => t.method === 'debit' || t.method === 'credit')
      .reduce((acc, t) => acc + t.amount, 0), 
  [filteredTransactions]);

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar />
      
      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-10">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">Dashboard</h1>
              <p className="text-slate-500 font-medium">Bem-vindo de volta ao seu controle financeiro.</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <MonthNavigator currentDate={currentDate} onChange={setCurrentDate} />
              <AddTransactionDialog banks={banks} onAdd={addTransaction} />
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-primary text-primary-foreground border-none shadow-2xl shadow-primary/20 rounded-[2rem] overflow-hidden">
              <CardContent className="pt-8">
                <div className="flex items-center gap-3 mb-4 opacity-80">
                  <Wallet size={18} />
                  <p className="font-bold text-xs uppercase tracking-widest">Saldo Total</p>
                </div>
                <h2 className="text-3xl font-black">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBalance)}
                </h2>
              </CardContent>
            </Card>

            <Card className="bg-white border-none shadow-sm rounded-[2rem]">
              <CardContent className="pt-8 flex items-center gap-4">
                <div className="bg-purple-50 p-4 rounded-2xl text-purple-600">
                  <CreditCard size={24} />
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Cartões</p>
                  <h3 className="text-xl font-black text-slate-900">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCredit)}
                  </h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-none shadow-sm rounded-[2rem]">
              <CardContent className="pt-8 flex items-center gap-4">
                <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Receitas</p>
                  <h3 className="text-xl font-black text-emerald-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyIncome)}
                  </h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-none shadow-sm rounded-[2rem]">
              <CardContent className="pt-8 flex items-center gap-4">
                <div className="bg-rose-50 p-4 rounded-2xl text-rose-600">
                  <TrendingDown size={24} />
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Despesas</p>
                  <h3 className="text-xl font-black text-rose-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyExpenses)}
                  </h3>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <section className="lg:col-span-8 space-y-6">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-black text-slate-900">Transações Recentes</h2>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                  {filteredTransactions.length} este mês
                </span>
              </div>
              <TransactionList 
                transactions={filteredTransactions} 
                banks={banks} 
                onEdit={setEditingTransaction}
                onDelete={deleteTransaction}
              />
            </section>

            <section className="lg:col-span-4 space-y-6">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-black text-slate-900">Minhas Contas</h2>
                <div className="flex gap-2">
                  <AddBankDialog onAdd={addBank} />
                  <AddCreditCardDialog onAdd={addBank} />
                </div>
              </div>
              
              <div className="space-y-4">
                {banks.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
                    <p className="text-slate-400 text-sm font-medium">Nenhuma conta cadastrada.</p>
                  </div>
                ) : (
                  banks.map((bank) => (
                    <BankCard 
                      key={bank.id} 
                      bank={bank} 
                      onRemove={removeBank} 
                      onClick={setSelectedBankForHistory}
                    />
                  ))
                )}
              </div>
            </section>
          </div>
        </div>

        <BankHistorySheet 
          bank={selectedBankForHistory} 
          transactions={transactions} 
          onClose={() => setSelectedBankForHistory(null)} 
          onEdit={setEditingTransaction}
          onDelete={deleteTransaction}
        />

        <EditTransactionDialog 
          transaction={editingTransaction}
          banks={banks}
          onUpdate={updateTransaction}
          onClose={() => setEditingTransaction(null)}
        />

        <MadeWithDyad />
      </main>
    </div>
  );
};

export default Index;