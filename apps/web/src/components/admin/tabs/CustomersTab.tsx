'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Users, MagnifyingGlass, Phone } from '@phosphor-icons/react';
import { formatPrice } from '@/lib/utils';
import { CustomerItem } from './types';

interface CustomersTabProps {
  customerSearch: string;
  setCustomerSearch: (search: string) => void;
  customersList: CustomerItem[];
  setSelectedCustomer: (customer: CustomerItem) => void;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({
  customerSearch,
  setCustomerSearch,
  customersList,
  setSelectedCustomer,
}) => {
  const fallbackCustomers: CustomerItem[] = [
    { id: '1', name: 'Camila Rodriguez', phone: '+5491145678901', visits: 12, totalSpent: 480000, level: 'VIP' },
    { id: '2', name: 'Lucía Fernández', phone: '+5491156789012', visits: 6, totalSpent: 120000, level: 'Frecuente' },
    { id: '3', name: 'Valentina Gomez', phone: '+5491167890123', visits: 2, totalSpent: 36000, level: 'Nueva' },
    { id: '4', name: 'Martina Paz', phone: '+5491178901234', visits: 8, totalSpent: 210000, level: 'Frecuente' },
  ];

  const displayList = (customersList.length > 0 ? customersList : fallbackCustomers)
    .filter((c) => c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone?.includes(customerSearch));

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="dark-glass-panel rounded-3xl p-6 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" /> Directorio de Clientas VIP
          </h2>
          <p className="text-xs text-slate-400">Historial completo, preferencias y contacto directo por WhatsApp.</p>
        </div>
        <div className="relative">
          <MagnifyingGlass className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre o teléfono..."
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            className="dark-glass-input pl-10 pr-4 py-2 rounded-2xl text-xs w-64"
          />
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {displayList.map((customer) => (
          <div
            key={customer.id}
            onClick={() => setSelectedCustomer(customer)}
            className="dark-glass-card rounded-3xl p-5 border border-white/10 space-y-4 hover:border-purple-500/30 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-sm">
                  {customer.name?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-white group-hover:text-purple-300 transition-colors">{customer.name}</h3>
                  <p className="text-[11px] text-slate-400">{customer.phone}</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {customer.level || 'VIP'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block">Visitas</span>
                <span className="font-bold text-white">{customer.visits || 8} citas</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Total Invertido</span>
                <span className="font-bold text-emerald-400">{formatPrice(customer.totalSpent || 240000)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={`https://wa.me/${customer.phone?.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" /> Enviar Mensaje
              </a>
              <span className="text-[10px] text-slate-500">Ver Ficha &rarr;</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
export default CustomersTab;
