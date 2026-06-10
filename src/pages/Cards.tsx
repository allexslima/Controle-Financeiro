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
import AddCreditCardDialog from "@/components/AddCreditCardDialog";
import PayInvoiceDialog from "@/components/PayInvoiceDialog";
import RecurringActionDialog from "@/components/RecurringActionDialog";
import { useFinance } from "@/context/FinanceContext";
import { Bank, Transaction } from "@/types/finance";
import { isSameMonth, parseISO, isAfter, startOfDay, isBefore, endOfDay, getDate, addMonths, subMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard, Pencil } from "lucide-react";

const CardsPage = () => {
  const { banks, transactions, removeBank, updateBank, deleteTransaction, addTransaction, addBank, updateTransaction } = useFinance();
  const [selectedCard, setSelectedCard] = useState<Bank | null>(null);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'edit' | 'delete',
    transaction: Transaction,
    updatedData?: Transaction
  } | null>(null);

  const creditCards = banks.filter(b => b.type === 'credit_card');

  const getBillingMonth = (transaction: Transaction, bank: Bank | undefined) => {
    const tDate = parseISO(transaction.date);
    if (!bank || !bank.closingDay) return tDate;
    if (getDate(tDate) > bank.closingDay) {
      return addMonths(tDate, 1);
    }
    return tDate;
  };

  const filteredTransactions = useMemo(() => {
    if (!selectedCard) return [];
    return transactions.filter(t => {
      if (t.bankId !== selectedCard.id && t.destinationBankId !== selectedCard.id) return false;
      const billingMonth = getBillingMonth(t, selectedCard);
      return isSameMonth(billingMonth, currentDate);
    });
  }, [transactions, selectedCard, currentDate]);

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
      updateTransaction(pendingAction.updatedData, mode as 'single' | 'future' | 'all');
    }
    setPendingAction(null);
  };

  const today = endOfDay(new Date());

  const invoiceUntilToday = useMemo(() => 
    filteredTransactions
      .filter(t => !isAfter(parseISO(t.date), today) && t.method === 'credit')
      .reduce((acc, t) => acc + t.amount, 0),
  [filteredTransactions, today]);

  const invoiceUntilClosing = useMemo(() => 
    filteredTransactions
      .filter(t => t.method === 'credit')
      .reduce((acc, t) => acc + t.amount, 0),
  [filteredTransactions]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      <Sidebar />
      <MobileNav />
      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          {!selectedCard ? (
            <>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">Meus Cartões</h1>
                <div className="flex items-center gap-2">
                  <AddCreditCardDialog onAdd={addBank} variant="discrete" />
                  <AddTransactionDialog banks={banks} onAdd={addTransaction} variant="discrete" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {creditCards.map(card => (
                  <div key={card.id} className="flex flex-col">
                    <BankCard 
                      bank={card} 
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
                  <AddTransactionDialog banks={banks} onAdd={addTransaction} variant="discrete" />
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
                  
                  <div className="mt-8 flex flex-col md:flex-row md:items-end gap-8">
                    <div>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Fatura até o momento</p>
                      <p className="text-4xl font-black">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoiceUntilToday)}
                      </p>
                    </div>
                    <div className="pb-1">
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Fatura até o Fechamento</p>
                      <p className="text-xl font-black text-rose-400">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoiceUntilClosing)}
                      </p>
                    </div>
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
                onEdit={handleEditRequest} 
                onDelete={handleDeleteRequest}
              />
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

export default CardsPage;