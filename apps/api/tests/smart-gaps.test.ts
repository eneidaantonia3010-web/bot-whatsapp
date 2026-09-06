// ============================================
// Unit & Integration Tests: Predictive Smart Gaps Algorithm
// Tests AppointmentService.scoreSlotsForSmartGaps and availability routes
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/services/prisma';
import { AppointmentService, TimeSlotAvailability } from '../src/services/appointment-service';

describe('Predictive Agenda Optimization (Smart Gaps) Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('AppointmentService.scoreSlotsForSmartGaps (Pure Algorithm)', () => {
    // Helper to generate full day candidate slots
    const generateDaySlots = (): TimeSlotAvailability[] => {
      const slots: TimeSlotAvailability[] = [];
      for (let h = 9; h < 19; h++) {
        slots.push({ time: `${h.toString().padStart(2, '0')}:00`, available: true });
        slots.push({ time: `${h.toString().padStart(2, '0')}:30`, available: true });
      }
      return slots;
    };

    it('1. Contigüidad Izquierda: should prioritize slot immediately before existing appointment', () => {
      const slots = generateDaySlots();
      // Appointment from 11:00 to 12:00 (ART)
      const existing = [
        { date: '11:00', endDate: '12:00', status: 'CONFIRMED' },
      ];
      const serviceDuration = 60; // 60 min

      const { scoredSlots } = AppointmentService.scoreSlotsForSmartGaps(slots, existing, serviceDuration);

      const slot1000 = scoredSlots.find((s) => s.time === '10:00');
      const slot1500 = scoredSlots.find((s) => s.time === '15:00');

      expect(slot1000).toBeDefined();
      expect(slot1500).toBeDefined();
      // 10:00 ends at 11:00, delta 0 with 11:00 appointment -> adjacent_appointment_exact (+100)
      expect(slot1000!.score).toBeGreaterThan(slot1500!.score!);
      expect(slot1000!.gapReason).toContain('adjacent_appointment_exact');
    });

    it('2. Contigüidad Derecha: should prioritize slot immediately following existing appointment', () => {
      const slots = generateDaySlots();
      // Appointment from 14:00 to 15:00
      const existing = [
        { date: '14:00', endDate: '15:00', status: 'CONFIRMED' },
      ];
      const serviceDuration = 45;

      const { scoredSlots } = AppointmentService.scoreSlotsForSmartGaps(slots, existing, serviceDuration);

      const slot1500 = scoredSlots.find((s) => s.time === '15:00');
      const slot1730 = scoredSlots.find((s) => s.time === '17:30');

      expect(slot1500).toBeDefined();
      expect(slot1730).toBeDefined();
      // 15:00 starts immediately at 15:00 (gap 0) -> +100
      expect(slot1500!.score).toBeGreaterThan(slot1730!.score!);
      expect(slot1500!.gapReason).toContain('adjacent_appointment_exact');
    });

    it('3. Hueco Puente (Bridge Slot): should give highest score to a slot that perfectly fills a gap between two appointments', () => {
      const slots = generateDaySlots();
      // Appointment A: 10:00 to 11:00, Appointment B: 12:00 to 13:00
      const existing = [
        { date: '10:00', endDate: '11:00', status: 'CONFIRMED' },
        { date: '12:00', endDate: '13:00', status: 'CONFIRMED' },
      ];
      const serviceDuration = 60; // fills 11:00 - 12:00 perfectly

      const { scoredSlots, recommended } = AppointmentService.scoreSlotsForSmartGaps(slots, existing, serviceDuration);

      const slot1100 = scoredSlots.find((s) => s.time === '11:00');
      expect(slot1100).toBeDefined();
      expect(slot1100!.gapReason).toContain('bridge_slot');

      // Bridge slot should have the highest score overall and be recommended
      const topScored = [...scoredSlots].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
      expect(topScored.time).toBe('11:00');
      expect(slot1100!.isRecommended).toBe(true);
      expect(recommended.some((r) => r.time === '11:00')).toBe(true);
    });

    it('4. Fronteras del Salón: should give boundary bonus to opening and closing slots', () => {
      const slots = generateDaySlots();
      // One appointment in the middle at 13:00 - 14:00
      const existing = [
        { date: '13:00', endDate: '14:00', status: 'CONFIRMED' },
      ];
      const serviceDuration = 60;

      const { scoredSlots } = AppointmentService.scoreSlotsForSmartGaps(slots, existing, serviceDuration);

      const slot0900 = scoredSlots.find((s) => s.time === '09:00');
      const slot1800 = scoredSlots.find((s) => s.time === '18:00'); // 18:00 + 60m = 19:00 (closing boundary)
      const slot1630 = scoredSlots.find((s) => s.time === '16:30'); // floating middle slot

      expect(slot0900!.score).toBeGreaterThan(slot1630!.score!);
      expect(slot1800!.score).toBeGreaterThan(slot1630!.score!);
      expect(slot0900!.gapReason).toContain('day_boundary_start');
      expect(slot1800!.gapReason).toContain('day_boundary_end');
    });

    it('5. Anti-Fragmentación: should penalize slots that create dead orphan gaps < 30min', () => {
      const slots = generateDaySlots();
      // Appointment from 10:00 to 11:45
      const existing = [
        { date: '10:00', endDate: '11:45', status: 'CONFIRMED' },
      ];
      const serviceDuration = 45;

      const { scoredSlots } = AppointmentService.scoreSlotsForSmartGaps(slots, existing, serviceDuration);

      // Slot 12:00 leaves a 15-minute gap between 11:45 and 12:00 -> orphan gap penalty
      const slot1200 = scoredSlots.find((s) => s.time === '12:00');
      expect(slot1200).toBeDefined();
      expect(slot1200!.gapReason).toContain('orphan_gap_before');
    });

    it('6. Día Vacío: should recommend anchor slots at start of morning and afternoon blocks', () => {
      const slots = generateDaySlots();
      const existing: any[] = [];
      const serviceDuration = 45;

      const { recommended } = AppointmentService.scoreSlotsForSmartGaps(slots, existing, serviceDuration, 4);

      expect(recommended).toHaveLength(4);
      const recTimes = recommended.map((r) => r.time);
      expect(recTimes).toContain('09:00');
      expect(recTimes).toContain('10:00');
      expect(recTimes).toContain('14:00');
      expect(recTimes).toContain('15:00');
    });

    it('7. Filtro Compacto: should limit recommendations to exactly recommendLimit items', () => {
      const slots = generateDaySlots();
      const existing = [
        { date: '11:00', endDate: '12:00', status: 'CONFIRMED' },
      ];
      const { scoredSlots, recommended } = AppointmentService.scoreSlotsForSmartGaps(slots, existing, 45, 3);

      expect(recommended).toHaveLength(3);
      const recommendedCount = scoredSlots.filter((s) => s.isRecommended).length;
      expect(recommendedCount).toBe(3);
    });
  });

  describe('HTTP Endpoints Integration', () => {
    const mockService = {
      id: 'srv_corte',
      name: 'Corte Signature',
      duration: 45,
      price: 25000,
    };

    it('GET /api/appointments/availability?compact=true returns only recommended slots', async () => {
      vi.spyOn(prisma.service, 'findUnique').mockResolvedValueOnce(mockService as any);
      vi.spyOn(prisma.appointment, 'findMany').mockResolvedValueOnce([]);
      vi.spyOn(prisma.blockedTime, 'findMany').mockResolvedValueOnce([]);

      const res = await request(app).get(
        '/api/appointments/availability?date=2026-09-15&serviceId=srv_corte&compact=true&limit=3'
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeLessThanOrEqual(3);
      res.body.forEach((slot: any) => {
        expect(slot).toHaveProperty('time');
        expect(slot).toHaveProperty('available', true);
        expect(slot).toHaveProperty('isRecommended', true);
        expect(slot).toHaveProperty('score');
      });
    });

    it('GET /api/appointments/smart-availability returns full Smart Gaps analysis payload', async () => {
      vi.spyOn(prisma.service, 'findUnique').mockResolvedValue(mockService as any);
      vi.spyOn(prisma.appointment, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.blockedTime, 'findMany').mockResolvedValue([]);

      const res = await request(app).get(
        '/api/appointments/smart-availability?date=2026-09-15&serviceId=srv_corte&limit=4'
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('serviceId', 'srv_corte');
      expect(res.body).toHaveProperty('serviceDuration', 45);
      expect(res.body).toHaveProperty('recommendedSlots');
      expect(Array.isArray(res.body.recommendedSlots)).toBe(true);
      expect(res.body.recommendedSlots.length).toBeLessThanOrEqual(4);
      expect(res.body).toHaveProperty('slots');
      expect(Array.isArray(res.body.slots)).toBe(true);
    });
  });
});
