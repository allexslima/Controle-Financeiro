"use client";

import React, { useState, useMemo } from 'react';
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import { useFinance } from "@/context/FinanceContext";
import { 
  format, 
  startOfYear, 
  addMonths, 
  setYear,
  getYear
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { calculateMonthlySummary } from "@/utils/financeCalculations";

const CalendarPage = () => {
  const navigate = useNavigate();
  const { transactions, banks } = useFinance();
  const [selectedYear, setSelectedYear] = useState(getYear(new Date()));
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', skipSnaps: false });

  const scrollPrev = React.useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = React.useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const yearData = useMemo(() => {
    const months = [];
    const yearStart = startOfYear(setYear(new Date(), selectedYear));

    for (let i = 0; i < 12; i++) {
      const currentMonth = addMonths(yearStart, i);
      const summary = calculateMonthlySummary(transactions, banks, currentMonth);

      months.push({
        date: currentMonth,
        name: format(currentMonth, "MMMM", { locale: ptBR }),
        completed: summary.completed,
        future: summary.future,
        previousBalance: summary.previousBalance,
        grandTotal: summary.grandTotal
      });
    }
    return months;
  }, [transactions, banks, selectedYear]);

  const handleMonthClick = (date: Date) => {
    navigate('/transactions', { state: { selectedDate: date.toISOString() } });
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      <Sidebar />
      <MobileNav />
      <main className="flex-1 p-4 md:p-10 overflow-y-auto pb-32 md:pb-10">
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <h1 className="text-3xl font-black text-slate-900 dark:text-white">Calendário Anual</h1>
              <p className="text-slate-500 text-sm font-medium">Resumo Geral do Mês para cada período</p>
            </div>

            <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSelectedYear(prev => prev - 1)}
                className="rounded-xl"
              >
                <ChevronLeft size={20} />
              </Button>
              <div className="flex items-center gap-2 px-4">
                <CalendarIcon size={18} className="text-primary opacity-50" />
                <span className="text-xl font-black text-slate-900 dark:text-white">{selectedYear}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSelectedYear(prev => prev + 1)}
                className="rounded-xl"
              >
                <ChevronRight size={20} />
              </Button>
            </div>
          </header>

          <div className="relative group">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex gap-6">
                {yearData.map((month, index) => (
                  <div 
                    key={index} 
                    className="flex-[0_0_85%] sm:flex-[0_0_50%] lg:flex-[0_0_33.33%] min-w-0"
                  >
                    <div 
                      onClick={() => handleMonthClick(month.date)}
                      className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-4 cursor-pointer hover:shadow-xl hover:border-primary/20 transition-all h-full flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="text-2xl font-black capitalize text-slate-900 dark:text-white">
                            {month.name}
                          </h3>
                          <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 px-2.5 py-1 rounded-full">
                            {selectedYear}
                          </span>
                        </div>
                        
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between font-medium text-slate-500">
                            <span>Valores Efetuados (Mês)</span>
                            <span className={month.completed >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(month.completed)}
                            </span>
                          </div>

                          <div className="flex justify-between font-medium text-slate-500">
                            <span>Valores Futuros (Mês)</span>
                            <span className={month.future >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(month.future)}
                            </span>
                          </div>

                          <div className="flex justify-between font-medium text-slate-500">
                            <span>Saldo Mês Anterior</span>
                            <span className={month.previousBalance >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(month.previousBalance)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center mt-6">
                        <span className="text-base font-black text-slate-900 dark:text-white">Total Geral</span>
                        <span className={`text-xl font-black ${month.grandTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(month.grandTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={scrollPrev}
              className="absolute -left-4 top-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 rounded-full shadow-xl border-none h-12 w-12 hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={24} />
            </Button>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={scrollNext}
              className="absolute -right-4 top-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 rounded-full shadow-xl border-none h-12 w-12 hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight size={24} />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CalendarPage;