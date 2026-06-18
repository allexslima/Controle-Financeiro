"use client";

import React, { useState, useMemo } from 'react';
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import MonthNavigator from "@/components/MonthNavigator";
import { useFinance } from "@/context/FinanceContext";
import { isSameMonth, parseISO, getDate, addMonths } from "date-fns";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Transaction, Bank } from "@/types/finance";

const ReportPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { transactions, categories, banks } = useFinance();

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

  const reportData = useMemo(() => {
    const monthTransactions = transactions.filter(t => 
      isSameMonth(getBillingMonth(t), currentDate) && 
      t.method !== 'income' && 
      t.method !== 'transfer'
    );

    const totalsByCategory = monthTransactions.reduce((acc, t) => {
      const catId = t.category;
      if (!acc[catId]) acc[catId] = 0;
      acc[catId] += t.amount;
      return acc;
    }, {} as Record<string, number>);

    const totalExpenses = Object.values(totalsByCategory).reduce((a, b) => a + b, 0);

    const chartData = Object.entries(totalsByCategory).map(([catId, amount]) => {
      const category = categories.find(c => c.id === catId) || { name: 'Outros', color: '#94a3b8' };
      return {
        name: category.name,
        value: amount,
        color: category.color,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
      };
    }).sort((a, b) => b.value - a.value);

    return { chartData, totalExpenses };
  }, [transactions, currentDate, categories, banks]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800">
          <p className="font-bold text-slate-900 dark:text-white">{payload[0].name}</p>
          <p className="text-primary font-black">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payload[0].value)}
          </p>
          <p className="text-xs text-slate-500">
            {payload[0].payload.percentage.toFixed(1)}% do total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      <Sidebar />
      <MobileNav />
      <main className="flex-1 p-4 md:p-10 overflow-y-auto pb-32 md:pb-10">
        <div className="max-w-5xl mx-auto space-y-8">
          <header className="flex flex-col md:flex-row items-center justify-between gap-4">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Relatório de Gastos</h1>
            <MonthNavigator currentDate={currentDate} onChange={setCurrentDate} />
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="rounded-[2.5rem] border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-xl font-black">Distribuição por Categoria</CardTitle>
              </CardHeader>
              <CardContent className="h-[400px]">
                {reportData.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData.chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {reportData.chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    Nenhum gasto registrado neste mês.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-xl font-black">Ranking de Gastos</CardTitle>
              </CardHeader>
              <CardContent className="h-[400px]">
                {reportData.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={reportData.chartData}
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fontSize: 12, fontWeight: 600 }}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                      <Bar 
                        dataKey="value" 
                        radius={[0, 10, 10, 0]} 
                        barSize={20}
                      >
                        {reportData.chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    Nenhum dado para exibir.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-black mb-6">Detalhamento</h3>
            <div className="space-y-4">
              {reportData.chartData.map((item) => (
                <div key={item.name} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-bold text-slate-700 dark:text-slate-200">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-900 dark:text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                    </p>
                    <p className="text-xs text-slate-500 font-bold">{item.percentage.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="text-xl font-black">Total de Gastos</span>
                <span className="text-2xl font-black text-rose-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reportData.totalExpenses)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReportPage;