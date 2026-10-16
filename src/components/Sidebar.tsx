import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Landmark, 
  CreditCard, 
  LogOut,
  PieChart,
  BarChart3,
  CalendarDays,
  TrendingUp,
  User,
  LogIn,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import UndoButton from "./UndoButton";
import ShareDataButton from "./ShareDataButton";
import { useAuth } from "@/context/AuthContext";
import AiAssistantDialog from "./AiAssistantDialog";

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: ArrowLeftRight, label: 'Transações', path: '/transactions' },
  { icon: CalendarDays, label: 'Calendário', path: '/calendar' },
  { icon: TrendingUp, label: 'Investimentos', path: '/investments' },
  { icon: Landmark, label: 'Contas', path: '/accounts' },
  { icon: CreditCard, label: 'Cartões', path: '/cards' },
  { icon: BarChart3, label: 'Relatórios', path: '/report' },
  { icon: User, label: 'Perfil', path: '/profile' },
];

const Sidebar = () => {
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const [isAiOpen, setIsAiOpen] = useState(false);

  return (
    <>
      <AiAssistantDialog open={isAiOpen} onOpenChange={setIsAiOpen} />

      <aside className="w-72 bg-white dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800 flex flex-col h-screen sticky top-0 hidden md:flex shrink-0">
        <div className="p-6">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl flex items-center justify-center transition-colors shadow-xs shrink-0">
                <PieChart size={22} />
              </div>
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white truncate">
                Finance.io
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 pl-2">
              <UndoButton />
              <ShareDataButton />
            </div>
          </div>

          <nav className="space-y-1.5">
            {/* Botão de destaque Fale com IA */}
            <button
              type="button"
              onClick={() => setIsAiOpen(true)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-violet-600 via-indigo-600 to-primary text-white shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer group mb-3"
            >
              <div className="flex items-center gap-3">
                <Sparkles size={18} className="animate-pulse text-amber-300" />
                <span>Fale com IA</span>
              </div>
              <span className="text-[10px] bg-white/20 text-white font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                Voz
              </span>
            </button>
          {menuItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                location.pathname === item.path 
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg shadow-black/10 dark:shadow-white/5 font-bold" 
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-slate-50 dark:border-slate-800 space-y-4">
        {/* User Card */}
        {user ? (
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-xl space-y-2.5">
            <Link to="/profile" className="flex items-center gap-2.5 group">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  {profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'U'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-primary transition-colors">
                  {profile?.name}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {profile?.email}
                </p>
              </div>
            </Link>
            <button 
              onClick={signOut}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
            >
              <LogOut size={13} />
              Sair da conta
            </button>
          </div>
        ) : (
          <Link
            to="/auth"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 hover:bg-primary/15 text-primary rounded-xl text-xs font-bold transition-all"
          >
            <LogIn size={15} />
            Entrar / Criar Perfil
          </Link>
        )}

        <div className="flex items-center justify-between px-2 pt-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tema</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  </>
  );
};

export default Sidebar;