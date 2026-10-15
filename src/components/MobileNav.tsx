"use client";

import React from 'react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Landmark, 
  CreditCard, 
  PlusCircle,
  PieChart,
  BarChart3,
  CalendarDays
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import AddTransactionDialog from "./AddTransactionDialog";
import { useFinance } from "@/context/FinanceContext";
import UndoButton from "./UndoButton";
import ShareDataButton from "./ShareDataButton";
import { DatabaseStatus } from "./DatabaseStatus";
import { useAuth } from "@/context/AuthContext";
import { User } from "lucide-react";

const MobileNav = () => {
  const location = useLocation();
  const { banks, addTransaction } = useFinance();
  const { user, profile } = useAuth();

  const navItems = [
    { icon: LayoutDashboard, label: 'Início', path: '/' },
    { icon: CalendarDays, label: 'Calendário', path: '/calendar' },
    { icon: BarChart3, label: 'Relatórios', path: '/report' },
    { icon: Landmark, label: 'Contas', path: '/accounts' },
    { icon: CreditCard, label: 'Cartões', path: '/cards' },
  ];

  return (
    <>
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-lg flex items-center justify-center transition-colors">
            <PieChart size={18} />
          </div>
          <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Finance.io</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="scale-90 origin-right">
            <DatabaseStatus />
          </div>
          <Link
            to={user ? "/profile" : "/auth"}
            className="w-8 h-8 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center font-bold text-xs transition-colors"
            title={user ? "Meu Perfil" : "Entrar / Criar Perfil"}
          >
            {user && profile?.name ? profile.name.slice(0, 1).toUpperCase() : <User size={15} />}
          </Link>
          <UndoButton />
          <ShareDataButton />
        </div>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between z-50 pb-safe">
        <div className="flex items-center justify-between w-full max-w-md mx-auto">
          {navItems.slice(0, 2).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 transition-colors",
                location.pathname === item.path ? "text-primary" : "text-slate-400"
              )}
            >
              <item.icon size={20} />
              <span className="text-[9px] font-bold">{item.label}</span>
            </Link>
          ))}

          <div className="relative -top-6">
            <AddTransactionDialog 
              banks={banks} 
              onAdd={addTransaction} 
              variant="discrete" 
            />
          </div>

          {navItems.slice(2).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 transition-colors",
                location.pathname === item.path ? "text-primary" : "text-slate-400"
              )}
            >
              <item.icon size={20} />
              <span className="text-[9px] font-bold">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
      
      <div className="md:hidden h-28" />
    </>
  );
};

export default MobileNav;