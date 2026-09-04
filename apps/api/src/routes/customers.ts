// ============================================
// Customers Routes
// ============================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../services/prisma';

export const customersRouter = Router();

const createCustomerSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  phone: z.string().trim().min(6, 'El teléfono debe tener al menos 6 dígitos'),
  email: z.string().trim().email('Email inválido').optional().nullable().or(z.literal('')),
  instagram: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

// GET /api/customers — List customers with pagination
customersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { search, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const skip = (pageNum - 1) * limitNum;

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

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        include: {
          _count: { select: { appointments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    res.setHeader('X-Total-Count', total.toString());
    res.json({ data: customers, pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
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
    const parseResult = createCustomerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Datos de cliente inválidos', details: parseResult.error.flatten() });
    }

    const { name, phone, email, instagram, notes } = parseResult.data;
    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        email: email || null,
        instagram: instagram || null,
        notes: notes || null,
      },
    });
    res.status(201).json(customer);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});
