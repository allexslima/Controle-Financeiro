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
import { Link, useLocation } from "react-router-dom";

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: ArrowLeftRight, label: 'Transações', path: '/transactions' },
  { icon: Landmark, label: 'Contas', path: '/accounts' },
  { icon: CreditCard, label: 'Cartões', path: '/cards' },
];

const Sidebar = () => {
  const location = useLocation();

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
            <Link
              key={item.label}
              to={item.path}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                location.pathname === item.path 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
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