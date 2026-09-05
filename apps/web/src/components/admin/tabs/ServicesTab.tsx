'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Scissors, Plus, PencilSimple } from '@phosphor-icons/react';
import { formatPrice, formatDuration } from '@/lib/utils';
import { ServiceItem } from './types';

interface ServicesTabProps {
  servicesList: ServiceItem[];
  handleOpenNewService: () => void;
  handleToggleServiceActive: (service: ServiceItem) => Promise<void>;
  setEditingService: (service: ServiceItem) => void;
  setServiceForm: (form: {
    name: string;
    description: string;
    price: number;
    duration: number;
    category: string;
    imageUrl: string;
    active: boolean;
  }) => void;
  setShowServiceModal: (show: boolean) => void;
}

export const ServicesTab: React.FC<ServicesTabProps> = ({
  servicesList,
  handleOpenNewService,
  handleToggleServiceActive,
  setEditingService,
  setServiceForm,
  setShowServiceModal,
}) => {
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="dark-glass-panel rounded-3xl p-6 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
            <Scissors className="w-5 h-5 text-pink-400" /> Catálogo de Servicios y Precios
          </h2>
          <p className="text-xs text-slate-400">Activá, pausá o modificá los valores de los tratamientos.</p>
        </div>
        <button
          onClick={handleOpenNewService}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-semibold text-xs shadow-lg shadow-pink-500/25 hover:brightness-110 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Agregar Servicio
        </button>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {servicesList.map((service) => (
          <div key={service.id} className="dark-glass-card rounded-3xl p-5 border border-white/10 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  {service.category || 'Cabello'}
                </span>
                {/* Toggle Active Switch */}
                <button
                  onClick={() => handleToggleServiceActive(service)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 ${
                    service.active !== false
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${service.active !== false ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  {service.active !== false ? 'Disponible' : 'Pausado'}
                </button>
              </div>
              <h3 className="font-bold text-white text-base font-display">{service.name}</h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{service.description}</p>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 block">Duración: {formatDuration(service.duration)}</span>
                <span className="text-lg font-bold text-white font-mono">{formatPrice(service.price)}</span>
              </div>
              <button
                onClick={() => {
                  setEditingService(service);
                  setServiceForm({
                    name: service.name,
                    description: service.description || '',
                    price: service.price,
                    duration: service.duration,
                    category: service.category || 'cabello',
                    imageUrl: service.imageUrl || '',
                    active: service.active !== false,
                  });
                  setShowServiceModal(true);
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
                title="Editar Servicio"
              >
                <PencilSimple className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
export default ServicesTab;
