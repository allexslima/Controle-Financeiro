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
import { Transaction, Bank } from "@/types/finance";
import { useLocation } from "react-router-dom";
import { ChevronDown, ChevronUp, CreditCard, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TransactionsPage = () => {
  const location = useLocation();
  const { transactions, banks, deleteTransaction, updateTransaction, addTransaction } = useFinance();
  
  const [currentDate, setCurrentDate] = useState(() => {
    if (location.state?.selectedDate) return new Date(location.state.selectedDate);
    return new Date();
  });

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [expandedFaturas, setExpandedFaturas] = useState<Record<string, boolean>>({});
  
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'edit' | 'delete',
    transaction: Transaction,
    updatedData?: Transaction
  } | null>(null);

  const getBillingMonth = (transaction: Transaction) => {
    const tDate = parseISO(transaction.date);
    if (transaction.method !== 'credit') return tDate;
    const bank = banks.find(b => b.id === transaction.bankId);
    if (!bank || !bank.closingDay) return tDate;
    if (getDate(tDate) > bank.closingDay) return addMonths(tDate, 1);
    return tDate;
  };

  const processedData = useMemo(() => {
    const monthTransactions = transactions.filter(t => isSameMonth(getBillingMonth(t), currentDate));
    
    const normalTransactions: Transaction[] = [];
    const creditGroups: Record<string, { transactions: Transaction[], payments: number }> = {};

    monthTransactions.forEach(t => {
      if (t.method === 'credit') {
        if (!creditGroups[t.bankId]) creditGroups[t.bankId] = { transactions: [], payments: 0 };
        creditGroups[t.bankId].transactions.push(t);
      } else if (t.method === 'transfer' && banks.find(b => b.id === t.destinationBankId)?.type === 'credit_card') {
        // É um pagamento de fatura
        if (!creditGroups[t.destinationBankId!]) creditGroups[t.destinationBankId!] = { transactions: [], payments: 0 };
        creditGroups[t.destinationBankId!].payments += t.amount;
        normalTransactions.push(t); // Mantemos o pagamento na lista pois ele saiu de uma conta
      } else {
        normalTransactions.push(t);
      }
    });

    return { normalTransactions, creditGroups };
  }, [transactions, currentDate, banks]);

  const toggleFatura = (bankId: string) => {
    setExpandedFaturas(prev => ({ ...prev, [bankId]: !prev[bankId] }));
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

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      <Sidebar />
      <MobileNav />
      <main className="flex-1 p-4 md:p-10 overflow-y-auto pb-32 md:pb-10">
        <div className="max-w-5xl mx-auto space-y-8">
          <header className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-black text-slate-900 dark:text-white">Transações</h1>
              <AddTransactionDialog banks={banks} onAdd={addTransaction} />
            </div>
            <MonthNavigator currentDate={currentDate} onChange={setCurrentDate} />
          </header>

          <div className="space-y-4">
            {/* Seção de Faturas Agrupadas */}
            {Object.entries(processedData.creditGroups).map(([bankId, group]) => {
              const bank = banks.find(b => b.id === bankId);
              const totalPurchases = group.transactions.reduce((acc, t) => acc + t.amount, 0);
              const remainingBalance = Math.max(0, totalPurchases - group.payments);
              const isExpanded = expandedFaturas[bankId];

              if (totalPurchases === 0) return null;

              return (
                <div key={bankId} className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                  <div 
                    className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    onClick={() => toggleFatura(bankId)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-purple-100 text-purple-600">
                        <CreditCard size={24} />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 dark:text-white">Fatura {bank?.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {group.payments > 0 ? `Pago: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(group.payments)}` : 'Aguardando pagamento'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className={cn("text-xl font-black", remainingBalance > 0 ? "text-rose-600" : "text-emerald-600")}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(remainingBalance)}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Restante</p>
                      </div>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      <TransactionList 
                        transactions={group.transactions} 
                        banks={banks} 
                        onEdit={setEditingTransaction} 
                        onDelete={handleDeleteRequest}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Lista de Transações Normais (Débito, Receita, Pagamentos) */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 px-4 mb-2">Movimentações de Conta</h3>
              <TransactionList 
                transactions={processedData.normalTransactions} 
                banks={banks} 
                onEdit={setEditingTransaction} 
                onDelete={handleDeleteRequest}
              />
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
          title={pendingAction?.type === 'edit' ? "Editar Transação" : "Excluir Transação"}
          description="Esta transação faz parte de um grupo. Como deseja aplicar as alterações?"
          type={pendingAction?.type || 'edit'}
          onAction={handleRecurringAction}
        />
      </main>
    </div>
  );
};

export default TransactionsPage;