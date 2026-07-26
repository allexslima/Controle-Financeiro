import { Bank, Transaction } from "@/types/finance";
import { isSameMonth, parseISO, isBefore, startOfMonth, getDate, addMonths } from "date-fns";

export const getBillingMonth = (transaction: Transaction, banks: Bank[]) => {
  const tDate = parseISO(transaction.date);
  if (transaction.method !== 'credit') return tDate;
  
  const bank = banks.find(b => b.id === transaction.bankId);
  if (!bank || !bank.closingDay) return tDate;

  if (getDate(tDate) > bank.closingDay) {
    return addMonths(tDate, 1);
  }
  return tDate;
};

export const calculateMonthlySummary = (
  transactions: Transaction[], 
  banks: Bank[], 
  currentDate: Date
) => {
  const monthStart = startOfMonth(currentDate);
  const operationalBanks = banks.filter(b => b.type !== 'investment');

  const calculateBalance = (tList: Transaction[]) => {
    return tList.reduce((acc, t) => {
      const isOriginOp = operationalBanks.some(b => b.id === t.bankId);
      const isDestOp = operationalBanks.some(b => b.id === t.destinationBankId);

      if (t.method === 'income') return isOriginOp ? acc + t.amount : acc;
      
      if (t.method === 'transfer' || t.method === 'investment_apply' || t.method === 'investment_redeem') {
        let balance = acc;
        if (isOriginOp && !isDestOp) balance -= t.amount;
        if (!isOriginOp && isDestOp) balance += t.amount;
        return balance;
      }

      // 'debit' e 'credit'
      return isOriginOp ? acc - t.amount : acc;
    }, 0);
  };

  const baseTransactions = transactions.filter(t => {
    const billingMonth = getBillingMonth(t, banks);
    return isSameMonth(billingMonth, currentDate);
  });

  const previousTransactions = transactions.filter(t => 
    isBefore(getBillingMonth(t, banks), monthStart)
  );

  const completed = calculateBalance(baseTransactions.filter(t => t.isCompleted));
  const future = calculateBalance(baseTransactions.filter(t => !t.isCompleted));
  const previousBalance = calculateBalance(previousTransactions);
  const grandTotal = completed + future + previousBalance;

  return { completed, future, previousBalance, grandTotal };
};