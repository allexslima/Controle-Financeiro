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
      amount: number; // Valor de cada parcela inserida no banco
      totalAmount?: number; // Valor total da compra
      installmentAmount?: number; // Valor de cada parcela
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

interface ParsedInstallments {
  installments: number;
  totalAmount: number;
  installmentAmount: number;
}

/**
 * Extrai valores monetários e parcelas com suporte detalhado aos padrões em Português do Brasil.
 */
function parseInstallmentDetails(text: string): ParsedInstallments {
  // Limpar formatação comum de pontuação para facilitar regex
  const clean = text.replace(/R\$\s*/gi, 'R$ ');

  // Caso 1: Usuário fala o valor DE CADA PARCELA explicitamente
  // Exemplos: "em 3x de 100 reais", "3 vezes de 50", "3 parcelas de 50 reais", "4x de R$ 25", "em 10 vezes de 120"
  const patternNxVal = /(\d{1,2})\s*(?:x|vezes|parcelas)\s*(?:de\s+)?(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)/i;
  const matchNxVal = clean.match(patternNxVal);

  if (matchNxVal) {
    const installments = parseInt(matchNxVal[1], 10) || 1;
    const installmentAmount = parseFloat(matchNxVal[2].replace(',', '.'));
    const totalAmount = Number((installmentAmount * installments).toFixed(2));
    return { installments, totalAmount, installmentAmount };
  }

  // Caso 2: Usuário fala o VALOR TOTAL primeiro e depois o número de parcelas
  // Exemplos: "compra de 300 reais parcelada em 3 vezes", "300 reais em 3x", "tênis por 400 parcelado em 4x", "1200 reais parcelado em 10 vezes"
  const patternTotalThenN = /(?:valor\s+de\s+|de\s+|por\s+|r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais|real|r\$)?\s*(?:[^.,\n]*?)\s*(?:parcelad[oa]s?\s+em|em|dividid[oa]s?\s+em)\s+(\d{1,2})\s*(?:x|vezes|parcelas)/i;
  const matchTotalThenN = clean.match(patternTotalThenN);

  if (matchTotalThenN) {
    const totalAmount = parseFloat(matchTotalThenN[1].replace(',', '.'));
    const installments = parseInt(matchTotalThenN[2], 10) || 1;
    const installmentAmount = installments > 1 ? Number((totalAmount / installments).toFixed(2)) : totalAmount;
    return { installments, totalAmount, installmentAmount };
  }

  // Caso 3: "parcelado em 3x no valor de 300 reais" ou "parcelado em 3 vezes de 300 reais" (onde 300 é o total)
  const patternNThenTotal = /(?:parcelad[oa]s?\s+em|dividid[oa]s?\s+em)\s+(\d{1,2})\s*(?:x|vezes|parcelas)\s*(?:[^.,\n]*?)\s*(?:no\s+valor\s+de|total\s+de|de)\s*(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)/i;
  const matchNThenTotal = clean.match(patternNThenTotal);

  if (matchNThenTotal) {
    const installments = parseInt(matchNThenTotal[1], 10) || 1;
    const totalAmount = parseFloat(matchNThenTotal[2].replace(',', '.'));
    const installmentAmount = installments > 1 ? Number((totalAmount / installments).toFixed(2)) : totalAmount;
    return { installments, totalAmount, installmentAmount };
  }

  // Caso 4: Valor único padrão (à vista ou com indicação solta de parcelas)
  let totalAmount = 0;
  let installments = 1;

  // Procura valores monetários como "30 reais", "R$ 50,00", "valor de 150", "de 45"
  const patternSimpleVal = /(?:(?:no\s+)?valor\s+de\s+|r\$\s*|de\s+|por\s+)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais|real|r\$)?/i;
  const matchSimple = clean.match(patternSimpleVal);
  if (matchSimple && matchSimple[1]) {
    totalAmount = parseFloat(matchSimple[1].replace(',', '.'));
  }

  // Verifica se há parcelas mencionadas em outro ponto (ex: "em 3x", "em 2 vezes")
  const matchJustInstallments = clean.match(/(?:em\s+|parcelad[oa]\s+em\s+)?(\d{1,2})\s*(?:x|vezes|parcelas)/i);
  if (matchJustInstallments && matchJustInstallments[1]) {
    installments = parseInt(matchJustInstallments[1], 10) || 1;
  }

  const installmentAmount = installments > 1 && totalAmount > 0
    ? Number((totalAmount / installments).toFixed(2))
    : totalAmount;

  return { installments, totalAmount, installmentAmount };
}

export function processAiCommandLocally(
  text: string,
  banks: BankContext[],
  categories: CategoryContext[],
  currentDate?: string
): AiProcessResult {
  const lower = text.toLowerCase().trim();
  const todayStr = currentDate || new Date().toISOString().split('T')[0];

  // 1. Respostas para consultas de saldo e saúde financeira
  if (
    lower.includes('saldo') ||
    lower.includes('quanto tenho') ||
    lower.includes('patrimônio') ||
    lower.includes('patrimonio') ||
    lower.includes('minhas finanças') ||
    lower.includes('meu dinheiro')
  ) {
    const totalAccounts = banks
      .filter(b => b.type === 'account')
      .reduce((sum, b) => sum + (Number(b.balance) || 0), 0);

    const totalInvestments = banks
      .filter(b => b.type === 'investment')
      .reduce((sum, b) => sum + (Number(b.balance) || 0), 0);

    const totalCreditDebt = banks
      .filter(b => b.type === 'credit_card')
      .reduce((sum, b) => sum + (Number(b.balance) || 0), 0);

    let reply = `Seu saldo disponível em contas é de ${currencyFormat(totalAccounts)}.`;
    if (totalInvestments > 0) {
      reply += ` Em investimentos, você possui ${currencyFormat(totalInvestments)}.`;
    }
    if (totalCreditDebt > 0) {
      reply += ` A fatura atual dos seus cartões soma ${currencyFormat(totalCreditDebt)}.`;
    }
    return { reply };
  }

  // 2. Extração inteligente de valores e parcelas
  const { installments, totalAmount, installmentAmount } = parseInstallmentDetails(text);

  // 3. Extrair descrição personalizada
  let customDescription = "";
  const nameMatch = text.match(
    /(?:com\s+(?:o\s+)?nome|nome|descri[cç][aã]o|chamad[oa]|t[ií]tulo)\s*[:=]?\s*["']?([^.,;\n]+?)["']?(?:\.|\,|$|\s+(?:categoria|na\s+categoria|no\s+valor|no\s+cart[aã]o|no\s+cr[eé]dito|no\s+d[eé]bito|efetivad[oa]|pago|paga))/i
  );
  if (nameMatch && nameMatch[1]) {
    customDescription = nameMatch[1].trim();
  }

  // 4. Extrair status de efetivação
  const isCompleted = /(?:efetivad[oa]|conclu[ií]d[oa]|pag[oa]|liquidado)/i.test(text);

  // 5. Identificar método de pagamento
  let method: TransactionMethod = 'debit';
  const isInstallmentPurchase = installments > 1 || lower.includes('parcelad') || lower.includes('parcela');

  if (
    isInstallmentPurchase ||
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

  // 6. Identificar banco / cartão
  let matchedBank = banks.find(b => {
    const bankName = b.name.toLowerCase();
    return lower.includes(bankName) || bankName.includes(lower);
  });

  // Tenta encontrar por apelidos comuns
  if (!matchedBank) {
    if (lower.includes('nu') || lower.includes('roxinho')) {
      matchedBank = banks.find(b => b.name.toLowerCase().includes('nubank'));
    } else if (lower.includes('inter')) {
      matchedBank = banks.find(b => b.name.toLowerCase().includes('inter'));
    } else if (lower.includes('itau') || lower.includes('itaú')) {
      matchedBank = banks.find(b => b.name.toLowerCase().includes('itau') || b.name.toLowerCase().includes('itaú'));
    } else if (lower.includes('bradesco')) {
      matchedBank = banks.find(b => b.name.toLowerCase().includes('bradesco'));
    } else if (lower.includes('santander')) {
      matchedBank = banks.find(b => b.name.toLowerCase().includes('santander'));
    }
  }

  if (!matchedBank) {
    if (method === 'credit') {
      matchedBank = banks.find(b => b.type === 'credit_card') || banks[0];
    } else {
      matchedBank = banks.find(b => b.type === 'account') || banks[0];
    }
  }

  // 7. Identificar categoria
  let categoryId = categories[0]?.id || 'Geral';
  let categoryName = 'Geral';

  // Verifica menção explícita de "categoria [Nome]"
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
    // Procura por termos de categoria no texto
    const categoryKeywords: Record<string, string[]> = {
      'Alimentação': ['almoço', 'almoco', 'jantar', 'lanche', 'restaurante', 'ifood', 'comida', 'mercado', 'supermercado', 'padaria', 'pizza', 'café', 'churrasco', 'açougue', 'açougue'],
      'Transporte': ['uber', '99', 'gasolina', 'combustível', 'combustivel', 'posto', 'estacionamento', 'pedágio', 'pedagio', 'ônibus', 'metro', 'passagem'],
      'Saúde': ['farmácia', 'farmacia', 'drogaria', 'remédio', 'remedio', 'médico', 'medico', 'consulta', 'dentista', 'exame', 'hospital'],
      'Lazer': ['cinema', 'jogo', 'livro', 'passeio', 'praia', 'show', 'festa', 'viagem', 'hotel', 'netflix', 'spotify', 'bar'],
      'Moradia': ['aluguel', 'condomínio', 'condominio', 'luz', 'água', 'agua', 'energia', 'gás', 'gas', 'internet', 'iptu'],
      'Compras': ['celular', 'smartphone', 'iphone', 'computador', 'notebook', 'roupa', 'tênis', 'tenis', 'sapato', 'camisa', 'calça', 'shopee', 'mercado livre', 'amazon'],
      'Educação': ['curso', 'faculdade', 'escola', 'livro', 'mensalidade'],
    };

    let matchedCatName: string | null = null;
    for (const [catGroupName, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(k => lower.includes(k))) {
        matchedCatName = catGroupName;
        break;
      }
    }

    if (matchedCatName) {
      const found = categories.find(c => c.name.toLowerCase().includes(matchedCatName!.toLowerCase()));
      if (found) {
        categoryId = found.id;
        categoryName = found.name;
      }
    } else {
      // Procura direta no nome das categorias cadastradas
      const found = categories.find(c => lower.includes(c.name.toLowerCase()));
      if (found) {
        categoryId = found.id;
        categoryName = found.name;
      }
    }
  }

  // 8. Descrição inteligente da transação
  let description = customDescription;
  if (!description) {
    if (lower.includes('almoço') || lower.includes('almoco')) description = "Almoço";
    else if (lower.includes('jantar')) description = "Jantar";
    else if (lower.includes('mercado') || lower.includes('supermercado')) description = "Supermercado";
    else if (lower.includes('padaria')) description = "Padaria";
    else if (lower.includes('celular') || lower.includes('smartphone')) description = "Celular";
    else if (lower.includes('tênis') || lower.includes('tenis')) description = "Tênis";
    else if (lower.includes('roupa') || lower.includes('roupas')) description = "Roupas";
    else if (lower.includes('combustível') || lower.includes('gasolina') || lower.includes('posto')) description = "Combustível";
    else if (lower.includes('farmácia') || lower.includes('farmacia') || lower.includes('remédio')) description = "Farmácia";
    else if (lower.includes('uber') || lower.includes('táxi') || lower.includes('taxi')) description = "Transporte / Uber";
    else if (lower.includes('salário') || lower.includes('salario')) description = "Salário";
    else if (method === 'credit') {
      description = installments > 1 ? `Compra parcelada (${installments}x)` : "Compra no cartão de crédito";
    } else if (method === 'income') {
      description = "Receita / Entrada";
    } else {
      description = "Despesa";
    }
  }

  // 9. Processar data mencionada (ex: "ontem", "anteontem")
  let transactionDate = todayStr;
  if (lower.includes('ontem') && !lower.includes('anteontem')) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    transactionDate = d.toISOString().split('T')[0];
  } else if (lower.includes('anteontem')) {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    transactionDate = d.toISOString().split('T')[0];
  }

  // Se tiver valor detectado e um banco válido
  if (installmentAmount > 0 && matchedBank) {
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
    const categoryText = categoryName !== 'Geral' ? ` na categoria ${categoryName}` : '';

    let reply = '';
    if (installments > 1) {
      reply = `Adicionei a compra "${description}" no valor total de ${currencyFormat(totalAmount)} ${actionLabel}${categoryText} parcelada em ${installments}x de ${currencyFormat(installmentAmount)}${completedText}!`;
    } else {
      reply = `Adicionei "${description}" no valor de ${currencyFormat(totalAmount)} ${actionLabel}${categoryText}${completedText}!`;
    }

    return {
      reply,
      action: {
        type: 'addTransaction',
        data: {
          description,
          amount: installmentAmount, // <-- O valor de CADA parcela que será inserida mensalmente
          totalAmount, // <-- O valor total da compra
          installmentAmount, // <-- O valor de cada parcela
          method,
          bankId: matchedBank.id,
          destinationBankId: destBankId,
          category: categoryId,
          date: transactionDate,
          installments,
          isCompleted,
        },
      },
    };
  }

  // Caso não tenha conseguido identificar um comando de lançamento claro
  return {
    reply: `Entendido! Você pode falar ou digitar com toda liberdade, por exemplo:
• "Comprei um celular de 1.200 reais parcelado em 10 vezes no cartão"
• "Coloque uma compra de 300 reais em 3x no Nubank"
• "Compra em 4x de 50 reais no cartão de crédito"
• "Gastei 45 reais no almoço de hoje no débito"
• "Recebi 2.500 reais de salário no Itaú"
• "Qual é o meu saldo total?"`,
  };
}
