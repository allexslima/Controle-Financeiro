"use client";

import React from 'react';
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/context/FinanceContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface UndoButtonProps {
  className?: string;
}

const UndoButton = ({ className }: UndoButtonProps) => {
  const { undo, canUndo } = useFinance();

  if (!canUndo) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={undo}
          className={cn(
            "rounded-xl h-8 w-8 border-slate-200/90 dark:border-slate-800 text-slate-500 hover:text-primary hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all bg-white dark:bg-slate-950 shadow-xs shrink-0",
            className
          )}
        >
          <Undo2 size={15} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Desfazer última ação</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default UndoButton;