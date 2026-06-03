"use client";

import React, { useState, useMemo } from 'react';
import Sidebar from "@/components/Sidebar";
import BankCard from "@/components/BankCard";
import TransactionList from "@/components/TransactionList";
import MonthNavigator from "@/components/MonthNavigator";
import { useFinance } from "@/context/FinanceContext";
import { Bank, Transaction } from "@/types/finance";
import { isSameMonth, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const AccountsPage = () => {
  const { banks, transactions, removeBank, deleteTransaction, updateTransaction } = useFinance();
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
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
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar />
      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          {!selectedBank ? (
            <>
              <h1 className="text-3xl font-black text-slate-900">Minhas Contas</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {accountBanks.map(bank => (
                  <BankCard 
                    key={bank.id} 
                    bank={bank} 
                    onRemove={removeBank} 
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

              <div className="bg-white p-8 rounded-[2rem] shadow-sm border-l-8" style={{ borderLeftColor: selectedBank.color }}>
                <h2 className="text-2xl font-black text-slate-900">{selectedBank.name}</h2>
                <p className="text-slate-500 font-medium">Movimentações do mês</p>
                <p className="text-3xl font-black mt-4">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedBank.balance)}
                </p>
              </div>

              <TransactionList 
                transactions={filteredTransactions} 
                banks={banks} 
                onEdit={() => {}} // Implementar se necessário
                onDelete={deleteTransaction}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AccountsPage;