// ============================================
// Customer Zod Validation Schemas
// ============================================

import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  instagram: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
