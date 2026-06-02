"use client";

import React from 'react';
import { Transaction, Bank } from "@/types/finance";
import { ArrowUpCircle, Wallet, CreditCard, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TransactionListProps {
  transactions: Transaction[];
  banks: Bank[];
}

const TransactionList = ({ transactions, banks }: TransactionListProps) => {
  const getBankName = (id: string) => banks.find(b => b.id === id)?.name || "Conta removida";

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'income': return <ArrowUpCircle size={24} className="text-emerald-600" />;
      case 'debit': return <Wallet size={24} className="text-blue-600" />;
      case 'credit': return <CreditCard size={24} className="text-purple-600" />;
      default: return <Wallet size={24} />;
    }
  };

  const getMethodBg = (method: string) => {
    switch (method) {
      case 'income': return 'bg-emerald-100';
      case 'debit': return 'bg-blue-100';
      case 'credit': return 'bg-purple-100';
      default: return 'bg-slate-100';
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <h3 className="text-lg font-bold text-slate-800">Transações Recentes</h3>
      </div>
      <div className="divide-y divide-slate-50">
        {transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            Nenhuma transação registrada ainda.
          </div>
        ) : (
          transactions.map((transaction) => (
            <div key={transaction.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-2xl ${getMethodBg(transaction.method)}`}>
                  {getMethodIcon(transaction.method)}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{transaction.description}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="bg-slate-100 px-2 py-0.5 rounded-full capitalize">{transaction.method === 'income' ? 'Receita' : transaction.method}</span>
                    <span>•</span>
                    <span>{getBankName(transaction.bankId)}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold ${transaction.method === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {transaction.method === 'income' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount)}
                </p>
                <p className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                  <Calendar size={10} />
                  {format(new Date(transaction.date), "dd 'de' MMM", { locale: ptBR })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TransactionList;