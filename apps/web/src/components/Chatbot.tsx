'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatCircle, X, PaperPlaneRight, Sparkle, SpinnerGap } from '@phosphor-icons/react';
import { useTranslation } from '@/i18n/I18nContext';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState(() => 'web-' + Math.random().toString(36).substring(2, 11));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Set initial welcome message translated
  useEffect(() => {
    setMessages([
      {
        id: 1,
        text: t('chatbot.welcomeMsg'),
        sender: 'bot',
        timestamp: new Date(),
      },
    ]);
  }, [t]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = async (customText?: string) => {
    const textToSend = customText || input.trim();
    if (!textToSend) return;

    const userMessage: Message = {
      id: Date.now(),
      text: textToSend,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customText) setInput('');
    setIsTyping(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://glow-studio-api-q6ls.onrender.com';
      const res = await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.text,
          senderId: sessionId,
          platform: 'WEB'
        })
      });
      
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: data.response || 'El asistente no pudo procesar tu mensaje.',
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: 'Atención disponible por WhatsApp al +54 9 11 7356-6392 💕',
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 md:w-16 md:h-16 rounded-full bg-[var(--color-ink)] text-white shadow-[var(--shadow-lifted)] flex items-center justify-center hover:scale-110 transition-transform duration-300 group"
            aria-label="Abrir chat"
          >
            <ChatCircle weight="fill" className="w-6 h-6 md:w-7 md:h-7 text-pink-400" />
            <span className="absolute inset-0 rounded-full bg-pink-500 animate-ping opacity-20" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-[380px] h-[500px] md:h-[550px] bg-white rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden border border-gray-200"
          >
            {/* Header */}
            <div className="bg-[var(--color-ink)] text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-pink-500/20 flex items-center justify-center">
                  <Sparkle weight="fill" className="w-4 h-4 text-pink-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Glow Studio</h4>
                  <p className="text-xs text-white/60 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online 24/7
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-white"
                aria-label="Cerrar chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                      msg.sender === 'user'
                        ? 'bg-[var(--color-ink)] text-white rounded-2xl rounded-br-md'
                        : 'bg-white text-gray-900 shadow-sm rounded-2xl rounded-bl-md border border-gray-200'
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}

              {/* Preset Suggestion Pills */}
              {messages.length <= 2 && (
                <div className="flex flex-col gap-1.5 pt-2">
                  {[
                    t('chatbot.presetQuestion1'),
                    t('chatbot.presetQuestion2'),
                    t('chatbot.presetQuestion3'),
                  ].map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      onClick={() => sendMessage(preset)}
                      className="text-left text-xs bg-white text-gray-700 hover:text-pink-600 px-3 py-2 rounded-xl border border-gray-200 shadow-sm hover:border-pink-300 transition-all font-medium"
                    >
                      💡 {preset}
                    </button>
                  ))}
                </div>
              )}

              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md border border-gray-200 shadow-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-200 bg-white shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('chatbot.inputPlaceholder')}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs sm:text-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30 transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="w-10 h-10 rounded-xl bg-[var(--color-ink)] text-white flex items-center justify-center hover:bg-black transition-colors disabled:opacity-40"
                  aria-label="Enviar"
                >
                  {isTyping ? (
                    <SpinnerGap className="w-4 h-4 animate-spin" />
                  ) : (
                    <PaperPlaneRight weight="fill" className="w-4 h-4 text-pink-400" />
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
