"use client";

import React, { useState, useMemo } from 'react';
import { Transaction, Bank } from "@/types/finance";
import { ArrowUpCircle, Wallet, CreditCard, Calendar, ArrowLeftRight, Pencil, Search, CheckCircle2, Clock, GripVertical } from "lucide-react";
import { format, isAfter, startOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SwipeableTransactionItem from "./SwipeableTransactionItem";
import { cn } from "@/lib/utils";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useFinance } from "@/context/FinanceContext";

interface TransactionListProps {
  transactions: Transaction[];
  banks: Bank[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

const TransactionList = ({ transactions, banks, onEdit, onDelete }: TransactionListProps) => {
  const { reorderTransactions } = useFinance();
  const [searchTerm, setSearchTerm] = useState("");
  const today = startOfDay(new Date());

  const getBankName = (id: string) => banks.find(b => b.id === id)?.name || "Conta removida";

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'income': return <ArrowUpCircle size={20} className="text-emerald-600" />;
      case 'debit': return <Wallet size={20} className="text-blue-600" />;
      case 'credit': return <CreditCard size={20} className="text-purple-600" />;
      case 'transfer': return <ArrowLeftRight size={20} className="text-orange-500" />;
      default: return <Wallet size={20} />;
    }
  };

  // Filtra e ordena: Primeiro por data (DESC), depois pela ordem manual (ASC)
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        const search = searchTerm.toLowerCase();
        return t.description.toLowerCase().includes(search) || 
               t.amount.toString().includes(search);
      })
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return (a.order || 0) - (b.order || 0);
      });
  }, [transactions, searchTerm]);

  const splitTransactions = useMemo(() => {
    const completed = filteredTransactions.filter(t => t.isCompleted);
    const pending = filteredTransactions.filter(t => !t.isCompleted);
    return { completed, pending };
  }, [filteredTransactions]);

  const onDragEnd = (result: DropResult, listType: 'completed' | 'pending') => {
    if (!result.destination) return;

    const items = Array.from(listType === 'completed' ? splitTransactions.completed : splitTransactions.pending);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Atualiza o campo 'order' de todos os itens na lista afetada
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index
    }));

    reorderTransactions(updatedItems);
  };

  const renderItem = (transaction: Transaction, index: number, isPending: boolean) => (
    <Draggable key={transaction.id} draggableId={transaction.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "transition-shadow",
            snapshot.isDragging && "shadow-2xl z-50"
          )}
        >
          <SwipeableTransactionItem 
            onDelete={() => onDelete(transaction.id)}
            onEdit={() => onEdit(transaction)}
          >
            <div className={cn(
              "p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all flex items-center justify-between group",
              isPending && "opacity-60 grayscale-[0.5] bg-slate-50/50 dark:bg-slate-900/50",
              snapshot.isDragging && "bg-slate-100 dark:bg-slate-800"
            )}>
              <div className="flex items-center gap-4">
                <div {...provided.dragHandleProps} className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing p-1">
                  <GripVertical size={18} />
                </div>
                <div className="flex flex-col items-center justify-center min-w-[24px]">
                  {isPending ? (
                    <Clock size={18} className="text-slate-400" />
                  ) : (
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  )}
                </div>
                <div className={cn("p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm")}>
                  {getMethodIcon(transaction.method)}
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{transaction.description}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                    <span className="font-medium">
                      {transaction.method === 'transfer' 
                        ? `${getBankName(transaction.bankId)} → ${getBankName(transaction.destinationBankId!)}`
                        : getBankName(transaction.bankId)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className={cn(
                    "font-black text-sm",
                    transaction.method === 'income' ? 'text-emerald-600' : 
                    transaction.method === 'transfer' ? 'text-orange-500' : 'text-rose-600'
                  )}>
                    {transaction.method === 'income' ? '+' : 
                     transaction.method === 'transfer' ? '' : '-'} 
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount)}
                  </p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 flex items-center justify-end gap-1 font-medium">
                    <Calendar size={10} />
                    {format(parseISO(transaction.date), "dd 'de' MMM", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-slate-400 hover:text-primary"
                    onClick={() => onEdit(transaction)}
                  >
                    <Pencil size={14} />
                  </Button>
                </div>
              </div>
            </div>
          </SwipeableTransactionItem>
        </div>
      )}
    </Draggable>
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden border border-slate-100 dark:border-slate-800">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Buscar transação..." 
            className="pl-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus-visible:ring-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="divide-y divide-slate-50 dark:divide-slate-800">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 font-medium">
            Nenhuma transação encontrada.
          </div>
        ) : (
          <>
            {splitTransactions.completed.length > 0 && (
              <div className="bg-slate-50/30 dark:bg-slate-800/30 px-6 py-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Efetivadas</span>
              </div>
            )}
            <DragDropContext onDragEnd={(res) => onDragEnd(res, 'completed')}>
              <Droppable droppableId="completed-list">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    {splitTransactions.completed.map((t, index) => renderItem(t, index, false))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {splitTransactions.pending.length > 0 && (
              <div className="bg-slate-50/30 dark:bg-slate-800/30 px-6 py-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Não Efetivadas (Futuras)</span>
              </div>
            )}
            <DragDropContext onDragEnd={(res) => onDragEnd(res, 'pending')}>
              <Droppable droppableId="pending-list">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    {splitTransactions.pending.map((t, index) => renderItem(t, index, true))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </>
        )}
      </div>
    </div>
  );
};

export default TransactionList;