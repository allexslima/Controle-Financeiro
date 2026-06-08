"use client";

import React, { useState, useMemo } from 'react';
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import BankCard from "@/components/BankCard";
import TransactionList from "@/components/TransactionList";
import MonthNavigator from "@/components/MonthNavigator";
import EditBankDialog from "@/components/EditBankDialog";
import EditTransactionDialog from "@/components/EditTransactionDialog";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import AddBankDialog from "@/components/AddBankDialog";
import { useFinance } from "@/context/FinanceContext";
import { Bank, Transaction } from "@/types/finance";
import { isSameMonth, parseISO, isAfter, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil } from "lucide-react";

const AccountsPage = () => {
  const { banks, transactions, removeBank, updateBank, deleteTransaction, addTransaction, addBank, updateTransaction } = useFinance();
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const accountBanks = banks.filter(b => b.type === 'account');

  const filteredTransactions = useMemo(() => {
    if (!selectedBank) return [];
    return transactions.filter(t => 
      (t.bankId === selectedBank.id || t.destinationBankId === selectedBank.id) &&
      isSameMonth(parseISO(t.date), currentDate)
    );
  }, [transactions, selectedBank, currentDate]);

  const today = startOfDay(new Date());

  const completedTotal = useMemo(() => 
    filteredTransactions
      .filter(t => !isAfter(parseISO(t.date), today))
      .reduce((acc, t) => {
        if (t.method === 'income') return acc + t.amount;
        if (t.method === 'transfer' && t.destinationBankId === selectedBank?.id) return acc + t.amount;
        return acc - t.amount;
      }, 0),
  [filteredTransactions, today, selectedBank]);

  const futureTotal = useMemo(() => 
    filteredTransactions
      .filter(t => isAfter(parseISO(t.date), today))
      .reduce((acc, t) => {
        if (t.method === 'income') return acc + t.amount;
        if (t.method === 'transfer' && t.destinationBankId === selectedBank?.id) return acc + t.amount;
        return acc - t.amount;
      }, 0),
  [filteredTransactions, today, selectedBank]);

  const finalMonthBalance = (selectedBank?.balance || 0) + futureTotal;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      <Sidebar />
      <MobileNav />
      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          {!selectedBank ? (
            <>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">Minhas Contas</h1>
                <div className="flex items-center gap-2">
                  <AddBankDialog onAdd={addBank} />
                  <AddTransactionDialog banks={banks} onAdd={addTransaction} variant="discrete" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {accountBanks.map(bank => (
                  <BankCard 
                    key={bank.id} 
                    bank={bank} 
                    onRemove={removeBank} 
                    onEdit={setEditingBank}
                    onClick={setSelectedBank} 
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" onClick={() => setSelectedBank(null)} className="gap-2 self-start text-slate-600 dark:text-slate-400">
                    <ArrowLeft size={18} /> Voltar
                  </Button>
                  <AddTransactionDialog banks={banks} onAdd={addTransaction} variant="discrete" />
                </div>
                <MonthNavigator currentDate={currentDate} onChange={setCurrentDate} />
              </div>

              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border-l-8 relative group border-slate-100 dark:border-slate-800" style={{ borderLeftColor: selectedBank.color }}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-primary"
                  onClick={() => setEditingBank(selectedBank)}
                >
                  <Pencil size={18} />
                </Button>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">{selectedBank.name}</h2>
                <div className="mt-4 flex flex-col md:flex-row md:items-end gap-6">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">Saldo Atual</p>
                    <p className="text-4xl font-black text-slate-900 dark:text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedBank.balance)}
                    </p>
                  </div>
                  <div className="pb-1">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Previsão Final do Mês</p>
                    <p className={`text-xl font-black ${finalMonthBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalMonthBalance)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">Movimentação Efetuada (Mês)</p>
                  <p className={`text-2xl font-black mt-2 ${completedTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(completedTotal)}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">Movimentação Futura (Mês)</p>
                  <p className={`text-2xl font-black mt-2 ${futureTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(futureTotal)}
                  </p>
                </div>
              </div>

              <TransactionList 
                transactions={filteredTransactions} 
                banks={banks} 
                onEdit={setEditingTransaction} 
                onDelete={deleteTransaction}
              />
            </div>
          )}
        </div>

        <EditBankDialog 
          bank={editingBank}
          onUpdate={updateBank}
          onClose={() => setEditingBank(null)}
        />

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

export default AccountsPage;