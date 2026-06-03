"use client";

import React, { useState, useMemo } from 'react';
import Sidebar from "@/components/Sidebar";
import MonthNavigator from "@/components/MonthNavigator";
import TransactionList from "@/components/TransactionList";
import EditTransactionDialog from "@/components/EditTransactionDialog";
import { useFinance } from "@/context/FinanceContext";
import { isSameMonth, parseISO, isAfter, startOfDay } from "date-fns";
import { Transaction } from "@/types/finance";

const TransactionsPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { transactions, banks, deleteTransaction, updateTransaction } = useFinance();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => isSameMonth(parseISO(t.date), currentDate));
  }, [transactions, currentDate]);

  const today = startOfDay(new Date());

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
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar />
      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          <header className="flex items-center justify-between">
            <h1 className="text-3xl font-black text-slate-900">Todas as Transações</h1>
            <MonthNavigator currentDate={currentDate} onChange={setCurrentDate} />
          </header>

          <TransactionList 
            transactions={filteredTransactions} 
            banks={banks} 
            onEdit={setEditingTransaction}
            onDelete={deleteTransaction}
          />

          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
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
            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className="text-lg font-black text-slate-900">Total do Mês</span>
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