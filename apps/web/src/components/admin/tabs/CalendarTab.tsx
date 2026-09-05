'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  Lock,
  Hourglass,
  LockSimple,
  Trash,
  CalendarCheck,
} from '@phosphor-icons/react';
import { BlockedTimeItem, MockAppointment, WaitlistItem, WeekDay } from './types';

interface CalendarTabProps {
  weekOffset: number;
  setWeekOffset: React.Dispatch<React.SetStateAction<number>>;
  calendarView: 'week' | 'month';
  setCalendarView: (view: 'week' | 'month') => void;
  getWeekDays: (offset: number) => WeekDay[];
  appointments: MockAppointment[];
  blockedTimes: BlockedTimeItem[];
  waitlist: WaitlistItem[];
  setShowBlockModal: (show: boolean) => void;
  setShowWaitlistModal: (show: boolean) => void;
  handleDeleteBlockedTime: (id: string) => Promise<void>;
  setSelectedAppointment: (apt: MockAppointment) => void;
}

export const CalendarTab: React.FC<CalendarTabProps> = ({
  weekOffset,
  setWeekOffset,
  calendarView,
  setCalendarView,
  getWeekDays,
  appointments,
  blockedTimes,
  waitlist,
  setShowBlockModal,
  setShowWaitlistModal,
  handleDeleteBlockedTime,
  setSelectedAppointment,
}) => {
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="dark-glass-panel rounded-3xl p-6 border border-white/10 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
            <CalendarBlank className="w-5 h-5 text-pink-400" /> Agenda Interactiva de Turnos
          </h2>
          <p className="text-xs text-slate-400">Visualizá los turnos reales agendados, bloqueos de horarios y lista de espera.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Week Navigation */}
          <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-2xl border border-white/10">
            <button
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all text-xs flex items-center gap-1"
              title="Semana Anterior"
            >
              <CaretLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                weekOffset === 0 ? 'bg-pink-500/20 text-pink-300 font-semibold border border-pink-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all text-xs flex items-center gap-1"
              title="Semana Siguiente"
            >
              <CaretRight className="w-4 h-4" />
            </button>
          </div>

          {/* Block Time Button */}
          <button
            onClick={() => setShowBlockModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-amber-300 border border-amber-400/30 hover:border-amber-400/50 transition-all shadow-sm"
          >
            <Lock className="w-3.5 h-3.5" /> Bloquear Horario / Feriado
          </button>

          {/* Waitlist Modal Toggle */}
          <button
            onClick={() => setShowWaitlistModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-purple-300 border border-purple-400/30 hover:border-purple-400/50 transition-all shadow-sm"
          >
            <Hourglass className="w-3.5 h-3.5" /> Lista de Espera ({waitlist.filter((w) => w.status === 'WAITING').length})
          </button>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-2xl border border-white/10">
            <button
              onClick={() => setCalendarView('week')}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                calendarView === 'week' ? 'bg-pink-500 text-white font-semibold shadow-md shadow-pink-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setCalendarView('month')}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                calendarView === 'month' ? 'bg-pink-500 text-white font-semibold shadow-md shadow-pink-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Mes
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Weekly Matrix */}
      {calendarView === 'week' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {getWeekDays(weekOffset).map((day, idx) => {
            const dayAppointments = appointments.filter((apt) => apt.date === day.dateStr);
            const dayBlocks = blockedTimes.filter((b) => {
              const bStart = b.startDate ? b.startDate.split('T')[0] : '';
              const bEnd = b.endDate ? b.endDate.split('T')[0] : '';
              return day.dateStr >= bStart && day.dateStr <= bEnd;
            });

            return (
              <div
                key={idx}
                className={`dark-glass-card rounded-2xl p-4 border transition-all ${
                  day.isToday ? 'border-pink-500/50 bg-pink-500/[0.03] shadow-lg shadow-pink-500/10' : 'border-white/10'
                } space-y-3 flex flex-col min-h-[380px]`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold font-display ${day.isToday ? 'text-pink-400 font-extrabold' : 'text-slate-200'}`}>
                      {day.label}
                    </span>
                    {day.isToday && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-pink-500 text-white font-bold">HOY</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {dayAppointments.length} turnos
                  </span>
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto max-h-[420px] pr-0.5">
                  {/* Blocked Times on this day */}
                  {dayBlocks.map((b) => (
                    <div
                      key={b.id}
                      className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-amber-400 font-bold flex items-center gap-1">
                          <LockSimple className="w-3 h-3" /> {b.allDay ? 'DÍA COMPLETO' : 'BLOQUEADO'}
                        </span>
                        <button
                          onClick={() => handleDeleteBlockedTime(b.id)}
                          className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                          title="Eliminar bloqueo"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs font-semibold mt-1 truncate">{b.reason}</p>
                      {!b.allDay && (
                        <p className="text-[10px] text-amber-300/70 font-mono">
                          {new Date(b.startDate).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })} - {new Date(b.endDate).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </p>
                      )}
                    </div>
                  ))}

                  {/* Real Appointments */}
                  {dayAppointments
                    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                    .map((apt) => {
                      const isConfirmed = apt.status === 'CONFIRMED';
                      const isPending = apt.status === 'PENDING';
                      const isCancelled = apt.status === 'CANCELLED';

                      return (
                        <div
                          key={apt.id}
                          onClick={() => setSelectedAppointment(apt)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer group ${
                            isConfirmed
                              ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/60'
                              : isPending
                              ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/60'
                              : isCancelled
                              ? 'bg-rose-500/10 border-rose-500/30 opacity-60'
                              : 'bg-pink-500/10 border-pink-500/20 hover:border-pink-500/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-pink-300 font-bold">
                              {apt.time || '10:00'}hs
                            </span>
                            <span
                              className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                                isConfirmed
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : isPending
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : isCancelled
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-slate-500/20 text-slate-300'
                              }`}
                            >
                              {apt.status}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-white truncate group-hover:text-pink-300 mt-1">
                            {apt.customerName}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{apt.service}</p>
                          {apt.price > 0 && (
                            <p className="text-[9px] font-mono text-slate-500 mt-1">${apt.price.toLocaleString('es-AR')}</p>
                          )}
                        </div>
                      );
                    })}

                  {dayAppointments.length === 0 && dayBlocks.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-40">
                      <CalendarCheck className="w-8 h-8 text-slate-600 mb-1" />
                      <p className="text-[10px] text-slate-500">Sin turnos</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Month Grid */
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-2">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
              <div key={d} className="py-2 text-center text-xs font-bold text-slate-400 border-b border-white/10">
                {d}
              </div>
            ))}
            {Array.from({ length: 31 }).map((_, i) => {
              const dayNumber = i + 1;
              const monthDayStr = `2026-08-${dayNumber.toString().padStart(2, '0')}`;
              const count = appointments.filter((a) => a.date === monthDayStr).length;

              return (
                <div
                  key={i}
                  className="dark-glass-card h-24 p-2.5 rounded-xl border border-white/5 flex flex-col justify-between hover:border-pink-500/30 transition-all cursor-pointer"
                >
                  <span className="text-xs font-mono font-semibold text-slate-300">{dayNumber}</span>
                  {count > 0 ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 truncate">
                      {count} {count === 1 ? 'Turno' : 'Turnos'}
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-600">Libre</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
};
export default CalendarTab;
