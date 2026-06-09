"use client";

import React from 'react';
import { Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/context/FinanceContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const HistoryControls = () => {
  const { undo, redo, canUndo, canRedo } = useFinance();

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={undo}
            disabled={!canUndo}
            className="rounded-xl h-10 w-10 border-slate-200 text-slate-500 hover:text-primary hover:border-primary transition-all bg-white dark:bg-slate-900 disabled:opacity-30"
          >
            <Undo2 size={18} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Desfazer (Voltar)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={redo}
            disabled={!canRedo}
            className="rounded-xl h-10 w-10 border-slate-200 text-slate-500 hover:text-primary hover:border-primary transition-all bg-white dark:bg-slate-900 disabled:opacity-30"
          >
            <Redo2 size={18} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Refazer (Avançar)</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default HistoryControls;