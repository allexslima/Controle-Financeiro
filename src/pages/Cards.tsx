"use client";

import React, { useState, useMemo } from 'react';
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import BankCard from "@/components/BankCard";
import TransactionList from "@/components/TransactionList.tsx";
import MonthNavigator from "@/components/MonthNavigator";
import EditBankDialog from "@/components/EditBankDialog";
import EditTransactionDialog from "@/components/EditTransactionDialog";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import AddCreditCardDialog from "@/components/AddCreditCardDialog";
import PayInvoiceDialog from "@/components/PayInvoiceDialog";
import { useFinance } from "@/context/FinanceContext";
import { Bank, Transaction } from "@/types/finance";
import { isSameMonth, parseISO, isAfter, startOfDay, getDate, addMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard, Pencil } from "lucide-react";

const CardsPage = () => {
  const { banks, transactions, removeBank, updateBank, deleteTransaction, addTransaction, addBank, updateTransaction } = useFinance();
  const [selectedCard, setSelectedCard] = useState<Bank | null>(null);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const creditCards = banks.filter(b => b.type === 'credit_card');

  const getCompletedInvoice = (card: Bank) => {
    const pendingTransactions = transactions.filter(t => 
      (t.bankId === card.id || t.destinationBankId === card.id) &&
      !t.isCompleted
    );
    
    let balance = card.balance;
    pendingTransactions.forEach(t => {
      if (t.method === 'credit') {
        balance -= t.amount;
      } else if (t.method === 'transfer' && t.destinationBankId === card.id) {
        balance += t.amount;
      }
    });
    return balance;
  };

  const getBillingMonth = (transaction: Transaction, bank: Bank | undefined) => {
    const tDate = parseISO(transaction.date);
    if (!bank || !bank.closingDay) return tDate;
    if (getDate(tDate) > bank.closingDay) return addMonths(tDate, 1);
    return tDate;
  };

  const filteredTransactions = useMemo(() => {
    if (!selectedCard) return [];
    return transactions.filter(t => {
      if (t.bankId !== selectedCard.id && t.destinationBankId !== selectedCard.id) return false;
      const billingMonth = getBillingMonth(t, selectedCard);
      return isSameMonth(billingMonth, currentDate);
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedCard, currentDate]);

  const summaryData = useMemo(() => {
    if (!selectedCard) return { completed: 0, future: 0 };
    
    const completed = filteredTransactions
      .filter(t => t.isCompleted)
      .reduce((acc, t) => {
        if (t.method === 'credit') return acc - t.amount;
        if (t.method === 'transfer' && t.destinationBankId === selectedCard.id) return acc + t.amount;
        return acc;
      }, 0);

    const future = filteredTransactions
      .filter(t => !t.isCompleted)
      .reduce((acc, t) => {
        if (t.method === 'credit') return acc - t.amount;
        if (t.method === 'transfer' && t.destinationBankId === selectedCard.id) return acc + t.amount;
        return acc;
      }, 0);

    return { completed, future };
  }, [filteredTransactions, selectedCard]);

  const grandTotal = summaryData.completed + summaryData.future;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      <Sidebar />
      <MobileNav />
      <main className="flex-1 p-4 md:p-10 overflow-y-auto pb-32 md:pb-10">
        <div className="max-w-5xl mx-auto space-y-8">
          {!selectedCard ? (
            <>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">Meus Cartões</h1>
                <div className="flex items-center gap-2">
                  <AddCreditCardDialog onAdd={addBank} variant="discrete" />
                  <AddTransactionDialog banks={banks} onAdd={addTransaction} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {creditCards.map(card => (
                  <div key={card.id} className="flex flex-col">
                    <BankCard 
                      bank={card} 
                      displayBalance={getCompletedInvoice(card)}
                      onRemove={removeBank} 
                      onEdit={setEditingBank}
                      onClick={setSelectedCard} 
                    />
                    <PayInvoiceDialog card={card} banks={banks} onPay={addTransaction} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" onClick={() => setSelectedCard(null)} className="gap-2 self-start text-slate-600 dark:text-slate-400">
                    <ArrowLeft size={18} /> Voltar
                  </Button>
                  <AddTransactionDialog banks={banks} onAdd={addTransaction} />
                </div>
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
                  
                  <div className="mt-8">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Total da Fatura</p>
                    <p className="text-4xl font-black">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(grandTotal))}
                    </p>
                  </div>

                  <div className="mt-8 max-w-[200px]">
                    <PayInvoiceDialog card={selectedCard} banks={banks} onPay={addTransaction} />
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
              </div>

              <TransactionList 
                transactions={filteredTransactions} 
                banks={banks} 
                onEdit={setEditingTransaction} 
                onDelete={deleteTransaction}
              />

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
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-lg font-black text-slate-900 dark:text-white">Total Geral</span>
                  <span className={`text-2xl font-black ${grandTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(grandTotal)}
                  </span>
                </div>
              </div>
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

export default CardsPage;