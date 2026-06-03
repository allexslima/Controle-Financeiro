"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Landmark, CreditCard } from "lucide-react";
import { Bank } from "@/types/finance";

interface BankCardProps {
  bank: Bank;
  onRemove: (id: string) => void;
  onClick: (bank: Bank) => void;
}

const BankCard = ({ bank, onRemove, onClick }: BankCardProps) => {
  const formattedBalance = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(bank.balance);

  return (
    <Card 
      className="overflow-hidden border-none shadow-lg transition-all hover:shadow-xl bg-white cursor-pointer group"
      onClick={() => onClick(bank)}
    >
      <div 
        className="h-2 w-full" 
        style={{ backgroundColor: bank.color }}
      />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {bank.type === 'account' ? (
            <Landmark className="h-4 w-4" style={{ color: bank.color }} />
          ) : (
            <CreditCard className="h-4 w-4" style={{ color: bank.color }} />
          )}
          {bank.name}
        </CardTitle>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={(e) => {
            e.stopPropagation();
            onRemove(bank.id);
          }}
          className="text-muted-foreground hover:text-destructive transition-colors h-8 w-8 opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedBalance}</div>
        <div className="flex justify-between items-center mt-1">
          <p className="text-xs text-muted-foreground">
            {bank.type === 'account' ? 'Saldo Atual' : 'Fatura Atual'}
          </p>
          {bank.type === 'credit_card' && bank.closingDay && (
            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">
              Fecha dia {bank.closingDay}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BankCard;