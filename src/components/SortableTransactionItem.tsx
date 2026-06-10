"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import SwipeableTransactionItem from './SwipeableTransactionItem';

interface SortableTransactionItemProps {
  id: string;
  children: React.ReactNode;
  onDelete: () => void;
  onEdit: () => void;
}

const SortableTransactionItem = ({ id, children, onDelete, onEdit }: SortableTransactionItemProps) => {
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
    zIndex: isDragging ? 50 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group/sortable relative">
      <div 
        {...attributes} 
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 p-2 cursor-grab active:cursor-grabbing opacity-0 group-hover/sortable:opacity-100 transition-opacity z-10 text-slate-300 hover:text-slate-500 hidden md:block"
      >
        <GripVertical size={16} />
      </div>
      <SwipeableTransactionItem onDelete={onDelete} onEdit={onEdit}>
        {children}
      </SwipeableTransactionItem>
    </div>
  );
};

export default SortableTransactionItem;