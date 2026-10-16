"use client";

import React, { useState, useMemo } from "react";
import {
  Transaction,
  Bank,
} from "@/types/finance";
import {
  ArrowUpCircle,
  Wallet,
  CreditCard,
  Calendar,
  ArrowLeftRight,
  Pencil,
  Search,
  CheckCircle2,
  Clock,
  Repeat,
  Layers,
  Trash2,
  ArrowUpDown,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SwipeableTransactionItem from "./SwipeableTransactionItem";
import { cn } from "@/lib/utils";
import { useFinance } from "@/context/FinanceContext";

interface TransactionListProps {
  transactions: Transaction[];
  banks: Bank[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  enableReorder?: boolean;
}

const TransactionList = ({
  transactions,
  banks,
  onEdit,
  onDelete,
  enableReorder = false,
}: TransactionListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isReorderActive, setIsReorderActive] = useState(false);
  const { reorderTransactionSection, categories = [] } = useFinance();

  const isReordering = enableReorder || isReorderActive;

  const getBank = (id: string) => banks.find((b) => b.id === id);
  const getBankName = (id: string) => getBank(id)?.name || "Conta removida";

  const getCategory = (catIdOrName?: string) => {
    if (!catIdOrName) return null;
    return categories.find((c) => c.id === catIdOrName || c.name === catIdOrName) || null;
  };

  const getCategoryName = (catIdOrName?: string) => {
    if (!catIdOrName) return "";
    return getCategory(catIdOrName)?.name || catIdOrName;
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "income":
        return <ArrowUpCircle size={20} className="text-emerald-600" />;
      case "debit":
        return <Wallet size={20} className="text-blue-600" />;
      case "credit":
        return <CreditCard size={20} className="text-purple-600" />;
      case "transfer":
        return <ArrowLeftRight size={20} className="text-orange-500" />;
      case "investment_apply":
        return <ArrowLeftRight size={20} className="text-sky-600" />;
      case "investment_redeem":
        return <ArrowLeftRight size={20} className="text-amber-600" />;
      default:
        return <Wallet size={20} />;
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    const search = searchTerm.toLowerCase();
    const catName = getCategoryName(t.category).toLowerCase();
    return (
      t.description.toLowerCase().includes(search) ||
      t.amount.toString().includes(search) ||
      catName.includes(search)
    );
  });

  const splitTransactions = useMemo(() => {
    const completed = filteredTransactions
      .filter((t) => t.isCompleted === true)
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const pending = filteredTransactions
      .filter((t) => t.isCompleted !== true)
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return { completed, pending };
  }, [filteredTransactions]);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [draggedFromSection, setDraggedFromSection] = useState<
    "pending" | "completed" | null
  >(null);

  const handleDragStart = (
    e: React.DragEvent,
    id: string,
    section: "pending" | "completed"
  ) => {
    setDraggedId(id);
    setDraggedFromSection(section);
    // Add a class to the dragged element for styling
    e.currentTarget.classList.add("dragging");
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget.classList.contains("dragging")) {
      e.currentTarget.classList.remove("dragging");
    }
    setDraggedId(null);
    setDraggedFromSection(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (
    e: React.DragEvent,
    targetId: string,
    targetSection: "pending" | "completed"
  ) => {
    e.preventDefault();
    if (!draggedId) return;
    if (draggedFromSection !== targetSection) {
      // Not allowed to move between sections
      setDraggedId(null);
      setDraggedFromSection(null);
      return;
    }
    if (draggedId === targetId) {
      setDraggedId(null);
      setDraggedFromSection(null);
      return;
    }

    // Get the current list of ids for the section
    let sectionIds = (
      draggedFromSection === "pending"
        ? splitTransactions.pending
        : splitTransactions.completed
    ).map((t) => t.id);

    // Remove the draggedId from the list
    sectionIds = sectionIds.filter((id) => id !== draggedId);
    // Find the index of the targetId
    const targetIndex = sectionIds.indexOf(targetId);
    // Insert the draggedId at the targetIndex
    sectionIds.splice(targetIndex, 0, draggedId);

    // Update the order of transactions in the section
    reorderTransactionSection(sectionIds);

    setDraggedId(null);
    setDraggedFromSection(null);
  };

  const moveItem = (
    id: string,
    section: "pending" | "completed",
    direction: "up" | "down"
  ) => {
    const currentList = section === "pending"
      ? splitTransactions.pending
      : splitTransactions.completed;

    const currentIndex = currentList.findIndex((t) => t.id === id);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentList.length) return;

    const sectionIds = currentList.map((t) => t.id);
    const [removed] = sectionIds.splice(currentIndex, 1);
    sectionIds.splice(targetIndex, 0, removed);

    reorderTransactionSection(sectionIds);
  };

  const renderDraggableItem = (
    transaction: Transaction,
    isPending: boolean,
    section: "pending" | "completed",
    isFirst = false,
    isLast = false
  ) => {
    const destBank = transaction.destinationBankId
      ? getBank(transaction.destinationBankId)
      : null;
    const isCardPayment =
      transaction.method === "transfer" && destBank?.type === "credit_card";

    const isInstallment =
      transaction.installments && transaction.installments > 1;
    const isRecurring = transaction.isRecurring;
    const hasHighlight = isInstallment || isRecurring;

    // Se for pagamento de fatura e estivermos vendo o cartão, mostrar "Pagamento Recebido"
    const displayDescription = isCardPayment
      ? "Pagamento Recebido"
      : transaction.description;

    const isDragging = draggedId === transaction.id;

    const itemContent = (
      <div
        draggable={true}
        onDragStart={(e) =>
          handleDragStart(e, transaction.id, section)}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={(e) =>
          handleDrop(e, transaction.id, section)}
        className={cn(
          "p-4 flex items-center justify-between group cursor-grab dragging:cursor-grabbing",
          isDragging && "opacity-50 scale-[0.98]",
          isPending && "opacity-60 grayscale-[0.5] bg-slate-50/50 dark:bg-slate-900/50",
          hasHighlight && !isPending && "bg-slate-100 dark:bg-slate-800/60"
        )}
      >
        <div className="flex items-center gap-3">
          {/* Controles de Cima / Baixo e Arrastar */}
          <div className="flex items-center gap-0.5 -ml-1 text-slate-400">
            <div 
              title="Segure para arrastar"
              className="cursor-grab text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 p-0.5"
            >
              <GripVertical size={16} />
            </div>
            <div className="flex flex-col -space-y-0.5">
              <button
                type="button"
                title="Mover para cima"
                onClick={(e) => {
                  e.stopPropagation();
                  moveItem(transaction.id, section, "up");
                }}
                disabled={isFirst}
                className={cn(
                  "p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
                  isFirst && "opacity-20 cursor-not-allowed hover:bg-transparent"
                )}
              >
                <ChevronUp size={13} />
              </button>
              <button
                type="button"
                title="Mover para baixo"
                onClick={(e) => {
                  e.stopPropagation();
                  moveItem(transaction.id, section, "down");
                }}
                disabled={isLast}
                className={cn(
                  "p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
                  isLast && "opacity-20 cursor-not-allowed hover:bg-transparent"
                )}
              >
                <ChevronDown size={13} />
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center min-w-[24px]">
            {isPending ? (
              <Clock size={18} className="text-slate-400" />
            ) : (
              <CheckCircle2 size={18} className="text-emerald-500" />
            )}
          </div>
          <div className={cn(
            "p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm relative"
          )}>
            {getMethodIcon(transaction.method)}
            {isRecurring && (
              <div
                className="absolute -top-1 -right-1 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-full p-0.5 border-2 border-white dark:border-slate-800"
              >
                <Repeat size={8} />
              </div>
            )}
            {isInstallment && !isRecurring && (
              <div
                className="absolute -top-1 -right-1 bg-slate-500 text-white rounded-full p-0.5 border-2 border-white dark:border-slate-800"
              >
                <Layers size={8} />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                {displayDescription}
              </p>
              {transaction.amount < 0 && (
                <span className="text-[8px] font-black uppercase tracking-tighter bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md">
                  Estorno
                </span>
              )}
              {isRecurring && (
                <span
                  className="text-[8px] font-black uppercase tracking-tighter bg-primary/10 text-primary px-1.5 py-0.5 rounded-md"
                >
                  Recorrente
                </span>
              )}
              {isInstallment && (
                <span
                  className="text-[8px] font-black uppercase tracking-tighter bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md"
                >
                  Parcelado
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
              <span className="font-medium">
                {transaction.method === "transfer" ||
                transaction.method === "investment_apply" ||
                transaction.method === "investment_redeem"
                  ? `${getBankName(transaction.bankId)} → ${getBankName(
                      transaction.destinationBankId!
                    )}`
                  : getBankName(transaction.bankId)}
              </span>
              {transaction.category && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 font-medium">
                    {getCategory(transaction.category)?.color && (
                      <span 
                        className="w-1.5 h-1.5 rounded-full inline-block shrink-0" 
                        style={{ backgroundColor: getCategory(transaction.category)?.color }}
                      />
                    )}
                    <span>{getCategoryName(transaction.category)}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className={cn(
              "font-black text-sm",
              transaction.method === "income" || transaction.amount < 0
                ? "text-emerald-600 dark:text-emerald-400"
                : (transaction.method === "transfer" ||
                  transaction.method === "investment_redeem")
                ? "text-orange-500"
                : "text-rose-600 dark:text-rose-400"
            )}>
              {transaction.method === "income" ? "+" : ""}
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(transaction.amount)}
            </p>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 flex items-center justify-end gap-1 font-medium">
              <Calendar size={10} />
              {format(parseISO(transaction.date), "dd 'de' MMM", {
                locale: ptBR,
              })}
            </p>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-primary"
              onClick={() => onEdit(transaction)}
            >
              <Pencil size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-destructive"
              onClick={() => onDelete(transaction.id)}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      </div>
    );

    return (
      <SwipeableTransactionItem
        key={transaction.id}
        onDelete={() => onDelete(transaction.id)}
        onEdit={() => onEdit(transaction)}
      >
        {itemContent}
      </SwipeableTransactionItem>
    );
  };

  const renderItem = (transaction: Transaction, isPending: boolean) => {
    const destBank = transaction.destinationBankId
      ? getBank(transaction.destinationBankId)
      : null;
    const isCardPayment =
      transaction.method === "transfer" && destBank?.type === "credit_card";

    const isInstallment =
      transaction.installments && transaction.installments > 1;
    const isRecurring = transaction.isRecurring;
    const hasHighlight = isInstallment || isRecurring;

    // Se for pagamento de fatura e estivermos vendo o cartão, mostrar "Pagamento Recebido"
    const displayDescription = isCardPayment
      ? "Pagamento Recebido"
      : transaction.description;

    return (
      <SwipeableTransactionItem
        key={transaction.id}
        onDelete={() => onDelete(transaction.id)}
        onEdit={() => onEdit(transaction)}
      >
        <div className={cn(
          "p-4 hover:bg-slate-200/50 dark:hover:bg-slate-800/80 transition-all flex items-center justify-between group",
          isPending && "opacity-60 grayscale-[0.5] bg-slate-50/50 dark:bg-slate-900/50",
          hasHighlight && !isPending && "bg-slate-100 dark:bg-slate-800/60"
        )}>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center justify-center min-w-[24px]">
              {isPending ? (
                <Clock size={18} className="text-slate-400" />
              ) : (
                <CheckCircle2 size={18} className="text-emerald-500" />
              )}
            </div>
            <div className={cn(
              "p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm relative"
            )}>
              {getMethodIcon(transaction.method)}
              {isRecurring && (
                <div
                  className="absolute -top-1 -right-1 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-full p-0.5 border-2 border-white dark:border-slate-800"
                >
                  <Repeat size={8} />
                </div>
              )}
              {isInstallment && !isRecurring && (
                <div
                  className="absolute -top-1 -right-1 bg-slate-500 text-white rounded-full p-0.5 border-2 border-white dark:border-slate-800"
                >
                  <Layers size={8} />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  {displayDescription}
                </p>
                {transaction.amount < 0 && (
                  <span className="text-[8px] font-black uppercase tracking-tighter bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md">
                    Estorno
                  </span>
                )}
                {isRecurring && (
                  <span
                    className="text-[8px] font-black uppercase tracking-tighter bg-primary/10 text-primary px-1.5 py-0.5 rounded-md"
                  >
                    Recorrente
                  </span>
                )}
                {isInstallment && (
                  <span
                    className="text-[8px] font-black uppercase tracking-tighter bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md"
                  >
                  Parcelado
                </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="font-medium">
                  {transaction.method === "transfer" ||
                  transaction.method === "investment_apply" ||
                  transaction.method === "investment_redeem"
                    ? `${getBankName(transaction.bankId)} → ${getBankName(
                        transaction.destinationBankId!
                      )}`
                    : getBankName(transaction.bankId)}
                </span>
                {transaction.category && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 font-medium">
                      {getCategory(transaction.category)?.color && (
                        <span 
                          className="w-1.5 h-1.5 rounded-full inline-block shrink-0" 
                          style={{ backgroundColor: getCategory(transaction.category)?.color }}
                        />
                      )}
                      <span>{getCategoryName(transaction.category)}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className={cn(
                "font-black text-sm",
                transaction.method === "income" || transaction.amount < 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : (transaction.method === "transfer" ||
                    transaction.method === "investment_redeem")
                  ? "text-orange-500"
                  : "text-rose-600 dark:text-rose-400"
              )}>
                {transaction.method === "income" ? "+" : ""}
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(transaction.amount)}
              </p>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 flex items-center justify-end gap-1 font-medium">
                <Calendar size={10} />
                {format(parseISO(transaction.date), "dd 'de' MMM", {
                  locale: ptBR,
                })}
              </p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-primary"
                onClick={() => onEdit(transaction)}
              >
                <Pencil size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-destructive"
                onClick={() => onDelete(transaction.id)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        </div>
      </SwipeableTransactionItem>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden border border-slate-100 dark:border-slate-800">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar transação..."
            className="pl-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none focus-visible:ring-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Botão discreto para ativar a função ordem */}
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => setIsReorderActive(!isReorderActive)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border",
              isReorderActive
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
            )}
          >
            <ArrowUpDown size={13} />
            <span>{isReorderActive ? "Concluir ordenação" : "Organizar ordem"}</span>
          </button>

          {isReorderActive && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              Use as setas ⬆️ ⬇️ ou arraste
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-50 dark:divide-slate-800">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 font-medium">
            Nenhuma transação encontrada.
          </div>
        ) : (
          <>
            {isReordering ? (
              <>
                {splitTransactions.pending.length > 0 && (
                  <div className="bg-slate-50/30 dark:bg-slate-800/30 px-6 py-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Não Efetivadas (Futuras)
                    </span>
                  </div>
                )}
                <div className="space-y-2">
                  {splitTransactions.pending.map((t, idx, arr) =>
                    renderDraggableItem(t, true, "pending", idx === 0, idx === arr.length - 1)
                  )}
                </div>

                {splitTransactions.completed.length > 0 && (
                  <div className="bg-slate-50/30 dark:bg-slate-800/30 px-6 py-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Efetivadas
                    </span>
                  </div>
                )}
                <div className="space-y-2">
                  {splitTransactions.completed.map((t, idx, arr) =>
                    renderDraggableItem(t, false, "completed", idx === 0, idx === arr.length - 1)
                  )}
                </div>
              </>
            ) : (
              <>
                {splitTransactions.pending.length > 0 && (
                  <div className="bg-slate-50/30 dark:bg-slate-800/30 px-6 py-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Não Efetivadas (Futuras)
                    </span>
                  </div>
                )}
                {splitTransactions.pending.map((t) =>
                  renderItem(t, true)
                )}

                {splitTransactions.completed.length > 0 && (
                  <div className="bg-slate-50/30 dark:bg-slate-800/30 px-6 py-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Efetivadas
                    </span>
                  </div>
                )}
                {splitTransactions.completed.map((t) =>
                  renderItem(t, false)
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TransactionList;