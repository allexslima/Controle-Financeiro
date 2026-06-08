"use client";

import React, { useState, useMemo } from 'react';
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import MonthNavigator from "@/components/MonthNavigator";
import TransactionList from "@/components/TransactionList";
import EditTransactionDialog from "@/components/EditTransactionDialog";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import { useFinance } from "@/context/FinanceContext";
import { isSameMonth, parseISO, isAfter, startOfDay } from "date-fns";
import { Transaction } from "@/types/finance";

const TransactionsPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { transactions, banks, deleteTransaction, updateTransaction, addTransaction } = useFinance();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const filteredTransactions = useMemo(() => {
    const monthTransactions = transactions.filter(t => isSameMonth(parseISO(t.date), currentDate));
    
    const creditCards = banks.filter(b => b.type === 'credit_card');
    const nonCreditTransactions = monthTransactions.filter(t => t.method !== 'credit');
    
    const aggregatedCredit = creditCards.map(card => {
      const cardPurchases = monthTransactions.filter(t => t.method === 'credit' && t.bankId === card.id);
      const total = cardPurchases.reduce((acc, t) => acc + t.amount, 0);
      
      if (total === 0) return null;
      
      return {
        id: `invoice-${card.id}-${currentDate.getTime()}`,
        description: `Fatura: ${card.name}`,
        amount: total,
        method: 'credit' as const,
        bankId: card.id,
        category: 'Fatura',
        date: currentDate.toISOString(),
      } as Transaction;
    }).filter(Boolean) as Transaction[];

    return [...nonCreditTransactions, ...aggregatedCredit];
  }, [transactions, currentDate, banks]);

  const today = startOfDay(new Date());

  const completedTotal = useMemo(() => 
    transactions
      .filter(t => isSameMonth(parseISO(t.date), currentDate) && !isAfter(parseISO(t.date), today))
      .reduce((acc, t) => t.method === 'income' ? acc + t.amount : acc - t.amount, 0),
  [transactions, currentDate, today]);

  const futureTotal = useMemo(() => 
    transactions
      .filter(t => isSameMonth(parseISO(t.date), currentDate) && isAfter(parseISO(t.date), today))
      .reduce((acc, t) => t.method === 'income' ? acc + t.amount : acc - t.amount, 0),
  [transactions, currentDate, today]);

  const grandTotal = completedTotal + futureTotal;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      <Sidebar />
      <MobileNav />
      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          <header className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-black text-slate-900 dark:text-white">Todas as Transações</h1>
              <AddTransactionDialog banks={banks} onAdd={addTransaction} variant="discrete" />
            </div>
            <MonthNavigator currentDate={currentDate} onChange={setCurrentDate} />
          </header>

          <TransactionList 
            transactions={filteredTransactions} 
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
      </main>
    </div>
  );
};

export default TransactionsPage;