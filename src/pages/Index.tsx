"use client";

import React, { useState, useMemo } from 'react';
import { Bank, Transaction } from "@/types/finance";
import BankCard from "@/components/BankCard";
import AddBankDialog from "@/components/AddBankDialog";
import AddCreditCardDialog from "@/components/AddCreditCardDialog";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import TransactionList from "@/components/TransactionList";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Wallet, TrendingUp, TrendingDown, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const Index = () => {
  const [banks, setBanks] = useState<Bank[]>([
    { id: '1', name: 'Nubank', balance: 2500.50, color: '#8a05be', type: 'account' },
    { id: '2', name: 'Itaú', balance: 12400.00, color: '#ec7000', type: 'account' },
  ]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const addBank = (newBank: Bank) => {
    setBanks([...banks, newBank]);
  };

  const removeBank = (id: string) => {
    setBanks(banks.filter(bank => bank.id !== id));
    setTransactions(transactions.filter(t => t.bankId !== id && t.destinationBankId !== id));
  };

  const addTransaction = (transaction: Transaction) => {
    setTransactions([transaction, ...transactions]);
    
    setBanks(prevBanks => prevBanks.map(bank => {
      if (bank.id === transaction.bankId) {
        let newBalance = bank.balance;
        if (transaction.method === 'income') {
          newBalance += transaction.amount;
        } else {
          newBalance -= transaction.amount;
        }
        return { ...bank, balance: newBalance };
      }
      
      if (transaction.method === 'transfer' && bank.id === transaction.destinationBankId) {
        return { ...bank, balance: bank.balance + transaction.amount };
      }
      
      return bank;
    }));
  };

  const totalBalance = useMemo(() => 
    banks.filter(b => b.type === 'account').reduce((acc, bank) => acc + bank.balance, 0), 
  [banks]);

  const totalCredit = useMemo(() => 
    banks.filter(b => b.type === 'credit_card').reduce((acc, bank) => acc + bank.balance, 0), 
  [banks]);
  
  const monthlyIncome = useMemo(() => 
    transactions
      .filter(t => t.method === 'income')
      .reduce((acc, t) => acc + t.amount, 0), 
  [transactions]);

  const monthlyExpenses = useMemo(() => 
    transactions
      .filter(t => t.method === 'debit' || t.method === 'credit')
      .reduce((acc, t) => acc + t.amount, 0), 
  [transactions]);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Meu Dashboard</h1>
            <p className="text-slate-500">Gerencie suas finanças com clareza.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <AddTransactionDialog banks={banks} onAdd={addTransaction} />
            <AddBankDialog onAdd={addBank} />
            <AddCreditCardDialog onAdd={addBank} />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-primary text-primary-foreground border-none shadow-xl rounded-3xl overflow-hidden relative">
            <CardContent className="pt-8">
              <p className="text-primary-foreground/80 font-medium text-sm">Saldo em Contas</p>
              <h2 className="text-3xl font-bold mt-1">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBalance)}
              </h2>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-lg rounded-3xl">
            <CardContent className="pt-8 flex items-center gap-4">
              <div className="bg-purple-100 p-3 rounded-2xl text-purple-600">
                <CreditCard size={24} />
              </div>
              <div>
                <p className="text-slate-500 text-xs font-medium">Total em Cartões</p>
                <h3 className="text-xl font-bold text-purple-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCredit)}
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-lg rounded-3xl">
            <CardContent className="pt-8 flex items-center gap-4">
              <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-slate-500 text-xs font-medium">Receitas (Mês)</p>
                <h3 className="text-xl font-bold text-emerald-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyIncome)}
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-lg rounded-3xl">
            <CardContent className="pt-8 flex items-center gap-4">
              <div className="bg-rose-100 p-3 rounded-2xl text-rose-600">
                <TrendingDown size={24} />
              </div>
              <div>
                <p className="text-slate-500 text-xs font-medium">Despesas (Mês)</p>
                <h3 className="text-xl font-bold text-rose-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyExpenses)}
                </h3>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Minhas Contas e Cartões</h2>
              <span className="text-sm text-slate-500 font-medium">{banks.length}</span>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {banks.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 text-sm">Nenhuma conta ou cartão.</p>
                </div>
              ) : (
                banks.map((bank) => (
                  <BankCard key={bank.id} bank={bank} onRemove={removeBank} />
                ))
              )}
            </div>
          </section>

          <section className="lg:col-span-2 space-y-4">
            <TransactionList transactions={transactions} banks={banks} />
          </section>
        </div>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;