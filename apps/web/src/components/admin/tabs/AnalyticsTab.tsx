'use client';

import React from 'react';
import { motion } from 'motion/react';
import { TrendUp, ChartBar, ChartPie } from '@phosphor-icons/react';
import { formatPrice } from '@/lib/utils';
import { FinancialData } from './types';

interface AnalyticsTabProps {
  financialData: FinancialData;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ financialData }) => {
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-8">
      {/* Financial Metrics Summary Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="dark-glass-card rounded-3xl p-5 border border-white/10 space-y-2">
          <span className="text-xs text-slate-400">Ingreso Mensual Actual</span>
          <h3 className="text-3xl font-bold text-emerald-400 font-mono">{formatPrice(financialData.revenueThisMonth)}</h3>
          <p className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1">
            <TrendUp className="w-3.5 h-3.5" /> +{financialData.revenueGrowthPct}% vs mes anterior
          </p>
        </div>
        <div className="dark-glass-card rounded-3xl p-5 border border-white/10 space-y-2">
          <span className="text-xs text-slate-400">Ticket Promedio por Clienta</span>
          <h3 className="text-3xl font-bold text-white font-mono">{formatPrice(financialData.averageTicket)}</h3>
          <p className="text-[11px] text-slate-400">Basado en {financialData.totalAppointmentsMonth} turnos atendidos</p>
        </div>
        <div className="dark-glass-card rounded-3xl p-5 border border-white/10 space-y-2">
          <span className="text-xs text-slate-400">Tasa de Cancelación</span>
          <h3 className="text-3xl font-bold text-pink-400 font-mono">{financialData.cancellationRate}%</h3>
          <p className="text-[11px] text-slate-400">{financialData.cancelledMonth} cancelaciones registradas</p>
        </div>
      </div>

      {/* Visual Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Weekly Bar Representation */}
        <div className="dark-glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
          <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
            <ChartBar className="w-5 h-5 text-pink-400" /> Ingresos Semanales
          </h3>
          <div className="space-y-3 pt-2">
            {financialData.weeklyRevenue.map((w, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">{w.week}</span>
                  <span className="text-emerald-400 font-mono">{formatPrice(w.revenue)}</span>
                </div>
                <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(5, (w.revenue / 400000) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Services Ranking */}
        <div className="dark-glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
          <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
            <ChartPie className="w-5 h-5 text-purple-400" /> Servicios Más Solicitados
          </h3>
          <div className="space-y-3">
            {financialData.topServices.map((srv, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-xs">
                <div>
                  <p className="font-semibold text-white">{srv.name}</p>
                  <p className="text-[10px] text-slate-400">{srv.count} turnos realizados</p>
                </div>
                <span className="font-mono font-bold text-pink-400">{formatPrice(srv.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
export default AnalyticsTab;
