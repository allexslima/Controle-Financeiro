import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { processAiCommandLocally } from '../utils/aiCommandProcessor';

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

export interface AiCommandRequest {
  message: string;
  banks: BankContext[];
  categories: CategoryContext[];
  currentDate?: string;
}

const addTransactionDeclaration: FunctionDeclaration = {
  name: 'addTransaction',
  description: 'Adiciona uma movimentação financeira (despesa no cartão de crédito, débito, receita ou transferência) diretamente no sistema. Lida com compras à vista ou compras parceladas com máxima precisão matemática.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      description: {
        type: Type.STRING,
        description: 'Descrição ou nome da transação (ex: "Celular", "Almoço", "Supermercado", "Tênis", "Salário")',
      },
      totalAmount: {
        type: Type.NUMBER,
        description: 'Valor TOTAL da compra/transação em Reais (R$). Exemplo: se o usuário disser "compra de 300 reais em 3x", totalAmount é 300. Se disser "3x de 100 reais", totalAmount é 300. Se for compra à vista de 50 reais, totalAmount é 50.',
      },
      installmentAmount: {
        type: Type.NUMBER,
        description: 'Valor de CADA parcela em Reais (R$). Exemplo: Para uma compra total de 300 em 3x, installmentAmount é 100 (300 / 3). Se o usuário disser "4 parcelas de 50 reais", installmentAmount é 50. Para compra à vista (1x), installmentAmount é igual a totalAmount.',
      },
      installments: {
        type: Type.NUMBER,
        description: 'Quantidade de parcelas (ex: 1 se for à vista; 2, 3, 6, 10, 12 se for parcelado). Padrão 1.',
      },
      method: {
        type: Type.STRING,
        enum: ['credit', 'debit', 'income', 'transfer', 'investment_apply', 'investment_redeem'],
        description: 'Método de pagamento: "credit" para cartão de crédito (sempre use "credit" se a compra for parcelada), "debit" para débito/pix despesa, "income" para receitas/entradas, "transfer" para transferências.',
      },
      bankId: {
        type: Type.STRING,
        description: 'O ID da conta ou cartão onde a movimentação ocorreu (deve ser um dos IDs válidos da lista de contas/cartões do usuário).',
      },
      destinationBankId: {
        type: Type.STRING,
        description: 'Para transferências, o ID da conta de destino.',
      },
      category: {
        type: Type.STRING,
        description: 'O ID da categoria mais apropriada entre as disponíveis (ex: Alimentação, Transporte, Compras, Geral, etc.).',
      },
      date: {
        type: Type.STRING,
        description: 'Data da transação no formato ISO (YYYY-MM-DD). Se o usuário disser "ontem", calcule a data de ontem a partir de hoje; se disser "hoje" ou não especificar, use a data atual.',
      },
      isCompleted: {
        type: Type.BOOLEAN,
        description: 'Indica se a transação já foi paga/efetivada (true) ou se é futura/pendente (false).',
      },
    },
    required: ['description', 'totalAmount', 'installmentAmount', 'method', 'bankId'],
  },
};

const currencyFormat = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export async function handleAiCommand(req: any, res: any) {
  const { message, banks = [], categories = [], currentDate } = req.body as AiCommandRequest;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Mensagem não fornecida' });
  }

  const todayStr = currentDate || new Date().toISOString().split('T')[0];

  // Preparar lista de bancos e categorias para passar no contexto da IA
  const banksContextStr = (banks || [])
    .map(b => `- ID: "${b.id}", Nome: "${b.name}", Tipo: ${b.type}, Saldo: R$ ${b.balance}`)
    .join('\n');

  const categoriesContextStr = (categories || [])
    .map(c => `- ID: "${c.id}", Nome: "${c.name}"`)
    .join('\n');

  const prompt = `Você é o assistente financeiro pessoal de alta inteligência do aplicativo Finance.io.
O usuário enviou o seguinte comando por voz ou texto:
"${message}"

Data de referência (hoje): ${todayStr}

Contas e Cartões disponíveis do usuário:
${banksContextStr || 'Nenhum banco cadastrado'}

Categorias disponíveis:
${categoriesContextStr || 'Nenhuma categoria cadastrada'}

REGRAS DE INTERPRETAÇÃO E COMPREENSÃO CRÍTICAS:
1. COMPRAS PARCELADAS:
   - Se o usuário disser "compra de X reais parcelada em N vezes" (ex: "compra de 300 reais em 3x" ou "celular de 1200 em 10 vezes"):
     * totalAmount = X (ex: 300 ou 1200)
     * installments = N (ex: 3 ou 10)
     * installmentAmount = X / N (ex: 300 / 3 = 100, ou 1200 / 10 = 120)
     * NUNCA coloque o valor total como sendo o valor de cada parcela!
   - Se o usuário disser "N parcelas de X reais" ou "N vezes de X reais" (ex: "3x de 100 reais", "4 parcelas de 50 reais"):
     * installmentAmount = X (ex: 100 ou 50)
     * installments = N (ex: 3 ou 4)
     * totalAmount = N * X (ex: 300 ou 200)
   - Sempre que uma compra for parcelada (installments > 1), o método DEVE ser "credit" e a conta deve ser preferencialmente um cartão de crédito ("credit_card").

2. ESCOLHA DE BANCO / CARTÃO:
   - Correlacione o banco falado pelo usuário com a lista fornecida (ex: "nubank", "nu", "inter", "itaú", "itau", "santander", "bradesco", etc.).
   - Se não for especificado nenhum banco e for compra no crédito/parcelada, escolha o primeiro cartão de crédito da lista.
   - Se for débito/pix, escolha a conta corrente principal.

3. CATEGORIAS:
   - Deduza a melhor categoria com base no que foi comprado (ex: refeições -> Alimentação, combustível/uber -> Transporte, celular/tênis/roupas -> Compras, remédio -> Saúde).
   - Use o ID exato da categoria correspondente na chamada.

4. ESTABELECIMENTO / LOCAL DA COMPRA E DESCRIÇÃO:
   - Se o usuário mencionar o estabelecimento, loja ou local onde comprou (ex: "compra no mercado teste", "padaria central", "posto ipiranga", "shopee", "farmácia pague menos"), PRESERVE esse nome na 'description' (ex: "Mercado Teste", "Padaria Central", "Posto Ipiranga"). NÃO substitua o nome do estabelecimento pelo termo genérico da categoria.

5. SE FOR UMA CONSULTA OU CONVERSA:
   - Se o usuário perguntar saldo, gastos ou como estão as finanças, responda detalhadamente com clareza, empatia e cordialidade em português do Brasil, usando os saldos das contas e faturas informadas acima sem chamar ferramentas.`;

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          tools: [{ functionDeclarations: [addTransactionDeclaration] }],
        },
      });

      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        if (call.name === 'addTransaction') {
          const args: any = call.args;
          const targetBank = banks.find(b => b.id === args.bankId) || banks[0];
          const installmentsCount = Math.max(1, Number(args.installments || 1));

          let installmentAmount = Number(args.installmentAmount || 0);
          let totalAmount = Number(args.totalAmount || 0);

          if (installmentAmount <= 0 && totalAmount > 0) {
            installmentAmount = installmentsCount > 1
              ? Number((totalAmount / installmentsCount).toFixed(2))
              : totalAmount;
          } else if (totalAmount <= 0 && installmentAmount > 0) {
            totalAmount = Number((installmentAmount * installmentsCount).toFixed(2));
          }

          // Montar resposta clara e detalhada
          let reply = response.text;
          if (!reply) {
            if (installmentsCount > 1) {
              reply = `Adicionei a compra "${args.description}" no valor total de ${currencyFormat(totalAmount)} no cartão ${targetBank?.name || 'de crédito'} parcelada em ${installmentsCount}x de ${currencyFormat(installmentAmount)} com sucesso!`;
            } else {
              reply = `Adicionei "${args.description}" no valor de ${currencyFormat(totalAmount)} em ${targetBank?.name || 'sua conta'} com sucesso!`;
            }
          }

          return res.json({
            reply,
            action: {
              type: 'addTransaction',
              data: {
                description: args.description || 'Movimentação via IA',
                amount: installmentAmount, // <-- O valor de cada parcela mensal
                totalAmount, // <-- O valor total
                installmentAmount, // <-- O valor da parcela
                method: args.method || (installmentsCount > 1 ? 'credit' : 'debit'),
                bankId: args.bankId || targetBank?.id,
                destinationBankId: args.destinationBankId,
                category: args.category || categories[0]?.id || 'Geral',
                date: args.date || todayStr,
                installments: installmentsCount,
                isCompleted: args.isCompleted ?? false,
              },
            },
          });
        }
      }

      if (response.text) {
        return res.json({ reply: response.text });
      }
    } catch (_error) {
      // Quando a API do Gemini não estiver acessível, aciona o parser inteligente local
      const fallback = processAiCommandLocally(message, banks, categories, todayStr);
      return res.json(fallback);
    }
  }

  // Fallback inteligente em português
  const fallback = processAiCommandLocally(message, banks, categories, todayStr);
  return res.json(fallback);
}
