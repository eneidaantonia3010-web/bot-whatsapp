// ============================================
// Data CSV Export Routes
// ============================================

import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma';

export const exportsRouter = Router();

// Neutralize CSV formula injection by prepending single quote to formula triggers (=, +, -, @)
function sanitizeCsvField(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  let str = String(val).replace(/"/g, '""');
  if (/^[=+@\t\r\n-]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str}"`;
}

// GET /api/exports/appointments.csv — Export appointments to CSV
exportsRouter.get('/appointments.csv', async (_req: Request, res: Response) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: { customer: true, service: true },
      orderBy: { date: 'desc' },
      take: 1000,
    });

    const headers = ['ID', 'Fecha', 'Estado', 'Cliente', 'Telefono', 'Servicio', 'Precio', 'Origen'];
    const rows = appointments.map((apt: any) => [
      sanitizeCsvField(apt.id),
      sanitizeCsvField(apt.date.toISOString()),
      sanitizeCsvField(apt.status),
      sanitizeCsvField(apt.customer?.name),
      sanitizeCsvField(apt.customer?.phone || ''),
      sanitizeCsvField(apt.service?.name),
      sanitizeCsvField(apt.service?.price),
      sanitizeCsvField(apt.source),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="turnos-glow-studio.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting appointments CSV:', error);
    res.status(500).json({ error: 'Failed to export appointments CSV' });
  }
});

// GET /api/exports/customers.csv — Export customers to CSV
exportsRouter.get('/customers.csv', async (_req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { name: 'asc' },
      take: 2000,
    });

    const headers = ['ID', 'Nombre', 'Telefono', 'Email', 'Instagram', 'FechaRegistro'];
    const rows = customers.map((c: any) => [
      sanitizeCsvField(c.id),
      sanitizeCsvField(c.name),
      sanitizeCsvField(c.phone || ''),
      sanitizeCsvField(c.email || ''),
      sanitizeCsvField(c.instagram || ''),
      sanitizeCsvField(c.createdAt.toISOString()),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="clientes-glow-studio.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting customers CSV:', error);
    res.status(500).json({ error: 'Failed to export customers CSV' });
  }
});
