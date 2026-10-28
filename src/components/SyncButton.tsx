"use client";

import React, { useState } from 'react';
import { RefreshCw, AlertCircle, Wrench, UploadCloud, CheckCircle2, Activity, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFinance } from "@/context/FinanceContext";
import { supabase } from "@/lib/supabase";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { showSuccess, showError } from "@/utils/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface SyncButtonProps {
  className?: string;
  showText?: boolean;
}

const SyncButton = ({ className, showText = false }: SyncButtonProps) => {
  const { 
    syncStatus, 
    syncErrorMessage, 
    isRefreshing, 
    hasUnsyncedChanges, 
    refreshFromDatabase, 
    repairConnection, 
    pushLocalToDatabase 
  } = useFinance();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; ms?: number } | null>(null);

  const handleClick = async () => {
    if (isRefreshing) return;

    if (syncStatus === 'error' || syncStatus === 'needs_tables') {
      setDialogOpen(true);
      return;
    }

    try {
      await refreshFromDatabase(true);
      showSuccess("Dados sincronizados com a nuvem!");
    } catch {
      showError("Não foi possível sincronizar no momento.");
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const start = performance.now();
    try {
      const { data, count, error } = await supabase
        .from('banks')
        .select('id, name', { count: 'exact' })
        .limit(1);

      const elapsed = Math.round(performance.now() - start);

      if (error) {
        setTestResult({
          success: false,
          message: `Erro da nuvem [${error.code || 'API'}]: ${error.message || 'Sem resposta'}`,
          ms: elapsed,
        });
      } else {
        setTestResult({
          success: true,
          message: `Conexão ativa e respondendo! Banco alcançado em ${elapsed}ms.`,
          ms: elapsed,
        });
        // Tenta sincronizar os dados reais se a conexão respondeu
        await refreshFromDatabase(true);
      }
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - start);
      setTestResult({
        success: false,
        message: `Falha de rede direta: ${err?.message || 'Não foi possível conectar ao Supabase'}`,
        ms: elapsed,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleRepair = async () => {
    setIsRepairing(true);
    try {
      await repairConnection();
      if (syncStatus === 'connected') {
        setDialogOpen(false);
      }
    } finally {
      setIsRepairing(false);
    }
  };

  const handlePush = async () => {
    setIsPushing(true);
    try {
      await pushLocalToDatabase();
      if (syncStatus === 'connected') {
        setDialogOpen(false);
      }
    } finally {
      setIsPushing(false);
    }
  };

  const getStatusText = () => {
    if (isRefreshing) return "Sincronizando com a nuvem...";
    if (syncStatus === 'connected') return "Nuvem conectada (Clique para sincronizar agora)";
    if (syncStatus === 'needs_tables') return "Tabelas do Supabase ausentes (Clique para detalhes)";
    if (syncStatus === 'error') return "Falha na sincronização (Clique para diagnosticar e testar conexão)";
    return "Conectando ao Supabase...";
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size={showText ? "default" : "icon"}
            onClick={handleClick}
            disabled={isRefreshing}
            className={cn(
              "relative rounded-xl h-8 border-slate-200/90 dark:border-slate-800 text-slate-500 hover:text-primary hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all bg-white dark:bg-slate-950 shadow-xs shrink-0 cursor-pointer",
              syncStatus === 'error' && "border-rose-300 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:border-rose-400",
              showText ? "px-3 gap-2 text-xs font-semibold" : "w-8",
              className
            )}
            title="Sincronizar dados"
          >
            {syncStatus === 'error' ? (
              <AlertCircle size={15} className="text-rose-500 shrink-0" />
            ) : (
              <RefreshCw 
                size={14} 
                className={cn("shrink-0 transition-transform", isRefreshing && "animate-spin text-primary")} 
              />
            )}

            {showText && (
              <span className="truncate">
                {isRefreshing ? "Sincronizando..." : syncStatus === 'error' ? "Erro na Nuvem" : "Sincronizar"}
              </span>
            )}

            {/* Indicador de status (bolinha verde quando conectado e ocioso) */}
            {syncStatus === 'connected' && !isRefreshing && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}

            {syncStatus === 'error' && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-950" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{getStatusText()}</p>
        </TooltipContent>
      </Tooltip>

      {/* Modal de Diagnóstico e Reparação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2.5 text-slate-900 dark:text-white">
              <div className={cn(
                "p-2 rounded-xl",
                syncStatus === 'error' ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
              )}>
                {syncStatus === 'error' ? <AlertCircle size={22} /> : <CheckCircle2 size={22} />}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Sincronização com o Banco de Dados
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Status de comunicação com o Supabase na nuvem.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Mensagem detalhada do erro (se houver) */}
            {syncStatus === 'error' && (
              <div className="p-3.5 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl text-xs space-y-1">
                <p className="font-bold text-rose-800 dark:text-rose-300">
                  Detalhes do erro detectado:
                </p>
                <p className="text-rose-700 dark:text-rose-400 font-mono text-[11px] break-words">
                  {syncErrorMessage || "Falha na comunicação com o banco de dados."}
                </p>
              </div>
            )}

            {/* Aviso sobre alterações pendentes */}
            {hasUnsyncedChanges && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs space-y-1">
                <p className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <span>⚠️</span> Alterações pendentes neste dispositivo
                </p>
                <p className="text-amber-700 dark:text-amber-400 text-[11px]">
                  Há lançamentos ou alterações armazenadas localmente no navegador. Clique em "Enviar Alterações Locais" para salvar tudo na nuvem.
                </p>
              </div>
            )}

            {/* Resultado do Teste de Conexão */}
            {testResult && (
              <div className={cn(
                "p-3 rounded-xl border text-xs space-y-1",
                testResult.success 
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300"
                  : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300"
              )}>
                <div className="flex items-center gap-1.5 font-bold">
                  {testResult.success ? <CheckCircle2 size={14} className="text-emerald-600" /> : <AlertCircle size={14} className="text-rose-600" />}
                  <span>{testResult.success ? "Conexão Testada com Sucesso" : "Falha no Teste de Conexão"}</span>
                </div>
                <p className="text-[11px] font-mono break-words">{testResult.message}</p>
              </div>
            )}

            {/* Ações */}
            <div className="space-y-2 pt-1">
              <Button
                onClick={handleTestConnection}
                disabled={isTesting || isRefreshing}
                variant="outline"
                className="w-full justify-center gap-2 rounded-xl text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900 font-semibold text-xs py-4.5 cursor-pointer"
              >
                <Wifi size={15} className={isTesting ? "animate-pulse text-primary" : "text-primary"} />
                {isTesting ? "Testando comunicação com Supabase..." : "Testar Conexão em Tempo Real"}
              </Button>

              <Button
                onClick={handleRepair}
                disabled={isRepairing || isPushing || isRefreshing}
                className="w-full justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs py-5 cursor-pointer"
              >
                <RefreshCw size={15} className={isRepairing || isRefreshing ? "animate-spin" : ""} />
                {isRepairing || isRefreshing ? "Sincronizando..." : "Sincronizar Dados da Nuvem Agora"}
              </Button>

              {hasUnsyncedChanges && (
                <Button
                  onClick={handlePush}
                  disabled={isRepairing || isPushing || isRefreshing}
                  variant="outline"
                  className="w-full justify-center gap-2 rounded-xl border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-bold text-xs py-5 cursor-pointer"
                >
                  <UploadCloud size={16} className={isPushing ? "animate-spin" : ""} />
                  {isPushing ? "Enviando alterações..." : "Enviar Alterações Locais para a Nuvem"}
                </Button>
              )}

              <Button
                onClick={() => setDialogOpen(false)}
                variant="ghost"
                className="w-full rounded-xl text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SyncButton;
