export interface Bank {
  id: string;
  name: string;
  balance: number;
  color: string;
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  bankId: string;
}