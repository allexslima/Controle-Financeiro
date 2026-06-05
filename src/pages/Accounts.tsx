"use client";

import React, { useState, useMemo } from 'react';
import Sidebar from "@/components/Sidebar";
import BankCard from "@/components/BankCard";
import TransactionList from "@/components/TransactionList";
import MonthNavigator from "@/components/MonthNavigator";
import EditBankDialog from "@/components/EditBankDialog";
import { useFinance } from "@/context/FinanceContext";
import { Bank, Transaction } from "@/types/finance";
import { isSameMonth, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil } from "lucide-react";

const AccountsPage = () => {
  const { banks, transactions, removeBank, updateBank, deleteTransaction } = useFinance();
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const accountBanks = banks.filter(b => b.type === 'account');

  const filteredTransactions = useMemo(() => {
    if (!selectedBank) return [];
    return transactions.filter(t => 
      (t.bankId === selectedBank.id || t.destinationBankId === selectedBank.id) &&
      isSameMonth(parseISO(t.date), currentDate)
    );
  }, [transactions, selectedBank, currentDate]);

  return (
    <div className="flex min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      <Sidebar />
      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          {!selectedBank ? (
            <>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white">Minhas Contas</h1>
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
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setSelectedBank(null)} className="gap-2">
                  <ArrowLeft size={18} /> Voltar para Contas
                </Button>
                <MonthNavigator currentDate={currentDate} onChange={setCurrentDate} />
              </div>

              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border-l-8 relative group" style={{ borderLeftColor: selectedBank.color }}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setEditingBank(selectedBank)}
                >
                  <Pencil size={18} />
                </Button>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">{selectedBank.name}</h2>
                <p className="text-slate-500 font-medium">Movimentações do mês</p>
                <p className="text-3xl font-black mt-4 text-slate-900 dark:text-white">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedBank.balance)}
                </p>
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

export default AccountsPage;