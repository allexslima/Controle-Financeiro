"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Wallet, ArrowUpCircle, ArrowLeftRight } from "lucide-react";
import { Bank, Transaction, TransactionMethod } from "@/types/finance";
import { showSuccess, showError } from "@/utils/toast";
import { format, parseISO } from "date-fns";

interface EditTransactionDialogProps {
  transaction: Transaction | null;
  banks: Bank[];
  onUpdate: (transaction: Transaction) => void;
  onClose: () => void;
}

const EditTransactionDialog = ({ transaction, banks, onUpdate, onClose }: EditTransactionDialogProps) => {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<TransactionMethod>("debit");
  const [bankId, setBankId] = useState("");
  const [destinationBankId, setDestinationBankId] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    if (transaction) {
      setDescription(transaction.description);
      setAmount(transaction.amount.toString());
      setMethod(transaction.method);
      setBankId(transaction.bankId);
      setDestinationBankId(transaction.destinationBankId || "");
      setCategory(transaction.category);
      setDate(format(parseISO(transaction.date), "yyyy-MM-dd"));
    }
  }, [transaction]);

  const filteredBanks = banks.filter(bank => {
    if (method === 'credit') return bank.type === 'credit_card';
    return bank.type === 'account';
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction || !description || !amount || !bankId || !date) return;
    
    if (method === 'transfer' && (!destinationBankId || bankId === destinationBankId)) {
      showError("Selecione uma conta de destino diferente da origem.");
      return;
    }

    const updatedTransaction: Transaction = {
      ...transaction,
      description,
      amount: parseFloat(amount),
      method,
      bankId,
      destinationBankId: method === 'transfer' ? destinationBankId : undefined,
      category: category || (method === 'transfer' ? "Transferência" : "Geral"),
      date: new Date(date).toISOString(),
    };

    onUpdate(updatedTransaction);
    showSuccess(`Transação atualizada com sucesso!`);
    onClose();
  };

  const getBankLabel = () => {
    if (method === 'credit') return "Cartão de Crédito";
    if (method === 'transfer') return "Conta de Origem";
    return "Conta Bancária";
  };

  return (
    <Dialog open={!!transaction} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Editar Transação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
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
            <Label htmlFor="edit-description">Descrição</Label>
            <Input
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Valor (R$)</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-date">Data</Label>
              <Input
                id="edit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{getBankLabel()}</Label>
            <Select onValueChange={setBankId} value={bankId} required>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {filteredBanks.map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>{bank.name}</SelectItem>
                ))}
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

          <DialogFooter className="pt-4">
            <Button type="submit" className="w-full rounded-xl py-6 text-lg">Salvar Alterações</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTransactionDialog;