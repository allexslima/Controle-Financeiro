"use client";

import React, { useState, useMemo } from 'react';
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import MonthNavigator from "@/components/MonthNavigator";
import { useFinance } from "@/context/FinanceContext";
import { 
  isSameMonth, 
  parseISO, 
  getDate, 
  addMonths, 
  format,
  getDaysInMonth,
  setDate
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard, 
  PiggyBank, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles,
  BarChart3,
  PieChart as PieIcon,
  Award,
  Calendar,
  Layers,
  ArrowRightLeft
} from "lucide-react";
import { Transaction } from "@/types/finance";
import { cn } from "@/lib/utils";

const ReportPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { transactions, categories, banks } = useFinance();
  const [activeTab, setActiveTab] = useState<'categories' | 'evolution' | 'methods'>('categories');

  const getBank = (id: string) => banks.find(b => b.id === id);

  const getBillingMonth = (transaction: Transaction) => {
    const tDate = parseISO(transaction.date);
    if (transaction.method !== 'credit') return tDate;
    
    const bank = banks.find(b => b.id === transaction.bankId);
    if (!bank || !bank.closingDay) return tDate;

    if (getDate(tDate) > bank.closingDay) {
      return addMonths(tDate, 1);
    }
    return tDate;
  };

  const reportMetrics = useMemo(() => {
    // Transações deste mês
    const monthTransactions = transactions.filter(t => 
      isSameMonth(getBillingMonth(t), currentDate)
    );

    // Receitas
    const incomeTransactions = monthTransactions.filter(t => t.method === 'income');
    const totalIncome = incomeTransactions.reduce((acc, t) => acc + t.amount, 0);

    // Despesas (exclui transferências e investimentos)
    const expenseTransactions = monthTransactions.filter(t => 
      t.method !== 'income' && 
      t.method !== 'transfer' &&
      t.method !== 'investment_apply' &&
      t.method !== 'investment_redeem'
    );
    const totalExpenses = expenseTransactions.reduce((acc, t) => acc + t.amount, 0);

    // Saldo Líquido do Mês
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    // Despesas por Categoria
    const totalsByCategory = expenseTransactions.reduce((acc, t) => {
      const catId = t.category || 'Outros';
      acc[catId] = (acc[catId] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    const categoryData = Object.entries(totalsByCategory).map(([catId, amount]) => {
      const category = categories.find(c => c.id === catId || c.name === catId) || { 
        name: catId || 'Diversos', 
        color: '#64748b' 
      };
      return {
        name: category.name,
        value: amount,
        color: category.color,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
      };
    }).sort((a, b) => b.value - a.value);

    // Distribuição por Meio de Pagamento
    const methodTotals = expenseTransactions.reduce((acc, t) => {
      const key = t.method;
      acc[key] = (acc[key] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    const methodLabels: Record<string, { label: string; color: string; icon: any }> = {
      credit: { label: 'Cartão de Crédito', color: '#8b5cf6', icon: CreditCard },
      debit: { label: 'Débito em Conta', color: '#3b82f6', icon: Wallet },
      transfer: { label: 'Transferência / Pix', color: '#f97316', icon: ArrowRightLeft },
    };

    const methodData = Object.entries(methodTotals).map(([method, amount]) => ({
      method,
      label: methodLabels[method]?.label || method,
      value: amount,
      color: methodLabels[method]?.color || '#94a3b8',
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
    })).sort((a, b) => b.value - a.value);

    // Evolução diária no mês para gráfico de linha/área
    const daysInMonth = getDaysInMonth(currentDate);
    const dailyMap: Record<number, number> = {};
    for (let day = 1; day <= daysInMonth; day++) {
      dailyMap[day] = 0;
    }

    expenseTransactions.forEach(t => {
      const dayNum = getDate(parseISO(t.date));
      if (dailyMap[dayNum] !== undefined) {
        dailyMap[dayNum] += t.amount;
      }
    });

    const dailyTrendData = Object.entries(dailyMap).map(([dayStr, amount]) => ({
      day: `Dia ${dayStr}`,
      dia: parseInt(dayStr),
      amount,
    }));

    // Top 5 Maiores Gastos do Mês
    const topExpenses = [...expenseTransactions]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Maior Categoria
    const topCategory = categoryData[0] || null;

    return {
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate,
      categoryData,
      methodData,
      dailyTrendData,
      topExpenses,
      topCategory,
      transactionCount: monthTransactions.length
    };
  }, [transactions, currentDate, categories, banks]);

  const currencyFormat = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white dark:bg-slate-800 p-3 rounded-2xl shadow-2xl border border-slate-700 text-xs space-y-1">
          <p className="font-bold flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            {data.name}
          </p>
          <p className="text-sm font-black text-white">
            {currencyFormat(data.value)}
          </p>
          <p className="text-slate-400 font-semibold">
            {data.percentage.toFixed(1)}% de todas as despesas
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomAreaTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white dark:bg-slate-800 p-3 rounded-2xl shadow-2xl border border-slate-700 text-xs space-y-1">
          <p className="font-semibold text-slate-300">{label}</p>
          <p className="text-sm font-black text-rose-400">
            {currencyFormat(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8fafc] dark:bg-slate-950 font-sans">
      <Sidebar />
      <MobileNav />

      <main className="flex-1 p-4 md:p-10 overflow-y-auto pb-32 md:pb-12">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header Superior com Badge e Navegador */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 text-primary text-xs font-bold mb-2">
                <Sparkles size={13} className="text-amber-500 animate-pulse" />
                <span>Inteligência & Análise Mensal</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                Relatórios Financeiros
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Acompanhe o fluxo de caixa, evolução de despesas e onde você mais gasta
              </p>
            </div>

            <MonthNavigator currentDate={currentDate} onChange={setCurrentDate} />
          </div>

          {/* Cards de Métricas Principais (Executive Summary) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            
            {/* Total Receitas */}
            <Card className="rounded-[2rem] border-slate-200/80 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900 p-6 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                  <ArrowUpRight size={22} />
                </div>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                  Entradas do mês
                </span>
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Receita Total
              </p>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                {currencyFormat(reportMetrics.totalIncome)}
              </h2>
            </Card>

            {/* Total Despesas */}
            <Card className="rounded-[2rem] border-slate-200/80 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900 p-6 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl">
                  <ArrowDownRight size={22} />
                </div>
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-full">
                  Saídas do mês
                </span>
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Despesas Totais
              </p>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                {currencyFormat(reportMetrics.totalExpenses)}
              </h2>
            </Card>

            {/* Economia Líquida / Resultado */}
            <Card className={cn(
              "rounded-[2rem] border-none shadow-xl p-6 sm:col-span-2 lg:col-span-1 text-white relative overflow-hidden transition-all",
              reportMetrics.netSavings >= 0 
                ? "bg-slate-900 dark:bg-white dark:text-slate-900 shadow-slate-900/10" 
                : "bg-rose-600 shadow-rose-600/20"
            )}>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/10 dark:bg-slate-900/10 rounded-2xl">
                  <PiggyBank size={22} />
                </div>
                <span className="text-[11px] font-bold bg-white/20 dark:bg-slate-900/10 px-2.5 py-1 rounded-full">
                  {reportMetrics.netSavings >= 0 ? 'Resultado Positivo' : 'Atenção ao Saldo'}
                </span>
              </div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-75">
                Economia Líquida
              </p>
              <h2 className="text-2xl sm:text-3xl font-black mt-1">
                {currencyFormat(reportMetrics.netSavings)}
              </h2>
              <p className="text-[11px] opacity-80 mt-2 font-medium">
                {reportMetrics.savingsRate > 0 
                  ? `Você economizou ${reportMetrics.savingsRate.toFixed(1)}% da sua renda este mês`
                  : 'Despesas superaram as receitas no período'}
              </p>
            </Card>

          </div>

          {/* Destaque / Insight Inteligente */}
          {reportMetrics.topCategory && (
            <div className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-transparent border border-blue-200/60 dark:border-blue-900/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                  <Award size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-900 dark:text-blue-300">
                    Maior impacto no seu bolso este mês:
                  </p>
                  <p className="text-sm font-black text-slate-800 dark:text-white">
                    {reportMetrics.topCategory.name} representou {reportMetrics.topCategory.percentage.toFixed(1)}% do seu custo total ({currencyFormat(reportMetrics.topCategory.value)}).
                  </p>
                </div>
              </div>
              <div className="self-end sm:self-auto text-xs font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
                {reportMetrics.categoryData.length} categorias ativas
              </div>
            </div>
          )}

          {/* Seletor de Abas dos Gráficos */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl w-fit">
            <button
              onClick={() => setActiveTab('categories')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                activeTab === 'categories'
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <PieIcon size={15} />
              Categorias
            </button>
            <button
              onClick={() => setActiveTab('evolution')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                activeTab === 'evolution'
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <BarChart3 size={15} />
              Evolução Diária
            </button>
            <button
              onClick={() => setActiveTab('methods')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                activeTab === 'methods'
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <CreditCard size={15} />
              Meios de Pagamento
            </button>
          </div>

          {/* Gráfico Principal e Análise */}
          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Gráfico Donut de Categorias */}
              <Card className="lg:col-span-5 rounded-[2.5rem] border-slate-200/80 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900 p-6">
                <CardHeader className="p-0 mb-4">
                  <CardTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center justify-between">
                    <span>Divisão de Despesas</span>
                    <span className="text-xs font-semibold text-slate-400">Por categoria</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Passe o mouse ou toque nos segmentos para ver os valores
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-0 h-[300px] sm:h-[340px] flex items-center justify-center relative">
                  {reportMetrics.categoryData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={reportMetrics.categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={110}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="transparent"
                          >
                            {reportMetrics.categoryData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.color} 
                                className="transition-transform duration-200 hover:scale-105"
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} />
                        </RechartsPieChart>
                      </ResponsiveContainer>

                      {/* Total no centro da rosca */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total</span>
                        <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                          {currencyFormat(reportMetrics.totalExpenses)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-slate-400 text-sm">
                      Nenhum gasto registrado para este mês.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Lista Detalhada com Barras de Progresso */}
              <Card className="lg:col-span-7 rounded-[2.5rem] border-slate-200/80 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900 p-6 sm:p-8">
                <CardHeader className="p-0 mb-6">
                  <CardTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center justify-between">
                    <span>Ranking por Categoria</span>
                    <span className="text-xs font-bold text-slate-500">
                      {reportMetrics.categoryData.length} categorias
                    </span>
                  </CardTitle>
                </CardHeader>

                <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                  {reportMetrics.categoryData.length > 0 ? (
                    reportMetrics.categoryData.map((item, index) => (
                      <div 
                        key={item.name} 
                        className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-bold text-slate-400 w-5">
                              #{index + 1}
                            </span>
                            <div 
                              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm" 
                              style={{ backgroundColor: item.color }} 
                            />
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                              {item.name}
                            </span>
                          </div>

                          <div className="text-right flex items-center gap-3">
                            <span className="text-sm font-black text-slate-900 dark:text-white">
                              {currencyFormat(item.value)}
                            </span>
                            <span className="text-xs font-bold text-slate-400 min-w-[42px] text-right">
                              {item.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {/* Barra de progresso visual colorida */}
                        <div className="h-2 w-full bg-slate-200/70 dark:bg-slate-700/60 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${Math.max(item.percentage, 3)}%`,
                              backgroundColor: item.color 
                            }} 
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      Nenhum lançamento categorizado neste mês.
                    </div>
                  )}
                </div>
              </Card>

            </div>
          )}

          {/* Aba: Evolução Diária de Gastos */}
          {activeTab === 'evolution' && (
            <Card className="rounded-[2.5rem] border-slate-200/80 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900 p-6 sm:p-8">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-lg font-black text-slate-900 dark:text-white">
                  Curva Diária de Gastos
                </CardTitle>
                <CardDescription className="text-xs">
                  Acompanhe os dias do mês com maior concentração de saídas financeiras
                </CardDescription>
              </CardHeader>

              <CardContent className="p-0 h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={reportMetrics.dailyTrendData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                    <XAxis 
                      dataKey="dia" 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickFormatter={(val) => `D${val}`}
                    />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickFormatter={(val) => `R$${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
                    />
                    <Tooltip content={<CustomAreaTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#f43f5e" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorExpense)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Aba: Meios de Pagamento */}
          {activeTab === 'methods' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reportMetrics.methodData.map((item) => {
                const Icon = item.method === 'credit' ? CreditCard : Wallet;
                return (
                  <Card key={item.method} className="rounded-[2rem] border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div 
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md"
                          style={{ backgroundColor: item.color }}
                        >
                          <Icon size={22} />
                        </div>
                        <span className="text-sm font-black px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          {item.percentage.toFixed(1)}% do total
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white">
                        {item.label}
                      </h3>
                      <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2">
                        {currencyFormat(item.value)}
                      </p>
                    </div>

                    <div className="mt-6">
                      <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${Math.max(item.percentage, 5)}%`, 
                            backgroundColor: item.color 
                          }} 
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Top 5 Maiores Gastos do Mês */}
          <Card className="rounded-[2.5rem] border-slate-200/80 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900 p-6 sm:p-8">
            <CardHeader className="p-0 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingDown size={20} className="text-rose-500" />
                    <span>Top 5 Maiores Despesas do Mês</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    As compras e contas que mais consumiram seu orçamento
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <div className="space-y-3">
              {reportMetrics.topExpenses.length > 0 ? (
                reportMetrics.topExpenses.map((t, idx) => {
                  const bank = getBank(t.bankId);
                  return (
                    <div 
                      key={t.id}
                      className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <span className="w-6 h-6 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black text-xs shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-white">
                            {t.description}
                          </p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-2">
                            <span>{bank?.name || 'Conta'}</span>
                            <span>•</span>
                            <span>{t.category || 'Geral'}</span>
                            <span>•</span>
                            <span>{format(parseISO(t.date), "dd 'de' MMM", { locale: ptBR })}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-black text-rose-600 dark:text-rose-400">
                          {currencyFormat(t.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Nenhuma despesa para listar neste mês.
                </div>
              )}
            </div>
          </Card>

        </div>
      </main>
    </div>
  );
};

export default ReportPage;