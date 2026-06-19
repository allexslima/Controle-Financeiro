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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Wallet, ArrowUpCircle, ArrowLeftRight, Repeat, CheckCircle2 } from "lucide-react";
import { Bank, Transaction, TransactionMethod } from "@/types/finance";
import { showSuccess, showError } from "@/utils/toast";
import { format, parseISO, isAfter, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import CategorySelector from "./CategorySelector";

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
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState("");
  const [installments, setInstallments] = useState("1");
  const [isRecurring, setIsRecurring] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (transaction) {
      setDescription(transaction.description);
      setAmount(transaction.amount.toString());
      setMethod(transaction.method);
      setBankId(transaction.bankId);
      setDestinationBankId(transaction.destinationBankId || "");
      setCategoryId(transaction.category);
      setDate(format(parseISO(transaction.date), "yyyy-MM-dd"));
      setInstallments(transaction.installments?.toString() || "1");
      setIsRecurring(transaction.isRecurring || false);
      setIsCompleted(transaction.isCompleted || false);
    }
  }, [transaction]);

  const filteredBanks = banks.filter(bank => {
    if (method === 'credit') return bank.type === 'credit_card';
    return bank.type === 'account';
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction || !description || !amount || !bankId || !date) return;
    
    const [year, month, day] = date.split('-').map(Number);
    const localDate = new Date(year, month - 1, day, 12, 0, 0);

    const updatedTransaction: Transaction = {
      ...transaction,
      description,
      amount: parseFloat(amount),
      method,
      bankId,
      destinationBankId: method === 'transfer' ? destinationBankId : undefined,
      category: categoryId,
      date: localDate.toISOString(),
      installments: (method === 'credit' || method === 'debit') ? parseInt(installments) : undefined,
      isRecurring: isRecurring,
      isCompleted: isCompleted,
    };

    onUpdate(updatedTransaction);
    showSuccess(`Transação atualizada!`);
    onClose();
  };

  return (
    <Dialog open={!!transaction} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Editar Transação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", isCompleted ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500")}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Transação Efetivada?</p>
                <p className="text-[10px] text-slate-500">Define se o valor já saiu/entrou na conta</p>
              </div>
            </div>
            <Switch 
              checked={isCompleted} 
              onCheckedChange={setIsCompleted}
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>

          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
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
                className={`rounded-xl flex-col py-6 h-auto gap-1 px-1 ${method === item.id ? item.color : ''}`}
                onClick={() => setMethod(item.id as TransactionMethod)}
              >
                <item.icon className="h-4 w-4" />
                <span className="text-[9px] font-bold">{item.label}</span>
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">Descrição</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-2xl h-12 bg-slate-50 dark:bg-slate-900 border-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="rounded-2xl h-12 bg-slate-50 dark:bg-slate-900 border-none"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">Data</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-2xl h-12 bg-slate-50 dark:bg-slate-900 border-none"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">Categoria</Label>
            <CategorySelector value={categoryId} onChange={setCategoryId} />
          </div>

          <div className="space-y-2">
            <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">{method === 'credit' ? 'Cartão de Crédito' : 'Conta Bancária'}</Label>
            <Select onValueChange={setBankId} value={bankId} required>
              <SelectTrigger className="rounded-2xl h-12 bg-slate-50 dark:bg-slate-900 border-none">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {filteredBanks.map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>{bank.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {method === 'transfer' && (
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">Conta de Destino</Label>
              <Select onValueChange={setDestinationBankId} value={destinationBankId} required>
                <SelectTrigger className="rounded-2xl h-12 bg-orange-50/30 dark:bg-orange-950/10 border-orange-100 dark:border-orange-900/30">
                  <SelectValue placeholder="Selecione o destino" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {banks.filter(b => b.type === 'account').map((bank) => (
                    <SelectItem key={bank.id} value={bank.id} disabled={bank.id === bankId}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            {(method === 'credit' || method === 'debit') && (
              <div className="space-y-2">
                <Label htmlFor="edit-installments">Número de Parcelas</Label>
                <Input
                  id="edit-installments"
                  type="number"
                  min="1"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            )}
            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl">
              <Checkbox 
                id="edit-recurring" 
                checked={isRecurring} 
                onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="edit-recurring"
                  className="text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                >
                  <Repeat size={14} className="text-primary" />
                  Transação Recorrente
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="submit" className="w-full rounded-2xl py-6 text-lg font-black">Salvar Alterações</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTransactionDialog;