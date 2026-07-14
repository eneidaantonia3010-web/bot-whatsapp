// ============================================
// Services Routes
// ============================================

import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';

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

// POST /api/services — Create service (admin)
servicesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, price, duration, category, imageUrl } = req.body;
    const service = await prisma.service.create({
      data: { name, description, price, duration, category, imageUrl },
    });
    res.status(201).json(service);
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// PATCH /api/services/:id — Update service (admin)
servicesRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const service = await prisma.service.update({
      where: { id: req.params.id as string },
      data: req.body,
    });
    res.json(service);
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});
