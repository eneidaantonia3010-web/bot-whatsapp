import { z } from 'zod';

export const bookingFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Por favor ingresa tu nombre completo y un teléfono válido.'),
  phone: z
    .string()
    .trim()
    .min(6, 'Por favor ingresa tu nombre completo y un teléfono válido.')
    .max(30, 'Número de teléfono demasiado largo'),
  email: z
    .string()
    .trim()
    .email('Formato de email inválido')
    .optional()
    .or(z.literal('')),
  notes: z
    .string()
    .trim()
    .max(500, 'Las notas no pueden superar los 500 caracteres')
    .optional()
    .or(z.literal('')),
});

export type BookingFormData = z.infer<typeof bookingFormSchema>;
