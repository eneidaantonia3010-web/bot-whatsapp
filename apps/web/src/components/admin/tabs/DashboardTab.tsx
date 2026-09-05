'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  CalendarCheck,
  UserPlus,
  CurrencyDollar,
  Clock,
  TrendUp,
  CalendarBlank,
  CheckCircle,
  Sparkle,
  XCircle,
  UserCircle,
  Check,
  X,
} from '@phosphor-icons/react';
import { formatPrice } from '@/lib/utils';
import { MetricsData, MockAppointment, getCategoryBadge } from './types';

interface DashboardTabProps {
  metricsData: MetricsData;
  statusFilter: 'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  setStatusFilter: (status: 'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW') => void;
  filteredAppointments: MockAppointment[];
  setSelectedAppointment: (apt: MockAppointment) => void;
  handleStatusChange: (id: string, status: MockAppointment['status']) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  metricsData,
  statusFilter,
  setStatusFilter,
  filteredAppointments,
  setSelectedAppointment,
  handleStatusChange,
}) => {
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-8">
      {/* 4 Sparkline Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            title: 'Turnos del Mes',
            value: metricsData.appointmentsThisMonth,
            change: '+15%',
            isPositive: true,
            icon: CalendarCheck,
            color: 'from-pink-500 to-rose-600',
            bgGlow: 'shadow-pink-500/10',
          },
          {
            title: 'Clientas Nuevas',
            value: metricsData.newClientsThisMonth,
            change: '+8%',
            isPositive: true,
            icon: UserPlus,
            color: 'from-purple-500 to-indigo-600',
            bgGlow: 'shadow-purple-500/10',
          },
          {
            title: 'Ingresos Estimados',
            value: formatPrice(metricsData.revenueThisMonth),
            change: '+18.4%',
            isPositive: true,
            icon: CurrencyDollar,
            color: 'from-emerald-500 to-teal-600',
            bgGlow: 'shadow-emerald-500/10',
          },
          {
            title: 'Turnos Pendientes',
            value: metricsData.pendingAppointments,
            change: 'Atención requerida',
            isPositive: false,
            icon: Clock,
            color: 'from-amber-500 to-orange-600',
            bgGlow: 'shadow-amber-500/10',
          },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="dark-glass-card rounded-3xl p-5 border border-white/10 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-slate-400 font-medium">{card.title}</span>
                <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${card.color} p-[1px] shadow-lg ${card.bgGlow}`}>
                  <div className="w-full h-full bg-[#12121B] rounded-2xl flex items-center justify-center">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <h3 className="text-2xl font-bold text-white font-display">{card.value}</h3>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${card.isPositive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                  {card.change}
                </span>
              </div>
              {/* Decorative Sparkline graph line */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
                <span>Actualizado en vivo</span>
                <span className="text-pink-400 flex items-center gap-1 font-medium">
                  <TrendUp className="w-3 h-3" /> Tendencia positiva
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Appointments Table Section */}
      <div className="dark-glass-panel rounded-3xl p-6 border border-white/10 space-y-5">
        {/* Table Top Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
              <CalendarBlank className="w-5 h-5 text-pink-400" /> Próximos Turnos Programados
            </h2>
            <p className="text-xs text-slate-400">Haz clic en cualquier turno para abrir su ficha completa.</p>
          </div>

          {/* Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-white/[0.03] p-1 rounded-2xl border border-white/10">
            {[
              { key: 'ALL', label: 'Todos' },
              { key: 'PENDING', label: 'Pendientes' },
              { key: 'CONFIRMED', label: 'Confirmados' },
              { key: 'COMPLETED', label: 'Completados' },
              { key: 'CANCELLED', label: 'Cancelados' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  statusFilter === f.key
                    ? 'bg-pink-500 text-white font-semibold shadow-md shadow-pink-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table Component */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-white/[0.02] text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="py-3.5 px-4">Clienta</th>
                <th className="py-3.5 px-4">Servicio</th>
                <th className="py-3.5 px-4">Fecha & Hora</th>
                <th className="py-3.5 px-4">Precio</th>
                <th className="py-3.5 px-4">Origen</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No se encontraron turnos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((apt) => {
                  const badge = getCategoryBadge(apt.category);
                  return (
                    <tr
                      key={apt.id}
                      onClick={() => setSelectedAppointment(apt)}
                      className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-4 font-medium text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center text-pink-300 font-bold text-xs">
                          {apt.customerName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-white group-hover:text-pink-300 transition-colors">{apt.customerName}</p>
                          <p className="text-[10px] text-slate-400">{apt.customerPhone}</p>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border ${badge.bg}`}>
                          {apt.service}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-mono text-slate-200">
                        <span className="block text-white font-semibold">{apt.date}</span>
                        <span className="text-[11px] text-pink-400">{apt.time}hs</span>
                      </td>

                      <td className="py-4 px-4 font-bold text-white font-mono">
                        {formatPrice(apt.price)}
                      </td>

                      <td className="py-4 px-4">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-white/5 text-slate-400 border border-white/10">
                          {apt.source}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        {apt.status === 'CONFIRMED' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-max">
                            <CheckCircle className="w-3 h-3" /> Confirmado
                          </span>
                        )}
                        {apt.status === 'PENDING' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-max">
                            <Clock className="w-3 h-3" /> Pendiente
                          </span>
                        )}
                        {apt.status === 'COMPLETED' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1 w-max">
                            <Sparkle className="w-3 h-3" /> Completado
                          </span>
                        )}
                        {apt.status === 'CANCELLED' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1 w-max">
                            <XCircle className="w-3 h-3" /> Cancelado
                          </span>
                        )}
                        {apt.status === 'NO_SHOW' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 flex items-center gap-1 w-max">
                            <UserCircle className="w-3 h-3" /> Ausente
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {apt.status === 'PENDING' && (
                            <button
                              onClick={() => handleStatusChange(apt.id, 'CONFIRMED')}
                              className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all"
                              title="Confirmar Turno"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleStatusChange(apt.id, 'COMPLETED')}
                              className="p-1.5 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 transition-all"
                              title="Marcar Completado"
                            >
                              <Sparkle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {apt.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleStatusChange(apt.id, 'CANCELLED')}
                              className="p-1.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-all"
                              title="Cancelar Turno"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
export default DashboardTab;
