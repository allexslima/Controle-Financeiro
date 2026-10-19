"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Mic, 
  MicOff, 
  Send, 
  Bot, 
  User as UserIcon, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  CreditCard, 
  Landmark, 
  ArrowUpRight, 
  ArrowDownRight,
  RotateCcw,
  Loader2,
  ExternalLink,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/context/FinanceContext";
import { showSuccess, showError } from "@/utils/toast";
import { Transaction } from "@/types/finance";
import { processAiCommandLocally } from "@/utils/aiCommandProcessor";

const currencyFormat = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  actionExecuted?: {
    type: 'addTransaction';
    data: any;
    isUndone?: boolean;
  };
}

interface AiAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AiAssistantDialog: React.FC<AiAssistantDialogProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const { banks, categories, addTransaction, undo, deleteTransaction } = useFinance();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Olá! Sou sua inteligência financeira. Você pode falar ou digitar com total liberdade, por exemplo: "Comprei um celular de 1.200 reais parcelado em 10 vezes no cartão", "Coloque compra de 300 reais em 3x no Nubank" ou "Gastei 45 no almoço no débito". Como posso ajudar você agora?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Inicializar Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
        const clean = transcript.trim();
        if (clean) {
          setInput(clean);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Parar gravação se o modal for fechado
  useEffect(() => {
    if (!open && isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (_e) {}
      setIsListening(false);
    }
  }, [open, isListening]);

  // Rolar para a última mensagem
  useEffect(() => {
    if (open) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  // Falar resposta da IA via Text-To-Speech (se ativado)
  const speakText = (text: string) => {
    if (!voiceReplyEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS error:', e);
    }
  };

  const toggleListening = () => {
    if (!speechSupported) {
      showError('O reconhecimento de voz não é suportado neste navegador. Digite seu comando.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        setInput('');
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Failed to start recognition:', err);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    // Se estava ouvindo, para
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const userMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      sender: 'user',
      text: query,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let data: any = null;

      // 1. Tentar processar via API do servidor (Gemini)
      try {
        const response = await fetch('/api/ai-command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: query,
            banks: banks.map(b => ({
              id: b.id,
              name: b.name,
              type: b.type,
              balance: b.balance,
            })),
            categories: categories.map(c => ({
              id: c.id,
              name: c.name,
            })),
            currentDate: new Date().toISOString(),
          }),
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            data = await response.json();
          }
        }
      } catch (_serverErr) {
        // Falha de rede ou rota inexistente (ex: deploy estático na Vercel)
        data = null;
      }

      // 2. Se a API estiver offline, lenta ou indisponível, processar localmente com precisão imediata
      if (!data || !data.reply) {
        data = processAiCommandLocally(
          query,
          banks.map(b => ({ id: b.id, name: b.name, type: b.type, balance: b.balance })),
          categories.map(c => ({ id: c.id, name: c.name })),
          new Date().toISOString().split('T')[0]
        );
      }

      let actionExecuted = undefined;

      // Se foi determinado o lançamento de uma transação
      if (data.action?.type === 'addTransaction' && data.action.data) {
        const txData = data.action.data;
        const newTx: Transaction = {
          id: Math.random().toString(36).substr(2, 9),
          description: txData.description || 'Lançamento via IA',
          amount: Number(txData.amount) || 0,
          method: txData.method || 'credit',
          bankId: txData.bankId || banks[0]?.id,
          destinationBankId: txData.destinationBankId,
          category: txData.category || categories[0]?.id || 'Geral',
          date: txData.date || new Date().toISOString(),
          installments: txData.installments || 1,
          isCompleted: txData.isCompleted ?? false,
        };

        // Adiciona diretamente no contexto financeiro (atualiza saldo e persiste no banco de dados)
        const createdTxs = addTransaction(newTx);
        const count = newTx.installments || 1;
        const total = Number(txData.totalAmount) || (newTx.amount * count);

        actionExecuted = {
          type: 'addTransaction' as const,
          data: {
            ...newTx,
            id: createdTxs && createdTxs[0] ? createdTxs[0].id : newTx.id,
            createdTransactionIds: createdTxs ? createdTxs.map(t => t.id) : [newTx.id],
            groupId: createdTxs && createdTxs[0]?.groupId ? createdTxs[0].groupId : newTx.groupId,
            totalAmount: total,
            installmentAmount: newTx.amount,
          },
          isUndone: false,
        };

        if (count > 1) {
          showSuccess(`Compra parcelada adicionada: ${count}x de ${currencyFormat(newTx.amount)} (Total: ${currencyFormat(total)})`);
        } else {
          showSuccess(`Lançamento de ${currencyFormat(newTx.amount)} adicionado com sucesso!`);
        }
      }

      const aiReply = data.reply || 'Comando processado com sucesso!';
      const aiMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        sender: 'ai',
        text: aiReply,
        timestamp: new Date(),
        actionExecuted,
      };

      setMessages(prev => [...prev, aiMessage]);
      speakText(aiReply);
    } catch (err: any) {
      console.warn('Handling local response:', err);
      // Resposta segura e amigável
      const safeData = processAiCommandLocally(
        query,
        banks.map(b => ({ id: b.id, name: b.name, type: b.type, balance: b.balance })),
        categories.map(c => ({ id: c.id, name: c.name })),
        new Date().toISOString().split('T')[0]
      );

      const aiMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        sender: 'ai',
        text: safeData.reply,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPurchaseLocation = (actionData: any) => {
    onOpenChange(false); // Fecha o diálogo da IA
    if (actionData.method === 'credit') {
      // Abre a tela de cartões já com o cartão selecionado
      navigate('/cards', {
        state: {
          selectedBankId: actionData.bankId,
          highlightTxId: actionData.id,
        },
      });
    } else {
      // Abre a tela de transações / extrato da conta
      navigate('/transactions', {
        state: {
          selectedBankId: actionData.bankId,
          highlightTxId: actionData.id,
          selectedDate: actionData.date,
        },
      });
    }
  };

  const handleUndoAction = (messageId: string, actionData: any) => {
    const createdIds: string[] = actionData.createdTransactionIds || [actionData.id];

    if (createdIds && createdIds.length > 0) {
      createdIds.forEach((id) => {
        deleteTransaction(id, 'single');
      });
    } else {
      undo();
    }

    // Atualiza imediatamente o card nesta mensagem para estado desfeito
    setMessages(prev => prev.map(m => {
      if (m.id === messageId && m.actionExecuted) {
        return {
          ...m,
          actionExecuted: {
            ...m.actionExecuted,
            isUndone: true,
          },
        };
      }
      return m;
    }));

    showSuccess("Lançamento desfeito e apagado com sucesso!");
  };

  const quickChips = [
    'Adicione a compra de 50 reais no cartão de crédito',
    'Compra de 30 reais no crédito com nome Cinema, categoria Lazer',
    'Gastei 35 reais no almoço no débito',
    'Recebi 1.500 reais de salário',
    'Qual o meu saldo total?',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] sm:h-[620px] flex flex-col p-0 gap-0 overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-950">
        {/* Header com gradiente sutil */}
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                Fale com IA
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Assistente Ativo
                </span>
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Fale ou digite para lançar compras, despesas e receitas automaticamente
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (voiceReplyEnabled) window.speechSynthesis?.cancel();
                setVoiceReplyEnabled(!voiceReplyEnabled);
              }}
              className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              title={voiceReplyEnabled ? 'Voz ativada (clique para silenciar)' : 'Voz desativada (clique para ativar)'}
            >
              {voiceReplyEnabled ? <Volume2 size={16} className="text-primary" /> : <VolumeX size={16} />}
            </Button>
          </div>
        </DialogHeader>

        {/* Área de Mensagens / Chat */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            const action = m.actionExecuted?.data;
            const isUndone = !!m.actionExecuted?.isUndone;
            const targetBank = action ? banks.find(b => b.id === action.bankId) : null;
            const targetCategory = action ? categories.find(c => c.id === action.category) : null;

            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Bot size={16} />
                  </div>
                )}

                <div className={`space-y-2 max-w-[85%] sm:max-w-[75%]`}>
                  <div
                    className={`p-3.5 sm:p-4 rounded-2xl text-sm leading-relaxed ${
                      isUser
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium rounded-tr-xs'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-tl-xs border border-slate-200/60 dark:border-slate-800'
                    }`}
                  >
                    {m.text}
                  </div>

                  {/* Card de Transação Adicionada (Clicável para abrir o local da compra) */}
                  {action && (
                    <div 
                      onClick={() => {
                        if (!isUndone) {
                          handleOpenPurchaseLocation(action);
                        }
                      }}
                      className={`p-3.5 rounded-2xl border text-slate-900 dark:text-white space-y-2.5 transition-all duration-200 ${
                        isUndone
                          ? 'bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60 cursor-default'
                          : 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/30 hover:border-emerald-400 cursor-pointer shadow-xs group/card'
                      }`}
                      title={!isUndone ? 'Clique para abrir o local onde a compra foi registrada' : 'Lançamento desfeito'}
                    >
                      <div className="flex items-center justify-between">
                        {!isUndone ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 size={14} />
                            Lançamento Confirmado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 line-through">
                            <RotateCcw size={13} />
                            Lançamento Desfeito
                          </span>
                        )}

                        {!isUndone ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation(); // Evita abrir o local da compra ao clicar em Desfazer
                              handleUndoAction(m.id, action);
                            }}
                            className="h-6 px-2 text-[11px] font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1 rounded-lg"
                          >
                            <RotateCcw size={12} />
                            Desfazer
                          </Button>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-md">
                            Apagado
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <p className={`font-bold text-sm ${isUndone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
                            {action.description}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              {action.method === 'credit' ? <CreditCard size={12} /> : <Landmark size={12} />}
                              {targetBank?.name || 'Cartão/Conta'}
                            </span>
                            {targetCategory && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                                {targetCategory.name}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-base font-black ${
                            isUndone
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : action.method === 'income' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'
                          }`}>
                            {currencyFormat(action.amount)}
                          </span>
                          {action.installments && action.installments > 1 && (
                            <p className="text-[10px] text-slate-500 font-semibold leading-tight mt-0.5">
                              {action.installments}x de {currencyFormat(action.amount)}
                              {action.totalAmount && action.totalAmount !== action.amount && (
                                <span className="block text-[9px] text-slate-400 font-normal">
                                  Total: {currencyFormat(action.totalAmount)}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Botão/Link para abrir o local onde a compra foi lançada */}
                      {!isUndone && (
                        <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-400 group-hover/card:text-emerald-800 dark:group-hover/card:text-emerald-300">
                          <span className="inline-flex items-center gap-1.5">
                            <ExternalLink size={12} />
                            {action.method === 'credit' ? 'Ver na fatura do cartão' : 'Ver no extrato da conta'}
                          </span>
                          <span className="text-[10px] underline font-medium">
                            Abrir local da compra →
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                    <UserIcon size={16} />
                  </div>
                )}
              </div>
            );
          })}

          {/* Indicador de carregamento */}
          {isLoading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <Bot size={16} />
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Loader2 size={14} className="animate-spin text-primary" />
                Processando seu comando...
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Sugestões Rápidas */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 overflow-x-auto no-scrollbar">
          <div className="flex gap-2">
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip)}
                className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-all shrink-0 shadow-2xs"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Rodapé / Barra de Entrada (Voz + Texto) */}
        <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-2">
          {/* Alerta animado enquanto ouve */}
          {isListening && (
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-semibold animate-pulse">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span>Ouvindo sua voz... Fale à vontade e clique em <strong>Enviar</strong> quando terminar</span>
              </div>
              <button
                type="button"
                onClick={toggleListening}
                className="text-[11px] px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 text-rose-700 dark:text-rose-300 font-bold transition-colors shrink-0"
              >
                Pausar microfone
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* Botão de Microfone de Voz */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleListening}
              className={`rounded-2xl h-11 w-11 shrink-0 transition-all ${
                isListening
                  ? 'bg-rose-500 text-white border-rose-600 animate-pulse shadow-lg shadow-rose-500/30'
                  : 'bg-violet-600/10 hover:bg-violet-600/20 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-900/50'
              }`}
              title={isListening ? 'Pausar microfone' : 'Falar por voz'}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </Button>

            {/* Input de Texto */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? 'Transcrevendo sua fala em tempo real...' : 'Fale ou digite: "Adicione 50 no cartão de crédito"...'}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white placeholder:text-slate-400"
            />

            {/* Botão de Enviar */}
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`rounded-2xl h-11 px-4 font-bold shrink-0 gap-1.5 shadow-sm transition-all ${
                isListening && input.trim()
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400/40'
                  : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
              }`}
            >
              <Send size={16} />
              <span className="hidden sm:inline text-xs">Enviar</span>
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AiAssistantDialog;
