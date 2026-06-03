"use client";

import React from 'react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Landmark, 
  CreditCard, 
  Settings,
  LogOut,
  PieChart
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: ArrowLeftRight, label: 'Transações', active: false },
  { icon: Landmark, label: 'Contas', active: false },
  { icon: CreditCard, label: 'Cartões', active: false },
  { icon: PieChart, label: 'Relatórios', active: false },
  { icon: Settings, label: 'Configurações', active: false },
];

const Sidebar = () => {
  return (
    <aside className="w-64 bg-white border-r border-slate-100 flex flex-col h-screen sticky top-0 hidden md:flex">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
            <PieChart size={24} />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900">Finance.io</span>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.label}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                item.active 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-8 border-t border-slate-50">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-rose-500 hover:bg-rose-50 transition-all">
          <LogOut size={20} />
          Sair da conta
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;