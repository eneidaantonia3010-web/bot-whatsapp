// ============================================
// Staff & Stylists Management Routes
// ============================================

import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { z } from 'zod';
import { logger } from '../services/logger';

export const staffRouter = Router();

const createStaffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  bio: z.string().optional().nullable(),
  specialties: z.array(z.string()).default([]),
  calendarId: z.string().optional().nullable(),
  workingHours: z.any().optional().nullable(),
});

const updateStaffSchema = createStaffSchema.partial().extend({
  active: z.boolean().optional(),
});

// GET /api/staff — List active staff members (Public for booking wizard)
staffRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { includeInactive } = req.query;
    const where: any = {};
    if (includeInactive !== 'true') {
      where.active = true;
    }

    const staffMembers = await prisma.staff.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        bio: true,
        specialties: true,
        active: true,
        workingHours: true,
      },
    });

    res.json(staffMembers);
  } catch (error) {
    logger.error({ error }, 'Error fetching staff members');
    res.status(500).json({ error: 'Failed to fetch staff members' });
  }
});

// GET /api/staff/:id — Get staff member profile with recent appointments (Admin/Auth)
staffRouter.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const staffMember = await prisma.staff.findUnique({
      where: { id: id as string },
      include: {
        appointments: {
          take: 10,
          orderBy: { date: 'desc' },
          include: {
            service: true,
            customer: true,
          },
        },
      },
    });

    if (!staffMember) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.json(staffMember);
  } catch (error) {
    logger.error({ error }, 'Error fetching staff profile');
    res.status(500).json({ error: 'Failed to fetch staff profile' });
  }
});

// POST /api/staff — Create new staff member (Admin only)
staffRouter.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = createStaffSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid staff data', details: parsed.error.flatten() });
    }

    const newStaff = await prisma.staff.create({
      data: parsed.data,
    });

    logger.info({ staffId: newStaff.id, name: newStaff.name }, 'Staff member created');
    res.status(201).json(newStaff);
  } catch (error) {
    logger.error({ error }, 'Error creating staff member');
    res.status(500).json({ error: 'Failed to create staff member' });
  }
});

// PATCH /api/staff/:id — Update staff member (Admin only)
staffRouter.patch('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = updateStaffSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid staff data', details: parsed.error.flatten() });
    }

    const updatedStaff = await prisma.staff.update({
      where: { id: id as string },
      data: parsed.data,
    });

    logger.info({ staffId: id }, 'Staff member updated');
    res.json(updatedStaff);
  } catch (error) {
    logger.error({ error }, 'Error updating staff member');
    res.status(500).json({ error: 'Failed to update staff member' });
  }
});
