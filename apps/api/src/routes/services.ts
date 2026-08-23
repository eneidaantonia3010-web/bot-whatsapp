import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';
import { requireAdmin } from '../middleware/auth';

export const servicesRouter = Router();

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
    const { name, description, price, duration, category, imageUrl } = req.body;
    if (!name || !price || !duration) {
      return res.status(400).json({ error: 'Nombre, precio y duración son requeridos' });
    }
    const service = await prisma.service.create({
      data: { name, description, price, duration, category: category || 'PELUQUERIA', imageUrl },
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
    const { name, description, price, duration, category, imageUrl, active, order } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (duration !== undefined) updateData.duration = duration;
    if (category !== undefined) updateData.category = category;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (active !== undefined) updateData.active = active;
    if (order !== undefined) updateData.order = order;

    const service = await prisma.service.update({
      where: { id: req.params.id as string },
      data: updateData,
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

