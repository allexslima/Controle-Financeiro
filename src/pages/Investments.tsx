"use client";

import React, { useState, useMemo } from 'react';
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import MonthNavigator from "@/components/MonthNavigator";
import TransactionList from "@/components/TransactionList";
import EditTransactionDialog from "@/components/EditTransactionDialog";
import RecurringActionDialog from "@/components/RecurringActionDialog";
import { useFinance } from "@/context/FinanceContext";
import { Bank, Transaction } from "@/types/finance";
import { 
  TrendingUp, 
  Plus, 
  ArrowUpRight, 
  PieChart as PieIcon,
  Landmark,
  Pencil,
  Trash2,
  ArrowLeft,
  Coins
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import EditBankDialog from "@/components/EditBankDialog";
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
import { isSameMonth, parseISO, isBefore, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

const InvestmentsPage = () => {
  const { banks, transactions, addBank, addTransaction, removeBank, updateBank, deleteTransaction, updateTransaction } = useFinance();
  const [selectedInvestment, setSelectedInvestment] = useState<Bank | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'edit' | 'delete',
    transaction: Transaction,
    updatedData?: Transaction
  } | null>(null);

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("CDB");
  const [newBalance, setNewBalance] = useState("");
  const [newColor, setNewColor] = useState("#0ea5e9");
  const [newYieldRate, setNewYieldRate] = useState("");
  const [newYieldAmount, setNewYieldAmount] = useState("");

  const investmentBanks = banks.filter(b => b.type === 'investment');
  const totalInvested = investmentBanks.reduce((acc, b) => acc + b.balance, 0);
  const totalYields = investmentBanks.reduce((acc, b) => acc + (b.yieldAmount || 0), 0);

  // Lógica para a visão detalhada
  const getInvestmentSummary = (bank: Bank) => {
    const monthStart = startOfMonth(currentDate);

    const calculateBalance = (tList: Transaction[]) => {
      return tList.reduce((acc, t) => {
        const isOrigin = t.bankId === bank.id;
        const isDest = t.destinationBankId === bank.id;

        if (t.method === 'investment_apply') {
          if (isDest) return acc + t.amount;
          if (isOrigin) return acc - t.amount;
        }
        if (t.method === 'investment_redeem') {
          if (isOrigin) return acc - t.amount;
          if (isDest) return acc + t.amount;
        }
        
        if (t.method === 'transfer') {
          if (isDest) return acc + t.amount;
          if (isOrigin) return acc - t.amount;
        }

        return acc;
      }, 0);
    };

    const previousTransactions = transactions.filter(t => 
      (t.bankId === bank.id || t.destinationBankId === bank.id) &&
      isBefore(parseISO(t.date), monthStart)
    );

    const currentMonthTransactions = transactions.filter(t => 
      (t.bankId === bank.id || t.destinationBankId === bank.id) &&
      isSameMonth(parseISO(t.date), currentDate)
    );

    const previousBalance = calculateBalance(previousTransactions);
    const completedMonth = calculateBalance(currentMonthTransactions.filter(t => t.isCompleted));
    const futureMonth = calculateBalance(currentMonthTransactions.filter(t => !t.isCompleted));

    const currentBalance = previousBalance + completedMonth;
    const projectedTotal = currentBalance + futureMonth;

    return { previousBalance, completedMonth, futureMonth, currentBalance, projectedTotal };
  };

  const filteredTransactions = useMemo(() => {
    if (!selectedInvestment) return [];
    return transactions.filter(t => 
      (t.bankId === selectedInvestment.id || t.destinationBankId === selectedInvestment.id) &&
      isSameMonth(parseISO(t.date), currentDate)
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedInvestment, currentDate]);

  const selectedSummary = useMemo(() => {
    if (!selectedInvestment) return null;
    return getInvestmentSummary(selectedInvestment);
  }, [selectedInvestment, transactions, currentDate]);

  const distributionByType = useMemo(() => {
    const groups: Record<string, { amount: number, color: string }> = {};
    investmentBanks.forEach(bank => {
      const type = bank.investmentType || 'Outros';
      if (!groups[type]) {
        groups[type] = { amount: 0, color: bank.color };
      }
      groups[type].amount += bank.balance;
    });
    return Object.entries(groups).map(([type, data]) => ({
      type,
      ...data,
      percentage: totalInvested > 0 ? (data.amount / totalInvested) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);
  }, [investmentBanks, totalInvested]);

  const handleAddInvestmentAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const bank: Bank = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName,
      balance: parseFloat(newBalance) || 0,
      color: newColor,
      type: 'investment',
      investmentType: newType,
      yieldRate: newYieldRate ? parseFloat(newYieldRate) : undefined,
      yieldAmount: newYieldAmount ? parseFloat(newYieldAmount) : undefined
    };
    addBank(bank);
    showSuccess("Conta de investimento criada!");
    setIsAddAccountOpen(false);
    setNewName("");
    setNewBalance("");
    setNewYieldRate("");
    setNewYieldAmount("");
  };

  const handleDeleteRequest = (id: string) => {
    const t = transactions.find(item => item.id === id);
    if (t?.groupId) {
      setPendingAction({ type: 'delete', transaction: t });
      setRecurringDialogOpen(true);
    } else {
      deleteTransaction(id);
    }
  };

  const handleUpdate = (updated: Transaction) => {
    if (updated.groupId) {
      setPendingAction({ type: 'edit', transaction: updated, updatedData: updated });
      setRecurringDialogOpen(true);
    } else {
      updateTransaction(updated);
    }
  };

  const handleRecurringAction = (mode: 'single' | 'future' | 'all') => {
    if (!pendingAction) return;
    if (pendingAction.type === 'delete') {
      deleteTransaction(pendingAction.transaction.id, mode);
    } else if (pendingAction.type === 'edit' && pendingAction.updatedData) {
      updateTransaction(pendingAction.updatedData, mode as 'single' | 'future');
    }
    setPendingAction(null);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f0f4f8] dark:bg-slate-950">
      <Sidebar />
      <MobileNav />
      <main className="flex-1 p-4 md:p-10 overflow-y-auto pb-32 md:pb-10">
        <div className="max-w-5xl mx-auto space-y-8">
          {!selectedInvestment ? (
            <>
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

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Taxa Rendimento (% a.a.)</Label>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="Ex: 12.5"
                              value={newYieldRate}
                              onChange={(e) => setNewYieldRate(e.target.value)}
                              className="rounded-xl"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Rendimento Inicial (R$)</Label>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="Ex: 0.00"
                              value={newYieldAmount}
                              onChange={(e) => setNewYieldAmount(e.target.value)}
                              className="rounded-xl"
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
                  <CardContent className="p-10 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-3 mb-4 opacity-60">
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
                    </div>

                    {totalYields > 0 && (
                      <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10">
                        <div className="flex items-center gap-2 text-emerald-400 mb-1">
                          <Coins size={16} />
                          <span className="text-[10px] font-black uppercase tracking-wider">Rendimento Total</span>
                        </div>
                        <p className="text-2xl font-black text-emerald-400">
                          + {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalYields)}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-900 border-none shadow-sm rounded-[2.5rem]">
                  <CardHeader>
                    <CardTitle className="text-lg font-black flex items-center gap-2">
                      <PieIcon size={20} className="text-sky-500" />
                      Distribuição por Tipo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {distributionByType.length === 0 ? (
                      <p className="text-center text-slate-400 py-8 text-sm">Nenhum investimento cadastrado.</p>
                    ) : (
                      distributionByType.map(item => (
                        <div key={item.type} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-500">{item.type}</span>
                            <span>{item.percentage.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full transition-all duration-1000" 
                              style={{ 
                                width: `${item.percentage}%`,
                                backgroundColor: item.color
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
                      onClick={() => setSelectedInvestment(bank)}
                      className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:shadow-lg transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl" style={{ backgroundColor: `${bank.color}15`, color: bank.color }}>
                          <Landmark size={24} />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 dark:text-white">{bank.name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {bank.investmentType}
                            </span>
                            {bank.yieldRate !== undefined && (
                              <span className="text-[10px] font-black text-sky-600 bg-sky-50 dark:bg-sky-950/50 px-1.5 py-0.5 rounded">
                                {bank.yieldRate}% a.a.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xl font-black text-slate-900 dark:text-white">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bank.balance)}
                          </p>
                          {bank.yieldAmount !== undefined && bank.yieldAmount > 0 && (
                            <p className="text-xs text-emerald-600 font-bold">
                              + {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bank.yieldAmount)}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-primary"
                            onClick={(e) => { e.stopPropagation(); setEditingBank(bank); }}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              if(confirm("Deseja remover esta conta de investimento?")) {
                                removeBank(bank.id);
                              }
                            }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" onClick={() => setSelectedInvestment(null)} className="gap-2 self-start text-slate-600 dark:text-slate-400">
                    <ArrowLeft size={18} /> Voltar
                  </Button>
                  <AddTransactionDialog banks={banks} onAdd={addTransaction} />
                </div>
                <MonthNavigator currentDate={currentDate} onChange={setCurrentDate} />
              </div>

              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border-l-8 relative group border-slate-100 dark:border-slate-800" style={{ borderLeftColor: selectedInvestment.color }}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-primary"
                  onClick={() => setEditingBank(selectedInvestment)}
                >
                  <Pencil size={18} />
                </Button>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">{selectedInvestment.name}</h2>
                  <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {selectedInvestment.investmentType}
                  </span>
                  {selectedInvestment.yieldRate !== undefined && (
                    <span className="px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/50 text-[10px] font-black text-sky-600">
                      {selectedInvestment.yieldRate}% a.a.
                    </span>
                  )}
                </div>
                <div className="mt-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest">Saldo Efetivado</p>
                    <p className="text-4xl font-black text-slate-900 dark:text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedSummary?.currentBalance || 0)}
                    </p>
                    {selectedInvestment.yieldAmount !== undefined && selectedInvestment.yieldAmount > 0 && (
                      <p className="text-sm text-emerald-600 font-bold mt-1">
                        Rendimento Acumulado: + {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedInvestment.yieldAmount)}
                      </p>
                    )}
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Total Geral (Projeção)</p>
                    <p className={cn("text-xl font-black", (selectedSummary?.projectedTotal || 0) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedSummary?.projectedTotal || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <TransactionList 
                transactions={filteredTransactions} 
                banks={banks} 
                onEdit={setEditingTransaction} 
                onDelete={handleDeleteRequest}
              />

              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex justify-between text-sm font-medium text-slate-500">
                  <span>Valores Efetuados (Mês)</span>
                  <span className={(selectedSummary?.completedMonth || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedSummary?.completedMonth || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-medium text-slate-500">
                  <span>Valores Futuros (Mês)</span>
                  <span className={(selectedSummary?.futureMonth || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedSummary?.futureMonth || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-medium text-slate-500">
                  <span>Saldo Mês Anterior</span>
                  <span className={(selectedSummary?.previousBalance || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedSummary?.previousBalance || 0)}
                  </span>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-lg font-black text-slate-900 dark:text-white">Total Geral</span>
                  <span className={`text-2xl font-black ${(selectedSummary?.projectedTotal || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedSummary?.projectedTotal || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <EditBankDialog 
          bank={editingBank}
          onUpdate={updateBank}
          onClose={() => setEditingBank(null)}
        />

        <EditTransactionDialog 
          transaction={editingTransaction}
          banks={banks}
          onUpdate={handleUpdate}
          onClose={() => setEditingTransaction(null)}
        />

        <RecurringActionDialog 
          open={recurringDialogOpen}
          onOpenChange={setRecurringDialogOpen}
          title={pendingAction?.type === 'edit' ? "Editar Transação Recorrente" : "Excluir Transação Recorrente"}
          description={pendingAction?.type === 'edit' 
            ? "Esta transação faz parte de um grupo. Como deseja aplicar as alterações?" 
            : "Esta transação faz parte de um grupo. Como deseja realizar a exclusão?"}
          type={pendingAction?.type || 'edit'}
          onAction={handleRecurringAction}
        />
      </main>
    </div>
  );
};

export default InvestmentsPage;