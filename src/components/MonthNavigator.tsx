"use client";

import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format, setMonth, setYear, getYear, getMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MonthNavigatorProps {
  currentDate: Date;
  onChange: (date: Date) => void;
}

const MonthNavigator = ({ currentDate, onChange }: MonthNavigatorProps) => {
  const years = Array.from({ length: 10 }, (_, i) => getYear(new Date()) - 5 + i);
  const months = Array.from({ length: 12 }, (_, i) => i);

  const handleYearChange = (year: string) => {
    onChange(setYear(currentDate, parseInt(year)));
  };

  const handleMonthChange = (month: string) => {
    onChange(setMonth(currentDate, parseInt(month)));
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <Calendar size={18} className="text-primary opacity-50" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Período</span>
      </div>

      <div className="flex items-center gap-2">
        <Select value={getYear(currentDate).toString()} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[100px] rounded-xl border-none bg-slate-50 dark:bg-slate-800 font-bold">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()} className="font-bold">
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={getMonth(currentDate).toString()} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-[140px] rounded-xl border-none bg-slate-50 dark:bg-slate-800 font-bold capitalize">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            {months.map((month) => (
              <SelectItem key={month} value={month.toString()} className="font-bold capitalize">
                {format(setMonth(new Date(), month), "MMMM", { locale: ptBR })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default MonthNavigator;