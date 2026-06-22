"use client";

import React from 'react';
import { Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/context/FinanceContext";
import LZString from "lz-string";
import { showSuccess, showError } from "@/utils/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ShareDataButton = () => {
  const { banks, transactions, categories } = useFinance();
  const [copied, setCopied] = React.useState(false);

  const handleShare = async () => {
    try {
      const dataToShare = {
        banks,
        transactions,
        categories,
        version: "1.0",
        timestamp: new Date().toISOString()
      };

      const jsonString = JSON.stringify(dataToShare);
      const compressed = LZString.compressToEncodedURIComponent(jsonString);
      
      // Gera a URL base + o parâmetro de importação
      const baseUrl = window.location.origin + window.location.pathname;
      const shareUrl = `${baseUrl}?import=${compressed}`;

      // Tenta usar a API de compartilhamento nativa (mobile)
      if (navigator.share) {
        await navigator.share({
          title: 'Meus Dados - Finance.io',
          text: 'Confira meu histórico financeiro no Finance.io',
          url: shareUrl,
        });
        showSuccess("Link compartilhado!");
      } else {
        // Fallback para copiar para a área de transferência
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        showSuccess("Link de backup copiado para a área de transferência!");
        setTimeout(() => setCopied(false), 3000);
      }
    } catch (err) {
      console.error(err);
      showError("Não foi possível gerar o link de compartilhamento.");
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={handleShare}
          className="rounded-xl h-10 w-10 border-slate-200 text-slate-500 hover:text-primary hover:border-primary transition-all bg-white dark:bg-slate-900"
        >
          {copied ? <Check size={18} className="text-emerald-500" /> : <Share2 size={18} />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Exportar e Compartilhar Dados</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default ShareDataButton;