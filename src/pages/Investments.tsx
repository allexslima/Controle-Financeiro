"use client";

import React, { useState, useMemo } from 'react';
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import { useFinance } from "@/context/FinanceContext";
import { Bank, Transaction } from "@/types/finance";
import { 
  TrendingUp, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  PieChart as PieIcon,
  Wallet,
  ChevronRight,
  Landmark
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showSuccess } from "@/utils/toast";

const InvestmentsPage = () => {
  const { banks, transactions, addBank, addTransaction } = useFinance();
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  
  // Estados para nova conta de investimento
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("CDB");
  const [newBalance, setNewBalance] = useState("");
  const [newColor, setNewColor] = useState("#0ea5e9");

  const investmentBanks = banks.filter(b => b.type === 'investment');
  const totalInvested = investmentBanks.reduce((acc, b) => acc + b.balance, 0);

  const handleAddInvestmentAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const bank: Bank = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName,
      balance: parseFloat(newBalance) || 0,
      color: newColor,
      type: 'investment',
      investmentType: newType
    };
    addBank(bank);
    showSuccess("Conta de investimento criada!");
    setIsAddAccountOpen(false);
    setNewName("");
    setNewBalance("");
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f0f4f8] dark:bg-slate-950">
      <Sidebar />
      <MobileNav />
      <main className="flex-1 p-4 md:p-10 overflow-y-auto pb-32 md:pb-10">
        <div className="max-w-5xl mx-auto space-y-8">
          <header className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-600 text-xs font-black uppercase tracking-widest">
                Área de Patrimônio
              </div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white">Investimentos</h1>
            </div>

            <div className="flex items-center gap-3">
              <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold gap-2 h-12 px-6">
                    <Plus size={20} />
                    Nova Aplicação
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-[2rem]">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black">Nova Conta de Investimento</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddInvestmentAccount} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nome da Instituição/Ativo</Label>
                      <Input 
                        placeholder="Ex: XP Investimentos, Tesouro Direto..." 
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="rounded-xl"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tipo de Ativo</Label>
                        <Select onValueChange={setNewType} value={newType}>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CDB">CDB / Renda Fixa</SelectItem>
                            <SelectItem value="Ações">Ações</SelectItem>
                            <SelectItem value="FIIs">Fundos Imobiliários</SelectItem>
                            <SelectItem value="Cripto">Criptomoedas</SelectItem>
                            <SelectItem value="Tesouro">Tesouro Direto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Saldo Inicial (R$)</Label>
                        <Input 
                          type="number" 
                          step="0.01"
                          value={newBalance}
                          onChange={(e) => setNewBalance(e.target.value)}
                          className="rounded-xl"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Cor de Identificação</Label>
                      <Input 
                        type="color" 
                        value={newColor}
                        onChange={(e) => setNewColor(e.target.value)}
                        className="h-12 w-full rounded-xl p-1 cursor-pointer"
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="w-full rounded-xl py-6 text-lg font-black bg-sky-600">Criar Conta</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <AddTransactionDialog banks={banks} onAdd={addTransaction} />
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-slate-900 text-white border-none shadow-2xl rounded-[2.5rem] overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
              <CardContent className="p-10 relative z-10">
                <div className="flex items-center gap-3 mb-8 opacity-60">
                  <TrendingUp size={20} />
                  <span className="text-xs font-black uppercase tracking-[0.2em]">Patrimônio Total Investido</span>
                </div>
                <h2 className="text-5xl font-black mb-2">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalInvested)}
                </h2>
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <ArrowUpRight size={16} />
                  <span>Seu dinheiro trabalhando para você</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-none shadow-sm rounded-[2.5rem]">
              <CardHeader>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <PieIcon size={20} className="text-sky-500" />
                  Distribuição
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {investmentBanks.length === 0 ? (
                  <p className="text-center text-slate-400 py-8 text-sm">Nenhum investimento cadastrado.</p>
                ) : (
                  investmentBanks.map(bank => (
                    <div key={bank.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-500">{bank.name}</span>
                        <span>{((bank.balance / (totalInvested || 1)) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full transition-all duration-1000" 
                          style={{ 
                            width: `${(bank.balance / (totalInvested || 1)) * 100}%`,
                            backgroundColor: bank.color
                          }} 
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white px-2">Minhas Aplicações</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {investmentBanks.map(bank => (
                <div 
                  key={bank.id}
                  className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:shadow-lg transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl" style={{ backgroundColor: `${bank.color}15`, color: bank.color }}>
                      <Landmark size={24} />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 dark:text-white">{bank.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {bank.investmentType}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-slate-900 dark:text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bank.balance)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InvestmentsPage;