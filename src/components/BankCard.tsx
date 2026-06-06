"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Landmark, CreditCard, Pencil } from "lucide-react";
import { Bank } from "@/types/finance";

interface BankCardProps {
  bank: Bank;
  onRemove: (id: string) => void;
  onEdit: (bank: Bank) => void;
  onClick: (bank: Bank) => void;
}

const BankCard = ({ bank, onRemove, onEdit, onClick }: BankCardProps) => {
  const formattedBalance = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(bank.balance);

  return (
    <Card 
      className="overflow-hidden border-none shadow-lg transition-all hover:shadow-xl bg-white dark:bg-slate-900 cursor-pointer group"
      onClick={() => onClick(bank)}
    >
      <div 
        className="h-2 w-full" 
        style={{ backgroundColor: bank.color }}
      />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-900 dark:text-white">
          {bank.type === 'account' ? (
            <Landmark className="h-4 w-4" style={{ color: bank.color }} />
          ) : (
            <CreditCard className="h-4 w-4" style={{ color: bank.color }} />
          )}
          {bank.name}
        </CardTitle>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(bank);
            }}
            className="text-muted-foreground hover:text-primary transition-colors h-8 w-8"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => {
              e.stopPropagation();
              onRemove(bank.id);
            }}
            className="text-muted-foreground hover:text-destructive transition-colors h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900 dark:text-white">{formattedBalance}</div>
        <div className="flex justify-between items-center mt-1">
          <p className="text-xs text-muted-foreground">
            {bank.type === 'account' ? 'Saldo Atual' : 'Fatura Atual'}
          </p>
          {bank.type === 'credit_card' && bank.closingDay && (
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-400">
              Fecha dia {bank.closingDay}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BankCard;