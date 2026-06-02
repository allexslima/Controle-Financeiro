"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Landmark } from "lucide-react";
import { Bank } from "@/src/types/finance";

interface BankCardProps {
  bank: Bank;
  onRemove: (id: string) => void;
}

const BankCard = ({ bank, onRemove }: BankCardProps) => {
  const formattedBalance = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(bank.balance);

  return (
    <Card className="overflow-hidden border-none shadow-lg transition-all hover:shadow-xl">
      <div 
        className="h-2 w-full" 
        style={{ backgroundColor: bank.color }}
      />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Landmark className="h-4 w-4" style={{ color: bank.color }} />
          {bank.name}
        </CardTitle>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onRemove(bank.id)}
          className="text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedBalance}</div>
        <p className="text-xs text-muted-foreground mt-1">Saldo Atual</p>
      </CardContent>
    </Card>
  );
};

export default BankCard;