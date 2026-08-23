// ============================================
// Smart Waitlist Routes (Express API)
// ============================================

import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { z } from 'zod';
import { requireAdmin } from '../middleware/auth';

export const waitlistRouter = Router();

const addToWaitlistSchema = z.object({
  customerName: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  customerPhone: z.string().min(6, { message: 'Teléfono inválido.' }),
  serviceId: z.string().min(1, { message: 'El serviceId es requerido.' }),
  preferredDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Fecha preferida inválida.',
  }),
  timeRange: z.string().optional().nullable(), // e.g. "mañana", "tarde", "14:00-18:00"
  notes: z.string().optional().nullable(),
});

// GET /api/waitlist — List all waitlist entries (admin only)
waitlistRouter.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status, date, serviceId } = req.query;
    const where: any = {};

    if (status && status !== 'all') {
      where.status = status;
    }
    if (serviceId) {
      where.serviceId = serviceId;
    }
    if (date) {
      const d = new Date(date as string);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      where.preferredDate = { gte: d, lt: nextDay };
    }

    const waitlist = await prisma.waitlist.findMany({
      where,
      include: {
        customer: true,
        service: true,
      },
      orderBy: { createdAt: 'asc' }, // FIFO: first come, first served
    });

    return res.json(waitlist);
  } catch (error: any) {
    console.error('Error fetching waitlist:', error);
    return res.status(500).json({ error: 'Failed to fetch waitlist' });
  }
});

// POST /api/waitlist — Add customer to waitlist
waitlistRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parseResult = addToWaitlistSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parseResult.error.flatten() });
    }

    const { customerName, customerPhone, serviceId, preferredDate, timeRange, notes } = parseResult.data;

    // Verify service exists
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      return res.status(400).json({ error: 'Servicio no encontrado.' });
    }

    // Find or create customer
    let customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { phone: customerPhone },
          { phone: `+${customerPhone}` },
          { phone: { contains: customerPhone.slice(-8) } },
        ],
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customerName,
          phone: customerPhone,
        },
      });
    }

    const entry = await prisma.waitlist.create({
      data: {
        customerId: customer.id,
        serviceId: service.id,
        preferredDate: new Date(preferredDate),
        timeRange: timeRange || null,
        notes: notes || null,
        status: 'WAITING',
      },
      include: {
        customer: true,
        service: true,
      },
    });

    console.log(`📋 Added to waitlist: [${entry.id}] ${customer.name} for ${service.name} on ${preferredDate}`);
    return res.status(201).json(entry);
  } catch (error: any) {
    console.error('Error adding to waitlist:', error);
    return res.status(500).json({ error: 'Failed to add to waitlist' });
  }
});

// DELETE /api/waitlist/:id — Remove from waitlist (admin only)
waitlistRouter.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.waitlist.delete({
      where: { id: id as string },
    });

    console.log(`🗑️ Removed from waitlist: ${id}`);
    return res.json({ status: 'ok', message: 'Eliminado de la lista de espera.' });
  } catch (error: any) {
    console.error('Error deleting waitlist entry:', error);
    return res.status(500).json({ error: 'Failed to delete waitlist entry' });
  }
});
