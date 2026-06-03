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
import { isSameMonth, parseISO } from "date-fns";
import { useFinance } from "@/context/FinanceContext";

const Index = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { banks, transactions, addBank, removeBank, addTransaction, deleteTransaction, updateTransaction } = useFinance();
  
  const [selectedBankForHistory, setSelectedBankForHistory] = useState<Bank | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => isSameMonth(parseISO(t.date), currentDate));
  }, [transactions, currentDate]);

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
              <p className="text-slate-500 font-medium">Resumo financeiro do mês.</p>
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
                {banks.map((bank) => (
                  <BankCard 
                    key={bank.id} 
                    bank={bank} 
                    onRemove={removeBank} 
                    onClick={setSelectedBankForHistory}
                  />
                ))}
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