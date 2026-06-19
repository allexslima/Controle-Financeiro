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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Plus, CreditCard, Wallet, ArrowUpCircle, ArrowLeftRight, Repeat, CheckCircle2 } from "lucide-react";
import { Bank, Transaction, TransactionMethod } from "@/types/finance";
import { showSuccess, showError } from "@/utils/toast";
import { format, isAfter, startOfDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import CategorySelector from "./CategorySelector";

interface AddTransactionDialogProps {
  banks: Bank[];
  onAdd: (transaction: Transaction) => void;
  variant?: 'default' | 'discrete';
}

const AddTransactionDialog = ({ banks, onAdd, variant = 'default' }: AddTransactionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<TransactionMethod>("debit");
  const [bankId, setBankId] = useState("");
  const [destinationBankId, setDestinationBankId] = useState("");
  const [categoryId, setCategoryId] = useState("cat-7"); // Default Geral
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [installments, setInstallments] = useState("1");
  const [isRecurring, setIsRecurring] = useState(false);
  const [isCompleted, setIsCompleted] = useState(true);
  
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const today = startOfDay(new Date());

  const filteredBanks = banks.filter(bank => {
    if (method === 'credit') return bank.type === 'credit_card';
    return bank.type === 'account';
  });

  useEffect(() => {
    const selectedDate = parseISO(date);
    setIsCompleted(!isAfter(selectedDate, today));
  }, [date]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, boolean> = {};
    if (!description) newErrors.description = true;
    if (!amount) newErrors.amount = true;
    if (!bankId) newErrors.bankId = true;
    if (!date) newErrors.date = true;
    if (!categoryId) newErrors.categoryId = true;
    if (method === 'transfer' && !destinationBankId) newErrors.destinationBankId = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const [year, month, day] = date.split('-').map(Number);
    const localDate = new Date(year, month - 1, day, 12, 0, 0);

    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      description: method === 'transfer' ? `Transferência: ${description}` : description,
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
    setCategoryId("cat-7");
    setMethod("debit");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setInstallments("1");
    setIsRecurring(false);
    setIsCompleted(true);
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) resetForm(); }}>
      <DialogTrigger asChild>
        {variant === 'default' ? (
          <Button className="rounded-full px-8 py-6 text-base font-bold bg-[#1e293b] hover:bg-[#0f172a] text-white shadow-xl transition-all hover:scale-105">
            Nova Transação
          </Button>
        ) : (
          <Button className="h-16 w-16 rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center p-0 bg-primary text-white hover:scale-110 transition-transform">
            <Plus className="h-10 w-10" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] rounded-[2rem] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Nova Movimentação</DialogTitle>
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
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              placeholder="Ex: Aluguel, Pix, Supermercado..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={cn("rounded-xl", errors.description && "border-destructive")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={cn("rounded-xl", errors.amount && "border-destructive")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={cn("rounded-xl", errors.date && "border-destructive")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Categoria *</Label>
            <CategorySelector 
              value={categoryId} 
              onChange={setCategoryId} 
              error={errors.categoryId}
            />
          </div>

          <div className="space-y-2">
            <Label>{method === 'credit' ? 'Cartão de Crédito *' : 'Conta Bancária *'}</Label>
            <Select onValueChange={setBankId} value={bankId}>
              <SelectTrigger className={cn("rounded-xl", errors.bankId && "border-destructive")}>
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
              <Label>Conta de Destino *</Label>
              <Select onValueChange={setDestinationBankId} value={destinationBankId}>
                <SelectTrigger className={cn("rounded-xl border-orange-200 bg-orange-50/30", errors.destinationBankId && "border-destructive")}>
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

          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            {(method === 'credit' || method === 'debit') && (
              <div className="space-y-2">
                <Label htmlFor="installments">Número de Parcelas</Label>
                <Input
                  id="installments"
                  type="number"
                  min="1"
                  max="48"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            )}
            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">
              <Checkbox 
                id="recurring" 
                checked={isRecurring} 
                onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="recurring"
                  className="text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                >
                  <Repeat size={14} className="text-primary" />
                  Transação Recorrente
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="submit" className="w-full rounded-xl py-6 text-lg">Confirmar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionDialog;