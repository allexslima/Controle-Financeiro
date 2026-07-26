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
import { isSameMonth, parseISO, isBefore, startOfMonth, getDate, addMonths } from "date-fns";
import { Transaction, Bank } from "@/types/finance";
import { useLocation } from "react-router-dom";
import { Landmark, CreditCard, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const getBillingMonth = (transaction: Transaction) => {
    const tDate = parseISO(transaction.date);
    if (transaction.method !== 'credit') return tDate;
    const bank = banks.find(b => b.id === transaction.bankId);
    if (!bank || !bank.closingDay) return tDate;
    if (getDate(tDate) > bank.closingDay) return addMonths(tDate, 1);
    return tDate;
  };

  // Função para calcular o valor líquido de uma transação para um determinado banco/investimento
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
  const investmentBanks = useMemo(() => banks.filter(b => b.type === 'investment'), [banks]);

  // Agrupamento por Banco de Conta Corrente
  const accountGroups = useMemo(() => {
    return accountBanks.map(bank => {
      const bankTransactions = transactions.filter(t => 
        (t.bankId === bank.id || t.destinationBankId === bank.id) &&
        isSameMonth(parseISO(t.date), currentDate)
      );

      const completed = bankTransactions
        .filter(t => t.isCompleted)
        .reduce((acc, t) => acc + getTransactionNetValueForBank(t, bank.id), 0);

      const future = bankTransactions
        .filter(t => !t.isCompleted)
        .reduce((acc, t) => acc + getTransactionNetValueForBank(t, bank.id), 0);

      const total = completed + future;

      return { bank, transactions: bankTransactions, completed, future, total };
    });
  }, [accountBanks, transactions, currentDate]);

  // Agrupamento por Cartão de Crédito
  const cardGroups = useMemo(() => {
    return creditCardBanks.map(card => {
      const cardTransactions = transactions.filter(t => {
        if (t.bankId !== card.id && t.destinationBankId !== card.id) return false;
        const billingMonth = getBillingMonth(t);
        return isSameMonth(billingMonth, currentDate);
      });

      const completed = cardTransactions
        .filter(t => t.isCompleted)
        .reduce((acc, t) => acc + getTransactionNetValueForBank(t, card.id), 0);

      const future = cardTransactions
        .filter(t => !t.isCompleted)
        .reduce((acc, t) => acc + getTransactionNetValueForBank(t, card.id), 0);

      const total = completed + future;

      return { card, transactions: cardTransactions, completed, future, total };
    });
  }, [creditCardBanks, transactions, currentDate, banks]);

  // Agrupamento individual por Conta de Investimento
  const investmentGroups = useMemo(() => {
    return investmentBanks.map(bank => {
      const bankTransactions = transactions.filter(t => 
        (t.bankId === bank.id || t.destinationBankId === bank.id) &&
        isSameMonth(parseISO(t.date), currentDate)
      );

      const completed = bankTransactions
        .filter(t => t.isCompleted)
        .reduce((acc, t) => acc + getTransactionNetValueForBank(t, bank.id), 0);

      const future = bankTransactions
        .filter(t => !t.isCompleted)
        .reduce((acc, t) => acc + getTransactionNetValueForBank(t, bank.id), 0);

      const total = completed + future;

      return { bank, transactions: bankTransactions, completed, future, total };
    });
  }, [investmentBanks, transactions, currentDate]);

  // Resumo Global Final
  const summaryData = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const operationalBanks = banks.filter(b => b.type !== 'investment');

    const calculateBalance = (tList: Transaction[]) => {
      return tList.reduce((acc, t) => {
        const isOriginOp = operationalBanks.some(b => b.id === t.bankId);
        const isDestOp = operationalBanks.some(b => b.id === t.destinationBankId);

        if (t.method === 'income') return isOriginOp ? acc + t.amount : acc;
        
        if (t.method === 'transfer' || t.method === 'investment_apply' || t.method === 'investment_redeem') {
          let balance = acc;
          if (isOriginOp && !isDestOp) balance -= t.amount;
          if (!isOriginOp && isDestOp) balance += t.amount;
          return balance;
        }

        return isOriginOp ? acc - t.amount : acc;
      }, 0);
    };

    const baseTransactions = transactions.filter(t => {
      const billingMonth = getBillingMonth(t);
      return isSameMonth(billingMonth, currentDate);
    });

    const previousTransactions = transactions.filter(t => 
      isBefore(getBillingMonth(t), monthStart)
    );

    const completed = calculateBalance(baseTransactions.filter(t => t.isCompleted));
    const future = calculateBalance(baseTransactions.filter(t => !t.isCompleted));
    const previousBalance = calculateBalance(previousTransactions);

    return { completed, future, previousBalance };
  }, [transactions, currentDate, banks]);

  const grandTotal = summaryData.completed + summaryData.future + summaryData.previousBalance;

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

              {accountGroups.map(({ bank, transactions: bankTs, completed, future, total }) => {
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
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total no Mês</p>
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
                        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4 text-xs font-bold px-6">
                          <div>
                            <span className="text-slate-400 uppercase tracking-wider text-[10px]">Efetuados: </span>
                            <span className={completed >= 0 ? "text-emerald-600" : "text-rose-600"}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(completed)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 uppercase tracking-wider text-[10px]">Não Efetuados: </span>
                            <span className={future >= 0 ? "text-emerald-600" : "text-rose-600"}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(future)}
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

                {cardGroups.map(({ card, transactions: cardTs, completed, future, total }) => {
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
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Fatura</p>
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
                          <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4 text-xs font-bold px-6">
                            <div>
                              <span className="text-slate-400 uppercase tracking-wider text-[10px]">Efetuados: </span>
                              <span className={completed >= 0 ? "text-emerald-600" : "text-rose-600"}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(completed)}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-slate-400 uppercase tracking-wider text-[10px]">Futuros: </span>
                              <span className={future >= 0 ? "text-emerald-600" : "text-rose-600"}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(future)}
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

            {/* 3. SEÇÃO DE INVESTIMENTOS */}
            {investmentGroups.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 px-2 flex items-center gap-2">
                  <TrendingUp size={16} /> Investimentos
                </h2>

                {investmentGroups.map(({ bank, transactions: bankTs, completed, future, total }) => {
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
                            <div className="flex items-center gap-2">
                              <h3 className="font-black text-slate-900 dark:text-white text-lg">{bank.name}</h3>
                              {bank.investmentType && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase tracking-wider">
                                  {bank.investmentType}
                                </span>
                              )}
                            </div>
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
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aporte Líquido Mês</p>
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

                          {/* Totais Específicos do Investimento */}
                          <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4 text-xs font-bold px-6">
                            <div>
                              <span className="text-slate-400 uppercase tracking-wider text-[10px]">Aportes Efetuados: </span>
                              <span className={completed >= 0 ? "text-emerald-600" : "text-rose-600"}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(completed)}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-slate-400 uppercase tracking-wider text-[10px]">Aportes Futuros: </span>
                              <span className={future >= 0 ? "text-emerald-600" : "text-rose-600"}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(future)}
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

          {/* 4. RESUMO GERAL GLOBAL NO RODAPÉ */}
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