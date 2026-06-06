"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { 
  Plus, 
  CreditCard, 
  Wallet, 
  MoreVertical,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const Accounts = () => {
  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Contas e Cartões</h1>
            <p className="text-gray-500 mt-1">Gerencie suas instituições financeiras e limites.</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 rounded-xl gap-2">
            <Plus className="w-4 h-4" />
            Nova Conta
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bank Accounts */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-blue-600" />
              Contas Bancárias
            </h2>
            <div className="grid gap-4">
              {[
                { name: 'Banco do Brasil', balance: 'R$ 4.250,00', type: 'Corrente', color: 'bg-blue-600' },
                { name: 'Nubank', balance: 'R$ 8.200,00', type: 'Pagamentos', color: 'bg-purple-600' },
                { name: 'Inter', balance: 'R$ 1.500,00', type: 'Investimentos', color: 'bg-orange-500' },
              ].map((acc, i) => (
                <Card key={i} className="p-6 border-none shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white", acc.color)}>
                        <Wallet className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{acc.name}</h3>
                        <p className="text-sm text-gray-500">{acc.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{acc.balance}</p>
                      <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Credit Cards */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Cartões de Crédito
            </h2>
            <div className="grid gap-6">
              {[
                { name: 'Nubank Ultravioleta', limit: 'R$ 15.000,00', used: 'R$ 3.200,00', color: 'from-purple-600 to-indigo-700', lastDigits: '4582' },
                { name: 'XP Visa Infinite', limit: 'R$ 25.000,00', used: 'R$ 1.150,00', color: 'from-gray-800 to-black', lastDigits: '9901' },
              ].map((card, i) => (
                <div key={i} className={cn(
                  "relative overflow-hidden rounded-3xl p-8 text-white shadow-xl transition-transform hover:scale-[1.02]",
                  "bg-gradient-to-br", card.color
                )}>
                  <div className="relative z-10 flex flex-col h-full justify-between min-h-[180px]">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm opacity-80 font-medium">Nome do Cartão</p>
                        <h3 className="text-xl font-bold">{card.name}</h3>
                      </div>
                      <CreditCard className="w-8 h-8 opacity-50" />
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-xs opacity-60 mb-1">Fatura Atual</p>
                          <p className="text-2xl font-bold">{card.used}</p>
                        </div>
                        <p className="text-sm font-mono">**** {card.lastDigits}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs opacity-80">
                          <span>Limite Disponível</span>
                          <span>{card.limit}</span>
                        </div>
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-white rounded-full" 
                            style={{ width: `${(parseFloat(card.used.replace(/\D/g,'')) / parseFloat(card.limit.replace(/\D/g,''))) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Decorative circles */}
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                  <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-black/10 rounded-full blur-3xl" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Accounts;