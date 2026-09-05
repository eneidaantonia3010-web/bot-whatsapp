import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOptimisticAppointments } from './useOptimisticAppointments';
import * as api from '@/lib/api';
import type { Appointment } from '@/types';

vi.mock('@/lib/api', () => ({
  updateAppointment: vi.fn(),
}));

const mockInitialAppointments: Appointment[] = [
  {
    id: 'apt-1',
    token: 'tok-1',
    date: '2026-09-01T10:00:00-03:00',
    endDate: '2026-09-01T11:00:00-03:00',
    status: 'PENDING',
    notes: 'Primer turno',
    customerId: 'cust-1',
    customer: {
      id: 'cust-1',
      name: 'Lucía Morales',
      phone: '1123456789',
      email: 'lucia@example.com',
      instagram: null,
      notes: null,
      createdAt: '2026-08-01T00:00:00Z',
    },
    serviceId: 'srv-1',
    service: {
      id: 'srv-1',
      name: 'Corte y Nutrición',
      description: null,
      price: 18000,
      duration: 60,
      category: 'cabello',
      imageUrl: null,
      active: true,
      order: 1,
    },
    source: 'WEB',
    createdAt: '2026-08-30T10:00:00Z',
  },
  {
    id: 'apt-2',
    token: 'tok-2',
    date: '2026-09-02T14:00:00-03:00',
    endDate: '2026-09-02T15:30:00-03:00',
    status: 'CONFIRMED',
    notes: null,
    customerId: 'cust-2',
    customer: {
      id: 'cust-2',
      name: 'Camila Rossi',
      phone: '1198765432',
      email: null,
      instagram: null,
      notes: null,
      createdAt: '2026-08-01T00:00:00Z',
    },
    serviceId: 'srv-2',
    service: {
      id: 'srv-2',
      name: 'Manicuría Spa',
      description: null,
      price: 12000,
      duration: 90,
      category: 'unas',
      imageUrl: null,
      active: true,
      order: 2,
    },
    source: 'WHATSAPP',
    createdAt: '2026-08-30T11:00:00Z',
  },
];

describe('useOptimisticAppointments Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes correctly with provided appointments', () => {
    const { result } = renderHook(() => useOptimisticAppointments(mockInitialAppointments));

    expect(result.current.appointments).toEqual(mockInitialAppointments);
    expect(result.current.appointments).toHaveLength(2);
    expect(result.current.isPending).toBe(false);
  });

  it('triggers updateStatusOptimistic and calls api.updateAppointment', async () => {
    (api.updateAppointment as any).mockResolvedValueOnce({
      ...mockInitialAppointments[0],
      status: 'CONFIRMED',
    });

    const { result } = renderHook(() => useOptimisticAppointments(mockInitialAppointments));

    await act(async () => {
      await result.current.updateStatusOptimistic('apt-1', 'CONFIRMED');
    });

    expect(api.updateAppointment).toHaveBeenCalledTimes(1);
    expect(api.updateAppointment).toHaveBeenCalledWith('apt-1', { status: 'CONFIRMED' });
  });

  it('handles errors when api.updateAppointment fails without throwing an uncaught exception', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (api.updateAppointment as any).mockRejectedValueOnce(new Error('Network failure'));

    const { result } = renderHook(() => useOptimisticAppointments(mockInitialAppointments));

    await act(async () => {
      await result.current.updateStatusOptimistic('apt-1', 'CANCELLED');
    });

    expect(api.updateAppointment).toHaveBeenCalledWith('apt-1', { status: 'CANCELLED' });
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to update appointment status:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
