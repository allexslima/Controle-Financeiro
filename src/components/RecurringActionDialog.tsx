"use client";

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface RecurringActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onAction: (mode: 'single' | 'future' | 'all') => void;
  type: 'edit' | 'delete';
}

const RecurringActionDialog = ({ 
  open, 
  onOpenChange, 
  title, 
  description, 
  onAction,
  type 
}: RecurringActionDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-[2rem]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-bold">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-500">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2 py-4">
          <Button 
            variant="outline" 
            className="justify-start h-12 rounded-xl font-semibold"
            onClick={() => {
              onAction('single');
              onOpenChange(false);
            }}
          >
            Apenas esta
          </Button>
          
          <Button 
            variant="outline" 
            className="justify-start h-12 rounded-xl font-semibold"
            onClick={() => {
              onAction('future');
              onOpenChange(false);
            }}
          >
            Esta e as próximas
          </Button>

          {type === 'delete' && (
            <Button 
              variant="outline" 
              className="justify-start h-12 rounded-xl font-semibold text-rose-600 hover:text-rose-700"
              onClick={() => {
                onAction('all');
                onOpenChange(false);
              }}
            >
              Todas as ocorrências
            </Button>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RecurringActionDialog;