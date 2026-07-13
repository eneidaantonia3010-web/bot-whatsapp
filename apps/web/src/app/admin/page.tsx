'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  CalendarBlank,
  Users,
  CurrencyDollar,
  Clock,
  TrendUp,
  Funnel,
  MagnifyingGlass,
  Check,
  X,
  Sparkle,
  DotsThree,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import { SERVICES_STATIC } from '@/lib/constants';
import { formatPrice, formatDuration } from '@/lib/utils';

// Mock data for the admin dashboard
const MOCK_METRICS = {
  appointmentsThisMonth: 47,
  newClientsThisMonth: 12,
  revenueThisMonth: 1285000,
  pendingAppointments: 8,
};

interface MockAppointment {
  id: string;
  customerName: string;
  service: string;
  date: string;
  time: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  source: 'WEB' | 'INSTAGRAM' | 'WHATSAPP';
  price: number;
}

const MOCK_APPOINTMENTS: MockAppointment[] = [
  { id: '1', customerName: 'Valentina López', service: 'Uñas Gel Luxury', date: '2026-07-14', time: '10:00', status: 'CONFIRMED', source: 'INSTAGRAM', price: 28000 },
  { id: '2', customerName: 'Camila Rodríguez', service: 'Facial Glow', date: '2026-07-14', time: '11:00', status: 'PENDING', source: 'WEB', price: 35000 },
  { id: '3', customerName: 'Martina García', service: 'Corte Signature', date: '2026-07-14', time: '14:00', status: 'CONFIRMED', source: 'WHATSAPP', price: 25000 },
  { id: '4', customerName: 'Sofía Fernández', service: 'Anti-frizz Keratina', date: '2026-07-15', time: '09:00', status: 'PENDING', source: 'INSTAGRAM', price: 45000 },
  { id: '5', customerName: 'Isabella Martínez', service: 'Esmaltado Semi Pro', date: '2026-07-15', time: '10:30', status: 'CONFIRMED', source: 'WEB', price: 18000 },
  { id: '6', customerName: 'Lucía Gómez', service: 'Corte Hombre Premium', date: '2026-07-15', time: '15:00', status: 'CANCELLED', source: 'WHATSAPP', price: 15000 },
  { id: '7', customerName: 'Catalina Díaz', service: 'Facial Glow', date: '2026-07-16', time: '11:00', status: 'PENDING', source: 'INSTAGRAM', price: 35000 },
  { id: '8', customerName: 'Emilia Sánchez', service: 'Uñas Gel Luxury', date: '2026-07-16', time: '14:00', status: 'CONFIRMED', source: 'WEB', price: 28000 },
  { id: '9', customerName: 'Julieta Torres', service: 'Corte Signature', date: '2026-07-17', time: '09:00', status: 'COMPLETED', source: 'INSTAGRAM', price: 25000 },
  { id: '10', customerName: 'Renata Ruiz', service: 'Anti-frizz Keratina', date: '2026-07-17', time: '13:00', status: 'PENDING', source: 'WHATSAPP', price: 45000 },
];

const STATUS_STYLES = {
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400', label: 'Pendiente' },
  CONFIRMED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400', label: 'Confirmado' },
  COMPLETED: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400', label: 'Completado' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400', label: 'Cancelado' },
};

const SOURCE_ICONS: Record<string, string> = {
  WEB: '🌐',
  INSTAGRAM: '📸',
  WHATSAPP: '💬',
};

export default function AdminPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [appointments, setAppointments] = useState(MOCK_APPOINTMENTS);

  const filteredAppointments = appointments.filter((apt) => {
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      apt.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.service.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const updateStatus = (id: string, newStatus: MockAppointment['status']) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, status: newStatus } : apt))
    );
  };

  const metrics = [
    {
      label: 'Turnos del Mes',
      value: MOCK_METRICS.appointmentsThisMonth,
      icon: CalendarBlank,
      color: 'text-[var(--color-ink)]',
      bgColor: 'bg-[var(--color-bg-alt)]',
      change: '+12%',
    },
    {
      label: 'Clientes Nuevos',
      value: MOCK_METRICS.newClientsThisMonth,
      icon: Users,
      color: 'text-[var(--color-ink)]',
      bgColor: 'bg-[var(--color-bg-alt)]',
      change: '+8%',
    },
    {
      label: 'Ingreso del Mes',
      value: formatPrice(MOCK_METRICS.revenueThisMonth),
      icon: CurrencyDollar,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      change: '+15%',
    },
    {
      label: 'Turnos Pendientes',
      value: MOCK_METRICS.pendingAppointments,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      change: null,
    },
  ];

  return (
    <div className="min-h-[100svh] bg-[var(--color-bg)] pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 
              className="text-3xl md:text-4xl font-semibold text-[var(--color-ink)] tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Panel de Administración
            </h1>
            <p className="text-[var(--color-ink-muted)] text-sm mt-2">
              Bienvenida, Sofia. Estos son los datos de tu salón.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-[var(--color-surface)] border border-[var(--color-bg-alt)] px-4 py-2 rounded-[var(--radius-full)] shadow-sm">
            <CalendarBlank className="w-4 h-4 text-[var(--color-ink-muted)]" />
            <span className="text-sm font-medium text-[var(--color-ink)]">
              {new Date().toLocaleDateString('es-AR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="bg-[var(--color-surface)] border border-[var(--color-bg-alt)] rounded-2xl p-6 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-lifted)] transition-shadow duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-[var(--radius-xl)] ${metric.bgColor} flex items-center justify-center`}>
                  <metric.icon className={`w-5 h-5 ${metric.color}`} />
                </div>
                {metric.change && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                    <TrendUp weight="bold" className="w-3 h-3" />
                    {metric.change}
                  </span>
                )}
              </div>
              <p className="text-2xl font-semibold text-[var(--color-ink)] mb-1" style={{ fontFamily: 'var(--font-display)' }}>{metric.value}</p>
              <p className="text-sm font-medium text-[var(--color-ink-muted)]">{metric.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Appointments Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="bg-[var(--color-surface)] border border-[var(--color-bg-alt)] rounded-2xl shadow-[var(--shadow-soft)] overflow-hidden"
        >
          {/* Table Header */}
          <div className="p-6 border-b border-[var(--color-bg-alt)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 
                className="text-xl font-semibold text-[var(--color-ink)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Próximos Turnos
              </h2>
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative">
                  <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-ink-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar cliente..."
                    className="pl-9 pr-4 py-2 rounded-[var(--radius-lg)] border border-[var(--color-bg-alt)] bg-[var(--color-bg)] text-sm focus:outline-none focus:border-[var(--color-ink)] focus:ring-1 focus:ring-[var(--color-ink)] w-full sm:w-64 transition-all"
                  />
                </div>
                {/* Status Filter */}
                <div className="flex gap-2">
                  {[
                    { value: 'all', label: 'Todos' },
                    { value: 'PENDING', label: 'Pendientes' },
                    { value: 'CONFIRMED', label: 'Confirmados' },
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setStatusFilter(filter.value)}
                      className={`px-4 py-2 rounded-[var(--radius-lg)] text-xs font-semibold transition-all duration-200 ${
                        statusFilter === filter.value
                          ? 'bg-[var(--color-ink)] text-[var(--color-white)]'
                          : 'bg-[var(--color-bg-alt)] text-[var(--color-ink-light)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg)] border border-transparent hover:border-[var(--color-bg-alt)]'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-bg-alt)] bg-[var(--color-bg)]">
                  <th className="text-left text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider px-6 py-4">Cliente</th>
                  <th className="text-left text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider px-6 py-4">Servicio</th>
                  <th className="text-left text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider px-6 py-4">Fecha & Hora</th>
                  <th className="text-left text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider px-6 py-4">Estado</th>
                  <th className="text-left text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider px-6 py-4">Origen</th>
                  <th className="text-left text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider px-6 py-4">Monto</th>
                  <th className="text-right text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider px-6 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-bg-alt)]">
                {filteredAppointments.map((apt, index) => {
                  const status = STATUS_STYLES[apt.status];
                  return (
                    <motion.tr
                      key={apt.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-[var(--color-bg)]/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-[var(--color-ink)]">{apt.customerName}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[var(--color-ink-light)]">{apt.service}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-[var(--color-ink)]">
                          {new Date(apt.date).toLocaleDateString('es-AR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </div>
                        <div className="text-xs font-medium text-[var(--color-ink-muted)]">{apt.time}hs</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-white/10 ${status.bg} ${status.text}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-[var(--color-ink-light)] flex items-center gap-2">
                          {SOURCE_ICONS[apt.source]}
                          <span className="text-xs uppercase tracking-wider">{apt.source}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-[var(--color-ink)]">{formatPrice(apt.price)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {apt.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => updateStatus(apt.id, 'CONFIRMED')}
                                className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center transition-colors border border-emerald-100"
                                title="Confirmar"
                              >
                                <Check weight="bold" className="w-4 h-4 text-emerald-600" />
                              </button>
                              <button
                                onClick={() => updateStatus(apt.id, 'CANCELLED')}
                                className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors border border-red-100"
                                title="Cancelar"
                              >
                                <X weight="bold" className="w-4 h-4 text-red-500" />
                              </button>
                            </>
                          )}
                          {apt.status === 'CONFIRMED' && (
                            <button
                              onClick={() => updateStatus(apt.id, 'COMPLETED')}
                              className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors border border-blue-100"
                              title="Marcar completado"
                            >
                              <Check weight="bold" className="w-4 h-4 text-blue-600" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredAppointments.length === 0 && (
            <div className="text-center py-16">
              <CalendarBlank className="w-12 h-12 text-[var(--color-bg-alt)] mx-auto mb-4" />
              <p className="text-[var(--color-ink-muted)] font-medium">No se encontraron turnos con esos filtros.</p>
            </div>
          )}

          {/* Pagination Placeholder */}
          <div className="px-6 py-4 border-t border-[var(--color-bg-alt)] flex items-center justify-between bg-[var(--color-bg)]">
            <p className="text-sm font-medium text-[var(--color-ink-muted)]">
              Mostrando {filteredAppointments.length} de {appointments.length} turnos
            </p>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-bg-alt)] flex items-center justify-center hover:bg-[var(--color-bg-alt)] transition-colors">
                <CaretLeft className="w-4 h-4 text-[var(--color-ink-muted)]" />
              </button>
              <button className="w-8 h-8 rounded-lg bg-[var(--color-ink)] text-[var(--color-white)] flex items-center justify-center text-sm font-semibold shadow-sm">
                1
              </button>
              <button className="w-8 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-bg-alt)] flex items-center justify-center hover:bg-[var(--color-bg-alt)] transition-colors">
                <CaretRight className="w-4 h-4 text-[var(--color-ink-muted)]" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
