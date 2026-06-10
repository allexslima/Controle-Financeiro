"use client";

import React, { useState } from 'react';
import { Transaction, Bank } from "@/types/finance";
import { ArrowUpCircle, Wallet, CreditCard, Calendar, ArrowLeftRight, Pencil, Trash2, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SwipeableTransactionItem from "./SwipeableTransactionItem";

interface TransactionListProps {
  transactions: Transaction[];
  banks: Bank[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

const TransactionList = ({ transactions, banks, onEdit, onDelete }: TransactionListProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const getBankName = (id: string) => banks.find(b => b.id === id)?.name || "Conta removida";

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'income': return <ArrowUpCircle size={24} className="text-emerald-600" />;
      case 'debit': return <Wallet size={24} className="text-blue-600" />;
      case 'credit': return <CreditCard size={24} className="text-purple-600" />;
      case 'transfer': return <ArrowLeftRight size={24} className="text-orange-500" />;
      default: return <Wallet size={24} />;
    }
  };

  const getMethodBg = (method: string) => {
    switch (method) {
      case 'income': return 'bg-emerald-100 dark:bg-emerald-950/30';
      case 'debit': return 'bg-blue-100 dark:bg-blue-950/30';
      case 'credit': return 'bg-purple-100 dark:bg-purple-950/30';
      case 'transfer': return 'bg-orange-100 dark:bg-orange-950/30';
      default: return 'bg-slate-100 dark:bg-slate-800';
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const search = searchTerm.toLowerCase();
    const descriptionMatch = t.description.toLowerCase().includes(search);
    const amountMatch = t.amount.toString().includes(search);
    const formattedAmountMatch = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount).includes(search);
    return descriptionMatch || amountMatch || formattedAmountMatch;
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg overflow-hidden border border-slate-100 dark:border-slate-800">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 space-y-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Transações</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Buscar por nome ou valor..." 
            className="pl-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="divide-y divide-slate-50 dark:divide-slate-800">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500">
            {searchTerm ? "Nenhuma transação encontrada para sua busca." : "Nenhuma transação registrada ainda."}
          </div>
        ) : (
          filteredTransactions.map((transaction) => (
            <SwipeableTransactionItem 
              key={transaction.id}
              onDelete={() => onDelete(transaction.id)}
              onEdit={() => onEdit(transaction)}
            >
              <div className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-2xl ${getMethodBg(transaction.method)}`}>
                    {getMethodIcon(transaction.method)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{transaction.description}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full capitalize">
                        {transaction.method === 'income' ? 'Receita' : 
                         transaction.method === 'transfer' ? 'Transferência' : 
                         transaction.method}
                      </span>
                      <span>•</span>
                      <span>
                        {transaction.method === 'transfer' 
                          ? `${getBankName(transaction.bankId)} → ${getBankName(transaction.destinationBankId!)}`
                          : getBankName(transaction.bankId)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`font-bold ${
                      transaction.method === 'income' ? 'text-emerald-600' : 
                      transaction.method === 'transfer' ? 'text-orange-500' : 'text-rose-600'
                    }`}>
                      {transaction.method === 'income' ? '+' : 
                       transaction.method === 'transfer' ? '' : '-'} 
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount)}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-end gap-1">
                      <Calendar size={10} />
                      {format(new Date(transaction.date), "dd 'de' MMM", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-primary dark:hover:text-white"
                      onClick={() => onEdit(transaction)}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-destructive"
                      onClick={() => onDelete(transaction.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            </SwipeableTransactionItem>
          ))
        )}
      </div>
    </div>
  );
};

export default TransactionList;