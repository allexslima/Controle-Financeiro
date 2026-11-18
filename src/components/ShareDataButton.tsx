"use client";

import React, { useRef, useState } from 'react';
import { Share2, Download, Upload, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFinance } from "@/context/FinanceContext";
import { showSuccess, showError } from "@/utils/toast";
import { Bank, Category, Transaction } from "@/types/finance";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ShareDataButtonProps {
  className?: string;
}

interface ParsedBackup {
  banks?: Bank[];
  transactions?: Transaction[];
  categories?: Category[];
}

const ShareDataButton = ({ className }: ShareDataButtonProps) => {
  const { banks, transactions, categories, importFullData } = useFinance();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<ParsedBackup | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const getData = () => ({
    banks,
    transactions,
    categories,
    version: "1.1",
    timestamp: new Date().toISOString()
  });

  const handleShareLink = async () => {
    try {
      const jsonString = JSON.stringify(getData());
      const encodedData = btoa(encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
      }));
      
      const shareUrl = `${window.location.origin}${window.location.pathname}?import=${encodedData}`;

      if (navigator.share) {
        await navigator.share({
          title: 'Backup Finance.io',
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showSuccess("Link de backup copiado!");
      }
    } catch (err) {
      showError("Link muito grande para compartilhar. Use a opção 'Baixar Arquivo'.");
    }
  };

  const handleDownloadFile = async () => {
    const dataStr = JSON.stringify(getData(), null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const exportFileDefaultName = `finance_backup_${new Date().toISOString().split('T')[0]}.json`;
    const file = new File([blob], exportFileDefaultName, { type: 'application/json' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Backup Finance.io',
          text: 'Seu backup de finanças',
        });
        showSuccess('Backup compartilhado com sucesso!');
        return;
      } catch (shareErr) {
        console.warn('Share failed, falling back to download', shareErr);
      }
    }

    const linkElement = document.createElement('a');
    linkElement.href = URL.createObjectURL(blob);
    linkElement.download = exportFileDefaultName;
    linkElement.click();
    URL.revokeObjectURL(linkElement.href);
    showSuccess('Arquivo de backup gerado!');
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const raw = JSON.parse(content);
        const payload = raw?.data && typeof raw.data === 'object' ? raw.data : raw;

        const hasBanks = Array.isArray(payload?.banks);
        const hasTransactions = Array.isArray(payload?.transactions);
        const hasCategories = Array.isArray(payload?.categories);

        if (!hasBanks && !hasTransactions && !hasCategories) {
          showError("Arquivo .json não contém contas, categorias ou transações válidas.");
          return;
        }

        setPendingImport({
          banks: hasBanks ? payload.banks : undefined,
          transactions: hasTransactions ? payload.transactions : undefined,
          categories: hasCategories ? payload.categories : undefined,
        });
        setConfirmOpen(true);
      } catch {
        showError("Arquivo de backup inválido ou corrompido.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!pendingImport || isImporting) return;
    setIsImporting(true);
    try {
      const result = await importFullData(pendingImport);
      if (result.success) {
        setConfirmOpen(false);
        setPendingImport(null);
        showSuccess("Backup restaurado e salvo na nuvem com sucesso!");
      } else {
        showError(`Falha ao salvar backup na nuvem: ${result.error || 'Erro desconhecido.'}`);
      }
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex items-center">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".json,application/json" 
        onChange={handleImportFile}
      />
      
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "rounded-xl h-8 w-8 border-slate-200/90 dark:border-slate-800 text-slate-500 hover:text-primary hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all bg-white dark:bg-slate-950 shadow-xs shrink-0",
                  className
                )}
              >
                <Share2 size={15} />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Backup e Sincronização</p>
          </TooltipContent>
        </Tooltip>
        
        <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
          <DropdownMenuLabel className="text-xs font-bold uppercase text-slate-400 px-2 py-1">Transferir Dados</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleShareLink} className="rounded-xl gap-2 cursor-pointer">
            <Share2 size={16} />
            <span>Compartilhar Link</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownloadFile} className="rounded-xl gap-2 cursor-pointer">
            <Download size={16} />
            <span>Baixar Arquivo (.json)</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="rounded-xl gap-2 cursor-pointer text-primary">
            <Upload size={16} />
            <span>Importar Arquivo</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={(open) => { if (!isImporting) setConfirmOpen(open); }}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <AlertTriangle className="text-amber-500 shrink-0" size={20} />
              Restaurar Backup (.json)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Os dados encontrados neste arquivo serão aplicados à sua conta e salvos na nuvem.
            </DialogDescription>
          </DialogHeader>

          {pendingImport && (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Contas / Cartões / Investimentos:</span>
                <span className="font-bold">{pendingImport.banks?.length ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Categorias:</span>
                <span className="font-bold">{pendingImport.categories?.length ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transações:</span>
                <span className="font-bold">{pendingImport.transactions?.length ?? 0}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isImporting}
              onClick={() => {
                setConfirmOpen(false);
                setPendingImport(null);
              }}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isImporting}
              onClick={handleConfirmImport}
              className="rounded-xl font-bold gap-2"
            >
              {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {isImporting ? "Restaurando na nuvem..." : "Restaurar Backup Agora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShareDataButton;