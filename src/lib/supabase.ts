import { createClient } from '@supabase/supabase-js';
import { Bank, Category, Transaction } from '@/types/finance';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vzzpvrlahbvbyccpwven.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_PJKCt300r0iq1GsjfJnadQ_eDYWgbj1';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const safeDbRun = async (promise: PromiseLike<any>) => {
  try {
    const res = await promise;
    if (res?.error) {
      console.warn('Supabase query error:', res.error);
    }
    return res;
  } catch (err) {
    console.warn('Supabase network error:', err);
  }
};

export const mapBankFromDb = (row: any): Bank => ({
  id: row.id,
  name: row.name,
  balance: Number(row.balance) || 0,
  color: row.color,
  type: row.type,
  closingDay: row.closing_day ?? undefined,
  dueDay: row.due_day ?? undefined,
  investmentType: row.investment_type ?? undefined,
  yieldType: row.yield_type ?? undefined,
  yieldRate: row.yield_rate !== null ? Number(row.yield_rate) : undefined,
  yieldAmount: row.yield_amount !== null ? Number(row.yield_amount) : undefined,
});

export const mapBankToDb = (bank: Bank) => ({
  id: bank.id,
  name: bank.name,
  balance: bank.balance,
  color: bank.color,
  type: bank.type,
  closing_day: bank.closingDay ?? null,
  due_day: bank.dueDay ?? null,
  investment_type: bank.investmentType ?? null,
  yield_type: bank.yieldType ?? null,
  yield_rate: bank.yieldRate ?? null,
  yield_amount: bank.yieldAmount ?? null,
});

export const mapCategoryFromDb = (row: any): Category => ({
  id: row.id,
  name: row.name,
  color: row.color,
  icon: row.icon ?? undefined,
});

export const mapCategoryToDb = (category: Category) => ({
  id: category.id,
  name: category.name,
  color: category.color,
  icon: category.icon ?? null,
});

export const mapTransactionFromDb = (row: any): Transaction => ({
  id: row.id,
  description: row.description,
  amount: Number(row.amount) || 0,
  method: row.method,
  category: row.category,
  date: row.date,
  bankId: row.bank_id,
  destinationBankId: row.destination_bank_id ?? undefined,
  installments: row.installments ?? undefined,
  isRecurring: row.is_recurring ?? false,
  groupId: row.group_id ?? undefined,
  isCompleted: row.is_completed ?? true,
  order: row.order ?? 0,
});

export const mapTransactionToDb = (t: Transaction) => ({
  id: t.id,
  description: t.description,
  amount: t.amount,
  method: t.method,
  category: t.category,
  date: t.date,
  bank_id: t.bankId,
  destination_bank_id: t.destinationBankId ?? null,
  installments: t.installments ?? null,
  is_recurring: t.isRecurring ?? false,
  group_id: t.groupId ?? null,
  is_completed: t.isCompleted ?? true,
  order: t.order ?? 0,
});
