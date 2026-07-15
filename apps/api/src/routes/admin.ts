// ============================================
// Admin Routes
// ============================================

import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';

export const adminRouter = Router();

// GET /api/admin/metrics — Dashboard metrics
adminRouter.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Appointments this month
    const appointmentsThisMonth = await prisma.appointment.count({
      where: {
        date: { gte: startOfMonth, lte: endOfMonth },
        status: { not: 'CANCELLED' },
      },
    });

    // New clients this month
    const newClientsThisMonth = await prisma.customer.count({
      where: {
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    // Revenue this month (sum of service prices for completed/confirmed appointments)
    const revenueAppointments = await prisma.appointment.findMany({
      where: {
        date: { gte: startOfMonth, lte: endOfMonth },
        status: { in: ['COMPLETED', 'CONFIRMED'] },
      },
      include: { service: true },
    });
    const revenueThisMonth = revenueAppointments.reduce((sum: number, apt: any) => sum + apt.service.price, 0);

    // Pending appointments
    const pendingAppointments = await prisma.appointment.count({
      where: {
        status: 'PENDING',
        date: { gte: now },
      },
    });

    res.json({
      appointmentsThisMonth,
      newClientsThisMonth,
      revenueThisMonth,
      pendingAppointments,
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});
