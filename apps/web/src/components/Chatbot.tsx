'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatCircle, X, PaperPlaneRight, Sparkle, SpinnerGap } from '@phosphor-icons/react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    text: '¡Hola! ✨ Soy el asistente de Glow Studio. ¿En qué puedo ayudarte? Puedo contarte sobre nuestros servicios, precios o ayudarte a reservar un turno.',
    sender: 'bot',
    timestamp: new Date(),
  },
];

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState(() => 'web-' + Math.random().toString(36).substring(2, 11));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      text: input.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('http://localhost:3001/api/messages', {
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
          text: 'Disculpá, el servicio está temporalmente fuera de línea. Escribinos por WhatsApp al +54 11 5555-4444 💕',
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
            className="fixed bottom-6 right-6 z-50 w-14 h-14 md:w-16 md:h-16 rounded-full bg-ink text-cream shadow-[var(--shadow-lifted)] flex items-center justify-center hover:scale-110 transition-transform duration-300 group"
            aria-label="Abrir chat"
          >
            <ChatCircle weight="fill" className="w-6 h-6 md:w-7 md:h-7" />
            {/* Pulse */}
            <span className="absolute inset-0 rounded-full bg-ink animate-ping opacity-20" />
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
            className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-[380px] h-[500px] md:h-[550px] bg-white rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden border border-cream-dark"
          >
            {/* Header */}
            <div className="bg-ink text-cream px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-rosa/20 flex items-center justify-center">
                  <Sparkle weight="fill" className="w-4 h-4 text-rosa" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Glow Studio</h4>
                  <p className="text-xs text-cream/60 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-salvia" />
                    Online ahora
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                aria-label="Cerrar chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-cream-light">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                      msg.sender === 'user'
                        ? 'bg-ink text-cream rounded-2xl rounded-br-md'
                        : 'bg-white text-ink shadow-sm rounded-2xl rounded-bl-md border border-cream-dark'
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md border border-cream-dark shadow-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-ink-muted animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 rounded-full bg-ink-muted animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 rounded-full bg-ink-muted animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-cream-dark bg-white shrink-0">
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
                  placeholder="Escribí tu mensaje..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-cream-light border border-cream-dark text-sm focus:outline-none focus:border-rosa focus:ring-1 focus:ring-rosa/30 transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="w-10 h-10 rounded-xl bg-ink text-cream flex items-center justify-center hover:bg-ink-light transition-colors disabled:opacity-40"
                  aria-label="Enviar"
                >
                  {isTyping ? (
                    <SpinnerGap className="w-4 h-4 animate-spin" />
                  ) : (
                    <PaperPlaneRight weight="fill" className="w-4 h-4" />
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
