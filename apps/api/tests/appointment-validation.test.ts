// ============================================
// Appointment & Customer Validation Schema Tests
// ============================================

import { describe, it, expect } from 'vitest';
import { createAppointmentSchema, updateAppointmentSchema } from '../src/schemas/appointment';
import { createCustomerSchema } from '../src/schemas/customer';

describe('Appointment Zod Validation Schemas', () => {
  describe('createAppointmentSchema', () => {
    it('should validate a valid appointment payload with all fields', () => {
      const validPayload = {
        date: '2026-09-01T15:00:00.000Z',
        serviceId: 'srv_corte_signature_123',
        customerName: 'Lucía Fernández',
        customerPhone: '+5491155551234',
        customerEmail: 'lucia@example.com',
        notes: 'Preferencia estilista Sofia',
        staffId: 'staff_sofia_123',
        source: 'WHATSAPP' as const,
        recurrence: 'MONTHLY' as const,
      };

      const result = createAppointmentSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.customerName).toBe('Lucía Fernández');
        expect(result.data.source).toBe('WHATSAPP');
        expect(result.data.recurrence).toBe('MONTHLY');
      }
    });

    it('should apply defaults for optional fields (source=WEB, recurrence=NONE)', () => {
      const minimalPayload = {
        date: '2026-09-02T10:00:00.000Z',
        serviceId: 'srv_unas_gel_123',
        customerName: 'Ana Clara',
        customerPhone: '+5491144445555',
      };

      const result = createAppointmentSchema.safeParse(minimalPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.source).toBe('WEB');
        expect(result.data.recurrence).toBe('NONE');
        expect(result.data.customerEmail).toBeUndefined();
      }
    });

    it('should accept empty string or null for customerEmail', () => {
      const payloadWithEmptyEmail = {
        date: '2026-09-03T11:00:00.000Z',
        serviceId: 'srv_facial_123',
        customerName: 'Mariana Pérez',
        customerPhone: '1122334455',
        customerEmail: '',
      };

      const payloadWithNullEmail = {
        date: '2026-09-03T11:00:00.000Z',
        serviceId: 'srv_facial_123',
        customerName: 'Mariana Pérez',
        customerPhone: '1122334455',
        customerEmail: null,
      };

      expect(createAppointmentSchema.safeParse(payloadWithEmptyEmail).success).toBe(true);
      expect(createAppointmentSchema.safeParse(payloadWithNullEmail).success).toBe(true);
    });

    it('should reject invalid date formats', () => {
      const invalidDatePayload = {
        date: 'fecha-invalida-no-parseable',
        serviceId: 'srv_123',
        customerName: 'María García',
        customerPhone: '+5491155550000',
      };

      const result = createAppointmentSchema.safeParse(invalidDatePayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Fecha inválida');
      }
    });

    it('should reject missing or empty serviceId', () => {
      const payload = {
        date: '2026-09-01T15:00:00.000Z',
        serviceId: '',
        customerName: 'María García',
        customerPhone: '+5491155550000',
      };

      const result = createAppointmentSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('serviceId'))).toBe(true);
      }
    });

    it('should reject short customer name (< 2 chars)', () => {
      const payload = {
        date: '2026-09-01T15:00:00.000Z',
        serviceId: 'srv_123',
        customerName: 'A',
        customerPhone: '+5491155550000',
      };

      const result = createAppointmentSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('customerName'))).toBe(true);
      }
    });

    it('should reject short phone numbers (< 6 chars)', () => {
      const payload = {
        date: '2026-09-01T15:00:00.000Z',
        serviceId: 'srv_123',
        customerName: 'Camila',
        customerPhone: '12345',
      };

      const result = createAppointmentSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('customerPhone'))).toBe(true);
      }
    });

    it('should reject invalid email formats', () => {
      const payload = {
        date: '2026-09-01T15:00:00.000Z',
        serviceId: 'srv_123',
        customerName: 'Camila',
        customerPhone: '+5491155550000',
        customerEmail: 'not-a-valid-email',
      };

      const result = createAppointmentSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('customerEmail'))).toBe(true);
      }
    });

    it('should reject invalid source enum values', () => {
      const payload = {
        date: '2026-09-01T15:00:00.000Z',
        serviceId: 'srv_123',
        customerName: 'Camila',
        customerPhone: '+5491155550000',
        source: 'TIKTOK',
      };

      const result = createAppointmentSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject invalid recurrence enum values', () => {
      const payload = {
        date: '2026-09-01T15:00:00.000Z',
        serviceId: 'srv_123',
        customerName: 'Camila',
        customerPhone: '+5491155550000',
        recurrence: 'YEARLY',
      };

      const result = createAppointmentSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('updateAppointmentSchema', () => {
    it('should accept valid status updates', () => {
      const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'] as const;

      for (const status of validStatuses) {
        const result = updateAppointmentSchema.safeParse({ status, notes: 'Updated note' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe(status);
        }
      }
    });

    it('should reject invalid status strings', () => {
      const result = updateAppointmentSchema.safeParse({ status: 'INVALID_STATUS' });
      expect(result.success).toBe(false);
    });

    it('should accept partial update with only notes', () => {
      const result = updateAppointmentSchema.safeParse({ notes: 'Cliente avisó demora 10 min' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBe('Cliente avisó demora 10 min');
      }
    });
  });
});

describe('Customer Zod Validation Schemas', () => {
  describe('createCustomerSchema', () => {
    it('should validate customer with name, phone, email, and instagram', () => {
      const payload = {
        name: 'Valentina López',
        phone: '+5491155550101',
        email: 'valentina@example.com',
        instagram: '@valelopez',
        notes: 'Alergia leve a tinturas amoniacales',
      };

      const result = createCustomerSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Valentina López');
        expect(result.data.instagram).toBe('@valelopez');
      }
    });

    it('should reject customer name with less than 2 characters', () => {
      const payload = {
        name: 'V',
        phone: '+5491155550101',
      };

      const result = createCustomerSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });
});
