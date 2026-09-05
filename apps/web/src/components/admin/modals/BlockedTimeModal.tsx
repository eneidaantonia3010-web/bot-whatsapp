'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X } from '@phosphor-icons/react';

interface BlockedTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  blockForm: {
    reason: string;
    allDay: boolean;
    startDate: string;
    endDate: string;
  };
  setBlockForm: React.Dispatch<React.SetStateAction<any>>;
  onCreateBlockedTime: (e: React.FormEvent) => Promise<void>;
}

export function BlockedTimeModal({
  isOpen,
  onClose,
  blockForm,
  setBlockForm,
  onCreateBlockedTime,
}: BlockedTimeModalProps) {
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
            className="relative w-full max-w-lg dark-glass-panel rounded-3xl p-6 border border-white/10 space-y-5 z-10"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-400" /> Bloquear Horario / Feriado
              </h3>
              <button
                onClick={onClose}
                className="p-1 rounded-xl hover:bg-white/10 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={onCreateBlockedTime} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Motivo del Bloqueo</label>
                <input
                  type="text"
                  placeholder="Ej: Feriado Nacional, Almuerzo, Vacaciones Sofía"
                  required
                  value={blockForm.reason}
                  onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
                  className="dark-glass-input rounded-xl px-3 py-2 w-full"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allDayCheck"
                  checked={blockForm.allDay}
                  onChange={(e) => setBlockForm({ ...blockForm, allDay: e.target.checked })}
                  className="rounded bg-white/10 border-white/20 text-pink-500 focus:ring-0"
                />
                <label htmlFor="allDayCheck" className="text-slate-300 text-xs cursor-pointer">
                  Bloquear día completo (09:00 a 19:00)
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Fecha & Hora Inicio</label>
                  <input
                    type="datetime-local"
                    required
                    value={blockForm.startDate}
                    onChange={(e) => setBlockForm({ ...blockForm, startDate: e.target.value })}
                    className="dark-glass-input rounded-xl px-3 py-2 w-full text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Fecha & Hora Fin</label>
                  <input
                    type="datetime-local"
                    required
                    value={blockForm.endDate}
                    onChange={(e) => setBlockForm({ ...blockForm, endDate: e.target.value })}
                    className="dark-glass-input rounded-xl px-3 py-2 w-full text-slate-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-lg shadow-amber-500/20 transition-all"
              >
                Guardar Bloqueo de Horario
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
