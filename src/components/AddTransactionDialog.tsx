"use client";

import React, { useState, useEffect } from 'react';
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
import { PlusCircle, CreditCard, Wallet, ArrowUpCircle, ArrowLeftRight } from "lucide-react";
import { Bank, Transaction, TransactionMethod } from "@/types/finance";
import { showSuccess, showError } from "@/utils/toast";

interface AddTransactionDialogProps {
  banks: Bank[];
  onAdd: (transaction: Transaction) => void;
}

const AddTransactionDialog = ({ banks, onAdd }: AddTransactionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<TransactionMethod>("debit");
  const [bankId, setBankId] = useState("");
  const [destinationBankId, setDestinationBankId] = useState("");
  const [category, setCategory] = useState("");

  // Filtra os bancos disponíveis com base no método selecionado
  const filteredBanks = banks.filter(bank => {
    if (method === 'credit') return bank.type === 'credit_card';
    return bank.type === 'account';
  });

  // Limpa a seleção se o banco atual não estiver na lista filtrada ao mudar o método
  useEffect(() => {
    if (bankId && !filteredBanks.find(b => b.id === bankId)) {
      setBankId("");
    }
  }, [method, filteredBanks, bankId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !bankId) return;
    
    if (method === 'transfer' && (!destinationBankId || bankId === destinationBankId)) {
      showError("Selecione uma conta de destino diferente da origem.");
      return;
    }

    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      description: method === 'transfer' ? `Transferência: ${description}` : description,
      amount: parseFloat(amount),
      method,
      bankId,
      destinationBankId: method === 'transfer' ? destinationBankId : undefined,
      category: category || (method === 'transfer' ? "Transferência" : "Geral"),
      date: new Date().toISOString(),
    };

    onAdd(newTransaction);
    showSuccess(`Operação registrada com sucesso!`);
    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setBankId("");
    setDestinationBankId("");
    setCategory("");
    setMethod("debit");
  };

  const getBankLabel = () => {
    if (method === 'credit') return "Cartão de Crédito";
    if (method === 'transfer') return "Conta de Origem";
    return "Conta Bancária";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 rounded-full px-6 border-primary text-primary hover:bg-primary/5">
          <PlusCircle className="h-4 w-4" />
          Nova Transação
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Nova Movimentação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl">
            {[
              { id: 'income', label: 'Receita', icon: ArrowUpCircle, color: 'bg-emerald-600' },
              { id: 'debit', label: 'Débito', icon: Wallet, color: 'bg-blue-600' },
              { id: 'credit', label: 'Crédito', icon: CreditCard, color: 'bg-purple-600' },
              { id: 'transfer', label: 'Transf.', icon: ArrowLeftRight, color: 'bg-orange-500' },
            ].map((item) => (
              <Button
                key={item.id}
                type="button"
                variant={method === item.id ? 'default' : 'ghost'}
                className={`rounded-lg flex-col py-6 h-auto gap-1 px-1 ${method === item.id ? item.color : ''}`}
                onClick={() => setMethod(item.id as TransactionMethod)}
              >
                <item.icon className="h-4 w-4" />
                <span className="text-[9px]">{item.label}</span>
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Ex: Aluguel, Pix, Transferência..."
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

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label>{getBankLabel()}</Label>
              <Select onValueChange={setBankId} value={bankId} required>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={`Selecione ${method === 'credit' ? 'o cartão' : 'a conta'}`} />
                </SelectTrigger>
                <SelectContent>
                  {filteredBanks.length === 0 ? (
                    <div className="p-2 text-xs text-center text-muted-foreground">
                      Nenhum(a) {method === 'credit' ? 'cartão' : 'conta'} cadastrado(a).
                    </div>
                  ) : (
                    filteredBanks.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {method === 'transfer' && (
              <div className="space-y-2">
                <Label>Conta de Destino</Label>
                <Select onValueChange={setDestinationBankId} value={destinationBankId} required>
                  <SelectTrigger className="rounded-xl border-orange-200 bg-orange-50/30">
                    <SelectValue placeholder="Selecione o destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.filter(b => b.type === 'account').map((bank) => (
                      <SelectItem key={bank.id} value={bank.id} disabled={bank.id === bankId}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {method !== 'transfer' && (
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
          )}

          <DialogFooter className="pt-4">
            <Button type="submit" className="w-full rounded-xl py-6 text-lg">Confirmar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionDialog;