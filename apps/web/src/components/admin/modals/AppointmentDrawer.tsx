'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarCheck,
  Phone,
  Check,
  Sparkle,
  X,
  UserCircle,
} from '@phosphor-icons/react';

interface AppointmentDrawerProps {
  selectedAppointment: any | null;
  onClose: () => void;
  onStatusChange: (id: string, status: any) => Promise<void>;
  formatPrice: (price: number) => string;
}

export function AppointmentDrawer({
  selectedAppointment,
  onClose,
  onStatusChange,
  formatPrice,
}: AppointmentDrawerProps) {
  return (
    <AnimatePresence>
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md h-full dark-glass-panel border-l border-white/10 p-6 flex flex-col justify-between z-10 space-y-6 overflow-y-auto"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-pink-400" /> Ficha Técnica del Turno
                </h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Client Info Card */}
              <div className="dark-glass-card p-4 rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                    {selectedAppointment.customerName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{selectedAppointment.customerName}</h3>
                    <p className="text-xs text-slate-400">{selectedAppointment.customerPhone}</p>
                  </div>
                </div>
                <a
                  href={`https://wa.me/${selectedAppointment.customerPhone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Phone className="w-4 h-4" /> Enviar Mensaje de WhatsApp
                </a>
              </div>

              {/* Service & Time Details */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400">Tratamiento</span>
                  <span className="font-semibold text-white">{selectedAppointment.service}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400">Fecha</span>
                  <span className="font-mono font-semibold text-white">{selectedAppointment.date}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400">Hora</span>
                  <span className="font-mono font-semibold text-pink-400">{selectedAppointment.time}hs</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400">Monto del Servicio</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">{formatPrice(selectedAppointment.price)}</span>
                </div>
              </div>

              {/* Change Status Actions */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-slate-400 block">Cambiar Estado del Turno</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onStatusChange(selectedAppointment.id, 'CONFIRMED')}
                    className="py-2.5 px-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Confirmar
                  </button>
                  <button
                    onClick={() => onStatusChange(selectedAppointment.id, 'COMPLETED')}
                    className="py-2.5 px-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Sparkle className="w-4 h-4" /> Completar
                  </button>
                  <button
                    onClick={() => onStatusChange(selectedAppointment.id, 'CANCELLED')}
                    className="py-2.5 px-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <X className="w-4 h-4" /> Cancelar Cita
                  </button>
                  <button
                    onClick={() => onStatusChange(selectedAppointment.id, 'NO_SHOW')}
                    className="py-2.5 px-3 rounded-xl bg-zinc-500/10 text-zinc-400 border border-zinc-500/30 hover:bg-zinc-500/20 text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <UserCircle className="w-4 h-4" /> Marcar Ausente
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition-colors"
            >
              Cerrar Ficha
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
