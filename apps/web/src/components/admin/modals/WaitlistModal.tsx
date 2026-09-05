'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hourglass, Trash, X } from '@phosphor-icons/react';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  waitlist: any[];
  onDeleteWaitlist: (id: string) => Promise<void>;
}

export function WaitlistModal({
  isOpen,
  onClose,
  waitlist,
  onDeleteWaitlist,
}: WaitlistModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-2xl dark-glass-panel rounded-3xl p-6 border border-white/10 space-y-5 z-10"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                <Hourglass className="w-5 h-5 text-purple-400" /> Lista de Espera Inteligente
              </h3>
              <button
                onClick={onClose}
                className="p-1 rounded-xl hover:bg-white/10 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Cuando una clienta cancela un turno, el bot le envía una notificación automática por WhatsApp a la primera clienta en espera.
            </p>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {waitlist.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  <Hourglass className="w-8 h-8 mx-auto mb-2 opacity-40 text-purple-400" />
                  No hay clientas en lista de espera en este momento.
                </div>
              ) : (
                waitlist.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white">{w.customer?.name || 'Clienta'}</p>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                            w.status === 'WAITING'
                              ? 'bg-purple-500/20 text-purple-300'
                              : w.status === 'OFFERED'
                              ? 'bg-amber-500/20 text-amber-300'
                              : w.status === 'BOOKED'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-500/20 text-slate-400'
                          }`}
                        >
                          {w.status === 'WAITING'
                            ? 'EN ESPERA'
                            : w.status === 'OFFERED'
                            ? 'OFERTADO'
                            : w.status === 'BOOKED'
                            ? 'RESERVÓ'
                            : w.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        💇 {w.service?.name} • 📅{' '}
                        {w.preferredDate
                          ? new Date(w.preferredDate).toLocaleDateString('es-AR')
                          : 'Fecha libre'}{' '}
                        {w.timeRange ? `(${w.timeRange})` : ''}
                      </p>
                      {w.customer?.phone && (
                        <p className="text-[10px] text-slate-500 font-mono">📱 {w.customer.phone}</p>
                      )}
                    </div>
                    <button
                      onClick={() => onDeleteWaitlist(w.id)}
                      className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                      title="Eliminar de lista"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
