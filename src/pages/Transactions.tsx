"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { 
  Search, 
  Filter, 
  Download, 
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const Transactions = () => {
  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transações</h1>
            <p className="text-gray-500 mt-1">Gerencie e visualize todo o seu histórico financeiro.</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 rounded-xl gap-2">
            <Plus className="w-4 h-4" />
            Nova Transação
          </Button>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-50 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4 flex-1 min-w-[300px]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                  placeholder="Buscar por descrição ou categoria..." 
                  className="pl-10 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all"
                />
              </div>
              <Button variant="outline" className="rounded-xl border-gray-200 gap-2">
                <Filter className="w-4 h-4" />
                Filtros
              </Button>
            </div>
            <Button variant="outline" className="rounded-xl border-gray-200 gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          </div>

          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="font-semibold">Descrição</TableHead>
                <TableHead className="font-semibold">Categoria</TableHead>
                <TableHead className="font-semibold">Data</TableHead>
                <TableHead className="font-semibold">Conta</TableHead>
                <TableHead className="font-semibold text-right">Valor</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { desc: 'Supermercado Extra', cat: 'Alimentação', date: '24 Out, 2023', acc: 'Nubank', amount: '- R$ 350,00', type: 'expense' },
                { desc: 'Salário Mensal', cat: 'Trabalho', date: '23 Out, 2023', acc: 'Banco do Brasil', amount: '+ R$ 5.000,00', type: 'income' },
                { desc: 'Netflix', cat: 'Entretenimento', date: '22 Out, 2023', acc: 'Nubank', amount: '- R$ 55,90', type: 'expense' },
                { desc: 'Posto Shell', cat: 'Transporte', date: '21 Out, 2023', acc: 'Banco do Brasil', amount: '- R$ 210,00', type: 'expense' },
                { desc: 'Aluguel', cat: 'Moradia', date: '20 Out, 2023', acc: 'Banco do Brasil', amount: '- R$ 1.800,00', type: 'expense' },
                { desc: 'Freelance Design', cat: 'Trabalho', date: '18 Out, 2023', acc: 'Nubank', amount: '+ R$ 1.200,00', type: 'income' },
              ].map((t, i) => (
                <TableRow key={i} className="hover:bg-gray-50/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        t.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                      )}>
                        {t.type === 'income' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                      </div>
                      <span className="font-medium text-gray-900">{t.desc}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                      {t.cat}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-500">{t.date}</TableCell>
                  <TableCell className="text-gray-500">{t.acc}</TableCell>
                  <TableCell className={cn(
                    "text-right font-bold",
                    t.type === 'income' ? "text-emerald-600" : "text-gray-900"
                  )}>
                    {t.amount}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="rounded-lg text-gray-400">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
};

export default Transactions;