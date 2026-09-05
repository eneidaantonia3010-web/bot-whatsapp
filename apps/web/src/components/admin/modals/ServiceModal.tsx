'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from '@phosphor-icons/react';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceForm: {
    name: string;
    category: string;
    price: number;
    duration: number;
    description: string;
  };
  setServiceForm: React.Dispatch<React.SetStateAction<any>>;
  editingService: any | null;
  onSave: (e: React.FormEvent) => Promise<void>;
}

export function ServiceModal({
  isOpen,
  onClose,
  serviceForm,
  setServiceForm,
  editingService,
  onSave,
}: ServiceModalProps) {
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
            className="relative w-full max-w-lg dark-glass-panel rounded-3xl p-6 border border-white/10 space-y-6 z-10"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white font-display">
                {editingService ? 'Editar Servicio' : 'Agregar Nuevo Servicio'}
              </h3>
              <button
                onClick={onClose}
                className="p-1 rounded-xl hover:bg-white/10 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={onSave} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Nombre del Servicio</label>
                <input
                  type="text"
                  required
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  className="w-full dark-glass-input rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Categoría</label>
                <select
                  value={serviceForm.category}
                  onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                  className="w-full dark-glass-input rounded-xl px-3 py-2 bg-[#12121A] text-white"
                >
                  <option value="cabello">Cabello</option>
                  <option value="unas">Uñas</option>
                  <option value="pestanas">Pestañas & Cejas</option>
                  <option value="facial">Facial</option>
                  <option value="maquillaje">Maquillaje</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Precio ($ ARS)</label>
                  <input
                    type="number"
                    required
                    value={serviceForm.price}
                    onChange={(e) => setServiceForm({ ...serviceForm, price: Number(e.target.value) })}
                    className="w-full dark-glass-input rounded-xl px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Duración (min)</label>
                  <input
                    type="number"
                    required
                    value={serviceForm.duration}
                    onChange={(e) => setServiceForm({ ...serviceForm, duration: Number(e.target.value) })}
                    className="w-full dark-glass-input rounded-xl px-3 py-2 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Descripción</label>
                <textarea
                  rows={3}
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  className="w-full dark-glass-input rounded-xl px-3 py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-semibold shadow-lg shadow-pink-500/20"
                >
                  Guardar Servicio
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
