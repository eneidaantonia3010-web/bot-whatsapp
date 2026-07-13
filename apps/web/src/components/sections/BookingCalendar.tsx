'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarBlank,
  Clock,
  User,
  Phone,
  EnvelopeSimple,
  CaretLeft,
  CaretRight,
  Check,
  Sparkle,
  SpinnerGap,
} from '@phosphor-icons/react';
import { SERVICES_STATIC, SALON } from '@/lib/constants';
import { formatPrice, formatDuration } from '@/lib/utils';
import { toast } from 'sonner';

// Generate available time slots for a given day
function generateTimeSlots() {
  const slots: string[] = [];
  for (let h = 9; h < 19; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
    if (h < 18) slots.push(`${h.toString().padStart(2, '0')}:30`);
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function BookingCalendar() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [step, setStep] = useState(1); // 1: Service, 2: Date, 3: Time, 4: Info, 5: Confirm
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const isDateDisabled = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    const dayOfWeek = date.getDay();
    // Disable past dates and Sundays
    return date < new Date(today.getFullYear(), today.getMonth(), today.getDate()) || dayOfWeek === 0;
  };

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSubmitting(false);
    setStep(5);
    toast.success('¡Turno reservado exitosamente! ✨', {
      description: 'Te enviaremos una confirmación por WhatsApp.',
    });
  };

  const service = selectedService !== null ? SERVICES_STATIC[selectedService] : null;

  return (
    <section id="reservar" className="section-padding bg-cream">
      {/* Header */}
      <div className="text-center mb-16">
        <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-rosa mb-4">
          Reservar Turno
        </span>
        <h2 className="font-[Playfair_Display] text-4xl md:text-5xl lg:text-6xl font-semibold text-ink mb-6">
          Elegí tu momento
        </h2>
        <p className="text-ink-muted max-w-lg mx-auto">
          Reservá tu turno en minutos. Elegí el servicio, fecha y horario que más te convenga.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="max-w-2xl mx-auto mb-12">
        <div className="flex items-center justify-between">
          {['Servicio', 'Fecha', 'Horario', 'Datos'].map((label, index) => (
            <div key={label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    step > index + 1
                      ? 'bg-salvia text-white'
                      : step === index + 1
                      ? 'bg-ink text-cream'
                      : 'bg-cream-dark text-ink-muted'
                  }`}
                >
                  {step > index + 1 ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                <span className="text-xs text-ink-muted mt-2 hidden sm:block">{label}</span>
              </div>
              {index < 3 && (
                <div
                  className={`w-12 sm:w-20 md:w-32 h-[2px] mx-2 transition-colors duration-300 ${
                    step > index + 1 ? 'bg-salvia' : 'bg-cream-dark'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {/* Step 1: Select Service */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {SERVICES_STATIC.map((s, index) => (
                <button
                  key={s.name}
                  onClick={() => {
                    setSelectedService(index);
                    setStep(2);
                  }}
                  className={`group p-6 rounded-xl border-2 text-left transition-all duration-300 hover:shadow-[var(--shadow-lifted)] ${
                    selectedService === index
                      ? 'border-rosa bg-rosa/5'
                      : 'border-cream-dark bg-white hover:border-rosa-light'
                  }`}
                >
                  <h4 className="font-[Playfair_Display] text-lg font-semibold text-ink mb-1 group-hover:text-rosa transition-colors">
                    {s.name}
                  </h4>
                  <div className="flex items-center gap-3 text-sm text-ink-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDuration(s.duration)}
                    </span>
                    <span className="font-medium text-ink">{formatPrice(s.price)}</span>
                  </div>
                </button>
              ))}
            </motion.div>
          )}

          {/* Step 2: Select Date */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-md mx-auto"
            >
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[var(--shadow-soft)]">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-6">
                  <button onClick={prevMonth} className="p-2 hover:bg-cream rounded-lg transition-colors">
                    <CaretLeft className="w-5 h-5 text-ink" />
                  </button>
                  <h3 className="font-[Playfair_Display] text-lg font-semibold">
                    {MONTHS[currentMonth]} {currentYear}
                  </h3>
                  <button onClick={nextMonth} className="p-2 hover:bg-cream rounded-lg transition-colors">
                    <CaretRight className="w-5 h-5 text-ink" />
                  </button>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {DAYS.map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-ink-muted py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells for days before the first */}
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {/* Actual days */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const disabled = isDateDisabled(day);
                    const selected =
                      selectedDate?.getDate() === day &&
                      selectedDate?.getMonth() === currentMonth &&
                      selectedDate?.getFullYear() === currentYear;

                    return (
                      <button
                        key={day}
                        disabled={disabled}
                        onClick={() => {
                          setSelectedDate(new Date(currentYear, currentMonth, day));
                          setStep(3);
                        }}
                        className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 ${
                          disabled
                            ? 'text-ink-muted/30 cursor-not-allowed'
                            : selected
                            ? 'bg-ink text-cream'
                            : isToday(day)
                            ? 'bg-rosa/10 text-rosa font-bold hover:bg-rosa hover:text-white'
                            : 'text-ink hover:bg-cream-dark'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Back Button */}
              <div className="text-center mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-ink-muted hover:text-ink transition-colors"
                >
                  ← Cambiar servicio
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Select Time */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-md mx-auto"
            >
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[var(--shadow-soft)]">
                <div className="flex items-center gap-2 mb-6">
                  <CalendarBlank className="w-5 h-5 text-rosa" />
                  <h3 className="font-semibold text-ink">
                    {selectedDate?.toLocaleDateString('es-AR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {TIME_SLOTS.map((time) => {
                    // Simulate some random unavailable slots
                    const isUnavailable = ['10:30', '14:00', '16:30'].includes(time);
                    return (
                      <button
                        key={time}
                        disabled={isUnavailable}
                        onClick={() => {
                          setSelectedTime(time);
                          setStep(4);
                        }}
                        className={`py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isUnavailable
                            ? 'bg-cream-dark/50 text-ink-muted/40 cursor-not-allowed line-through'
                            : selectedTime === time
                            ? 'bg-ink text-cream'
                            : 'bg-cream hover:bg-ink hover:text-cream'
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-center mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="text-sm text-ink-muted hover:text-ink transition-colors"
                >
                  ← Cambiar fecha
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Contact Info */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-lg mx-auto"
            >
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[var(--shadow-soft)]">
                {/* Summary */}
                <div className="bg-cream rounded-xl p-4 mb-6">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-[Playfair_Display] font-semibold text-ink">{service?.name}</span>
                    <span className="font-semibold text-ink">{service ? formatPrice(service.price) : ''}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-ink-muted">
                    <span className="flex items-center gap-1">
                      <CalendarBlank className="w-3.5 h-3.5" />
                      {selectedDate?.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {selectedTime} — {service ? formatDuration(service.duration) : ''}
                    </span>
                  </div>
                </div>

                {/* Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1.5">
                      Nombre completo *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Tu nombre"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-cream-dark bg-cream-light focus:outline-none focus:border-rosa focus:ring-1 focus:ring-rosa/30 text-sm transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink mb-1.5">
                      Teléfono / WhatsApp *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+54 11 ..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-cream-dark bg-cream-light focus:outline-none focus:border-rosa focus:ring-1 focus:ring-rosa/30 text-sm transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink mb-1.5">
                      Email (opcional)
                    </label>
                    <div className="relative">
                      <EnvelopeSimple className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="tu@email.com"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-cream-dark bg-cream-light focus:outline-none focus:border-rosa focus:ring-1 focus:ring-rosa/30 text-sm transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink mb-1.5">
                      Notas (opcional)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="¿Algo que quieras contarnos?"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-cream-dark bg-cream-light focus:outline-none focus:border-rosa focus:ring-1 focus:ring-rosa/30 text-sm transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!formData.name || !formData.phone || isSubmitting}
                  className="w-full mt-6 py-4 bg-ink text-cream rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:shadow-[var(--shadow-lifted)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <SpinnerGap className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkle weight="fill" className="w-4 h-4" />
                  )}
                  {isSubmitting ? 'Reservando...' : 'Confirmar Reserva'}
                </button>
              </div>

              <div className="text-center mt-6">
                <button
                  onClick={() => setStep(3)}
                  className="text-sm text-ink-muted hover:text-ink transition-colors"
                >
                  ← Cambiar horario
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Confirmation */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-md mx-auto text-center"
            >
              <div className="bg-white rounded-2xl p-8 md:p-12 shadow-[var(--shadow-soft)]">
                <div className="w-20 h-20 rounded-full bg-salvia/10 flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10 text-salvia" />
                </div>
                <h3 className="font-[Playfair_Display] text-2xl font-semibold text-ink mb-3">
                  ¡Reserva Confirmada! ✨
                </h3>
                <p className="text-ink-muted mb-6">
                  Tu turno para <strong>{service?.name}</strong> fue reservado para el{' '}
                  <strong>
                    {selectedDate?.toLocaleDateString('es-AR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </strong>{' '}
                  a las <strong>{selectedTime}hs</strong>.
                </p>
                <p className="text-sm text-ink-muted mb-8">
                  Te enviaremos una confirmación por WhatsApp al número proporcionado.
                </p>
                <button
                  onClick={() => {
                    setStep(1);
                    setSelectedService(null);
                    setSelectedDate(null);
                    setSelectedTime(null);
                    setFormData({ name: '', phone: '', email: '', notes: '' });
                  }}
                  className="px-8 py-3 bg-cream text-ink rounded-full text-sm font-medium hover:bg-cream-dark transition-colors"
                >
                  Reservar Otro Turno
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
