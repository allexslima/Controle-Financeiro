"use client";

import React from 'react';
import Layout from '@/components/Layout';
import StatCard from '@/components/Dashboard/StatCard';
import NewTransactionDialog from '@/components/Transactions/NewTransactionDialog';
import { 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  CreditCard,
  Plus,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const Index = () => {
  return (
    <Layout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Olá, Bem-vindo de volta!</h1>
            <p className="text-gray-500 mt-1">Aqui está o que está acontecendo com suas finanças hoje.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="rounded-xl border-gray-200">
              Exportar Relatório
            </Button>
            <NewTransactionDialog />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Saldo Total"
            value="R$ 12.450,00"
            trend="+2.5%"
            trendType="up"
            icon={Wallet}
            color="bg-blue-600"
          />
          <StatCard 
            title="Receitas"
            value="R$ 8.200,00"
            trend="+12%"
            trendType="up"
            icon={ArrowUpCircle}
            color="bg-emerald-500"
          />
          <StatCard 
            title="Despesas"
            value="R$ 3.150,00"
            trend="-5%"
            trendType="down"
            icon={ArrowDownCircle}
            color="bg-rose-500"
          />
          <StatCard 
            title="Limite Disponível"
            value="R$ 4.800,00"
            icon={CreditCard}
            color="bg-amber-500"
          />
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Transactions */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-gray-50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Transações Recentes</h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                  placeholder="Buscar transação..." 
                  className="pl-10 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              {[
                { name: 'Supermercado Extra', category: 'Alimentação', amount: '- R$ 350,00', date: 'Hoje, 14:30', type: 'expense' },
                { name: 'Salário Mensal', category: 'Trabalho', amount: '+ R$ 5.000,00', date: 'Ontem, 09:00', type: 'income' },
                { name: 'Netflix', category: 'Entretenimento', amount: '- R$ 55,90', date: '22 Out, 2023', type: 'expense' },
                { name: 'Posto Shell', category: 'Transporte', amount: '- R$ 210,00', date: '21 Out, 2023', type: 'expense' },
              ].map((t, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      t.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                      {t.type === 'income' ? <ArrowUpCircle className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{t.name}</p>
                      <p className="text-sm text-gray-500">{t.category} • {t.date}</p>
                    </div>
                  </div>
                  <p className={cn(
                    "font-bold text-lg",
                    t.type === 'income' ? "text-emerald-600" : "text-gray-900"
                  )}>
                    {t.amount}
                  </p>
                </div>
              ))}
            </div>
            
            <Button variant="ghost" className="w-full mt-6 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl">
              Ver todas as transações
            </Button>
          </div>

          {/* Accounts Overview */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-50">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Minhas Contas</h2>
              <div className="space-y-4">
                {[
                  { name: 'Banco do Brasil', balance: 'R$ 4.250,00', color: 'bg-blue-600' },
                  { name: 'Nubank', balance: 'R$ 8.200,00', color: 'bg-purple-600' },
                ].map((acc, i) => (
                  <div key={i} className="p-4 rounded-2xl border border-gray-100 hover:border-blue-200 transition-all cursor-pointer group">
                    <div className="flex items-center justify-between mb-2">
                      <div className={cn("w-8 h-8 rounded-lg", acc.color)} />
                      <span className="text-xs font-medium text-gray-400">Principal</span>
                    </div>
                    <p className="text-sm text-gray-500">{acc.name}</p>
                    <p className="text-lg font-bold text-gray-900">{acc.balance}</p>
                  </div>
                ))}
                <Button variant="outline" className="w-full rounded-xl border-dashed border-2 border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 h-24 flex flex-col gap-2">
                  <Plus className="w-5 h-5" />
                  Adicionar Conta
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;