"use client";

import React, { useState, useMemo } from 'react';
import AddBankDialog from "@/components/AddBankDialog";
import AddCreditCardDialog from "@/components/AddCreditCardDialog";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import MonthNavigator from "@/components/MonthNavigator";
import TransactionList from "@/components/TransactionList";
import EditTransactionDialog from "@/components/EditTransactionDialog";
import RecurringActionDialog from "@/components/RecurringActionDialog";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { TrendingUp, TrendingDown, CreditCard, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { isSameMonth, parseISO, isAfter, startOfDay, endOfMonth, getDate, addMonths } from "date-fns";
import { useFinance } from "@/context/FinanceContext";
import { Transaction } from "@/types/finance";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const { banks, transactions, addBank, addTransaction, deleteTransaction, updateTransaction } = useFinance();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'edit' | 'delete',
    transaction: Transaction,
    updatedData?: Transaction
  } | null>(null);

  const today = startOfDay(new Date());
  const endOfSelectedMonth = endOfMonth(currentDate);

  // Função auxiliar para determinar o mês de fatura de uma transação de crédito
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
    const baseTransactions = transactions.filter(t => {
      const billingMonth = getBillingMonth(t);
      return isSameMonth(billingMonth, currentDate);
    });

    const nonCredit = baseTransactions.filter(t => t.method !== 'credit');

    const creditByBank = baseTransactions.filter(t => t.method === 'credit').reduce((acc, t) => {
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
        isCompleted: false,
      };
    });

    return [...nonCredit, ...groupedCredit].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, currentDate, banks]);

  const handleEditRequest = (t: Transaction) => {
    if (t.id.startsWith('group-')) {
      navigate('/cards');
      return;
    }
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

  const summaryData = useMemo(() => {
    const base = transactions.filter(t => {
      const billingMonth = getBillingMonth(t);
      return isSameMonth(billingMonth, currentDate);
    });

    const completed = base.filter(t => t.isCompleted || !isAfter(parseISO(t.date), today))
      .reduce((acc, t) => {
        if (t.method === 'income') return acc + t.amount;
        if (t.method === 'transfer') return acc; // Transferência não afeta o saldo líquido do mês
        return acc - t.amount;
      }, 0);
    
    const future = base.filter(t => !t.isCompleted && isAfter(parseISO(t.date), today))
      .reduce((acc, t) => {
        if (t.method === 'income') return acc + t.amount;
        if (t.method === 'transfer') return acc;
        return acc - t.amount;
      }, 0);

    return { completed, future };
  }, [transactions, currentDate, banks, today]);

  const grandTotal = summaryData.completed + summaryData.future;

  // Cálculo do Saldo Projetado (Contas - Despesas Futuras)
  const projectedBalance = useMemo(() => {
    const accounts = banks.filter(b => b.type === 'account');
    const currentTotal = accounts.reduce((acc, bank) => acc + bank.balance, 0);
    return currentTotal;
  }, [banks]);

  const totalCreditMonth = useMemo(() => 
    transactions.filter(t => {
      if (t.method !== 'credit') return false;
      const billingMonth = getBillingMonth(t);
      return isSameMonth(billingMonth, currentDate);
    }).reduce((acc, t) => acc + t.amount, 0), 
  [transactions, currentDate, banks]);
  
  const monthlyIncome = useMemo(() => 
    transactions.filter(t => t.method === 'income' && isSameMonth(parseISO(t.date), currentDate))
      .reduce((acc, t) => acc + t.amount, 0), 
  [transactions, currentDate]);

  const monthlyExpenses = useMemo(() => 
    transactions.filter(t => (t.method === 'debit' || t.method === 'credit') && isSameMonth(parseISO(t.date), currentDate))
      .reduce((acc, t) => acc + t.amount, 0), 
  [transactions, currentDate]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      <Sidebar />
      <MobileNav />
      
      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-12">
          <header className="flex flex-col items-center text-center space-y-8 py-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 text-primary text-xs font-bold">
                <span className="animate-pulse">✨</span>
                <span>Visão Geral do Mês</span>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
            </div>

            <MonthNavigator currentDate={currentDate} onChange={setCurrentDate} />

            <div className="flex flex-wrap items-center justify-center gap-3">
              <AddTransactionDialog banks={banks} onAdd={addTransaction} />
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block" />
              <AddBankDialog onAdd={addBank} />
              <AddCreditCardDialog onAdd={addBank} />
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-primary text-primary-foreground border-none shadow-2xl shadow-primary/20 rounded-[2.5rem] overflow-hidden transition-transform hover:scale-[1.02]">
              <CardContent className="pt-10 pb-8 px-8">
                <div className="flex items-center gap-3 mb-6 opacity-70">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <Wallet size={20} />
                  </div>
                  <p className="font-bold text-[10px] uppercase tracking-widest">Saldo Atual Contas</p>
                </div>
                <h2 className="text-3xl font-black">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(projectedBalance)}
                </h2>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-none shadow-sm rounded-[2.5rem] transition-transform hover:scale-[1.02]">
              <CardContent className="pt-10 pb-8 px-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-50 dark:bg-purple-950/30 text-purple-600 rounded-xl">
                    <CreditCard size={20} />
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Faturas do Mês</p>
                </div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCreditMonth)}
                </h3>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-none shadow-sm rounded-[2.5rem] transition-transform hover:scale-[1.02]">
              <CardContent className="pt-10 pb-8 px-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-xl">
                    <TrendingUp size={20} />
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Receitas Mês</p>
                </div>
                <h3 className="text-3xl font-black text-emerald-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyIncome)}
                </h3>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-none shadow-sm rounded-[2.5rem] transition-transform hover:scale-[1.02]">
              <CardContent className="pt-10 pb-8 px-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-xl">
                    <TrendingDown size={20} />
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Despesas Mês</p>
                </div>
                <h3 className="text-3xl font-black text-rose-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyExpenses)}
                </h3>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Transações do Mês</h2>
            </div>
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

          <div className="pt-10">
            <MadeWithDyad />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;