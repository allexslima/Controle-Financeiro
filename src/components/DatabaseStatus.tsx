import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { Database, CheckCircle2, AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { showSuccess } from '@/utils/toast';

const SQL_SCHEMA = `-- 1. Tabela de Bancos e Contas
CREATE TABLE IF NOT EXISTS banks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  color TEXT NOT NULL,
  type TEXT NOT NULL,
  closing_day INTEGER,
  due_day INTEGER,
  investment_type TEXT,
  yield_type TEXT,
  yield_rate NUMERIC,
  yield_amount NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Categorias
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Transações
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  method TEXT NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  bank_id TEXT NOT NULL,
  destination_bank_id TEXT,
  installments INTEGER,
  is_recurring BOOLEAN DEFAULT FALSE,
  group_id TEXT,
  is_completed BOOLEAN DEFAULT TRUE,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar leitura e escrita pública
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total a banks" ON banks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total a categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total a transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);`;

export const DatabaseStatus = () => {
  const { syncStatus, refreshFromDatabase } = useFinance();
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopied(true);
    showSuccess("Script SQL copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshFromDatabase();
    setIsRefreshing(false);
  };

  if (syncStatus === 'connected') {
    return (
      <div className="flex items-center justify-between px-3 py-2 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            Supabase Conectado
          </span>
        </div>
        <button
          onClick={handleRefresh}
          title="Sincronizar agora"
          className="text-emerald-600 dark:text-emerald-400 hover:rotate-180 transition-transform duration-500"
        >
          <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
        </button>
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="w-full text-left flex items-center justify-between px-3 py-2 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl hover:bg-amber-100/80 dark:hover:bg-amber-900/30 transition-colors">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              {syncStatus === 'needs_tables' ? 'Criar Tabelas no SQL' : 'Conectando Supabase...'}
            </span>
          </div>
          <AlertTriangle size={13} className="text-amber-600 dark:text-amber-400" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Database className="text-primary" size={20} />
            Configuração das Tabelas no Supabase
          </DialogTitle>
          <DialogDescription>
            Sua chave foi conectada com sucesso! Para que o banco comece a gravar as informações, execute o script abaixo no <strong>SQL Editor</strong> do seu painel Supabase.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="relative">
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs overflow-x-auto max-h-60 font-mono">
              {SQL_SCHEMA}
            </pre>
            <Button
              size="sm"
              onClick={handleCopy}
              className="absolute top-2 right-2 flex items-center gap-1.5"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copiado!" : "Copiar SQL"}
            </Button>
          </div>

          <div className="text-xs text-slate-500 space-y-1">
            <p>1. Vá no menu lateral esquerdo do Supabase e clique no ícone <strong>SQL Editor (`&gt;_`)</strong>.</p>
            <p>2. Clique em <strong>+ New Query</strong>, cole o código acima e clique em <strong>Run</strong>.</p>
            <p>3. Depois, clique no botão abaixo para verificar a conexão.</p>
          </div>

          <Button onClick={handleRefresh} className="w-full">
            <RefreshCw size={14} className={`mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Verificar Conexão Agora
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
