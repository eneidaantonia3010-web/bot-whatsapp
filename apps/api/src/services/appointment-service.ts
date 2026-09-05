import { prisma } from './prisma';
import { createCalendarEvent, deleteCalendarEvent, getFreeBusy } from './calendar';
import { sendWhatsAppNotification, sendBookingConfirmation } from './whatsapp';
import { broadcastRealtimeEvent } from '../routes/realtime';

export interface CreateAppointmentInput {
  date: string;
  serviceId: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  notes?: string | null;
  staffId?: string | null;
  source?: string | null;
  recurrence?: string | null;
}

export class AppointmentService {
  /**
   * Look up appointment by self-service portal token, with customer phone masked for privacy.
   */
  static async getByToken(token: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { token },
      include: {
        service: true,
        customer: true,
        staff: true,
      },
    });

    if (!appointment) return null;

    const maskedPhone = appointment.customer.phone
      ? appointment.customer.phone.replace(/(\d{3})\d+(\d{2})/, '$1****$2')
      : undefined;

    return {
      ...appointment,
      customer: {
        id: appointment.customer.id,
        name: appointment.customer.name,
        phone: maskedPhone,
      },
    };
  }

  /**
   * Reschedule an appointment using customer self-service token.
   */
  static async rescheduleByToken(token: string, newDate: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { token },
      include: { service: true, customer: true, staff: true },
    });

    if (!appointment) {
      const err = new Error('NOT_FOUND');
      (err as any).statusCode = 404;
      throw err;
    }

    if (appointment.status === 'CANCELLED') {
      const err = new Error('CANNOT_RESCHEDULE_CANCELLED');
      (err as any).statusCode = 400;
      throw err;
    }

    const startDate = new Date(newDate);
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + appointment.service.duration);

    const resourceId = appointment.staffId || 'GLOBAL_SALON_RESOURCE';
    const lockKey = `STAFF_LOCK:${resourceId}`;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      const overlapping = await tx.appointment.findFirst({
        where: {
          id: { not: appointment.id },
          status: { in: ['PENDING', 'CONFIRMED'] },
          date: { lt: endDate },
          endDate: { gt: startDate },
          ...(appointment.staffId ? { staffId: appointment.staffId } : {}),
        },
      });

      if (overlapping) {
        throw new Error('CONFLICT_OVERLAPPING');
      }

      const blockedConflict = await tx.blockedTime.findFirst({
        where: {
          startDate: { lt: endDate },
          endDate: { gt: startDate },
        },
      });

      if (blockedConflict) {
        throw new Error(`CONFLICT_BLOCKED:${blockedConflict.reason}`);
      }

      return await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          date: startDate,
          endDate,
          status: 'CONFIRMED',
        },
        include: { service: true, customer: true, staff: true },
      });
    });

    broadcastRealtimeEvent({
      type: 'APPOINTMENT_RESCHEDULED',
      payload: updated,
    });

    return updated;
  }

  /**
   * Self-service customer appointment cancellation.
   */
  static async cancelByToken(token: string, reason?: string) {
    const existing = await prisma.appointment.findUnique({
      where: { token },
      include: { service: true, customer: true },
    });

    if (!existing) {
      const err = new Error('NOT_FOUND');
      (err as any).statusCode = 404;
      throw err;
    }

    if (existing.calendarEventId) {
      try {
        await deleteCalendarEvent(existing.calendarEventId);
      } catch (err) {
        console.warn('Calendar delete warning:', err);
      }
    }

    const updated = await prisma.appointment.update({
      where: { id: existing.id },
      data: {
        status: 'CANCELLED',
        notes: reason ? `${existing.notes || ''} | Cancelado por cliente: ${reason}` : existing.notes,
      },
      include: { service: true, customer: true },
    });

    broadcastRealtimeEvent({
      type: 'APPOINTMENT_CANCELLED',
      payload: updated,
    });

    return updated;
  }

  /**
   * Retrieve upcoming active appointments for a customer by phone or instagram.
   */
  static async getUpcomingForCustomer(phone?: string, instagram?: string) {
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : null;
    const now = new Date();

    const customerConditions: any[] = [];
    if (cleanPhone) {
      customerConditions.push(
        { phone: cleanPhone },
        { phone: `+${cleanPhone}` },
        { phone: { contains: cleanPhone.slice(-8) } }
      );
    }
    if (instagram) {
      customerConditions.push({ instagram });
    }

    const customer = await prisma.customer.findFirst({
      where: { OR: customerConditions },
    });

    if (!customer) return [];

    return await prisma.appointment.findMany({
      where: {
        customerId: customer.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        date: { gte: now },
      },
      include: {
        service: true,
        customer: true,
      },
      orderBy: { date: 'asc' },
    });
  }

  /**
   * Confirm next pending appointment within 48 hours for a customer.
   */
  static async confirmUpcoming(phone?: string, instagram?: string) {
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : null;
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const customerConditions: any[] = [];
    if (cleanPhone) {
      customerConditions.push(
        { phone: cleanPhone },
        { phone: `+${cleanPhone}` },
        { phone: { contains: cleanPhone.slice(-8) } }
      );
    }
    if (instagram) {
      customerConditions.push({ instagram });
    }

    const customer = await prisma.customer.findFirst({
      where: { OR: customerConditions },
    });

    if (!customer) return null;

    const appointment = await prisma.appointment.findFirst({
      where: {
        customerId: customer.id,
        status: 'PENDING',
        date: { gte: now, lte: in48h },
      },
      include: {
        service: true,
        customer: true,
      },
      orderBy: { date: 'asc' },
    });

    if (!appointment) return null;

    return await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: 'CONFIRMED' },
      include: {
        service: true,
        customer: true,
      },
    });
  }

  /**
   * Cancel an appointment by ID with late cancellation check and waitlist notifications.
   */
  static async cancelById(id: string, reason?: string) {
    const existing = await prisma.appointment.findUnique({
      where: { id },
      include: { service: true, customer: true },
    });

    if (!existing) {
      const err = new Error('NOT_FOUND');
      (err as any).statusCode = 404;
      throw err;
    }

    if (existing.calendarEventId) {
      try {
        await deleteCalendarEvent(existing.calendarEventId);
      } catch (err) {
        console.warn(`Could not delete calendar event ${existing.calendarEventId}:`, err);
      }
    }

    const now = new Date();
    const diffHours = (existing.date.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isLateCancellation = diffHours < 4;

    let updatedNotes = reason
      ? `${existing.notes ? `${existing.notes} | ` : ''}Cancelado: ${reason}`
      : existing.notes;

    if (isLateCancellation) {
      updatedNotes = `${updatedNotes ? `${updatedNotes} | ` : ''}[Cancelación con menos de 4hs de anticipación]`;
      await prisma.customer.update({
        where: { id: existing.customerId },
        data: { lateCancellationsCount: { increment: 1 } },
      }).catch((e) => console.warn('Warning updating customer late cancellation count:', e));
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: updatedNotes,
        lateCancellation: isLateCancellation,
      },
      include: { service: true, customer: true },
    });

    broadcastRealtimeEvent({
      type: 'APPOINTMENT_CANCELLED',
      payload: updated,
    });

    // Notify waitlist asynchronously
    AppointmentService.notifyWaitlistForFreedSlot(existing).catch((err) => {
      console.warn('⚠️ Error notifying waitlist on cancellation:', err);
    });

    return updated;
  }

  /**
   * Notify waitlist customers when a slot is freed up by cancellation.
   */
  private static async notifyWaitlistForFreedSlot(existingApt: any) {
    const aptDateStart = new Date(existingApt.date);
    aptDateStart.setHours(0, 0, 0, 0);
    const aptDateEnd = new Date(existingApt.date);
    aptDateEnd.setHours(23, 59, 59, 999);

    const waitingClient = await prisma.waitlist.findFirst({
      where: {
        serviceId: existingApt.serviceId,
        preferredDate: { gte: aptDateStart, lte: aptDateEnd },
        status: 'WAITING',
      },
      include: { customer: true, service: true },
      orderBy: { createdAt: 'asc' },
    });

    if (waitingClient && waitingClient.customer?.phone) {
      const timeStr = existingApt.date.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/Argentina/Buenos_Aires',
      });
      const dateStr = existingApt.date.toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'America/Argentina/Buenos_Aires',
      });

      const waitlistMsg = (
        `🎉 *¡Buenas noticias ${waitingClient.customer.name}!* 💕\n\n` +
        `Se acaba de liberar un turno para *${waitingClient.service.name}* el *${dateStr}* a las *${timeStr}hs* en *Glow Studio*.\n\n` +
        `👉 *Respondé SÍ a este mensaje si querés tomarlo antes de que se ocupe.* ¡Te esperamos! ✨`
      );

      const { sendWhatsAppMessage } = await import('./whatsapp');
      await sendWhatsAppMessage({
        to: waitingClient.customer.phone,
        message: waitlistMsg,
      });

      await prisma.waitlist.update({
        where: { id: waitingClient.id },
        data: { status: 'OFFERED', offeredAt: new Date() },
      });
    }
  }

  /**
   * Reschedule appointment by ID (Admin).
   */
  static async rescheduleById(id: string, newDate: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { service: true, customer: true },
    });

    if (!appointment) {
      const err = new Error('NOT_FOUND');
      (err as any).statusCode = 404;
      throw err;
    }

    const startDate = new Date(newDate);
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + appointment.service.duration);

    const resourceId = appointment.staffId || 'GLOBAL_SALON_RESOURCE';
    const lockKey = `STAFF_LOCK:${resourceId}`;

    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      const overlapping = await tx.appointment.findFirst({
        where: {
          id: { not: appointment.id },
          status: { in: ['PENDING', 'CONFIRMED'] },
          date: { lt: endDate },
          endDate: { gt: startDate },
          ...(appointment.staffId ? { staffId: appointment.staffId } : {}),
        },
      });

      if (overlapping) {
        throw new Error('CONFLICT_OVERLAPPING');
      }

      const blockedConflict = await tx.blockedTime.findFirst({
        where: {
          startDate: { lt: endDate },
          endDate: { gt: startDate },
        },
      });

      if (blockedConflict) {
        throw new Error(`CONFLICT_BLOCKED:${blockedConflict.reason}`);
      }

      return await tx.appointment.update({
        where: { id },
        data: {
          date: startDate,
          endDate,
          status: 'CONFIRMED',
        },
        include: { service: true, customer: true, staff: true },
      });
    });
  }

  /**
   * Update status and notes for an appointment.
   */
  static async updateAppointment(id: string, data: { status?: any; notes?: string | null }) {
    return await prisma.appointment.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
      include: {
        customer: true,
        service: true,
        staff: true,
      },
    });
  }

  /**
   * List appointments with filters.
   */
  static async listAppointments(filters: {
    status?: string;
    date?: string;
    serviceId?: string;
    limit?: number;
  }) {
    const where: any = {};
    if (filters.status && filters.status !== 'all') where.status = filters.status;
    if (filters.serviceId) where.serviceId = filters.serviceId;
    if (filters.date) {
      const d = new Date(filters.date);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      where.date = { gte: d, lt: nextDay };
    }

    return await prisma.appointment.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        service: true,
      },
      orderBy: { date: 'asc' },
      take: filters.limit || 50,
    });
  }

  /**
   * Create an appointment atomically with advisory lock and notifications.
   */
  static async createAppointment(data: CreateAppointmentInput) {
    const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
    if (!service) {
      const err = new Error('SERVICE_NOT_FOUND');
      (err as any).statusCode = 400;
      throw err;
    }

    const cleanPhone = data.customerPhone ? data.customerPhone.replace(/\D/g, '') : '';
    const cleanEmail = data.customerEmail ? data.customerEmail.trim().toLowerCase() : null;

    let customer = await prisma.customer.findFirst({
      where: {
        OR: [
          ...(cleanPhone ? [{ phone: cleanPhone }, { phone: `+${cleanPhone}` }, { phone: data.customerPhone }] : []),
          ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ],
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: data.customerName.trim(),
          phone: cleanPhone || data.customerPhone,
          email: cleanEmail,
        },
      });
    }

    const startDate = new Date(data.date);
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + service.duration);

    const resourceId = data.staffId || 'GLOBAL_SALON_RESOURCE';
    const lockKey = `STAFF_LOCK:${resourceId}`;

    let appointment = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      const overlapping = await tx.appointment.findFirst({
        where: {
          status: { in: ['PENDING', 'CONFIRMED'] },
          date: { lt: endDate },
          endDate: { gt: startDate },
          ...(data.staffId ? { staffId: data.staffId } : {}),
        },
      });

      if (overlapping) {
        throw new Error('CONFLICT_OVERLAPPING');
      }

      const blockedConflict = await tx.blockedTime.findFirst({
        where: {
          startDate: { lt: endDate },
          endDate: { gt: startDate },
        },
      });

      if (blockedConflict) {
        throw new Error(`CONFLICT_BLOCKED:${blockedConflict.reason}`);
      }

      return await tx.appointment.create({
        data: {
          date: startDate,
          endDate,
          status: 'PENDING',
          notes: data.notes,
          recurrence: (data.recurrence || 'NONE') as any,
          customerId: customer.id,
          serviceId: service.id,
          staffId: data.staffId || null,
          source: data.source as any,
        },
        include: {
          customer: true,
          service: true,
          staff: true,
        },
      });
    });

    // Calendar sync
    try {
      const calendarEventId = await createCalendarEvent({
        summary: `${service.name} — ${data.customerName}`,
        description: `Cliente: ${data.customerName}\nTeléfono: ${data.customerPhone}\n${data.notes ? `Notas: ${data.notes}` : ''}`,
        startTime: startDate,
        endTime: endDate,
      });
      if (calendarEventId) {
        appointment = await prisma.appointment.update({
          where: { id: appointment.id },
          data: { calendarEventId },
          include: { customer: true, service: true, staff: true },
        });
      }
    } catch (calErr) {
      console.warn('⚠️ Google Calendar sync error:', calErr);
    }

    broadcastRealtimeEvent({
      type: 'APPOINTMENT_CREATED',
      payload: appointment,
    });

    // Waitlist update if applicable
    try {
      const waitlistEntry = await prisma.waitlist.findFirst({
        where: {
          customerId: customer.id,
          serviceId: service.id,
          status: { in: ['WAITING', 'OFFERED'] },
        },
      });
      if (waitlistEntry) {
        await prisma.waitlist.update({
          where: { id: waitlistEntry.id },
          data: { status: 'BOOKED' },
        });
      }
    } catch (wErr) {
      console.warn('Warning updating waitlist entry:', wErr);
    }

    // Format and send notifications
    const dateStr = startDate.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const timeStr = startDate.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const dateTimeStr = `${dateStr} a las ${timeStr}hs`;

    try {
      await sendWhatsAppNotification({
        customerName: data.customerName,
        serviceName: service.name,
        dateTime: dateTimeStr,
        price: service.price,
      });

      if (data.customerPhone) {
        await sendBookingConfirmation({
          customerPhone: data.customerPhone,
          customerName: data.customerName,
          serviceName: service.name,
          dateTime: dateTimeStr,
          price: service.price,
        });
      }
    } catch (notifErr: any) {
      console.warn(`⚠️ Warning sending booking notification: ${notifErr.message}`);
    }

    return appointment;
  }

  /**
   * Calculate 30-minute slot availability for a given date and service.
   */
  static async getAvailability(date: string, serviceId: string, staffId?: string) {
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return null;

    const dateStr = date.split('T')[0];
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return null;

    // Argentina is UTC-3 fixed (ART). 09:00 ART = 12:00 UTC, 19:00 ART = 22:00 UTC.
    const dayStart = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(year, month - 1, day, 22, 0, 0, 0));

    const existing = await prisma.appointment.findMany({
      where: {
        date: { gte: dayStart, lt: dayEnd },
        status: { in: ['PENDING', 'CONFIRMED'] },
        ...(staffId ? { staffId } : {}),
      },
    });

    const blockedTimes = await prisma.blockedTime.findMany({
      where: {
        startDate: { lt: dayEnd },
        endDate: { gt: dayStart },
      },
    });

    let busyTimes: Array<{ start: string; end: string }> = [];
    try {
      busyTimes = await getFreeBusy(dayStart, dayEnd);
    } catch {
      // fallback to empty busy times
    }

    const now = Date.now();
    const slots: Array<{ time: string; available: boolean }> = [];

    for (let h = 9; h < 19; h++) {
      for (const m of [0, 30]) {
        const slotStart = new Date(Date.UTC(year, month - 1, day, h + 3, m, 0, 0));
        const slotEnd = new Date(slotStart.getTime() + service.duration * 60000);

        if (slotEnd.getTime() > dayEnd.getTime()) {
          slots.push({ time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`, available: false });
          continue;
        }

        const isPast = slotStart.getTime() <= now;

        const hasConflict = existing.some((apt: any) => {
          const aptStart = new Date(apt.date);
          const aptEnd = new Date(apt.endDate);
          return slotStart < aptEnd && slotEnd > aptStart;
        });

        const hasBlockedConflict = blockedTimes.some((b: any) => {
          const bStart = new Date(b.startDate);
          const bEnd = new Date(b.endDate);
          return slotStart < bEnd && slotEnd > bStart;
        });

        const calBusy = busyTimes.some((busy) => {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          return slotStart < busyEnd && slotEnd > busyStart;
        });

        slots.push({
          time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
          available: !isPast && !hasConflict && !hasBlockedConflict && !calBusy,
        });
      }
    }

    return slots;
  }
}
