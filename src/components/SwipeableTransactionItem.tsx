"use client";

import React, { useState, useRef } from 'react';
import { Trash2, Pencil, GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface SwipeableTransactionItemProps {
  id: string;
  children: React.ReactNode;
  onDelete: () => void;
  onEdit: () => void;
}

const SwipeableTransactionItem = ({ id, children, onDelete, onEdit }: SwipeableTransactionItemProps) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const threshold = 80;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only swipe if not dragging via the handle
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
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
    <div 
      ref={setNodeRef} 
      style={style} 
      className="relative overflow-hidden bg-slate-100 dark:bg-slate-800"
    >
      {/* Edit Button (Right swipe) */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-20 flex items-center justify-center bg-blue-600 text-white cursor-pointer"
        onClick={() => {
          onEdit();
          setOffsetX(0);
        }}
      >
        <Pencil size={20} />
      </div>

      {/* Delete Button (Left swipe) */}
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
        className="relative bg-white dark:bg-slate-900 transition-transform duration-200 ease-out flex items-center"
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div 
          {...attributes} 
          {...listeners} 
          className="p-4 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors"
        >
          <GripVertical size={20} />
        </div>
        
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SwipeableTransactionItem;