"use client";

import React, { useState, useMemo } from 'react';
import { Transaction, Bank } from "@/types/finance";
import { 
  ArrowUpCircle, 
  Wallet, 
  CreditCard, 
  Calendar, 
  ArrowLeftRight, 
  Pencil, 
  Search, 
  CheckCircle2, 
  Clock,
  Repeat,
  Layers
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SwipeableTransactionItem from "./SwipeableTransactionItem";
import { cn } from "@/lib/utils";

interface TransactionListProps {
  transactions: Transaction[];
  banks: Bank[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

const TransactionList = ({ transactions, banks, onEdit, onDelete }: TransactionListProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const getBank = (id: string) => banks.find(b => b.id === id);
  const getBankName = (id: string) => getBank(id)?.name || "Conta removida";

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'income': return <ArrowUpCircle size={20} className="text-emerald-600" />;
      case 'debit': return <Wallet size={20} className="text-blue-600" />;
      case 'credit': return <CreditCard size={20} className="text-purple-600" />;
      case 'transfer': return <ArrowLeftRight size={20} className="text-orange-500" />;
      case 'investment_apply': return <ArrowLeftRight size={20} className="text-sky-600" />;
      case 'investment_redeem': return <ArrowLeftRight size={20} className="text-amber-600" />;
      default: return <Wallet size={20} />;
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const search = searchTerm.toLowerCase();
    return t.description.toLowerCase().includes(search) || 
           t.amount.toString().includes(search);
  });

  const splitTransactions = useMemo(() => {
    const completed = filteredTransactions.filter(t => t.isCompleted === true);
    const pending = filteredTransactions.filter(t => t.isCompleted !== true);
    return { completed, pending };
  }, [filteredTransactions]);

  const renderItem = (transaction: Transaction, isPending: boolean) => {
    const destBank = transaction.destinationBankId ? getBank(transaction.destinationBankId) : null;
    const isCardPayment = transaction.method === 'transfer' && destBank?.type === 'credit_card';
    
    const isInstallment = transaction.installments && transaction.installments > 1;
    const isRecurring = transaction.isRecurring;
    const hasHighlight = isInstallment || isRecurring;

    // Se for pagamento de fatura e estivermos vendo o cartão, mostrar "Pagamento Recebido"
    const displayDescription = isCardPayment ? "Pagamento Recebido" : transaction.description;

    return (
      <SwipeableTransactionItem 
        key={transaction.id}
        onDelete={() => onDelete(transaction.id)}
        onEdit={() => onEdit(transaction)}
      >
        <div className={cn(
          "p-4 hover:bg-slate-200/50 dark:hover:bg-slate-800/80 transition-all flex items-center justify-between group",
          isPending && "opacity-60 grayscale-[0.5] bg-slate-50/50 dark:bg-slate-900/50",
          hasHighlight && !isPending && "bg-slate-100 dark:bg-slate-800/60"
        )}>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center justify-center min-w-[24px]">
              {isPending ? (
                <Clock size={18} className="text-slate-400" />
              ) : (
                <CheckCircle2 size={18} className="text-emerald-500" />
              )}
            </div>
            <div className={cn("p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm relative")}>
              {getMethodIcon(transaction.method)}
              {isRecurring && (
                <div className="absolute -top-1 -right-1 bg-primary text-white rounded-full p-0.5 border-2 border-white dark:border-slate-800">
                  <Repeat size={8} />
                </div>
              )}
              {isInstallment && !isRecurring && (
                <div className="absolute -top-1 -right-1 bg-slate-500 text-white rounded-full p-0.5 border-2 border-white dark:border-slate-800">
                  <Layers size={8} />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{displayDescription}</p>
                {isRecurring && <span className="text-[8px] font-black uppercase tracking-tighter bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">Recorrente</span>}
                {isInstallment && <span className="text-[8px] font-black uppercase tracking-tighter bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md">Parcelado</span>}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="font-medium">
                  {transaction.method === 'transfer' || transaction.method === 'investment_apply' || transaction.method === 'investment_redeem'
                    ? `${getBankName(transaction.bankId)} → ${getBankName(transaction.destinationBankId!)}`
                    : getBankName(transaction.bankId)}
                </span>
                {transaction.category && (
                  <>
                    <span>•</span>
                    <span>{transaction.category}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className={cn(
                "font-black text-sm",
                transaction.method === 'income' ? 'text-emerald-600' : 
                (transaction.method === 'transfer' || transaction.method === 'investment_redeem') ? 'text-orange-500' : 'text-rose-600'
              )}>
                {transaction.method === 'income' ? '+' : 
                 (transaction.method === 'transfer' || transaction.method === 'investment_redeem' || transaction.method === 'investment_apply') ? '' : '-'} 
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
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden border border-slate-100 dark:border-slate-800">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Buscar transação..." 
            className="pl-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none focus-visible:ring-primary"
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
            {splitTransactions.pending.length > 0 && (
              <div className="bg-slate-50/30 dark:bg-slate-800/30 px-6 py-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Não Efetivadas (Futuras)</span>
              </div>
            )}
            {splitTransactions.pending.map(t => renderItem(t, true))}

            {splitTransactions.completed.length > 0 && (
              <div className="bg-slate-50/30 dark:bg-slate-800/30 px-6 py-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Efetivadas</span>
              </div>
            )}
            {splitTransactions.completed.map(t => renderItem(t, false))}
          </>
        )}
      </div>
    </div>
  );
};

export default TransactionList;