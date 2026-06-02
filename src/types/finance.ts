export interface Bank {
  id: string;
  name: string;
  balance: number;
  color: string;
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
  destinationBankId?: string; // Usado apenas em transferências
}