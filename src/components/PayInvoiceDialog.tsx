"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard } from "lucide-react";
import { Bank, Transaction } from "@/types/finance";
import { showSuccess, showError } from "@/utils/toast";
import { format } from "date-fns";

interface PayInvoiceDialogProps {
  card: Bank;
  banks: Bank[];
  onPay: (transaction: Transaction) => void;
}

const PayInvoiceDialog = ({ card, banks, onPay }: PayInvoiceDialogProps) => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(card.balance.toFixed(2));
  const [sourceBankId, setSourceBankId] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const accounts = banks.filter(b => b.type === 'account');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payAmount = parseFloat(amount);
    if (!amount || !sourceBankId || !date) {
      showError("Preencha todos os campos.");
      return;
    }

    const paymentTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      description: `Pagamento de Fatura`,
      amount: payAmount,
      method: 'transfer',
      bankId: sourceBankId,
      destinationBankId: card.id,
      category: "", // Sem categoria conforme solicitado
      date: new Date(date).toISOString(),
      isCompleted: true, // Pagamento de fatura geralmente é imediato
    };

    onPay(paymentTransaction);
    showSuccess(`Pagamento de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payAmount)} registrado!`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full mt-4 gap-2 rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-500 transition-all font-bold">
          <CreditCard className="h-4 w-4" />
          Pagar Fatura
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Pagar Fatura</DialogTitle>
          <p className="text-sm text-muted-foreground">{card.name}</p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pay-amount">Valor do Pagamento (R$)</Label>
            <div className="relative">
              <Input
                id="pay-amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="rounded-xl pr-20"
                required
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                className="absolute right-1 top-1 h-8 text-[10px] font-bold text-primary"
                onClick={() => setAmount(card.balance.toFixed(2))}
              >
                TOTAL
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Pagar com a conta:</Label>
            <Select onValueChange={setSourceBankId} value={sourceBankId} required>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: bank.color }} />
                      {bank.name} (Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bank.balance)})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pay-date">Data do Pagamento</Label>
            <Input
              id="pay-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="submit" className="w-full rounded-xl py-6 text-lg bg-emerald-600 hover:bg-emerald-700">Confirmar Pagamento</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PayInvoiceDialog;