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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, CreditCard, Landmark } from "lucide-react";
import { Bank, BankType } from "@/types/finance";
import { showSuccess } from "@/utils/toast";

interface AddBankDialogProps {
  onAdd: (bank: Bank) => void;
}

const AddBankDialog = ({ onAdd }: AddBankDialogProps) => {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<BankType>("account");
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [color, setColor] = useState("#3b82f6");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !balance) return;

    const newBank: Bank = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      balance: parseFloat(balance),
      color,
      type,
      closingDay: type === 'credit_card' ? parseInt(closingDay) : undefined,
    };

    onAdd(newBank);
    showSuccess(`${type === 'account' ? 'Conta' : 'Cartão'} adicionado com sucesso!`);
    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setName("");
    setBalance("");
    setClosingDay("");
    setType("account");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary hover:bg-primary/90 text-white rounded-full px-6">
          <PlusCircle className="h-4 w-4" />
          Adicionar Conta/Cartão
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Nova Conta ou Cartão</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="account" className="w-full" onValueChange={(v) => setType(v as BankType)}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="account" className="gap-2">
              <Landmark className="h-4 w-4" /> Conta
            </TabsTrigger>
            <TabsTrigger value="credit_card" className="gap-2">
              <CreditCard className="h-4 w-4" /> Cartão
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do {type === 'account' ? 'Banco' : 'Cartão'}</Label>
            <Input
              id="name"
              placeholder={type === 'account' ? "Ex: Nubank, Itaú..." : "Ex: Visa Infinite, Black..."}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="balance">
              {type === 'account' ? 'Saldo Inicial (R$)' : 'Limite Utilizado (R$)'}
            </Label>
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

          {type === 'credit_card' && (
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
          )}

          <div className="space-y-2">
            <Label htmlFor="color">Cor de Identificação</Label>
            <div className="flex gap-3 items-center">
              <Input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-12 p-1 rounded-lg cursor-pointer"
              />
              <span className="text-sm text-muted-foreground">Escolha uma cor para o cartão</span>
            </div>
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="submit" className="w-full rounded-xl py-6 text-lg">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddBankDialog;