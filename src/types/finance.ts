export type BankType = 'account' | 'credit_card';

export interface Bank {
  id: string;
  name: string;
  balance: number;
  color: string;
  type: BankType;
  closingDay?: number; // Dia de fechamento da fatura (1-31)
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
}