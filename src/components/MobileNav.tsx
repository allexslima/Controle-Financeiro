"use client";

import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Landmark, 
  CreditCard, 
  Menu,
  PieChart,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import ThemeToggle from "./ThemeToggle";

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: ArrowLeftRight, label: 'Transações', path: '/transactions' },
  { icon: Landmark, label: 'Contas', path: '/accounts' },
  { icon: CreditCard, label: 'Cartões', path: '/cards' },
];

const MobileNav = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Só detecta se o toque começar perto da borda esquerda (primeiros 30px)
      if (e.touches[0].clientX < 30) {
        setTouchStart(e.touches[0].clientX);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStart === null) return;
      
      const currentTouch = e.touches[0].clientX;
      const diff = currentTouch - touchStart;

      // Se arrastar mais de 50px para a direita, abre o menu
      if (diff > 50) {
        setOpen(true);
        setTouchStart(null);
      }
    };

    const handleTouchEnd = () => {
      setTouchStart(null);
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [touchStart]);

  return (
    <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
          <PieChart size={18} />
        </div>
        <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Finance.io</span>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-xl">
            <Menu size={24} />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <div className="p-8 flex-1">
            <SheetHeader className="mb-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
                  <PieChart size={24} />
                </div>
                <SheetTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Finance.io</SheetTitle>
              </div>
            </SheetHeader>

            <nav className="space-y-2">
              {menuItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                    location.pathname === item.path 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-100"
                  )}
                >
                  <item.icon size={20} />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="p-8 border-t border-slate-50 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between px-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tema</span>
              <ThemeToggle />
            </div>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all">
              <LogOut size={20} />
              Sair da conta
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobileNav;