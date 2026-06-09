"use client";

import React from 'react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Landmark, 
  CreditCard, 
  PlusCircle,
  PieChart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import AddTransactionDialog from "./AddTransactionDialog";
import { useFinance } from "@/context/FinanceContext";
import HistoryControls from "./HistoryControls";

const MobileNav = () => {
  const location = useLocation();
  const { banks, addTransaction } = useFinance();

  const navItems = [
    { icon: LayoutDashboard, label: 'Início', path: '/' },
    { icon: ArrowLeftRight, label: 'Transações', path: '/transactions' },
    { icon: Landmark, label: 'Contas', path: '/accounts' },
    { icon: CreditCard, label: 'Cartões', path: '/cards' },
  ];

  return (
    <>
      {/* Top Bar for Mobile (Logo and History) */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <PieChart size={18} />
          </div>
          <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Finance.io</span>
        </div>
        <HistoryControls />
      </div>

      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 px-6 py-3 flex items-center justify-between z-50 pb-safe">
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
              <item.icon size={22} />
              <span className="text-[10px] font-bold">{item.label}</span>
            </Link>
          ))}

          {/* Central Plus Button */}
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
              <item.icon size={22} />
              <span className="text-[10px] font-bold">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
      
      {/* Spacer to prevent content from being hidden behind the bottom nav */}
      <div className="md:hidden h-24" />
    </>
  );
};

export default MobileNav;