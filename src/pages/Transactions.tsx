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
import { isSameMonth, parseISO, isBefore, startOfMonth } from "date-fns";
import { Transaction } from "@/types/finance";
import { useLocation } from "react-router-dom";
import { Landmark, CreditCard, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateMonthlySummary, getBillingMonth } from "@/utils/financeCalculations";

const TransactionsPage = () => {
  const location = useLocation();
  const { transactions, banks, deleteTransaction, updateTransaction, addTransaction } = useFinance();
  
  const [currentDate, setCurrentDate] = useState(() => {
    if (location.state?.selectedDate) return new Date(location.state.selectedDate);
    return new Date();
  });

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'edit' | 'delete',
    transaction: Transaction,
    updatedData?: Transaction
  } | null>(null);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Função para calcular o valor líquido de uma transação para um determinado banco/cartão
  const getTransactionNetValueForBank = (t: Transaction, bankId: string) => {
    const isOrigin = t.bankId === bankId;
    const isDest = t.destinationBankId === bankId;

    if (t.method === 'income') return isOrigin ? t.amount : 0;
    if (t.method === 'debit' || t.method === 'credit') return isOrigin ? -t.amount : 0;
    
    if (t.method === 'transfer' || t.method === 'investment_apply' || t.method === 'investment_redeem') {
      if (isOrigin && !isDest) return -t.amount;
      if (!isOrigin && isDest) return t.amount;
    }

    return 0;
  };

  // Separação dos bancos por tipo
  const accountBanks = useMemo(() => banks.filter(b => b.type === 'account'), [banks]);
  const creditCardBanks = useMemo(() => banks.filter(b => b.type === 'credit_card'), [banks]);

  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate]);

  // Agrupamento por Banco de Conta Corrente
  const accountGroups = useMemo(() => {
    return accountBanks.map(bank => {
      const bankTransactions = transactions.filter(t => 
        (t.bankId === bank.id || t.destinationBankId === bank.id) &&
        isSameMonth(parseISO(t.date), currentDate)
      );

      const previousTransactions = transactions.filter(t => 
        (t.bankId === bank.id || t.destinationBankId === bank.id) &&
        isBefore(parseISO(t.date), monthStart)
      );

      const previousBalance = previousTransactions.reduce(
        (acc, t) => acc + getTransactionNetValueForBank(t, bank.id), 0
      );

      const completed = bankTransactions
        .filter(t => t.isCompleted)
        .reduce((acc, t) => acc + getTransactionNetValueForBank(t, bank.id), 0);

      const future = bankTransactions
        .filter(t => !t.isCompleted)
        .reduce((acc, t) => acc + getTransactionNetValueForBank(t, bank.id), 0);

      const total = previousBalance + completed + future;

      return { bank, transactions: bankTransactions, previousBalance, completed, future, total };
    });
  }, [accountBanks, transactions, currentDate, monthStart]);

  // Agrupamento por Cartão de Crédito
  const cardGroups = useMemo(() => {
    return creditCardBanks.map(card => {
      const cardTransactions = transactions.filter(t => {
        if (t.bankId !== card.id && t.destinationBankId !== card.id) return false;
        const billingMonth = getBillingMonth(t, banks);
        return isSameMonth(billingMonth, currentDate);
      });

      const previousTransactions = transactions.filter(t => {
        if (t.bankId !== card.id && t.destinationBankId !== card.id) return false;
        return isBefore(getBillingMonth(t, banks), monthStart);
      });

      const previousBalance = previousTransactions.reduce(
        (acc, t) => acc + getTransactionNetValueForBank(t, card.id), 0
      );

      const completed = cardTransactions
        .filter(t => t.isCompleted)
        .reduce((acc, t) => acc + getTransactionNetValueForBank(t, card.id), 0);

      const future = cardTransactions
        .filter(t => !t.isCompleted)
        .reduce((acc, t) => acc + getTransactionNetValueForBank(t, card.id), 0);

      const total = previousBalance + completed + future;

      return { card, transactions: cardTransactions, previousBalance, completed, future, total };
    });
  }, [creditCardBanks, transactions, currentDate, monthStart, banks]);

  // Resumo Global Final (calculado via utilitário centralizado)
  const summaryData = useMemo(() => {
    return calculateMonthlySummary(transactions, banks, currentDate);
  }, [transactions, banks, currentDate]);

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

          <div className="space-y-8">
            {/* 1. SEÇÃO DE CONTAS BANCÁRIAS */}
            <div className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 px-2 flex items-center gap-2">
                <Landmark size={16} /> Contas Bancárias
              </h2>

              {accountGroups.map(({ bank, transactions: bankTs, previousBalance, completed, future, total }) => {
                const isCollapsed = expandedGroups[bank.id];
                return (
                  <div key={bank.id} className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div 
                      className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      onClick={() => toggleGroup(bank.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-3 h-10 rounded-full" style={{ backgroundColor: bank.color }} />
                        <div>
                          <h3 className="font-black text-slate-900 dark:text-white text-lg">{bank.name}</h3>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {bankTs.length} {bankTs.length === 1 ? 'movimentação' : 'movimentações'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className={cn("text-xl font-black", total >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saldo Geral Projetado</p>
                        </div>
                        {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="border-t border-slate-100 dark:border-slate-800">
                        <TransactionList 
                          transactions={bankTs} 
                          banks={banks} 
                          onEdit={setEditingTransaction} 
                          onDelete={handleDeleteRequest}
                        />

                        {/* Totais Específicos do Banco */}
                        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold px-6">
                          <div>
                            <span className="text-slate-400 uppercase tracking-wider text-[10px]">Mês Anterior: </span>
                            <span className={previousBalance >= 0 ? "text-slate-700 dark:text-slate-300" : "text-rose-600"}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(previousBalance)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 uppercase tracking-wider text-[10px]">Efetuados: </span>
                            <span className={completed >= 0 ? "text-emerald-600" : "text-rose-600"}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(completed)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 uppercase tracking-wider text-[10px]">Futuros: </span>
                            <span className={future >= 0 ? "text-emerald-600" : "text-rose-600"}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(future)}
                            </span>
                          </div>
                          <div className="md:text-right">
                            <span className="text-slate-400 uppercase tracking-wider text-[10px]">Total: </span>
                            <span className={total >= 0 ? "text-emerald-600" : "text-rose-600"}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 2. SEÇÃO DE CARTÕES DE CRÉDITO */}
            {cardGroups.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 px-2 flex items-center gap-2">
                  <CreditCard size={16} /> Cartões de Crédito
                </h2>

                {cardGroups.map(({ card, transactions: cardTs, previousBalance, completed, future, total }) => {
                  const isCollapsed = expandedGroups[card.id];
                  return (
                    <div key={card.id} className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                      <div 
                        className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        onClick={() => toggleGroup(card.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-2xl bg-purple-100 text-purple-600">
                            <CreditCard size={20} />
                          </div>
                          <div>
                            <h3 className="font-black text-slate-900 dark:text-white text-lg">Fatura {card.name}</h3>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {cardTs.length} {cardTs.length === 1 ? 'lançamento' : 'lançamentos'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className={cn("text-xl font-black", total >= 0 ? "text-emerald-600" : "text-rose-600")}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Acumulado</p>
                          </div>
                          {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                        </div>
                      </div>

                      {!isCollapsed && (
                        <div className="border-t border-slate-100 dark:border-slate-800">
                          <TransactionList 
                            transactions={cardTs} 
                            banks={banks} 
                            onEdit={setEditingTransaction} 
                            onDelete={handleDeleteRequest}
                          />

                          {/* Totais do Cartão */}
                          <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold px-6">
                            <div>
                              <span className="text-slate-400 uppercase tracking-wider text-[10px]">Mês Anterior: </span>
                              <span className={previousBalance >= 0 ? "text-slate-700 dark:text-slate-300" : "text-rose-600"}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(previousBalance)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 uppercase tracking-wider text-[10px]">Efetuados: </span>
                              <span className={completed >= 0 ? "text-emerald-600" : "text-rose-600"}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(completed)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 uppercase tracking-wider text-[10px]">Futuros: </span>
                              <span className={future >= 0 ? "text-emerald-600" : "text-rose-600"}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(future)}
                              </span>
                            </div>
                            <div className="md:text-right">
                              <span className="text-slate-400 uppercase tracking-wider text-[10px]">Total: </span>
                              <span className={total >= 0 ? "text-emerald-600" : "text-rose-600"}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. RESUMO GERAL GLOBAL NO RODAPÉ */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Resumo Geral do Mês</h3>
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
              <span className={`text-2xl font-black ${summaryData.grandTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summaryData.grandTotal)}
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