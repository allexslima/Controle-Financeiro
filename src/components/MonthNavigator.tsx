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
    <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={handlePrev}
        className="rounded-xl hover:bg-slate-50"
      >
        <ChevronLeft size={20} />
      </Button>
      
      <div className="flex items-center gap-2 px-4 min-w-[180px] justify-center">
        <Calendar size={18} className="text-primary" />
        <span className="text-sm font-bold text-slate-800 capitalize">
          {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
        </span>
      </div>

      <Button 
        variant="ghost" 
        size="icon" 
        onClick={handleNext}
        className="rounded-xl hover:bg-slate-50"
      >
        <ChevronRight size={20} />
      </Button>
    </div>
  );
};

export default MonthNavigator;