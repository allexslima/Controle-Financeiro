"use client";

import React, { useState, useMemo } from 'react';
import Sidebar from "@/components/Sidebar";
import BankCard from "@/components/BankCard";
import TransactionList from "@/components/TransactionList";
import MonthNavigator from "@/components/MonthNavigator";
import EditBankDialog from "@/components/EditBankDialog";
import { useFinance } from "@/context/FinanceContext";
import { Bank, Transaction } from "@/types/finance";
import { isSameMonth, parseISO, isAfter, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard, Pencil } from "lucide-react";

const CardsPage = () => {
  const { banks, transactions, removeBank, updateBank, deleteTransaction } = useFinance();
  const [selectedCard, setSelectedCard] = useState<Bank | null>(null);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const creditCards = banks.filter(b => b.type === 'credit_card');

  const filteredTransactions = useMemo(() => {
    if (!selectedCard) return [];
    return transactions.filter(t => 
      t.bankId === selectedCard.id &&
      isSameMonth(parseISO(t.date), currentDate)
    );
  }, [transactions, selectedCard, currentDate]);

  const today = startOfDay(new Date());

  const completedTotal = useMemo(() => 
    filteredTransactions
      .filter(t => !isAfter(parseISO(t.date), today))
      .reduce((acc, t) => acc + t.amount, 0),
  [filteredTransactions, today]);

  const futureTotal = useMemo(() => 
    filteredTransactions
      .filter(t => isAfter(parseISO(t.date), today))
      .reduce((acc, t) => acc + t.amount, 0),
  [filteredTransactions, today]);

  return (
    <div className="flex min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      <Sidebar />
      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          {!selectedCard ? (
            <>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white">Meus Cartões</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {creditCards.map(card => (
                  <BankCard 
                    key={card.id} 
                    bank={card} 
                    onRemove={removeBank} 
                    onEdit={setEditingBank}
                    onClick={setSelectedCard} 
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setSelectedCard(null)} className="gap-2">
                  <ArrowLeft size={18} /> Voltar para Cartões
                </Button>
                <MonthNavigator currentDate={currentDate} onChange={setCurrentDate} />
              </div>

              <div className="bg-slate-900 p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden group">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-white/10"
                  onClick={() => setEditingBank(selectedCard)}
                >
                  <Pencil size={18} />
                </Button>
                <div className="relative z-10">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-black">{selectedCard.name}</h2>
                      <p className="text-slate-400 text-sm">Fatura do mês</p>
                    </div>
                    <CreditCard size={32} className="text-slate-700" />
                  </div>
                  <p className="text-4xl font-black mt-8">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedCard.balance)}
                  </p>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Compras Efetuadas</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(completedTotal)}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Despesas Futuras</p>
                  <p className="text-2xl font-black text-rose-600 mt-2">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(futureTotal)}
                  </p>
                </div>
              </div>

              <TransactionList 
                transactions={filteredTransactions} 
                banks={banks} 
                onEdit={() => {}} 
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
      </main>
    </div>
  );
};

export default CardsPage;