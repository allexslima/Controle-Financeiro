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
import { PlusCircle } from "lucide-react";
import { Bank } from "@/src/types/finance";
import { showSuccess } from "@/src/utils/toast";

interface AddBankDialogProps {
  onAdd: (bank: Bank) => void;
}

const AddBankDialog = ({ onAdd }: AddBankDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [color, setColor] = useState("#3b82f6");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !balance) return;

    const newBank: Bank = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      balance: parseFloat(balance),
      color,
    };

    onAdd(newBank);
    showSuccess(`${name} adicionado com sucesso!`);
    setName("");
    setBalance("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary hover:bg-primary/90 text-white rounded-full px-6">
          <PlusCircle className="h-4 w-4" />
          Adicionar Banco
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Novo Banco</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Banco</Label>
            <Input
              id="name"
              placeholder="Ex: Nubank, Itaú..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="balance">Saldo Inicial (R$)</Label>
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
          <DialogFooter>
            <Button type="submit" className="w-full rounded-xl py-6 text-lg">Salvar Banco</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddBankDialog;