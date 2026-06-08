"use client";

import React, { useState, useRef } from 'react';
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeableTransactionItemProps {
  children: React.ReactNode;
  onDelete: () => void;
}

const SwipeableTransactionItem = ({ children, onDelete }: SwipeableTransactionItemProps) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const threshold = -80; // Distância para mostrar o botão de deletar

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    
    // Só permite arrastar para a esquerda
    if (diff < 0) {
      setOffsetX(Math.max(diff, -120));
    } else {
      setOffsetX(0);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (offsetX < threshold) {
      setOffsetX(-80);
    } else {
      setOffsetX(0);
    }
  };

  return (
    <div className="relative overflow-hidden bg-rose-600">
      <div 
        className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center text-white cursor-pointer"
        onClick={onDelete}
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