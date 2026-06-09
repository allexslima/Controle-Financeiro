"use client";

import React, { useState, useRef } from 'react';
import { Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeableTransactionItemProps {
  children: React.ReactNode;
  onDelete: () => void;
  onEdit: () => void;
}

const SwipeableTransactionItem = ({ children, onDelete, onEdit }: SwipeableTransactionItemProps) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const threshold = 80; // Distância para mostrar os botões

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    
    // Limita o arrasto entre -120 e 120
    setOffsetX(Math.min(Math.max(diff, -120), 120));
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (offsetX < -threshold) {
      setOffsetX(-80);
    } else if (offsetX > threshold) {
      setOffsetX(80);
    } else {
      setOffsetX(0);
    }
  };

  return (
    <div className="relative overflow-hidden bg-slate-100 dark:bg-slate-800">
      {/* Botão de Editar (Aparece ao arrastar para a direita) */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-20 flex items-center justify-center bg-blue-600 text-white cursor-pointer"
        onClick={() => {
          onEdit();
          setOffsetX(0);
        }}
      >
        <Pencil size={20} />
      </div>

      {/* Botão de Deletar (Aparece ao arrastar para a esquerda) */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-rose-600 text-white cursor-pointer"
        onClick={() => {
          onDelete();
          setOffsetX(0);
        }}
      >
        <Trash2 size={20} />
      </div>

      <div 
        className="relative bg-white dark:bg-slate-900 transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableTransactionItem;