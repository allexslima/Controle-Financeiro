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
import { CreditCard, PlusCircle, Plus } from "lucide-react";
import { Bank } from "@/types/finance";
import { showSuccess } from "@/utils/toast";

interface AddCreditCardDialogProps {
  onAdd: (bank: Bank) => void;
  variant?: 'default' | 'discrete';
}

const AddCreditCardDialog = ({ onAdd, variant = 'default' }: AddCreditCardDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [color, setColor] = useState("#8a05be");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !balance || !closingDay) return;

    const newCard: Bank = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      balance: parseFloat(balance),
      color,
      type: 'credit_card',
      closingDay: parseInt(closingDay),
    };

    onAdd(newCard);
    showSuccess(`Cartão de crédito adicionado com sucesso!`);
    setName("");
    setBalance("");
    setClosingDay("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === 'default' ? (
          <Button variant="outline" className="gap-2 border-purple-600 text-purple-600 hover:bg-purple-50 rounded-full px-6">
            <CreditCard className="h-4 w-4" />
            Novo Cartão
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-2 rounded-full border-slate-200 text-slate-600 hover:text-primary hover:border-primary transition-all h-9 px-4">
            <Plus className="h-4 w-4" />
            <span className="text-xs font-bold">Novo Cartão</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Novo Cartão de Crédito</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Cartão</Label>
            <Input
              id="name"
              placeholder="Ex: Nubank Ultravioleta, XP Visa..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="balance">Limite Utilizado (R$)</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="closingDay">Dia de Fechamento da Fatura</Label>
            <Input
              id="closingDay"
              type="number"
              min="1"
              max="31"
              placeholder="Ex: 10"
              value={closingDay}
              onChange={(e) => setClosingDay(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Cor do Cartão</Label>
            <div className="flex gap-3 items-center">
              <Input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-12 p-1 rounded-lg cursor-pointer"
              />
              <span className="text-sm text-muted-foreground">Identificação visual</span>
            </div>
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="submit" className="w-full rounded-xl py-6 text-lg bg-purple-600 hover:bg-purple-700">Salvar Cartão</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCreditCardDialog;