"use client";

import React, { useRef } from 'react';
import { Share2, Download, Upload, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/context/FinanceContext";
import { showSuccess, showError } from "@/utils/toast";
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

const ShareDataButton = () => {
  const { banks, transactions, categories, importFullData } = useFinance();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleDownloadFile = () => {
    const dataStr = JSON.stringify(getData(), null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `finance_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    showSuccess("Arquivo de backup gerado!");
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (window.confirm("Deseja importar os dados deste arquivo? Isso substituirá seus dados atuais.")) {
          importFullData(parsed);
          showSuccess("Dados importados com sucesso!");
        }
      } catch (err) {
        showError("Arquivo de backup inválido.");
      }
    };
    reader.readAsText(file);
    // Limpa o input para permitir importar o mesmo arquivo de novo se necessário
    event.target.value = '';
  };

  return (
    <div className="flex items-center">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".json" 
        onChange={handleImportFile}
      />
      
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl h-10 w-10 border-slate-200 text-slate-500 hover:text-primary hover:border-primary transition-all bg-white dark:bg-slate-900"
              >
                <Share2 size={18} />
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
    </div>
  );
};

export default ShareDataButton;