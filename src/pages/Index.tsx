"use client";

import React, { useState, useMemo } from 'react';
import AddBankDialog from "@/components/AddBankDialog";
import AddCreditCardDialog from "@/components/AddCreditCardDialog";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import MonthNavigator from "@/components/MonthNavigator";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { TrendingUp, TrendingDown, CreditCard, Wallet, Landmark, ArrowRight, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

  const operationalBanks = banks.filter(b => b.type !== 'investment');

  const summaryData = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    
    const calculateBalance = (tList: Transaction[]) => {
      return tList.reduce((acc, t) => {
        const isOriginOp = operationalBanks.some(b => b.id === t.bankId);
        const isDestOp = operationalBanks.some(b => b.id === t.destinationBankId);

        if (t.method === 'income') return isOriginOp ? acc + t.amount : acc;
        
        if (t.method === 'transfer' || t.method === 'investment_apply' || t.method === 'investment_redeem') {
          let balance = acc;
          if (isOriginOp && !isDestOp) balance -= t.amount;
          if (!isOriginOp && isDestOp) balance += t.amount;
          return balance;
        }

        // Débitos e Créditos (saídas das contas operacionais)
        return isOriginOp ? acc - t.amount : acc;
      }, 0);
    };

    const baseTransactions = transactions.filter(t => {
      const billingMonth = getBillingMonth(t);
      return isSameMonth(billingMonth, currentDate);
    });

    const previousTransactions = transactions.filter(t => 
      isBefore(getBillingMonth(t), monthStart)
    );

    const completed = calculateBalance(baseTransactions.filter(t => t.isCompleted));
    const future = calculateBalance(baseTransactions.filter(t => !t.isCompleted));
    const previousBalance = calculateBalance(previousTransactions);

    return { completed, future, previousBalance };
  }, [transactions, currentDate, banks]);

  const grandTotal = summaryData.completed + summaryData.future + summaryData.previousBalance;
  
  // O total investido no Dashboard agora também soma o saldo aplicado + rendimentos acumulados
  const totalInvested = banks.filter(b => b.type === 'investment').reduce((acc, b) => acc + b.balance + (b.yieldAmount || 0), 0);

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
              <Button 
                onClick={() => navigate('/investments')}
                className="rounded-full px-6 py-6 bg-sky-600 hover:bg-sky-700 text-white font-bold gap-2 shadow-lg shadow-sky-200 dark:shadow-none"
              >
                <BarChart3 size={20} />
                Conta de Investimento
              </Button>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card 
              onClick={() => navigate('/transactions', { state: { selectedDate: currentDate.toISOString() } })}
              className="bg-primary text-primary-foreground border-none shadow-2xl shadow-primary/20 rounded-[2.5rem] overflow-hidden transition-transform hover:scale-[1.02] cursor-pointer"
            >
              <CardContent className="pt-10 pb-8 px-8">
                <div className="flex items-center gap-3 mb-6 opacity-70">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <Wallet size={20} />
                  </div>
                  <p className="font-bold text-[10px] uppercase tracking-widest">Saldo Operacional</p>
                </div>
                <h2 className="text-3xl font-black">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(grandTotal)}
                </h2>
              </CardContent>
            </Card>

            <Card 
              onClick={() => navigate('/investments')}
              className="bg-sky-600 text-white border-none shadow-xl rounded-[2.5rem] transition-transform hover:scale-[1.02] cursor-pointer"
            >
              <CardContent className="pt-10 pb-8 px-8">
                <div className="flex items-center gap-3 mb-6 opacity-70">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <TrendingUp size={20} />
                  </div>
                  <p className="font-bold text-[10px] uppercase tracking-widest">Patrimônio Investido</p>
                </div>
                <h3 className="text-3xl font-black">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalInvested)}
                </h3>
              </CardContent>
            </Card>
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