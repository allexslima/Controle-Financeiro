"use client";

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Plus, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewTransactionDialogProps {
  children?: React.ReactNode;
}

const NewTransactionDialog = ({ children }: NewTransactionDialogProps) => {
  const [type, setType] = React.useState<'income' | 'expense'>('expense');

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button className="bg-blue-600 hover:bg-blue-700 rounded-xl gap-2">
            <Plus className="w-4 h-4" />
            Nova Transação
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">Nova Transação</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="flex p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setType('expense')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all",
                type === 'expense' ? "bg-white text-rose-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <ArrowDownCircle className="w-4 h-4" />
              Despesa
            </button>
            <button
              onClick={() => setType('income')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all",
                type === 'income' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <ArrowUpCircle className="w-4 h-4" />
              Receita
            </button>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amount" className="text-sm font-medium text-gray-700">Valor</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">R$</span>
              <Input 
                id="amount" 
                placeholder="0,00" 
                className="pl-10 h-12 rounded-xl border-gray-200 focus:ring-blue-500 text-lg font-bold" 
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">Descrição</Label>
            <Input id="description" placeholder="Ex: Aluguel, Salário..." className="h-12 rounded-xl border-gray-200" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-gray-700">Categoria</Label>
              <Select>
                <SelectTrigger className="h-12 rounded-xl border-gray-200">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="food">Alimentação</SelectItem>
                  <SelectItem value="housing">Moradia</SelectItem>
                  <SelectItem value="transport">Transporte</SelectItem>
                  <SelectItem value="leisure">Lazer</SelectItem>
                  <SelectItem value="salary">Salário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-gray-700">Conta</Label>
              <Select>
                <SelectTrigger className="h-12 rounded-xl border-gray-200">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nubank">Nubank</SelectItem>
                  <SelectItem value="bb">Banco do Brasil</SelectItem>
                  <SelectItem value="wallet">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button className={cn(
            "w-full h-12 rounded-xl text-white font-bold transition-all",
            type === 'expense' ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-500 hover:bg-emerald-600"
          )}>
            Salvar Transação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewTransactionDialog;