"use client";

import React, { useState, useMemo } from 'react';
import AddBankDialog from "@/components/AddBankDialog";
import AddCreditCardDialog from "@/components/AddCreditCardDialog";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import MonthNavigator from "@/components/MonthNavigator";
import TransactionList from "@/components/TransactionList";
import EditTransactionDialog from "@/components/EditTransactionDialog";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { TrendingUp, TrendingDown, CreditCard, Wallet, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { isSameMonth, parseISO, isAfter, startOfDay, endOfMonth } from "date-fns";
import { useFinance } from "@/context/FinanceContext";
import { Transaction } from "@/types/finance";

const Index = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { banks, transactions, addBank, addTransaction, deleteTransaction, updateTransaction } = useFinance();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => isSameMonth(parseISO(t.date), currentDate));
  }, [transactions, currentDate]);

  const today = startOfDay(new Date());
  const endOfSelectedMonth = endOfMonth(currentDate);

  // Saldo projetado ao final do mês selecionado
  const projectedBalance = useMemo(() => {
    const accounts = banks.filter(b => b.type === 'account');
    const currentTotal = accounts.reduce((acc, bank) => acc + bank.balance, 0);
    
    // Como o bank.balance já inclui TODAS as transações (inclusive as de meses muito distantes),
    // precisamos subtrair as transações que ocorrem APÓS o final do mês selecionado.
    const futureTransactions = transactions.filter(t => isAfter(parseISO(t.date), endOfSelectedMonth));
    
    const futureImpact = futureTransactions.reduce((acc, t) => {
      if (t.method === 'income') return acc + t.amount;
      if (t.method === 'transfer') {
        const isFromAccount = accounts.some(a => a.id === t.bankId);
        const isToAccount = accounts.some(a => a.id === t.destinationBankId);
        if (isFromAccount && !isToAccount) return acc - t.amount;
        if (!isFromAccount && isToAccount) return acc + t.amount;
        return acc;
      }
      return acc - t.amount;
    }, 0);

    return currentTotal - futureImpact;
  }, [banks, transactions, endOfSelectedMonth]);

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

  const completedTotal = useMemo(() => 
    filteredTransactions
      .filter(t => !isAfter(parseISO(t.date), today))
      .reduce((acc, t) => t.method === 'income' ? acc + t.amount : acc - t.amount, 0),
  [filteredTransactions, today]);

  const futureTotal = useMemo(() => 
    filteredTransactions
      .filter(t => isAfter(parseISO(t.date), today))
      .reduce((acc, t) => t.method === 'income' ? acc + t.amount : acc - t.amount, 0),
  [filteredTransactions, today]);

  const grandTotal = completedTotal + futureTotal;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      <Sidebar />
      <MobileNav />
      
      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-12">
          <header className="flex flex-col items-center text-center space-y-8 py-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 text-primary text-xs font-bold">
                <Sparkles size={12} />
                <span>Visão Geral do Mês</span>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
            </div>

            <MonthNavigator currentDate={currentDate} onChange={setCurrentDate} />

            <div className="flex flex-wrap items-center justify-center gap-3">
              <AddTransactionDialog banks={banks} onAdd={addTransaction} />
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block" />
              <AddBankDialog onAdd={addBank} />
              <AddCreditCardDialog onAdd={addBank} />
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-primary text-primary-foreground border-none shadow-2xl shadow-primary/20 rounded-[2.5rem] overflow-hidden transition-transform hover:scale-[1.02]">
              <CardContent className="pt-10 pb-8 px-8">
                <div className="flex items-center gap-3 mb-6 opacity-70">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <Wallet size={20} />
                  </div>
                  <p className="font-bold text-[10px] uppercase tracking-widest">Saldo Final do Mês</p>
                </div>
                <h2 className="text-3xl font-black">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(projectedBalance)}
                </h2>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-none shadow-sm rounded-[2.5rem] transition-transform hover:scale-[1.02]">
              <CardContent className="pt-10 pb-8 px-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-50 dark:bg-purple-950/30 text-purple-600 rounded-xl">
                    <CreditCard size={20} />
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Faturas Cartões</p>
                </div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCredit)}
                </h3>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-none shadow-sm rounded-[2.5rem] transition-transform hover:scale-[1.02]">
              <CardContent className="pt-10 pb-8 px-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-xl">
                    <TrendingUp size={20} />
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Receitas Mês</p>
                </div>
                <h3 className="text-3xl font-black text-emerald-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyIncome)}
                </h3>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-none shadow-sm rounded-[2.5rem] transition-transform hover:scale-[1.02]">
              <CardContent className="pt-10 pb-8 px-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-xl">
                    <TrendingDown size={20} />
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Despesas Mês</p>
                </div>
                <h3 className="text-3xl font-black text-rose-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyExpenses)}
                </h3>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Transações Recentes</h2>
            </div>
            <TransactionList 
              transactions={filteredTransactions.slice(0, 10)} 
              banks={banks} 
              onEdit={setEditingTransaction}
              onDelete={deleteTransaction}
            />

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex justify-between text-sm font-medium text-slate-500">
                <span>Valores Efetuados (Mês)</span>
                <span className={completedTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(completedTotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-medium text-slate-500">
                <span>Valores Futuros (Mês)</span>
                <span className={futureTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(futureTotal)}
                </span>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-lg font-black text-slate-900 dark:text-white">Total do Mês</span>
                <span className={`text-2xl font-black ${grandTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(grandTotal)}
                </span>
              </div>
            </div>
          </div>

          <EditTransactionDialog 
            transaction={editingTransaction}
            banks={banks}
            onUpdate={updateTransaction}
            onClose={() => setEditingTransaction(null)}
          />

          <div className="pt-10">
            <MadeWithDyad />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;