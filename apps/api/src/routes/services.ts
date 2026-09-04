import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../services/prisma';
import { requireAdmin } from '../middleware/auth';

export const servicesRouter = Router();

const createServiceSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().trim().optional().nullable(),
  price: z.coerce.number().positive('El precio debe ser mayor a 0'),
  duration: z.coerce.number().int().positive('La duración debe ser mayor a 0 minutos'),
  category: z.string().trim().default('PELUQUERIA'),
  imageUrl: z.string().trim().optional().nullable(),
});

const updateServiceSchema = createServiceSchema.partial().extend({
  active: z.boolean().optional(),
  order: z.coerce.number().int().optional(),
});

// GET /api/services — List all active services
servicesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const services = await prisma.service.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    });
    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// GET /api/services/:id — Get single service
servicesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const service = await prisma.service.findUnique({
      where: { id: req.params.id as string },
    });
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.json(service);
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ error: 'Failed to fetch service' });
  }
});

// POST /api/services — Create service (admin only)
servicesRouter.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parseResult = createServiceSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Datos de servicio inválidos', details: parseResult.error.flatten() });
    }

    const { name, description, price, duration, category, imageUrl } = parseResult.data;
    const service = await prisma.service.create({
      data: {
        name,
        description: description || null,
        price,
        duration,
        category: category || 'PELUQUERIA',
        imageUrl: imageUrl || null,
      },
    });
    res.status(201).json(service);
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// PATCH /api/services/:id — Update service (admin only)
servicesRouter.patch('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parseResult = updateServiceSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Datos de servicio inválidos', details: parseResult.error.flatten() });
    }

    const service = await prisma.service.update({
      where: { id: req.params.id as string },
      data: parseResult.data as any,
    });
    res.json(service);
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// DELETE /api/services/:id — Soft delete / deactivate service (admin only)
servicesRouter.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const service = await prisma.service.update({
      where: { id: req.params.id as string },
      data: { active: false },
    });
    res.json({ message: 'Service deactivated', service });
  } catch (error) {
    console.error('Error deactivating service:', error);
    res.status(500).json({ error: 'Failed to deactivate service' });
  }
});

