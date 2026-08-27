// ============================================
// Appointment Zod Validation Schemas
// ============================================

import { z } from 'zod';

export const createAppointmentSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Fecha inválida. Debe ser una cadena ISO-8601 o fecha válida.',
  }),
  serviceId: z.string().min(1, { message: 'El serviceId es requerido.' }),
  customerName: z.string().min(2, { message: 'El nombre del cliente debe tener al menos 2 caracteres.' }),
  customerPhone: z.string().min(6, { message: 'El teléfono debe tener al menos 6 dígitos.' }),
  customerEmail: z.string().email({ message: 'Email inválido.' }).optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable(),
  staffId: z.string().optional().nullable(),
  source: z.enum(['INSTAGRAM', 'WHATSAPP', 'WEB']).optional().default('WEB'),
  recurrence: z.enum(['NONE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']).optional().default('NONE'),
});

export const updateAppointmentSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']).optional(),
  notes: z.string().optional().nullable(),
});
