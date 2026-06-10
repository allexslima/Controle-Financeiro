"use client";

import React from 'react';
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/context/FinanceContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const UndoButton = () => {
  const { undo, canUndo } = useFinance();

  if (!canUndo) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={undo}
          className="rounded-xl h-10 w-10 border-slate-200 text-slate-500 hover:text-primary hover:border-primary transition-all bg-white dark:bg-slate-900"
        >
          <Undo2 size={18} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Desfazer última ação</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default UndoButton;