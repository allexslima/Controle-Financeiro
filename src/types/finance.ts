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
  order?: number; // Campo para ordenação manual
}