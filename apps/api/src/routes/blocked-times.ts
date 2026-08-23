// ============================================
// Blocked Times / Holidays Routes (Express API)
// ============================================

import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { z } from 'zod';
import { requireAdmin } from '../middleware/auth';

export const blockedTimesRouter = Router();

const createBlockedTimeSchema = z.object({
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Fecha de inicio inválida.',
  }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Fecha de fin inválida.',
  }),
  reason: z.string().min(2, { message: 'El motivo es requerido (mínimo 2 caracteres).' }),
  allDay: z.boolean().optional().default(false),
});

// GET /api/blocked-times — List blocked times (with optional date range filters)
blockedTimesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    const where: any = {};

    if (from || to) {
      where.startDate = {};
      if (from) where.startDate.gte = new Date(from as string);
      if (to) where.startDate.lte = new Date(to as string);
    }

    const blockedTimes = await prisma.blockedTime.findMany({
      where,
      orderBy: { startDate: 'asc' },
    });

    return res.json(blockedTimes);
  } catch (error: any) {
    console.error('Error fetching blocked times:', error);
    return res.status(500).json({ error: 'Failed to fetch blocked times' });
  }
});

// POST /api/blocked-times — Create a new blocked time or holiday (admin only)
blockedTimesRouter.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parseResult = createBlockedTimeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parseResult.error.flatten() });
    }

    const { startDate, endDate, reason, allDay } = parseResult.data;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      return res.status(400).json({ error: 'La fecha/hora de fin debe ser posterior a la de inicio.' });
    }

    const blocked = await prisma.blockedTime.create({
      data: {
        startDate: start,
        endDate: end,
        reason,
        allDay,
      },
    });

    console.log(`🔒 Blocked time created: [${blocked.id}] ${reason} (${start.toISOString()} - ${end.toISOString()})`);
    return res.status(201).json(blocked);
  } catch (error: any) {
    console.error('Error creating blocked time:', error);
    return res.status(500).json({ error: 'Failed to create blocked time' });
  }
});

// DELETE /api/blocked-times/:id — Delete a blocked time (admin only)
blockedTimesRouter.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.blockedTime.delete({
      where: { id: id as string },
    });

    console.log(`🔓 Blocked time deleted: ${id}`);
    return res.json({ status: 'ok', message: 'Bloqueo eliminado exitosamente.' });
  } catch (error: any) {
    console.error('Error deleting blocked time:', error);
    return res.status(500).json({ error: 'Failed to delete blocked time' });
  }
});
