"use client";

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Bank, Transaction } from "@/types/finance";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUpCircle, Wallet, CreditCard, ArrowLeftRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BankHistorySheetProps {
  bank: Bank | null;
  transactions: Transaction[];
  onClose: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

const BankHistorySheet = ({ bank, transactions, onClose, onEdit, onDelete }: BankHistorySheetProps) => {
  if (!bank) return null;

  const bankTransactions = transactions.filter(
    t => t.bankId === bank.id || t.destinationBankId === bank.id
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Agrupar por mês
  const groupedTransactions = bankTransactions.reduce((acc, transaction) => {
    const month = format(parseISO(transaction.date), "MMMM 'de' yyyy", { locale: ptBR });
    if (!acc[month]) acc[month] = [];
    acc[month].push(transaction);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'income': return <ArrowUpCircle size={18} className="text-emerald-600" />;
      case 'debit': return <Wallet size={18} className="text-blue-600" />;
      case 'credit': return <CreditCard size={18} className="text-purple-600" />;
      case 'transfer': return <ArrowLeftRight size={18} className="text-orange-500" />;
      default: return <Wallet size={18} />;
    }
  };

  return (
    <Sheet open={!!bank} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-3 h-10 rounded-full" style={{ backgroundColor: bank.color }} />
            <div>
              <SheetTitle className="text-2xl font-bold">{bank.name}</SheetTitle>
              <p className="text-sm text-muted-foreground">
                {bank.type === 'account' ? 'Histórico da Conta' : 'Histórico do Cartão'}
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-slate-50 rounded-2xl">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              {bank.type === 'account' ? 'Saldo Atual' : 'Fatura Atual'}
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bank.balance)}
            </p>
          </div>
        </SheetHeader>

        <div className="py-6 space-y-8">
          {Object.keys(groupedTransactions).length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              Nenhuma movimentação encontrada.
            </div>
          ) : (
            Object.entries(groupedTransactions).map(([month, items]) => (
              <div key={month} className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900 capitalize px-1">{month}</h4>
                <div className="space-y-1">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white shadow-sm rounded-lg">
                          {getMethodIcon(item.method)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.description}</p>
                          <p className="text-[10px] text-slate-500">
                            {format(parseISO(item.date), "dd 'de' MMM", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`text-sm font-bold ${
                            item.method === 'income' ? 'text-emerald-600' : 
                            item.method === 'transfer' && item.destinationBankId === bank.id ? 'text-emerald-600' :
                            'text-rose-600'
                          }`}>
                            {item.method === 'income' || (item.method === 'transfer' && item.destinationBankId === bank.id) ? '+' : '-'} 
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-slate-400 hover:text-primary"
                            onClick={() => onEdit(item)}
                          >
                            <Pencil size={12} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-slate-400 hover:text-destructive"
                            onClick={() => onDelete(item.id)}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BankHistorySheet;