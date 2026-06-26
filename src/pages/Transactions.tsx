"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import MonthNavigator from "@/components/MonthNavigator";
import TransactionList from "@/components/TransactionList";
import EditTransactionDialog from "@/components/EditTransactionDialog";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import RecurringActionDialog from "@/components/RecurringActionDialog";
import { useFinance } from "@/context/FinanceContext";
import { isSameMonth, parseISO, isBefore, startOfMonth, getDate, addMonths } from "date-fns";
import { Transaction } from "@/types/finance";
import { useNavigate, useLocation } from "react-router-dom";

const TransactionsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [currentDate, setCurrentDate] = useState(() => {
    if (location.state?.selectedDate) {
      return new Date(location.state.selectedDate);
    }
    return new Date();
  });

  const { transactions, banks, deleteTransaction, updateTransaction, addTransaction } = useFinance();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'edit' | 'delete',
    transaction: Transaction,
    updatedData?: Transaction
  } | null>(null);

  useEffect(() => {
    if (location.state?.selectedDate) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const getBillingMonth = (transaction: Transaction) => {
    const tDate = parseISO(transaction.date);
    if (transaction.method !== 'credit') return tDate;
    
    const bank = banks.find(b => b.id === transaction.bankId);
    if (!bank || !bank.closingDay) return tDate;

    if (getDate(tDate) > bank.closingDay) {
      return addMonths(tDate, 1);
    }
    return tDate;
  };

  const filteredTransactions = useMemo(() => {
    // Agora mostramos todas as transações individualmente, sem agrupar por fatura
    return transactions
      .filter(t => isSameMonth(getBillingMonth(t), currentDate))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, currentDate, banks]);

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

  const summaryData = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const base = transactions.filter(t => isSameMonth(getBillingMonth(t), currentDate));

    const completed = base.filter(t => t.isCompleted)
      .reduce((acc, t) => {
        if (t.method === 'income') return acc + t.amount;
        if (t.method === 'transfer') return acc;
        return acc - t.amount;
      }, 0);
    
    const future = base.filter(t => !t.isCompleted)
      .reduce((acc, t) => {
        if (t.method === 'income') return acc + t.amount;
        if (t.method === 'transfer') return acc;
        return acc - t.amount;
      }, 0);

    const previousBalance = transactions
      .filter(t => isBefore(getBillingMonth(t), monthStart))
      .reduce((acc, t) => {
        if (t.method === 'income') return acc + t.amount;
        if (t.method === 'transfer') return acc;
        return acc - t.amount;
      }, 0);

    return { completed, future, previousBalance };
  }, [transactions, currentDate, banks]);

  const grandTotal = summaryData.completed + summaryData.future + summaryData.previousBalance;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      <Sidebar />
      <MobileNav />
      <main className="flex-1 p-4 md:p-10 overflow-y-auto pb-32 md:pb-10">
        <div className="max-w-5xl mx-auto space-y-8">
          <header className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-black text-slate-900 dark:text-white">Todas as Transações</h1>
              <AddTransactionDialog banks={banks} onAdd={addTransaction} />
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
            <div className="flex justify-between text-sm font-medium text-slate-500">
              <span>Saldo Mês Anterior</span>
              <span className={summaryData.previousBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summaryData.previousBalance)}
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