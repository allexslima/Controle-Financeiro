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
import { PlusCircle, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Bank, Transaction, TransactionType } from "@/types/finance";
import { showSuccess } from "@/utils/toast";

interface AddTransactionDialogProps {
  banks: Bank[];
  onAdd: (transaction: Transaction) => void;
}

const AddTransactionDialog = ({ banks, onAdd }: AddTransactionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [bankId, setBankId] = useState("");
  const [category, setCategory] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !bankId) return;

    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      description,
      amount: parseFloat(amount),
      type,
      bankId,
      category: category || "Geral",
      date: new Date().toISOString(),
    };

    onAdd(newTransaction);
    showSuccess(`Transação registrada com sucesso!`);
    setDescription("");
    setAmount("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 rounded-full px-6 border-primary text-primary hover:bg-primary/5">
          <PlusCircle className="h-4 w-4" />
          Nova Transação
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Nova Transação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
            <Button
              type="button"
              variant={type === 'income' ? 'default' : 'ghost'}
              className={`flex-1 rounded-lg gap-2 ${type === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
              onClick={() => setType('income')}
            >
              <ArrowUpCircle className="h-4 w-4" /> Receita
            </Button>
            <Button
              type="button"
              variant={type === 'expense' ? 'default' : 'ghost'}
              className={`flex-1 rounded-lg gap-2 ${type === 'expense' ? 'bg-rose-600 hover:bg-rose-700' : ''}`}
              onClick={() => setType('expense')}
            >
              <ArrowDownCircle className="h-4 w-4" /> Despesa
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Ex: Aluguel, Salário..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Conta Bancária</Label>
            <Select onValueChange={setBankId} required>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {banks.map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Input
              id="category"
              placeholder="Ex: Alimentação, Lazer..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="submit" className="w-full rounded-xl py-6 text-lg">Registrar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionDialog;