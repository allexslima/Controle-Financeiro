export type BankType = 'account' | 'credit_card' | 'investment';

export interface Bank {
  id: string;
  name: string;
  balance: number;
  color: string;
  type: BankType;
  closingDay?: number;
  dueDay?: number;
  investmentType?: string; // Ex: CDB, Ações, FIIs...
  yieldRate?: number;      // Taxa de rendimento em %
  yieldAmount?: number;    // Valor do rendimento em R$
}

export type TransactionMethod = 'debit' | 'credit' | 'income' | 'transfer' | 'investment_apply' | 'investment_redeem';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  method: TransactionMethod;
  category: string;
  date: string;
  bankId: string;
  destinationBankId?: string;
  installments?: number;
  isRecurring?: boolean;
  groupId?: string;
  isCompleted?: boolean;
}