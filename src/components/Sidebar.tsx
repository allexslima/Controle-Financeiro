"use client";

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard, 
  Wallet, 
  Settings,
  LogOut,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: ArrowUpRight, label: 'Transações', path: '/transactions' },
  { icon: Wallet, label: 'Contas e Cartões', path: '/accounts' },
  { icon: TrendingUp, label: 'Investimentos', path: '/investments' },
  { icon: Settings, label: 'Configurações', path: '/settings' },
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
          <TrendingUp className="text-white w-6 h-6" />
        </div>
        <span className="text-2xl font-bold text-gray-900 tracking-tight">Finanly</span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-blue-50 text-blue-600 font-medium" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-colors",
                isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
              )} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-50">
        <button className="flex items-center gap-3 px-4 py-3 w-full text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200">
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;