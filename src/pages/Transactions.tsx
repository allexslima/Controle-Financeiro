"use client";

import React, { useState, useMemo } from 'react';
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import MonthNavigator from "@/components/MonthNavigator";
import TransactionList from "@/components/TransactionList";
import EditTransactionDialog from "@/components/EditTransactionDialog";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import RecurringActionDialog from "@/components/RecurringActionDialog";
import { useFinance } from "@/context/FinanceContext";
import { isSameMonth, parseISO, isAfter, startOfDay, getDate, addMonths } from "date-fns";
import { Transaction } from "@/types/finance";

const TransactionsPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { transactions, banks, deleteTransaction, updateTransaction, addTransaction } = useFinance();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'edit' | 'delete',
    transaction: Transaction,
    updatedData?: Transaction
  } | null>(null);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = parseISO(t.date);
      if (t.method !== 'credit') {
        return isSameMonth(tDate, currentDate);
      }
      
      const bank = banks.find(b => b.id === t.bankId);
      if (!bank || !bank.closingDay) return isSameMonth(tDate, currentDate);

      let billingMonth = tDate;
      if (getDate(tDate) > bank.closingDay) {
        billingMonth = addMonths(tDate, 1);
      }
      return isSameMonth(billingMonth, currentDate);
    });
  }, [transactions, currentDate, banks]);

  const today = startOfDay(new Date());

  const handleEditRequest = (t: Transaction) => {
    setEditingTransaction(t);
  };

  const handleUpdate = (updated: Transaction) => {
    if (updated.groupId) {
      setPendingAction({ type: 'edit', transaction: updated, updatedData: updated });
      setRecurringDialogOpen(true);
    } else {
      updateTransaction(updated);
    }
  };

  const handleDeleteRequest = (id: string) => {
    const t = transactions.find(item => item.id === id);
    if (t?.groupId) {
      setPendingAction({ type: 'delete', transaction: t });
      setRecurringDialogOpen(true);
    } else {
      deleteTransaction(id);
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
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      <Sidebar />
      <MobileNav />
      <main className="flex-1 p-4 md:p-10 overflow-y-auto pb-32 md:pb-10">
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
            onEdit={handleEditRequest}
            onDelete={handleDeleteRequest}
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

export default TransactionsPage;