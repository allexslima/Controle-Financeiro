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
import { Bank } from "@/types/finance";

interface EditBankDialogProps {
  bank: Bank | null;
  onUpdate: (bank: Bank) => void;
  onClose: () => void;
}

const EditBankDialog = ({ bank, onUpdate, onClose }: EditBankDialogProps) => {
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [color, setColor] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [yieldType, setYieldType] = useState<'pre' | 'cdi'>("pre");
  const [yieldRate, setYieldRate] = useState("");
  const [yieldAmount, setYieldAmount] = useState("");

  useEffect(() => {
    if (bank) {
      setName(bank.name);
      setBalance(bank.balance.toString());
      setColor(bank.color);
      setClosingDay(bank.closingDay?.toString() || "");
      setYieldType(bank.yieldType || "pre");
      setYieldRate(bank.yieldRate?.toString() || "");
      setYieldAmount(bank.yieldAmount?.toString() || "");
    }
  }, [bank]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bank || !name || !balance) return;

    const updatedBank: Bank = {
      ...bank,
      name,
      balance: parseFloat(balance),
      color,
      closingDay: bank.type === 'credit_card' ? parseInt(closingDay) : undefined,
      yieldType: bank.type === 'investment' ? yieldType : undefined,
      yieldRate: bank.type === 'investment' && yieldRate ? parseFloat(yieldRate) : undefined,
      yieldAmount: bank.type === 'investment' && yieldAmount ? parseFloat(yieldAmount) : undefined,
    };

    onUpdate(updatedBank);
    onClose();
  };

  return (
    <Dialog open={!!bank} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Editar {bank?.type === 'account' ? 'Conta' : bank?.type === 'credit_card' ? 'Cartão' : 'Investimento'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-bank-name">Nome</Label>
            <Input
              id="edit-bank-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-bank-balance">
              {bank?.type === 'account' ? 'Saldo Atual (R$)' : bank?.type === 'credit_card' ? 'Limite Utilizado (R$)' : 'Valor Aplicado (R$)'}
            </Label>
            <Input
              id="edit-bank-balance"
              type="number"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>

          {bank?.type === 'credit_card' && (
            <div className="space-y-2">
              <Label htmlFor="edit-bank-closing">Dia de Fechamento</Label>
              <Input
                id="edit-bank-closing"
                type="number"
                min="1"
                max="31"
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>
          )}

          {bank?.type === 'investment' && (
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label>Tipo de Rendimento</Label>
                <Select onValueChange={(val) => setYieldType(val as 'pre' | 'cdi')} value={yieldType}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre">Pré-fixado (% a.a.)</SelectItem>
                    <SelectItem value="cdi">Pós-fixado (% CDI)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-bank-yield-rate">
                    {yieldType === 'pre' ? 'Taxa (% a.a.)' : 'Percentual (% CDI)'}
                  </Label>
                  <Input
                    id="edit-bank-yield-rate"
                    type="number"
                    step="0.01"
                    placeholder={yieldType === 'pre' ? "Ex: 12.5" : "Ex: 100"}
                    value={yieldRate}
                    onChange={(e) => setYieldRate(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bank-yield-amount">Rendimento Acumulado (R$)</Label>
                  <Input
                    id="edit-bank-yield-amount"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 150.00"
                    value={yieldAmount}
                    onChange={(e) => setYieldAmount(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-bank-color">Cor</Label>
            <div className="flex gap-3 items-center">
              <Input
                id="edit-bank-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-12 p-1 rounded-lg cursor-pointer"
              />
              <span className="text-sm text-muted-foreground">Identificação visual</span>
            </div>
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="submit" className="w-full rounded-xl py-6 text-lg">Salvar Alterações</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditBankDialog;