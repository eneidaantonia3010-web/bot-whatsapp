// ============================================
// Concurrency & Race Condition Prevention Tests
// ============================================

import { prisma } from '../src/services/prisma';

describe('Appointment Concurrency & Double Booking Tests', () => {
  it('should prevent double bookings when 10 concurrent requests target the same slot', async () => {
    // 1. Find or create a test service
    let service = await prisma.service.findFirst({ where: { active: true } });
    if (!service) {
      service = await prisma.service.create({
        data: {
          name: 'Test Concurrency Haircut',
          price: 15000,
          duration: 45,
          category: 'cabello',
        },
      });
    }

    // 2. Find or create a test customer
    let customer = await prisma.customer.findFirst({ where: { phone: '5491100009999' } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: 'Concurrency Test User',
          phone: '5491100009999',
        },
      });
    }

    // Slot date far in the future
    const targetStartDate = new Date('2030-05-15T14:00:00.000Z');
    const targetEndDate = new Date(targetStartDate.getTime() + service.duration * 60000);

    // Clean up any prior test appointment at this slot
    await prisma.appointment.deleteMany({
      where: {
        date: targetStartDate,
      },
    });

    // 3. Execute 10 concurrent transactional booking attempts
    const concurrentAttempts = Array.from({ length: 10 }).map(async (_, idx) => {
      try {
        return await prisma.$transaction(async (tx) => {
          const overlapping = await tx.appointment.findFirst({
            where: {
              status: { in: ['PENDING', 'CONFIRMED'] },
              date: { lt: targetEndDate },
              endDate: { gt: targetStartDate },
            },
          });

          if (overlapping) {
            throw new Error('CONFLICT_OVERLAPPING');
          }

          return await tx.appointment.create({
            data: {
              date: targetStartDate,
              endDate: targetEndDate,
              status: 'PENDING',
              notes: `Concurrent test attempt #${idx + 1}`,
              customerId: customer.id,
              serviceId: service.id,
              source: 'WEB',
            },
          });
        });
      } catch (err: any) {
        return { error: err.message };
      }
    });

    const results = await Promise.all(concurrentAttempts);

    // 4. Assertions: Exactly 1 success, exactly 9 CONFLICT_OVERLAPPING
    const successfulBookings = results.filter((r) => !('error' in r));
    const rejectedBookings = results.filter((r) => 'error' in r && r.error === 'CONFLICT_OVERLAPPING');

    expect(successfulBookings.length).toBe(1);
    expect(rejectedBookings.length).toBe(9);

    // Verify DB state
    const dbAppointments = await prisma.appointment.findMany({
      where: { date: targetStartDate },
    });
    expect(dbAppointments.length).toBe(1);

    // Cleanup
    await prisma.appointment.deleteMany({
      where: { id: dbAppointments[0].id },
    });
  });
});
