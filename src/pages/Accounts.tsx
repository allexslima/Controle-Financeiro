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
import RecurringActionDialog from "@/components/RecurringActionDialog";
import { useFinance } from "@/context/FinanceContext";
import { Bank, Transaction } from "@/types/finance";
import { isSameMonth, parseISO, isBefore, startOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

const AccountsPage = () => {
  const { banks, transactions, removeBank, updateBank, deleteTransaction, addTransaction, addBank, updateTransaction } = useFinance();
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'edit' | 'delete',
    transaction: Transaction,
    updatedData?: Transaction
  } | null>(null);

  const accountBanks = banks.filter(b => b.type === 'account');

  const getBankSummary = (bank: Bank) => {
    const monthStart = startOfMonth(currentDate);

    const previousBalance = transactions
      .filter(t => 
        (t.bankId === bank.id || t.destinationBankId === bank.id) &&
        isBefore(parseISO(t.date), monthStart)
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

    const completedMonth = transactions
      .filter(t => 
        (t.bankId === bank.id || t.destinationBankId === bank.id) &&
        isSameMonth(parseISO(t.date), currentDate) &&
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

    const futureMonth = transactions
      .filter(t => 
        (t.bankId === bank.id || t.destinationBankId === bank.id) &&
        isSameMonth(parseISO(t.date), currentDate) &&
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

    return { previousBalance, completedMonth, futureMonth, currentBalance, projectedTotal };
  };

  const filteredTransactions = useMemo(() => {
    if (!selectedBank) return [];
    return transactions.filter(t => 
      (t.bankId === selectedBank.id || t.destinationBankId === selectedBank.id) &&
      isSameMonth(parseISO(t.date), currentDate)
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedBank, currentDate]);

  const selectedSummary = useMemo(() => {
    if (!selectedBank) return null;
    return getBankSummary(selectedBank);
  }, [selectedBank, transactions, currentDate]);

  const handleDeleteRequest = (id: string) => {
    const t = transactions.find(item => item.id === id);
    if (t?.groupId) {
      setPendingAction({ type: 'delete', transaction: t });
      setRecurringDialogOpen(true);
    } else {
      deleteTransaction(id);
    }
  };

  const handleUpdate = (updated: Transaction) => {
    if (updated.groupId) {
      setPendingAction({ type: 'edit', transaction: updated, updatedData: updated });
      setRecurringDialogOpen(true);
    } else {
      updateTransaction(updated);
    }
  };

  const handleRecurringAction = (mode: 'single' | 'future' | 'all') => {
    if (!pendingAction) return;
    if (pendingAction.type === 'delete') {
      deleteTransaction(pendingAction.transaction.id, mode);
    } else if (pendingAction.type === 'edit' && pendingAction.updatedData) {
      updateTransaction(pendingAction.updatedData, mode as 'single' | 'future');
    }
    setPendingAction(null);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      <Sidebar />
      <MobileNav />
      <main className="flex-1 p-4 md:p-10 overflow-y-auto pb-32 md:pb-10">
        <div className="max-w-5xl mx-auto space-y-8">
          {!selectedBank ? (
            <>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">Minhas Contas</h1>
                <div className="flex items-center gap-2">
                  <AddBankDialog onAdd={addBank} />
                  <AddTransactionDialog banks={banks} onAdd={addTransaction} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {accountBanks.map(bank => {
                  const summary = getBankSummary(bank);
                  return (
                    <BankCard 
                      key={bank.id} 
                      bank={bank} 
                      displayBalance={summary.currentBalance}
                      onRemove={removeBank} 
                      onEdit={setEditingBank}
                      onClick={setSelectedBank} 
                    />
                  );
                })}
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" onClick={() => setSelectedBank(null)} className="gap-2 self-start text-slate-600 dark:text-slate-400">
                    <ArrowLeft size={18} /> Voltar
                  </Button>
                  <AddTransactionDialog banks={banks} onAdd={addTransaction} />
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
                <div className="mt-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest">Saldo Efetivado</p>
                    <p className="text-4xl font-black text-slate-900 dark:text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedSummary?.currentBalance || 0)}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Total Geral (Projeção)</p>
                    <p className={cn("text-xl font-black", (selectedSummary?.projectedTotal || 0) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedSummary?.projectedTotal || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <TransactionList 
                transactions={filteredTransactions} 
                banks={banks} 
                onEdit={setEditingTransaction} 
                onDelete={handleDeleteRequest}
              />

              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex justify-between text-sm font-medium text-slate-500">
                  <span>Valores Efetuados (Mês)</span>
                  <span className={(selectedSummary?.completedMonth || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedSummary?.completedMonth || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-medium text-slate-500">
                  <span>Valores Futuros (Mês)</span>
                  <span className={(selectedSummary?.futureMonth || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedSummary?.futureMonth || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-medium text-slate-500">
                  <span>Saldo Mês Anterior</span>
                  <span className={(selectedSummary?.previousBalance || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedSummary?.previousBalance || 0)}
                  </span>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-lg font-black text-slate-900 dark:text-white">Total Geral</span>
                  <span className={`text-2xl font-black ${(selectedSummary?.projectedTotal || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedSummary?.projectedTotal || 0)}
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
          onUpdate={handleUpdate}
          onClose={() => setEditingTransaction(null)}
        />

        <RecurringActionDialog 
          open={recurringDialogOpen}
          onOpenChange={setRecurringDialogOpen}
          title={pendingAction?.type === 'edit' ? "Editar Transação Recorrente" : "Excluir Transação Recorrente"}
          description={pendingAction?.type === 'edit' 
            ? "Esta transação faz parte de um grupo. Como deseja aplicar as alterações?" 
            : "Esta transação faz parte de um grupo. Como deseja realizar a exclusão?"}
          type={pendingAction?.type || 'edit'}
          onAction={handleRecurringAction}
        />
      </main>
    </div>
  );
};

export default AccountsPage;