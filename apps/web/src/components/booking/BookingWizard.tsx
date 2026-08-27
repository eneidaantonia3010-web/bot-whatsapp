'use client';

// ============================================
// Glow Studio — Cal.com / Airbnb Style Booking Wizard
// ============================================

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getServices, getStaff, getAvailability, createAppointment } from '@/lib/api';
import type { Service } from '@/types';
import {
  Scissors,
  Sparkle,
  CalendarCheck,
  Clock,
  User,
  Phone,
  Envelope,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  CircleNotch,
  Calendar as CalendarIcon,
} from '@phosphor-icons/react';

interface StaffMember {
  id: string;
  name: string;
  avatarUrl?: string;
  specialties: string[];
}

export function BookingWizard() {
  const router = useRouter();

  // Data state
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [activeCategory, setActiveCategory] = useState<string>('todos');

  // Selections
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<Array<{ time: string; available: boolean }>>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Form inputs
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load services and staff on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        const [servicesData, staffData] = await Promise.all([
          getServices().catch(() => []),
          getStaff().catch(() => []),
        ]);
        setServices(servicesData.filter((s) => s.active));
        setStaffList(staffData);

        // Pre-select tomorrow as default date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1); // Skip Sunday
        setSelectedDate(tomorrow.toISOString().split('T')[0]);
      } catch (err) {
        console.error('Error loading booking data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // Fetch slots whenever selectedDate or selectedService changes
  useEffect(() => {
    if (selectedDate && selectedService) {
      const currentService = selectedService;
      async function fetchSlots() {
        try {
          setLoadingSlots(true);
          setSelectedTime('');
          const slots = await getAvailability(selectedDate, currentService.id);
          setAvailableSlots(slots);
        } catch (err) {
          console.error('Error fetching availability:', err);
          setAvailableSlots([]);
        } finally {
          setLoadingSlots(false);
        }
      }
      fetchSlots();
    }
  }, [selectedDate, selectedService]);

  // Categories list
  const categories = [
    { id: 'todos', label: 'Todos los Servicios' },
    { id: 'cabello', label: 'Cabello & Color' },
    { id: 'unas', label: 'Uñas & Manicuría' },
    { id: 'facial', label: 'Facial & Mirada' },
    { id: 'tratamientos', label: 'Tratamientos Spa' },
  ];

  const filteredServices =
    activeCategory === 'todos'
      ? services
      : services.filter((s) => s.category?.toLowerCase() === activeCategory.toLowerCase());

  // Generate next 14 booking days
  const bookingDays: Array<{ dateStr: string; dayName: string; dayNumber: number; isSunday: boolean }> = [];
  const now = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dayOfWeek = d.getDay();
    bookingDays.push({
      dateStr: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('es-AR', { weekday: 'short' }),
      dayNumber: d.getDate(),
      isSunday: dayOfWeek === 0,
    });
  }

  // Handle final submission
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedTime) {
      setErrorMessage('Por favor completa todos los pasos anteriores.');
      return;
    }
    if (!formData.name.trim() || formData.phone.trim().length < 6) {
      setErrorMessage('Por favor ingresa tu nombre completo y un teléfono válido.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const appointmentDate = `${selectedDate}T${selectedTime}:00-03:00`;
      const created = await createAppointment({
        date: appointmentDate,
        serviceId: selectedService.id,
        customerName: formData.name,
        customerPhone: formData.phone,
        customerEmail: formData.email || undefined,
        notes: formData.notes || undefined,
        staffId: selectedStaff?.id || undefined,
      } as any);

      // If token exists, redirect to self-service portal
      if ((created as any).token) {
        router.push(`/turno/${(created as any).token}`);
      } else {
        router.push('/#confirmado');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Hubo un error al reservar. Por favor intenta otro horario.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 glass-panel rounded-3xl border border-white/10">
        <CircleNotch className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-neutral-400 mt-4">Cargando agenda de turnos en vivo...</p>
      </div>
    );
  }

  return (
    <div id="reservar" className="w-full max-w-4xl mx-auto glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl backdrop-blur-xl bg-[#09090d]/80 transition-all duration-300">
      {/* Wizard Header / Steps Indicator */}
      <div className="border-b border-white/10 p-6 md:p-8 bg-gradient-to-b from-white/[0.04] to-transparent">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-primary font-semibold flex items-center gap-1.5">
              <Sparkle className="w-3.5 h-3.5" /> Agenda Tu Experiencia
            </span>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mt-1">
              Reserva tu Turno Online
            </h2>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-2">
            {[
              { num: 1, label: 'Servicio' },
              { num: 2, label: 'Fecha & Hora' },
              { num: 3, label: 'Confirmación' },
            ].map((step) => (
              <div
                key={step.num}
                onClick={() => {
                  if (step.num === 1) setCurrentStep(1);
                  if (step.num === 2 && selectedService) setCurrentStep(2);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all ${
                  currentStep === step.num
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : currentStep > step.num
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-white/5 text-neutral-500'
                }`}
              >
                <span>{step.num}</span>
                <span className="hidden sm:inline">{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* STEP 1: SERVICE & STAFF SELECTION */}
      {currentStep === 1 && (
        <div className="p-6 md:p-8 space-y-6">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Service Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredServices.map((service) => {
              const isSelected = selectedService?.id === service.id;
              return (
                <div
                  key={service.id}
                  onClick={() => setSelectedService(service)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-lg shadow-primary/15 ring-1 ring-primary'
                      : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-white text-base group-hover:text-primary transition-colors">
                        {service.name}
                      </h3>
                      <span className="text-primary font-bold text-base whitespace-nowrap">
                        ${service.price.toLocaleString('es-AR')}
                      </span>
                    </div>
                    {service.description && (
                      <p className="text-xs text-neutral-400 mt-2 line-clamp-2">
                        {service.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 text-xs text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" /> {service.duration} min
                    </span>
                    <span className={`font-medium ${isSelected ? 'text-primary font-bold' : 'text-neutral-500'}`}>
                      {isSelected ? '✓ Seleccionado' : 'Elegir'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Staff Selection (Optional) */}
          {staffList.length > 0 && (
            <div className="pt-4 border-t border-white/10">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
                ¿Preferís atenderte con alguna estilista en particular?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedStaff(null)}
                  className={`p-3 rounded-xl border text-left text-xs transition-all ${
                    selectedStaff === null
                      ? 'bg-primary/10 border-primary text-white'
                      : 'bg-white/[0.02] border-white/10 text-neutral-400 hover:bg-white/[0.05]'
                  }`}
                >
                  <p className="font-semibold text-white">Cualquiera</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Primera disponible</p>
                </button>
                {staffList.map((staff) => (
                  <button
                    key={staff.id}
                    type="button"
                    onClick={() => setSelectedStaff(staff)}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      selectedStaff?.id === staff.id
                        ? 'bg-primary/10 border-primary text-white'
                        : 'bg-white/[0.02] border-white/10 text-neutral-400 hover:bg-white/[0.05]'
                    }`}
                  >
                    <p className="font-semibold text-white truncate">{staff.name}</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5 truncate">
                      {staff.specialties?.[0] || 'Estilista'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Next Button */}
          <div className="flex justify-end pt-4">
            <button
              type="button"
              disabled={!selectedService}
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium px-6 py-3 rounded-xl shadow-lg shadow-primary/20 transition-all text-sm"
            >
              Continuar a Fecha y Hora <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: DATE & TIME SELECTION */}
      {currentStep === 2 && (
        <div className="p-6 md:p-8 space-y-6">
          {/* Selected summary pill */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-400">Servicio seleccionado:</p>
              <p className="font-semibold text-white text-sm">{selectedService?.name}</p>
            </div>
            <div className="text-right">
              <p className="text-primary font-bold">${selectedService?.price.toLocaleString('es-AR')}</p>
              <p className="text-[11px] text-neutral-500">{selectedService?.duration} minutos</p>
            </div>
          </div>

          {/* Horizontal Day Carousel */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-primary" /> Elige el día:
            </label>
            <div className="flex items-center gap-2.5 overflow-x-auto pb-3 scrollbar-thin">
              {bookingDays.map((day) => {
                const isSelected = selectedDate === day.dateStr;
                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    disabled={day.isSunday}
                    onClick={() => setSelectedDate(day.dateStr)}
                    className={`flex flex-col items-center justify-center min-w-[68px] py-3.5 px-2 rounded-2xl border text-center transition-all ${
                      day.isSunday
                        ? 'opacity-30 cursor-not-allowed border-white/5 bg-transparent'
                        : isSelected
                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25 scale-105'
                        : 'bg-white/[0.03] border-white/10 hover:bg-white/10 text-neutral-300'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-medium tracking-wider">{day.dayName}</span>
                    <span className="text-lg font-bold mt-1">{day.dayNumber}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Slot Picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" /> Horarios disponibles:
            </label>

            {loadingSlots ? (
              <div className="flex items-center justify-center p-8">
                <CircleNotch className="w-6 h-6 text-primary animate-spin" />
                <span className="text-xs text-neutral-400 ml-3">Consultando agenda...</span>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                <p className="text-sm text-neutral-400">No hay horarios libres para esta fecha.</p>
                <p className="text-xs text-neutral-500 mt-1">Por favor selecciona otro día.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                {availableSlots.map((slot) => {
                  const isSelected = selectedTime === slot.time;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedTime(slot.time)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                        !slot.available
                          ? 'opacity-25 cursor-not-allowed border-transparent bg-white/[0.01] line-through text-neutral-600'
                          : isSelected
                          ? 'bg-primary text-white border-primary shadow-md shadow-primary/30'
                          : 'bg-white/[0.04] border-white/10 hover:border-white/30 text-neutral-200'
                      }`}
                    >
                      {slot.time} hs
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Volver a Servicios
            </button>
            <button
              type="button"
              disabled={!selectedTime}
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium px-6 py-3 rounded-xl shadow-lg shadow-primary/20 transition-all text-sm"
            >
              Continuar a Tus Datos <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: CONTACT DETAILS & CONFIRMATION */}
      {currentStep === 3 && (
        <form onSubmit={handleSubmitBooking} className="p-6 md:p-8 space-y-6">
          {/* Booking Summary Card */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-primary">Resumen de tu Cita</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-neutral-400 block">Servicio:</span>
                <span className="font-semibold text-white text-sm">{selectedService?.name}</span>
              </div>
              <div>
                <span className="text-neutral-400 block">Fecha y Hora:</span>
                <span className="font-semibold text-white text-sm">
                  {selectedDate} • {selectedTime} hs
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block">Estilista:</span>
                <span className="font-semibold text-white text-sm">{selectedStaff?.name || 'Cualquiera disponible'}</span>
              </div>
              <div>
                <span className="text-neutral-400 block">Total a abonar:</span>
                <span className="font-bold text-primary text-base">${selectedService?.price.toLocaleString('es-AR')}</span>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" /> Nombre y Apellido *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Sofia Martínez"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-primary" /> WhatsApp / Teléfono *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Ej: 11 1234 5678"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                  <Envelope className="w-3.5 h-3.5 text-primary" /> Email (para confirmación)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="tu@email.com"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Notas especiales o preferencias de estilo (opcional)
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ej: Tengo cabello con alisado previo / Me gustaría agregar diseño de uñas..."
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {errorMessage}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Cambiar Horario
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold px-8 py-3.5 rounded-xl shadow-lg shadow-primary/25 transition-all text-sm"
            >
              {submitting ? (
                <>
                  <CircleNotch className="w-4 h-4 animate-spin" /> Confirmando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" /> Confirmar Reserva Ahora
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
