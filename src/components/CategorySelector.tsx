"use client";

import React, { useState } from 'react';
import { 
  Check, 
  ChevronsUpDown, 
  Plus, 
  Pencil, 
  Trash2, 
  Search,
  Tag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useFinance } from "@/context/FinanceContext";
import { Category } from "@/types/finance";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface CategorySelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

const CategorySelector = ({ value, onChange, error }: CategorySelectorProps) => {
  const { categories, addCategory, updateCategory, deleteCategory } = useFinance();
  const [open, setOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("#3b82f6");

  const selectedCategory = categories.find((cat) => cat.id === value);

  const handleSaveCategory = () => {
    if (!catName) return;

    if (editingCategory) {
      updateCategory({ ...editingCategory, name: catName, color: catColor });
    } else {
      addCategory({
        id: Math.random().toString(36).substr(2, 9),
        name: catName,
        color: catColor,
      });
    }
    setManageOpen(false);
    setEditingCategory(null);
    setCatName("");
  };

  const openCreate = () => {
    setEditingCategory(null);
    setCatName("");
    setCatColor("#3b82f6");
    setManageOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatColor(cat.color);
    setManageOpen(true);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between rounded-xl h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800",
              error && "border-destructive"
            )}
          >
            <div className="flex items-center gap-2">
              {selectedCategory ? (
                <>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedCategory.color }} />
                  {selectedCategory.name}
                </>
              ) : (
                <span className="text-slate-400">Selecionar categoria...</span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0 rounded-2xl overflow-hidden" align="start">
          <Command>
            <CommandInput placeholder="Buscar categoria..." />
            <CommandList>
              <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
              <CommandGroup>
                {categories.map((cat) => (
                  <CommandItem
                    key={cat.id}
                    value={cat.name}
                    onSelect={() => {
                      onChange(cat.id);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          value === cat.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6" 
                        onClick={(e) => { e.stopPropagation(); openEdit(cat); }}
                      >
                        <Pencil size={12} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-rose-500" 
                        onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <div className="p-2 border-t border-slate-100 dark:border-slate-800">
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 rounded-xl text-primary hover:bg-primary/5"
                onClick={openCreate}
              >
                <Plus size={16} />
                Nova Categoria
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editingCategory ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Categoria</Label>
              <Input 
                placeholder="Ex: Mercado, Assinaturas..." 
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Cor de Identificação</Label>
              <div className="flex gap-3 items-center">
                <Input
                  type="color"
                  value={catColor}
                  onChange={(e) => setCatColor(e.target.value)}
                  className="w-12 h-12 p-1 rounded-lg cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">Escolha uma cor para o gráfico</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveCategory} className="w-full rounded-xl py-6 text-lg">
              Salvar Categoria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategorySelector;