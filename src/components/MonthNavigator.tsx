"use client";

import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";

interface MonthNavigatorProps {
  currentDate: Date;
  onChange: (date: Date) => void;
}

const MonthNavigator = ({ currentDate, onChange }: MonthNavigatorProps) => {
  return (
    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => onChange(subMonths(currentDate, 1))}
        className="rounded-xl h-10 w-10"
      >
        <ChevronLeft size={20} />
      </Button>
      
      <div className="flex items-center gap-3 px-4 min-w-[140px] justify-center">
        <Calendar size={16} className="text-primary opacity-50 hidden sm:block" />
        <span className="text-sm font-black capitalize text-slate-900 dark:text-white">
          {format(currentDate, "MMMM/yy", { locale: ptBR })}
        </span>
      </div>

      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => onChange(addMonths(currentDate, 1))}
        className="rounded-xl h-10 w-10"
      >
        <ChevronRight size={20} />
      </Button>
    </div>
  );
};

export default MonthNavigator;