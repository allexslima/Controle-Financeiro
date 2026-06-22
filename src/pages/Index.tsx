"use client";

import React, { useState, useMemo } from 'react';
import AddBankDialog from "@/components/AddBankDialog";
import AddCreditCardDialog from "@/components/AddCreditCardDialog";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import MonthNavigator from "@/components/MonthNavigator";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { TrendingUp, TrendingDown, CreditCard, Wallet, Landmark, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { isSameMonth, parseISO, isBefore, startOfMonth, getDate, addMonths } from "date-fns";
import { useFinance } from "@/context/FinanceContext";
import { Transaction, Bank } from "@/types/finance";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const Index = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const { banks, transactions, addBank, addTransaction } = useFinance();

  const getBillingMonth = (transaction: Transaction) => {
    const tDate = parseISO(transaction.date);
    if (transaction.method !== 'credit') return tDate;
    
    const bank = banks.find(b => b.id === transaction.bankId);
    if (!bank || !bank.closingDay) return tDate;

    if (getDate(tDate) > bank.closingDay) {
      return addMonths(tDate, 1);
    }
    return tDate;
  };

  const summaryData = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    
    const base = transactions.filter(t => isSameMonth(getBillingMonth(t), currentDate));

    const completed = base.filter(t => t.isCompleted)
      .reduce((acc, t) => {
        if (t.method === 'income') return acc + t.amount;
        if (t.method === 'transfer') return acc;
        return acc - t.amount;
      }, 0);
    
    const future = base.filter(t => !t.isCompleted)
      .reduce((acc, t) => {
        if (t.method === 'income') return acc + t.amount;
        if (t.method === 'transfer') return acc;
        return acc - t.amount;
      }, 0);

    const previousBalance = transactions
      .filter(t => isBefore(getBillingMonth(t), monthStart))
      .reduce((acc, t) => {
        if (t.method === 'income') return acc + t.amount;
        if (t.method === 'transfer') return acc;
        return acc - t.amount;
      }, 0);

    return { completed, future, previousBalance };
  }, [transactions, currentDate, banks]);

  const grandTotal = summaryData.completed + summaryData.future + summaryData.previousBalance;

  const totalCreditMonth = useMemo(() => 
    transactions.filter(t => {
      if (t.method !== 'credit') return false;
      return isSameMonth(getBillingMonth(t), currentDate);
    }).reduce((acc, t) => acc + t.amount, 0), 
  [transactions, currentDate, banks]);
  
  const monthlyIncome = useMemo(() => 
    transactions.filter(t => t.method === 'income' && isSameMonth(parseISO(t.date), currentDate))
      .reduce((acc, t) => acc + t.amount, 0), 
  [transactions, currentDate]);

  const monthlyExpenses = useMemo(() => 
    transactions.filter(t => (t.method === 'debit' || t.method === 'credit') && isSameMonth(parseISO(t.date), currentDate))
      .reduce((acc, t) => acc + t.amount, 0), 
  [transactions, currentDate]);

  // Cálculo de saldo por conta para o mês selecionado
  const accountSummaries = useMemo(() => {
    const monthStart = startOfMonth(currentDate);

    return banks.map(bank => {
      // 1. Saldo Anterior (Tudo antes do mês atual)
      const previousBalance = transactions
        .filter(t => 
          (t.bankId === bank.id || t.destinationBankId === bank.id) &&
          isBefore(getBillingMonth(t), monthStart)
        )
        .reduce((acc, t) => {
          const isOrigin = t.bankId === bank.id;
          const isDest = t.destinationBankId === bank.id;
          if (t.method === 'income') return acc + t.amount;
          if (t.method === 'transfer') {
            if (isOrigin && !isDest) return acc - t.amount;
            if (!isOrigin && isDest) return acc + t.amount;
            return acc;
          }
          return acc - t.amount;
        }, 0);

      // 2. Valores Efetuados (Mês atual)
      const completedMonth = transactions
        .filter(t => 
          (t.bankId === bank.id || t.destinationBankId === bank.id) &&
          isSameMonth(getBillingMonth(t), currentDate) &&
          t.isCompleted
        )
        .reduce((acc, t) => {
          const isOrigin = t.bankId === bank.id;
          const isDest = t.destinationBankId === bank.id;
          if (t.method === 'income') return acc + t.amount;
          if (t.method === 'transfer') {
            if (isOrigin && !isDest) return acc - t.amount;
            if (!isOrigin && isDest) return acc + t.amount;
            return acc;
          }
          return acc - t.amount;
        }, 0);

      // 3. Valores Futuros (Mês atual)
      const futureMonth = transactions
        .filter(t => 
          (t.bankId === bank.id || t.destinationBankId === bank.id) &&
          isSameMonth(getBillingMonth(t), currentDate) &&
          !t.isCompleted
        )
        .reduce((acc, t) => {
          const isOrigin = t.bankId === bank.id;
          const isDest = t.destinationBankId === bank.id;
          if (t.method === 'income') return acc + t.amount;
          if (t.method === 'transfer') {
            if (isOrigin && !isDest) return acc - t.amount;
            if (!isOrigin && isDest) return acc + t.amount;
            return acc;
          }
          return acc - t.amount;
        }, 0);

      const currentBalance = previousBalance + completedMonth;
      const projectedTotal = currentBalance + futureMonth;

      return { ...bank, currentBalance, projectedTotal };
    });
  }, [banks, transactions, currentDate]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      <Sidebar />
      <MobileNav />
      
      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-12">
          <header className="flex flex-col items-center text-center space-y-8 py-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 text-primary text-xs font-bold">
                <span className="animate-pulse">✨</span>
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
                  <p className="font-bold text-[10px] uppercase tracking-widest">Total Geral do Mês</p>
                </div>
                <h2 className="text-3xl font-black">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(grandTotal)}
                </h2>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-none shadow-sm rounded-[2.5rem] transition-transform hover:scale-[1.02]">
              <CardContent className="pt-10 pb-8 px-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-50 dark:bg-purple-950/30 text-purple-600 rounded-xl">
                    <CreditCard size={20} />
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Faturas do Mês</p>
                </div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCreditMonth)}
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
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Resumo por Conta</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accountSummaries.map(summary => (
                <div 
                  key={summary.id}
                  onClick={() => navigate(summary.type === 'account' ? '/accounts' : '/cards')}
                  className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl" style={{ backgroundColor: `${summary.color}15`, color: summary.color }}>
                      {summary.type === 'account' ? <Landmark size={24} /> : <CreditCard size={24} />}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 dark:text-white">{summary.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {summary.type === 'account' ? 'Saldo Efetivado' : 'Fatura Efetivada'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="text-lg font-black text-slate-900 dark:text-white">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.currentBalance)}
                      </p>
                      <p className={cn("text-[10px] font-bold", summary.projectedTotal >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        Total Geral: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.projectedTotal)}
                      </p>
                    </div>
                    <ArrowRight size={18} className="text-slate-300 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex justify-between text-sm font-medium text-slate-500">
                <span>Valores Efetuados (Mês)</span>
                <span className={summaryData.completed >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summaryData.completed)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-medium text-slate-500">
                <span>Valores Futuros (Mês)</span>
                <span className={summaryData.future >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summaryData.future)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-medium text-slate-500">
                <span>Saldo Mês Anterior</span>
                <span className={summaryData.previousBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summaryData.previousBalance)}
                </span>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-lg font-black text-slate-900 dark:text-white">Total Geral</span>
                <span className={`text-2xl font-black ${grandTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(grandTotal)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-10">
            <MadeWithDyad />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;