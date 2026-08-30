'use client';

// ============================================
// Glow Studio — Customer Self-Service Portal (/turno/:token)
// ============================================

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getAppointmentByToken,
  cancelAppointmentByToken,
  rescheduleAppointmentByToken,
  getAvailability,
} from '@/lib/api';
import type { Appointment, TimeSlot } from '@/types';
import {
  Sparkle,
  CalendarCheck,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  ArrowCounterClockwise,
  CalendarPlus,
  CircleNotch,
  UserCircle,
  ShieldCheck,
  Info,
  Phone,
} from '@phosphor-icons/react';

export default function AppointmentPortalPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Reschedule State
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (!token) return;
    async function loadAppointment() {
      try {
        setLoading(true);
        const data = await getAppointmentByToken(token);
        setAppointment(data);
      } catch (err: any) {
        setError(err.message || 'No pudimos encontrar los detalles de este turno.');
      } finally {
        setLoading(false);
      }
    }
    loadAppointment();
  }, [token]);

  // Load slots when reschedule date is chosen
  useEffect(() => {
    if (newDate && appointment?.service?.id) {
      async function fetchSlots() {
        try {
          setLoadingSlots(true);
          const slots = await getAvailability(newDate, appointment!.service!.id);
          setAvailableSlots(slots);
        } catch (e) {
          setAvailableSlots([]);
        } finally {
          setLoadingSlots(false);
        }
      }
      fetchSlots();
    }
  }, [newDate, appointment]);

  const handleCancel = async () => {
    try {
      setActionLoading(true);
      const updated = await cancelAppointmentByToken(token, cancelReason);
      setAppointment(updated);
      setShowCancelModal(false);
    } catch (err: any) {
      alert(err.message || 'Error al cancelar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!newDate || !newTime) return;
    try {
      setActionLoading(true);
      const targetDate = `${newDate}T${newTime}:00-03:00`;
      const updated = await rescheduleAppointmentByToken(token, targetDate);
      setAppointment(updated);
      setShowRescheduleModal(false);
    } catch (err: any) {
      alert(err.message || 'Error al reprogramar');
    } finally {
      setActionLoading(false);
    }
  };

  // Generate Google Calendar Link safely
  const getGoogleCalendarUrl = () => {
    if (!appointment?.date) return '#';
    try {
      const startDate = new Date(appointment.date);
      const endDate = appointment.endDate
        ? new Date(appointment.endDate)
        : new Date(startDate.getTime() + (appointment.service?.duration || 60) * 60000);

      const start = startDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
      const end = endDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
      const title = encodeURIComponent(`${appointment.service.name} — Glow Studio by Sofia`);
      const details = encodeURIComponent(
        `Turno para ${appointment.customer.name}.\nServicio: ${appointment.service.name}\nDirección: Av. Corrientes 1234, CABA`
      );
      const location = encodeURIComponent('Av. Corrientes 1234, CABA, Buenos Aires');
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
    } catch {
      return '#';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090d] flex items-center justify-center p-4">
        <div className="flex flex-col items-center glass-panel p-8 rounded-3xl border border-white/10">
          <CircleNotch className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-neutral-400 mt-4">Cargando tu turno...</p>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-[#09090d] flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-3xl border border-white/10 max-w-md text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-white mt-4">Turno no encontrado</h2>
          <p className="text-sm text-neutral-400 mt-2">{error || 'El enlace puede haber expirado o ser inválido.'}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-6 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90"
          >
            Ir a la página principal
          </button>
        </div>
      </div>
    );
  }

  const appointmentDate = new Date(appointment.date);
  const formattedDate = appointmentDate.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const formattedTime = appointmentDate.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const isCancelled = appointment.status === 'CANCELLED';
  const isCompleted = appointment.status === 'COMPLETED';
  const isNoShow = appointment.status === 'NO_SHOW';
  const isPast = new Date(appointment.date).getTime() < Date.now();
  const canModify = !isCancelled && !isCompleted && !isNoShow && !isPast;

  return (
    <div className="min-h-screen bg-[#09090d] text-white py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Top Branding Banner */}
        <div className="text-center space-y-2">
          <span className="text-xs uppercase tracking-widest text-primary font-bold flex items-center justify-center gap-1.5">
            <Sparkle className="w-4 h-4" /> Glow Studio by Sofia
          </span>
          <h1 className="text-3xl font-serif font-bold text-white">Portal de Tu Cita</h1>
        </div>

        {/* Status Card */}
        <div className="glass-panel rounded-3xl border border-white/10 p-6 md:p-8 backdrop-blur-xl bg-white/[0.03] space-y-6 shadow-2xl">
          {/* Status Header */}
          <div className="flex items-center justify-between pb-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              {isCancelled ? (
                <div className="p-3 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
                  <XCircle className="w-6 h-6" />
                </div>
              ) : isCompleted ? (
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <CheckCircle className="w-6 h-6" />
                </div>
              ) : isNoShow ? (
                <div className="p-3 rounded-2xl bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                  <XCircle className="w-6 h-6" />
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle className="w-6 h-6" />
                </div>
              )}
              <div>
                <span className="text-xs text-neutral-400">Estado de la reserva</span>
                <h3 className="text-base font-bold text-white">
                  {isCancelled
                    ? 'Turno Cancelado'
                    : isCompleted
                    ? 'Turno Completado'
                    : isNoShow
                    ? 'No Asistió (Ausente)'
                    : 'Turno Confirmado'}
                </h3>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-neutral-400 block">Cliente</span>
              <span className="text-sm font-semibold text-white">{appointment.customer.name}</span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <Sparkle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="text-xs text-neutral-400 block">Servicio</span>
                <span className="text-sm font-semibold text-white">{appointment.service.name}</span>
                <span className="text-xs text-neutral-400 block mt-0.5">
                  {appointment.service.duration} min • ${appointment.service.price.toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="text-xs text-neutral-400 block">Fecha y Hora</span>
                <span className="text-sm font-semibold text-white capitalize">{formattedDate}</span>
                <span className="text-xs text-primary font-medium block mt-0.5">{formattedTime} hs</span>
              </div>
            </div>

            {appointment.staff && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 sm:col-span-2">
                <UserCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-neutral-400 block">Profesional Asignada</span>
                  <span className="text-sm font-semibold text-white">{appointment.staff.name}</span>
                  <span className="text-xs text-neutral-400 block mt-0.5">
                    {(appointment.staff as any).role || (appointment.staff as any).specialties?.join(', ') || 'Especialista'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Location details */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 gap-3 text-xs">
            <div className="flex items-center gap-2 text-neutral-300">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="font-medium text-white block">Glow Studio by Sofia</span>
                <span>Av. Corrientes 1234, CABA, Buenos Aires</span>
              </div>
            </div>
            <a
              href="https://maps.google.com/?q=Av.+Corrientes+1234,+CABA"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-center transition-colors border border-white/10"
            >
              Cómo llegar (Google Maps)
            </a>
          </div>

          {/* Add to Calendar Button */}
          {canModify && (
            <div className="pt-2">
              <a
                href={getGoogleCalendarUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs transition-all shadow-md"
              >
                <CalendarPlus className="w-4 h-4 text-primary" /> Agregar a Google Calendar / Apple Calendar
              </a>
            </div>
          )}

          {/* Action Buttons: Cancel / Reschedule */}
          {canModify && (
            <div className="flex items-center justify-between pt-4 border-t border-white/10 gap-3">
              <button
                onClick={() => setShowCancelModal(true)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-all text-center"
              >
                Cancelar Cita
              </button>
              <button
                onClick={() => setShowRescheduleModal(true)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 text-xs font-semibold transition-all text-center flex items-center justify-center gap-1.5"
              >
                <ArrowCounterClockwise className="w-3.5 h-3.5" /> Reprogramar Horario
              </button>
            </div>
          )}
        </div>

        {/* Preparation Tips Card */}
        <div className="glass-panel rounded-2xl border border-white/5 p-5 text-xs text-neutral-400 space-y-2 bg-white/[0.01]">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Info className="w-4 h-4 text-primary" /> Recomendaciones para tu visita
          </div>
          <p>
            Te sugerimos llegar 5 minutos antes de tu turno para prepararte con tranquilidad. Si necesitas cancelar o
            reprogramar, te pedimos hacerlo con al menos 4 horas de anticipación para ceder el lugar a la lista de espera.
          </p>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-[#12121a] border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">¿Deseas cancelar tu turno?</h3>
            <p className="text-xs text-neutral-400">
              Al confirmar, tu turno quedará libre y se ofrecerá automáticamente a las personas en lista de espera.
            </p>
            <textarea
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Motivo de cancelación (opcional)..."
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-primary"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
              >
                Volver
              </button>
              <button
                disabled={actionLoading}
                onClick={handleCancel}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors"
              >
                {actionLoading ? 'Cancelando...' : 'Confirmar Cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-[#12121a] border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Elegir nuevo día y horario</h3>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Selecciona una fecha:</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-primary"
              />
            </div>

            {loadingSlots ? (
              <div className="p-4 text-center text-xs text-neutral-400">
                <CircleNotch className="w-5 h-5 animate-spin mx-auto text-primary mb-2" /> Cargando horarios...
              </div>
            ) : availableSlots.length > 0 ? (
              <div>
                <label className="block text-xs text-neutral-400 mb-2">Horarios disponibles:</label>
                <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setNewTime(slot.time)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold border ${
                        newTime === slot.time
                          ? 'bg-primary text-white border-primary'
                          : slot.available
                          ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                          : 'opacity-30 line-through text-neutral-500'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
              >
                Volver
              </button>
              <button
                disabled={actionLoading || !newDate || !newTime}
                onClick={handleReschedule}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-white font-semibold text-xs transition-colors"
              >
                {actionLoading ? 'Guardando...' : 'Confirmar Nuevo Horario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
