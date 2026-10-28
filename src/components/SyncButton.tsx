"use client";

import React, { useState } from 'react';
import { RefreshCw, AlertCircle, Wrench, UploadCloud, ShieldAlert, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFinance } from "@/context/FinanceContext";
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
    if (syncStatus === 'error') return "Falha na conexão com Supabase (Clique para diagnosticar e reparar)";
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
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <div className="p-2 bg-rose-100 dark:bg-rose-950/60 rounded-xl">
                <AlertCircle size={22} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Diagnóstico de Conexão com a Nuvem
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  O computador não conseguiu comunicar com o banco de dados Supabase.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Mensagem detalhada do erro */}
            <div className="p-3.5 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl text-xs space-y-1">
              <p className="font-bold text-rose-800 dark:text-rose-300">
                Motivo detectado:
              </p>
              <p className="text-rose-700 dark:text-rose-400 font-mono text-[11px] break-words">
                {syncErrorMessage || "Erro de rede ou permissão ao acessar o Supabase."}
              </p>
            </div>

            {/* Aviso sobre alterações pendentes */}
            {hasUnsyncedChanges && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs space-y-1">
                <p className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <span>⚠️</span> Alterações pendentes neste computador
                </p>
                <p className="text-amber-700 dark:text-amber-400 text-[11px]">
                  Você fez modificações que ainda não foram salvas na nuvem. Clique em "Enviar Alterações Locais" para não perdê-las.
                </p>
              </div>
            )}

            {/* Guia de soluções rápidas */}
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldAlert size={15} className="text-indigo-500" />
                Principais causas no computador:
              </p>
              <ul className="list-disc pl-4 space-y-1.5 text-[11px] leading-relaxed">
                <li>
                  <strong className="text-slate-700 dark:text-slate-300">Bloqueador de anúncios (AdBlock / uBlock / Brave):</strong> Navegadores no computador costumam bloquear requisições para o domínio <code>supabase.co</code>. Desative o bloqueador para este site.
                </li>
                <li>
                  <strong className="text-slate-700 dark:text-slate-300">Sessão antiga ou expirada:</strong> O navegador pode estar com um token antigo armazenado no cache. O botão "Reparar Conexão" abaixo resolve isso na hora.
                </li>
              </ul>
            </div>

            {/* Ações de Reparo */}
            <div className="space-y-2 pt-1">
              <Button
                onClick={handleRepair}
                disabled={isRepairing || isPushing}
                className="w-full justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs py-5"
              >
                <Wrench size={16} className={isRepairing ? "animate-spin" : ""} />
                {isRepairing ? "Reparando conexão..." : "Reparar Conexão e Reconectar"}
              </Button>

              {hasUnsyncedChanges && (
                <Button
                  onClick={handlePush}
                  disabled={isRepairing || isPushing}
                  variant="outline"
                  className="w-full justify-center gap-2 rounded-xl border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-bold text-xs py-5"
                >
                  <UploadCloud size={16} className={isPushing ? "animate-spin" : ""} />
                  {isPushing ? "Enviando alterações..." : "Enviar Alterações Locais para a Nuvem"}
                </Button>
              )}

              <Button
                onClick={() => setDialogOpen(false)}
                variant="ghost"
                className="w-full rounded-xl text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
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
