import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent, getFreeBusy } from '../services/calendar';
import { sendWhatsAppNotification, sendBookingConfirmation } from '../services/whatsapp';
import { createAppointmentSchema, updateAppointmentSchema } from '../schemas/appointment';

export const appointmentsRouter = Router();

// GET /api/appointments/customer/upcoming — Get upcoming active appointments for a customer
appointmentsRouter.get('/customer/upcoming', async (req: Request, res: Response) => {
  try {
    const { phone, instagram } = req.query;
    if (!phone && !instagram) {
      return res.status(400).json({ error: 'phone or instagram is required' });
    }

    const cleanPhone = phone ? (phone as string).replace(/[^0-9]/g, '') : null;
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
      customerConditions.push({ instagram: instagram as string });
    }

    const customer = await prisma.customer.findFirst({
      where: { OR: customerConditions },
    });

    if (!customer) {
      return res.json([]);
    }

    const upcoming = await prisma.appointment.findMany({
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

    res.json(upcoming);
  } catch (error) {
    console.error('Error fetching customer upcoming appointments:', error);
    res.status(500).json({ error: 'Failed to fetch customer appointments' });
  }
});

// POST /api/appointments/confirm-upcoming — Confirm a customer's upcoming PENDING appointment (within 48h)
appointmentsRouter.post('/confirm-upcoming', async (req: Request, res: Response) => {
  try {
    const { phone, instagram } = req.body;
    if (!phone && !instagram) {
      return res.status(400).json({ error: 'phone or instagram is required' });
    }

    const cleanPhone = phone ? (phone as string).replace(/[^0-9]/g, '') : null;
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
      customerConditions.push({ instagram: instagram as string });
    }

    const customer = await prisma.customer.findFirst({
      where: { OR: customerConditions },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Find the next pending appointment within 48h
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

    if (!appointment) {
      return res.status(404).json({ error: 'No pending appointment found in the next 48 hours' });
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: 'CONFIRMED' },
      include: {
        service: true,
        customer: true,
      },
    });

    console.log(`✅ Appointment ${updated.id} confirmed automatically via WhatsApp reply`);
    res.json(updated);
  } catch (error) {
    console.error('Error confirming appointment:', error);
    res.status(500).json({ error: 'Failed to confirm appointment' });
  }
});

// POST /api/appointments/:id/cancel — Cancel an appointment and delete Google Calendar event
appointmentsRouter.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const existing = await prisma.appointment.findUnique({
      where: { id: id as string },
      include: { service: true, customer: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Delete Google Calendar event if it exists
    if (existing.calendarEventId) {
      try {
        await deleteCalendarEvent(existing.calendarEventId);
      } catch (err) {
        console.warn(`Could not delete calendar event ${existing.calendarEventId}:`, err);
      }
    }

    // ── Func 8: Check if cancellation is within 4 hours (Late Cancellation) ──
    const now = new Date();
    const diffHours = (existing.date.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isLateCancellation = diffHours < 4;

    let updatedNotes = reason
      ? `${existing.notes ? `${existing.notes} | ` : ''}Cancelado: ${reason}`
      : existing.notes;

    if (isLateCancellation) {
      updatedNotes = `${updatedNotes ? `${updatedNotes} | ` : ''}[Cancelación con menos de 4hs de anticipación]`;
      // Increment customer's late cancellations count
      await prisma.customer.update({
        where: { id: existing.customerId },
        data: { lateCancellationsCount: { increment: 1 } },
      }).catch((e) => console.warn('Warning updating customer late cancellation count:', e));
    }

    const updated = await prisma.appointment.update({
      where: { id: id as string },
      data: {
        status: 'CANCELLED',
        notes: updatedNotes,
        lateCancellation: isLateCancellation,
      },
      include: { service: true, customer: true },
    });

    console.log(`🗑️ Appointment ${id} cancelled successfully (Late: ${isLateCancellation})`);

    // ── Func 2: Smart Waitlist Notification ──
    try {
      const aptDateStart = new Date(existing.date);
      aptDateStart.setHours(0, 0, 0, 0);
      const aptDateEnd = new Date(existing.date);
      aptDateEnd.setHours(23, 59, 59, 999);

      const waitingClient = await prisma.waitlist.findFirst({
        where: {
          serviceId: existing.serviceId,
          preferredDate: { gte: aptDateStart, lte: aptDateEnd },
          status: 'WAITING',
        },
        include: { customer: true, service: true },
        orderBy: { createdAt: 'asc' },
      });

      if (waitingClient && waitingClient.customer?.phone) {
        const timeStr = existing.date.toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'America/Argentina/Buenos_Aires',
        });
        const dateStr = existing.date.toLocaleDateString('es-AR', {
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

        const { sendWhatsAppMessage } = await import('../services/whatsapp');
        await sendWhatsAppMessage({
          to: waitingClient.customer.phone,
          message: waitlistMsg,
        });

        await prisma.waitlist.update({
          where: { id: waitingClient.id },
          data: { status: 'OFFERED', offeredAt: new Date() },
        });

        console.log(`📢 Smart Waitlist: Sent freed slot offer to ${waitingClient.customer.name} (${waitingClient.customer.phone})`);
      }
    } catch (waitlistErr: any) {
      console.warn('⚠️ Error notifying waitlist on cancellation:', waitlistErr.message);
    }

    res.json(updated);
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

// POST /api/appointments/:id/reschedule — Reschedule an appointment to a new date/time
appointmentsRouter.post('/:id/reschedule', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newDate } = req.body;

    if (!newDate || isNaN(Date.parse(newDate))) {
      return res.status(400).json({ error: 'newDate is required and must be a valid ISO-8601 date string' });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: id as string },
      include: { service: true, customer: true },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const startDate = new Date(newDate);
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + appointment.service.duration);

    // Check for overlapping appointments excluding current one
    const overlapping = await prisma.appointment.findFirst({
      where: {
        id: { not: appointment.id },
        status: { in: ['PENDING', 'CONFIRMED'] },
        date: { lt: endDate },
        endDate: { gt: startDate },
      },
    });

    if (overlapping) {
      return res.status(409).json({ error: 'El nuevo horario seleccionado no está disponible.' });
    }

    // Update Google Calendar event if it exists
    if (appointment.calendarEventId) {
      try {
        await updateCalendarEvent(appointment.calendarEventId, {
          summary: `${appointment.service.name} — ${appointment.customer.name}`,
          startTime: startDate,
          endTime: endDate,
        });
      } catch (err) {
        console.warn(`Could not update calendar event ${appointment.calendarEventId}:`, err);
      }
    }

    const updated = await prisma.appointment.update({
      where: { id: id as string },
      data: {
        date: startDate,
        endDate,
        status: 'CONFIRMED',
      },
      include: { service: true, customer: true },
    });

    console.log(`📅 Appointment ${id} rescheduled to ${startDate.toISOString()}`);
    res.json(updated);
  } catch (error) {
    console.error('Error rescheduling appointment:', error);
    res.status(500).json({ error: 'Failed to reschedule appointment' });
  }
});

// GET /api/appointments — List appointments with optional filters
appointmentsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status, date, serviceId, limit = '50' } = req.query;

    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (serviceId) where.serviceId = serviceId;
    if (date) {
      const d = new Date(date as string);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      where.date = { gte: d, lt: nextDay };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          }
        },
        service: true,
      },
      orderBy: { date: 'asc' },
      take: parseInt(limit as string),
    });

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// POST /api/appointments — Create new appointment
appointmentsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parseResult = createAppointmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Datos de reserva inválidos', details: parseResult.error.flatten() });
    }

    const { date, serviceId, customerName, customerPhone, customerEmail, notes, source, recurrence } = parseResult.data;


    // Get service for duration
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      return res.status(400).json({ error: 'Service not found' });
    }

    // Create or find customer
    let customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { phone: customerPhone },
          { email: customerEmail || undefined },
        ],
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customerName,
          phone: customerPhone,
          email: customerEmail || null,
        },
      });
    }

    // Calculate end date
    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + service.duration);

    // Create Google Calendar event
    let calendarEventId: string | null = null;
    try {
      calendarEventId = await createCalendarEvent({
        summary: `${service.name} — ${customerName}`,
        description: `Cliente: ${customerName}\nTeléfono: ${customerPhone}\n${notes ? `Notas: ${notes}` : ''}`,
        startTime: startDate,
        endTime: endDate,
      });
    } catch (calErr) {
      console.warn('⚠️ Google Calendar sync error (continuing booking):', calErr);
    }

    // ── Atomic transaction: check overlap & insert appointment (Prevents TOCTOU Race Condition) ──
    let appointment;
    try {
      appointment = await prisma.$transaction(async (tx) => {
        const overlapping = await tx.appointment.findFirst({
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] },
            date: { lt: endDate },
            endDate: { gt: startDate },
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
            notes,
            recurrence: (recurrence || 'NONE') as any,
            customerId: customer.id,
            serviceId: service.id,
            calendarEventId,
            source: source as any,
          },
          include: {
            customer: true,
            service: true,
          },
        });
      });
    } catch (txErr: any) {
      if (txErr.message === 'CONFLICT_OVERLAPPING') {
        return res.status(409).json({ error: 'El horario seleccionado ya no está disponible.' });
      }
      if (txErr.message?.startsWith('CONFLICT_BLOCKED:')) {
        const reason = txErr.message.split(':')[1];
        return res.status(409).json({ error: `El horario está bloqueado (${reason}).` });
      }
      throw txErr;
    }

    // ── Func 2: If booking was from waitlist, update waitlist status to BOOKED ──
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
        console.log(`📋 Waitlist entry ${waitlistEntry.id} marked as BOOKED`);
      }
    } catch (wErr: any) {
      console.warn('Warning updating waitlist entry to BOOKED:', wErr.message);
    }

    // Format date for notifications
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

    // Send WhatsApp notifications (non-blocking)
    try {
      await sendWhatsAppNotification({
        customerName,
        serviceName: service.name,
        dateTime: dateTimeStr,
      });

      if (customerPhone) {
        await sendBookingConfirmation({
          customerPhone,
          customerName,
          serviceName: service.name,
          dateTime: dateTimeStr,
        });
      }
    } catch (notifErr: any) {
      console.warn(`⚠️ Warning sending booking notification: ${notifErr.message}`);
    }

    console.log(`✅ Appointment created: ${appointment.id}`);
    res.status(201).json(appointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// PATCH /api/appointments/:id — Update appointment status
appointmentsRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const parseResult = updateAppointmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parseResult.error.flatten() });
    }
    
    const { status, notes } = parseResult.data;

    const appointment = await prisma.appointment.update({
      where: { id: req.params.id as string },
      data: { status, notes },
      include: {
        customer: true,
        service: true,
      },
    });

    res.json(appointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// GET /api/appointments/availability — Get available time slots for a date
appointmentsRouter.get('/availability', async (req: Request, res: Response) => {
  try {
    const { date, serviceId } = req.query;
    if (!date || !serviceId) {
      return res.status(400).json({ error: 'date and serviceId are required' });
    }

    const service = await prisma.service.findUnique({ where: { id: serviceId as string } });
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const queryDate = new Date(date as string);
    const dayStart = new Date(queryDate);
    dayStart.setHours(9, 0, 0, 0);
    const dayEnd = new Date(queryDate);
    dayEnd.setHours(19, 0, 0, 0);

    // Get existing appointments for the day
    const existing = await prisma.appointment.findMany({
      where: {
        date: { gte: dayStart, lt: dayEnd },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    // Get blocked times for the day
    const blockedTimes = await prisma.blockedTime.findMany({
      where: {
        startDate: { lt: dayEnd },
        endDate: { gt: dayStart },
      },
    });

    // Get Google Calendar busy times
    const busyTimes = await getFreeBusy(dayStart, dayEnd);

    // Generate all possible slots (every 30 min from 9:00 to 19:00)
    const slots: Array<{ time: string; available: boolean }> = [];
    for (let h = 9; h < 19; h++) {
      for (const m of [0, 30]) {
        const slotStart = new Date(queryDate);
        slotStart.setHours(h, m, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + service.duration);

        // Check if slot end is past closing time
        if (slotEnd.getHours() >= 19 && slotEnd.getMinutes() > 0) {
          slots.push({ time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`, available: false });
          continue;
        }

        // Check against existing appointments
        const hasConflict = existing.some((apt: any) => {
          const aptStart = new Date(apt.date);
          const aptEnd = new Date(apt.endDate);
          return slotStart < aptEnd && slotEnd > aptStart;
        });

        // Check against blocked times
        const hasBlockedConflict = blockedTimes.some((b: any) => {
          const bStart = new Date(b.startDate);
          const bEnd = new Date(b.endDate);
          return slotStart < bEnd && slotEnd > bStart;
        });

        // Check against Google Calendar busy times
        const calBusy = busyTimes.some((busy) => {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          return slotStart < busyEnd && slotEnd > busyStart;
        });

        slots.push({
          time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
          available: !hasConflict && !hasBlockedConflict && !calBusy,
        });
      }
    }

    res.json(slots);
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});
