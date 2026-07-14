// ============================================
// Customers Routes
// ============================================

import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';

export const customersRouter = Router();

// GET /api/customers — List all customers
customersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { search, limit = '50' } = req.query;

    const where = search
      ? {
          OR: [
            { name: { contains: search as string, mode: 'insensitive' as const } },
            { phone: { contains: search as string } },
            { email: { contains: search as string, mode: 'insensitive' as const } },
            { instagram: { contains: search as string, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: { select: { appointments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET /api/customers/:id — Get single customer with appointments
customersRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id as string },
      include: {
        appointments: {
          include: { service: true },
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// POST /api/customers — Create customer
customersRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, phone, email, instagram, notes } = req.body;
    const customer = await prisma.customer.create({
      data: { name, phone, email, instagram, notes },
    });
    res.status(201).json(customer);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});
