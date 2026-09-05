import { Router, Request, Response } from 'express';
import { AppointmentService } from '../services/appointment-service';
import { createAppointmentSchema, updateAppointmentSchema } from '../schemas/appointment';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { appointmentCreationLimiter } from '../middleware/rate-limit';

export const appointmentsRouter = Router();

// GET /api/appointments/by-token/:token — Self-service customer portal appointment lookup
appointmentsRouter.get('/by-token/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const appointment = await AppointmentService.getByToken(token as string);

    if (!appointment) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    res.json(appointment);
  } catch (error) {
    console.error('Error fetching appointment by token:', error);
    res.status(500).json({ error: 'Error al obtener el turno' });
  }
});

// POST /api/appointments/by-token/:token/reschedule — Self-service customer reschedule
appointmentsRouter.post('/by-token/:token/reschedule', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { newDate } = req.body;

    if (!newDate || isNaN(Date.parse(newDate))) {
      return res.status(400).json({ error: 'newDate es requerida y debe ser válida' });
    }

    try {
      const updated = await AppointmentService.rescheduleByToken(token as string, newDate);
      res.json(updated);
    } catch (err: any) {
      if (err.statusCode === 404 || err.message === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Turno no encontrado' });
      }
      if (err.statusCode === 400 || err.message === 'CANNOT_RESCHEDULE_CANCELLED') {
        return res.status(400).json({ error: 'No se puede reprogramar un turno cancelado' });
      }
      if (err.message === 'CONFLICT_OVERLAPPING') {
        return res.status(409).json({ error: 'El horario seleccionado ya no está disponible.' });
      }
      if (err.message?.startsWith('CONFLICT_BLOCKED')) {
        const reason = err.message.split(':')[1] || 'Horario no disponible';
        return res.status(409).json({ error: `El horario no está disponible: ${reason}` });
      }
      throw err;
    }
  } catch (error) {
    console.error('Error rescheduling by token:', error);
    res.status(500).json({ error: 'Error al reprogramar el turno' });
  }
});

// POST /api/appointments/by-token/:token/cancel — Self-service customer cancel
appointmentsRouter.post('/by-token/:token/cancel', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { reason } = req.body;

    try {
      const updated = await AppointmentService.cancelByToken(token as string, reason);
      res.json(updated);
    } catch (err: any) {
      if (err.statusCode === 404 || err.message === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Turno no encontrado' });
      }
      throw err;
    }
  } catch (error) {
    console.error('Error cancelling by token:', error);
    res.status(500).json({ error: 'Error al cancelar el turno' });
  }
});

// GET /api/appointments/customer/upcoming — Get upcoming active appointments for a customer
appointmentsRouter.get('/customer/upcoming', requireAuth, async (req: Request, res: Response) => {
  try {
    const { phone, instagram } = req.query;
    if (!phone && !instagram) {
      return res.status(400).json({ error: 'phone or instagram is required' });
    }

    const upcoming = await AppointmentService.getUpcomingForCustomer(
      phone as string | undefined,
      instagram as string | undefined
    );

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

    const updated = await AppointmentService.confirmUpcoming(
      phone as string | undefined,
      instagram as string | undefined
    );

    if (!updated) {
      return res.status(404).json({ error: 'No pending appointment found in the next 48 hours or customer not found' });
    }

    console.log(`✅ Appointment ${updated.id} confirmed automatically via WhatsApp reply`);
    res.json(updated);
  } catch (error) {
    console.error('Error confirming appointment:', error);
    res.status(500).json({ error: 'Failed to confirm appointment' });
  }
});

// POST /api/appointments/:id/cancel — Cancel an appointment and delete Google Calendar event
appointmentsRouter.post('/:id/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    try {
      const updated = await AppointmentService.cancelById(id as string, reason);
      res.json(updated);
    } catch (err: any) {
      if (err.statusCode === 404 || err.message === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Appointment not found' });
      }
      throw err;
    }
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

// POST /api/appointments/:id/reschedule — Reschedule an appointment to a new date/time
appointmentsRouter.post('/:id/reschedule', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newDate } = req.body;

    if (!newDate || isNaN(Date.parse(newDate))) {
      return res.status(400).json({ error: 'newDate is required and must be a valid ISO-8601 date string' });
    }

    try {
      const updated = await AppointmentService.rescheduleById(id as string, newDate);
      res.json(updated);
    } catch (err: any) {
      if (err.statusCode === 404 || err.message === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Appointment not found' });
      }
      if (err.message === 'CONFLICT_OVERLAPPING') {
        return res.status(409).json({ error: 'El nuevo horario seleccionado no está disponible.' });
      }
      if (err.message?.startsWith('CONFLICT_BLOCKED')) {
        const reason = err.message.split(':')[1] || 'Horario no disponible';
        return res.status(409).json({ error: `El horario no está disponible: ${reason}` });
      }
      throw err;
    }
  } catch (error) {
    console.error('Error rescheduling appointment:', error);
    res.status(500).json({ error: 'Failed to reschedule appointment' });
  }
});

// GET /api/appointments — List appointments with optional filters (admin only)
appointmentsRouter.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status, date, serviceId, limit = '50' } = req.query;

    const appointments = await AppointmentService.listAppointments({
      status: status as string | undefined,
      date: date as string | undefined,
      serviceId: serviceId as string | undefined,
      limit: parseInt(limit as string) || 50,
    });

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// POST /api/appointments — Create new appointment
appointmentsRouter.post('/', appointmentCreationLimiter, async (req: Request, res: Response) => {
  try {
    const parseResult = createAppointmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Datos de reserva inválidos', details: parseResult.error.flatten() });
    }

    try {
      const appointment = await AppointmentService.createAppointment(parseResult.data);
      res.status(201).json(appointment);
    } catch (err: any) {
      if (err.statusCode === 400 && err.message === 'SERVICE_NOT_FOUND') {
        return res.status(400).json({ error: 'Service not found' });
      }
      if (err.message === 'CONFLICT_OVERLAPPING') {
        return res.status(409).json({ error: 'El horario seleccionado ya no está disponible.' });
      }
      if (err.message?.startsWith('CONFLICT_BLOCKED:')) {
        const reason = err.message.split(':')[1];
        return res.status(409).json({ error: `El horario está bloqueado (${reason}).` });
      }
      throw err;
    }
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// PATCH /api/appointments/:id — Update appointment status (admin only)
appointmentsRouter.patch('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parseResult = updateAppointmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parseResult.error.flatten() });
    }

    const { status, notes } = parseResult.data;

    const appointment = await AppointmentService.updateAppointment(req.params.id as string, {
      status,
      notes,
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
    const { date, serviceId, staffId } = req.query;
    if (!date || !serviceId) {
      return res.status(400).json({ error: 'date and serviceId are required' });
    }

    const slots = await AppointmentService.getAvailability(
      date as string,
      serviceId as string,
      staffId as string | undefined
    );

    if (slots === null) {
      return res.status(400).json({ error: 'Invalid date or service not found' });
    }

    res.json(slots);
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});
