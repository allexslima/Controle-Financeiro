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
    const base = transactions.filter(t => {
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

    // Agrupar transações de crédito por cartão
    const nonCredit = base.filter(t => t.method !== 'credit');
    const creditByBank = base.filter(t => t.method === 'credit').reduce((acc, t) => {
      if (!acc[t.bankId]) acc[t.bankId] = { amount: 0, count: 0 };
      acc[t.bankId].amount += t.amount;
      acc[t.bankId].count += 1;
      return acc;
    }, {} as Record<string, { amount: number, count: number }>);

    const groupedCredit: Transaction[] = Object.entries(creditByBank).map(([bankId, data]) => {
      const bank = banks.find(b => b.id === bankId);
      return {
        id: `group-${bankId}`,
        description: `Fatura ${bank?.name || 'Cartão'}`,
        amount: data.amount,
        method: 'credit',
        category: 'Cartão de Crédito',
        date: currentDate.toISOString(),
        bankId: bankId,
      };
    });

    return [...nonCredit, ...groupedCredit].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, currentDate, banks]);

  const today = startOfDay(new Date());

  const handleEditRequest = (t: Transaction) => {
    if (t.id.startsWith('group-')) return;
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
    if (id.startsWith('group-')) return;
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

  // Cálculo do resumo baseado nas transações originais (não agrupadas) para precisão
  const summaryData = useMemo(() => {
    const base = transactions.filter(t => {
      const tDate = parseISO(t.date);
      if (t.method !== 'credit') return isSameMonth(tDate, currentDate);
      const bank = banks.find(b => b.id === t.bankId);
      if (!bank || !bank.closingDay) return isSameMonth(tDate, currentDate);
      let billingMonth = tDate;
      if (getDate(tDate) > bank.closingDay) billingMonth = addMonths(tDate, 1);
      return isSameMonth(billingMonth, currentDate);
    });

    const completed = base.filter(t => !isAfter(parseISO(t.date), today))
      .reduce((acc, t) => t.method === 'income' ? acc + t.amount : acc - t.amount, 0);
    
    const future = base.filter(t => isAfter(parseISO(t.date), today))
      .reduce((acc, t) => t.method === 'income' ? acc + t.amount : acc - t.amount, 0);

    return { completed, future };
  }, [transactions, currentDate, banks, today]);

  const grandTotal = summaryData.completed + summaryData.future;

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