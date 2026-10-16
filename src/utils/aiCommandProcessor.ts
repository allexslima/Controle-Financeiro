import { TransactionMethod } from "../types/finance";

export interface BankContext {
  id: string;
  name: string;
  type: 'account' | 'credit_card' | 'investment';
  balance: number;
}

export interface CategoryContext {
  id: string;
  name: string;
}

export interface AiProcessResult {
  reply: string;
  action?: {
    type: 'addTransaction';
    data: {
      description: string;
      amount: number;
      method: TransactionMethod;
      bankId: string;
      destinationBankId?: string;
      category: string;
      date: string;
      installments?: number;
      isCompleted?: boolean;
    };
  };
}

const currencyFormat = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export function processAiCommandLocally(
  text: string,
  banks: BankContext[],
  categories: CategoryContext[],
  currentDate?: string
): AiProcessResult {
  const lower = text.toLowerCase().trim();
  const todayStr = currentDate || new Date().toISOString().split('T')[0];

  // 1. Respostas para consultas de saldo
  if (lower.includes('saldo') || lower.includes('quanto tenho') || lower.includes('patrimônio') || lower.includes('patrimonio')) {
    const totalAccounts = banks
      .filter(b => b.type === 'account')
      .reduce((sum, b) => sum + (Number(b.balance) || 0), 0);

    const totalInvestments = banks
      .filter(b => b.type === 'investment')
      .reduce((sum, b) => sum + (Number(b.balance) || 0), 0);

    const totalCreditDebt = banks
      .filter(b => b.type === 'credit_card')
      .reduce((sum, b) => sum + (Number(b.balance) || 0), 0);

    let reply = `Seu saldo total em contas correntes é de ${currencyFormat(totalAccounts)}.`;
    if (totalInvestments > 0) {
      reply += ` Em investimentos, você tem ${currencyFormat(totalInvestments)}.`;
    }
    if (totalCreditDebt > 0) {
      reply += ` Fatura atual de cartões: ${currencyFormat(totalCreditDebt)}.`;
    }
    return { reply };
  }

  // 2. Extrair valor monetário
  let amount = 0;
  // Procura padrões como "valor de 30", "30 reais", "R$ 30,50", "de 50", etc.
  const amountMatch = text.match(/(?:(?:no\s+)?valor\s+de\s+|r\$\s*|de\s+)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais|real|r\$)?/i);
  if (amountMatch && amountMatch[1]) {
    amount = parseFloat(amountMatch[1].replace(',', '.'));
  }

  // 3. Extrair descrição personalizada
  let customDescription = "";
  // Padrões como: "com nome Teste Teste", "com o nome Almoço", "nome Padaria", "descrição Mercado", "chamado Uber"
  const nameMatch = text.match(/(?:com\s+(?:o\s+)?nome|nome|descri[cç][aã]o|chamad[oa]|t[ií]tulo)\s*[:=]?\s*["']?([^.,;\n]+?)["']?(?:\.|\,|$|\s+(?:categoria|na\s+categoria|no\s+valor|no\s+cart[aã]o|no\s+cr[eé]dito|no\s+d[eé]bito|efetivad[oa]|pago|paga))/i);
  if (nameMatch && nameMatch[1]) {
    customDescription = nameMatch[1].trim();
  }

  // 4. Extrair status de efetivação (ex: "efetivada", "paga", "liquidada", "concluída")
  const isCompleted = /(?:efetivad[oa]|conclu[ií]d[oa]|pag[oa]|liquidado)/i.test(text);

  // 5. Extrair parcelas (ex: "em 3x", "em 3 vezes", "3 parcelas")
  let installments = 1;
  const installmentsMatch = text.match(/(?:em\s+)?(\d{1,2})\s*(?:x|vezes|parcelas)/i);
  if (installmentsMatch && installmentsMatch[1]) {
    installments = parseInt(installmentsMatch[1], 10) || 1;
  }

  // 6. Identificar método de pagamento
  let method: TransactionMethod = 'debit';
  if (
    lower.includes('crédito') ||
    lower.includes('credito') ||
    lower.includes('cartão') ||
    lower.includes('cartao')
  ) {
    method = 'credit';
  } else if (
    lower.includes('recebi') ||
    lower.includes('salário') ||
    lower.includes('salario') ||
    lower.includes('entrada') ||
    lower.includes('rendimento') ||
    lower.includes('ganhei') ||
    lower.includes('receita') ||
    lower.includes('depósito') ||
    lower.includes('deposito')
  ) {
    method = 'income';
  } else if (
    lower.includes('transfere') ||
    lower.includes('transferir') ||
    lower.includes('transferência') ||
    lower.includes('transferencia')
  ) {
    method = 'transfer';
  }

  // 7. Identificar banco / cartão
  let matchedBank = banks.find(b => lower.includes(b.name.toLowerCase()));
  if (!matchedBank) {
    if (method === 'credit') {
      matchedBank = banks.find(b => b.type === 'credit_card') || banks[0];
    } else {
      matchedBank = banks.find(b => b.type === 'account') || banks[0];
    }
  }

  // 8. Identificar categoria
  let categoryId = categories[0]?.id || 'Geral';
  let categoryName = 'Geral';

  // Primeiro verifica se tem "categoria [Nome]"
  const catMatch = text.match(/(?:na\s+categoria|categoria)\s*[:=]?\s*["']?([^.,;\n]+?)["']?(?:\.|\,|$|\s+(?:com\s+nome|no\s+valor|efetivad[oa]))/i);
  if (catMatch && catMatch[1]) {
    const specifiedCat = catMatch[1].trim().toLowerCase();
    const found = categories.find(
      c => c.name.toLowerCase() === specifiedCat ||
           c.name.toLowerCase().includes(specifiedCat) ||
           specifiedCat.includes(c.name.toLowerCase())
    );
    if (found) {
      categoryId = found.id;
      categoryName = found.name;
    }
  } else {
    // Procura por menções diretas de categorias
    const found = categories.find(c => lower.includes(c.name.toLowerCase()));
    if (found) {
      categoryId = found.id;
      categoryName = found.name;
    }
  }

  // 9. Descrição final
  let description = customDescription;
  if (!description) {
    if (lower.includes('almoço') || lower.includes('almoco')) description = "Almoço";
    else if (lower.includes('mercado') || lower.includes('supermercado')) description = "Supermercado";
    else if (lower.includes('combustível') || lower.includes('gasolina') || lower.includes('posto')) description = "Combustível";
    else if (lower.includes('farmácia') || lower.includes('farmacia') || lower.includes('remédio')) description = "Farmácia";
    else if (lower.includes('uber') || lower.includes('táxi') || lower.includes('taxi')) description = "Transporte / Uber";
    else if (lower.includes('salário') || lower.includes('salario')) description = "Salário";
    else if (method === 'credit') description = "Compra no cartão de crédito";
    else if (method === 'income') description = "Receita / Entrada";
    else description = "Despesa";
  }

  // Se tiver valor detectado e um banco válido
  if (amount > 0 && matchedBank) {
    const formattedVal = currencyFormat(amount);
    const targetName = matchedBank.name;
    
    let destBankId: string | undefined = undefined;
    if (method === 'transfer') {
      const otherBank = banks.find(b => b.id !== matchedBank?.id);
      destBankId = otherBank?.id;
    }

    let actionLabel = '';
    if (method === 'credit') {
      actionLabel = `no cartão de crédito (${targetName})`;
    } else if (method === 'income') {
      actionLabel = `como receita na conta ${targetName}`;
    } else if (method === 'transfer') {
      actionLabel = `transferido de ${targetName}`;
    } else {
      actionLabel = `na conta ${targetName}`;
    }

    const completedText = isCompleted ? ' (já marcada como efetivada)' : '';
    const installmentsText = installments > 1 ? ` em ${installments}x` : '';
    const categoryText = categoryName !== 'Geral' ? ` na categoria ${categoryName}` : '';

    const reply = `Adicionei "${description}" no valor de ${formattedVal} ${actionLabel}${categoryText}${installmentsText}${completedText}!`;

    return {
      reply,
      action: {
        type: 'addTransaction',
        data: {
          description,
          amount,
          method,
          bankId: matchedBank.id,
          destinationBankId: destBankId,
          category: categoryId,
          date: todayStr,
          installments,
          isCompleted,
        },
      },
    };
  }

  // Caso não tenha conseguido identificar um comando de lançamento claro
  return {
    reply: `Entendido! Você pode falar ou digitar comandos como:
• "Adicione a compra de 50 reais no cartão de crédito"
• "Compra no valor de 30 reais no crédito com nome Padaria, categoria Alimentação"
• "Gastei 45 reais no almoço no débito"
• "Recebi 2.000 reais de salário"
• "Qual o meu saldo total?"`,
  };
}
