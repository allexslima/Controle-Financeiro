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
  const handlePrev = () => onChange(subMonths(currentDate, 1));
  const handleNext = () => onChange(addMonths(currentDate, 1));

  return (
    <div className="flex items-center gap-6 bg-white p-3 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={handlePrev}
        className="rounded-full h-12 w-12 hover:bg-slate-50 text-slate-400 hover:text-primary transition-all"
      >
        <ChevronLeft size={24} />
      </Button>
      
      <div className="flex flex-col items-center px-8 min-w-[220px]">
        <div className="flex items-center gap-2 text-primary mb-0.5">
          <Calendar size={14} className="opacity-50" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Período Selecionado</span>
        </div>
        <span className="text-xl font-black text-slate-900 capitalize">
          {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
        </span>
      </div>

      <Button 
        variant="ghost" 
        size="icon" 
        onClick={handleNext}
        className="rounded-full h-12 w-12 hover:bg-slate-50 text-slate-400 hover:text-primary transition-all"
      >
        <ChevronRight size={24} />
      </Button>
    </div>
  );
};

export default MonthNavigator;