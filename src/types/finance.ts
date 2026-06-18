export type BankType = 'account' | 'credit_card';

export interface Bank {
  id: string;
  name: string;
  balance: number;
  color: string;
  type: BankType;
  closingDay?: number;
  dueDay?: number;
}

export type TransactionMethod = 'debit' | 'credit' | 'income' | 'transfer';

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
  category: string; // ID da categoria
  date: string;
  bankId: string;
  destinationBankId?: string;
  installments?: number;
  isRecurring?: boolean;
  groupId?: string;
  isCompleted?: boolean;
}