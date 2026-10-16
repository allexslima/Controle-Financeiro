import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';

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
  description: 'Adiciona uma movimentação financeira (despesa no cartão de crédito, débito, receita ou transferência) diretamente no sistema.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      description: {
        type: Type.STRING,
        description: 'Descrição ou nome da transação (ex: "Compra no cartão de crédito", "Almoço", "Supermercado", "Salário")',
      },
      amount: {
        type: Type.NUMBER,
        description: 'Valor monetário da transação em Reais (R$), positivo (ex: 50 para R$ 50,00).',
      },
      method: {
        type: Type.STRING,
        enum: ['credit', 'debit', 'income', 'transfer', 'investment_apply', 'investment_redeem'],
        description: 'Método de pagamento: "credit" para cartão de crédito, "debit" para débito/pix despesa, "income" para receitas/entradas, "transfer" para transferência entre contas.',
      },
      bankId: {
        type: Type.STRING,
        description: 'O ID da conta ou cartão onde a movimentação ocorreu (deve ser um dos IDs válidos da lista de contas do usuário).',
      },
      destinationBankId: {
        type: Type.STRING,
        description: 'Para transferências, o ID da conta de destino.',
      },
      category: {
        type: Type.STRING,
        description: 'O ID ou nome da categoria correspondente (ex: Alimentação, Transporte, Compras, Geral, etc.).',
      },
      date: {
        type: Type.STRING,
        description: 'Data da transação no formato ISO (YYYY-MM-DD ou ISO string). Se não especificado, usar a data atual.',
      },
      installments: {
        type: Type.NUMBER,
        description: 'Número de parcelas caso tenha sido mencionado (ex: 1, 2, 3...). Padrão 1.',
      },
    },
    required: ['description', 'amount', 'method', 'bankId'],
  },
};

import { processAiCommandLocally } from '../utils/aiCommandProcessor';

// Fallback inteligente em Português para garantir funcionamento mesmo se o serviço de IA estiver instável
function parsePortugueseCommandFallback(
  text: string,
  banks: BankContext[],
  categories: CategoryContext[],
  todayStr: string
) {
  return processAiCommandLocally(text, banks, categories, todayStr);
}

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

  const prompt = `Você é o assistente financeiro inteligente do aplicativo Finance.io.
O usuário enviou o seguinte comando por voz ou texto:
"${message}"

Data de hoje: ${todayStr}

Contas e Cartões disponíveis do usuário:
${banksContextStr || 'Nenhum banco cadastrado'}

Categorias disponíveis:
${categoriesContextStr || 'Nenhuma categoria cadastrada'}

Instruções:
1. Se o usuário estiver solicitando para adicionar uma despesa, compra, receita ou transferência (por exemplo: "Adicione a compra de 50 reais no cartão de credito"), invoque a ferramenta 'addTransaction'.
2. Se ele disser "no cartão de crédito", selecione o ID do cartão de crédito correspondente entre as opções acima (se não souber qual, pegue o primeiro do tipo "credit_card") e defina method: "credit".
3. Se ele disser "no débito" ou mencionar uma conta corrente, defina method: "debit".
4. Se ele falar de receita/ganho/salário, defina method: "income".
5. Se for apenas uma dúvida ou conversa, responda de forma amigável, clara e concisa em português do Brasil.`;

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
          const formattedVal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(args.amount || 0);

          const reply = response.text || `Adicionei a movimentação de ${formattedVal} (${args.description}) em ${targetBank?.name || 'sua conta'} com sucesso!`;

          return res.json({
            reply,
            action: {
              type: 'addTransaction',
              data: {
                description: args.description || 'Movimentação via IA',
                amount: Number(args.amount),
                method: args.method || 'credit',
                bankId: args.bankId || targetBank?.id,
                destinationBankId: args.destinationBankId,
                category: args.category || categories[0]?.id || 'Geral',
                date: args.date || todayStr,
                installments: Number(args.installments || 1),
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
      const fallback = parsePortugueseCommandFallback(message, banks, categories, todayStr);
      return res.json(fallback);
    }
  }

  // Fallback inteligente em português
  const fallback = parsePortugueseCommandFallback(message, banks, categories, todayStr);
  return res.json(fallback);
}
