"use client";

import React from 'react';
import { RefreshCw, CloudCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFinance } from "@/context/FinanceContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { showSuccess, showError } from "@/utils/toast";

interface SyncButtonProps {
  className?: string;
  showText?: boolean;
}

const SyncButton = ({ className, showText = false }: SyncButtonProps) => {
  const { syncStatus, isRefreshing, refreshFromDatabase } = useFinance();

  const handleSync = async () => {
    if (isRefreshing) return;
    try {
      await refreshFromDatabase(true);
      showSuccess("Dados sincronizados com a nuvem!");
    } catch {
      showError("Não foi possível sincronizar no momento.");
    }
  };

  const getStatusText = () => {
    if (isRefreshing) return "Sincronizando com a nuvem...";
    if (syncStatus === 'connected') return "Nuvem conectada (Clique para sincronizar agora)";
    if (syncStatus === 'needs_tables') return "Tabelas do Supabase ausentes";
    if (syncStatus === 'error') return "Falha na conexão com Supabase (Clique para tentar)";
    return "Conectando ao Supabase...";
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size={showText ? "default" : "icon"}
          onClick={handleSync}
          disabled={isRefreshing}
          className={cn(
            "relative rounded-xl h-8 border-slate-200/90 dark:border-slate-800 text-slate-500 hover:text-primary hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all bg-white dark:bg-slate-950 shadow-xs shrink-0 cursor-pointer",
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
              {isRefreshing ? "Sincronizando..." : "Sincronizar"}
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
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 rounded-full bg-rose-500" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{getStatusText()}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default SyncButton;
