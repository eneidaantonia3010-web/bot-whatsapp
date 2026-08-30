import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BookingWizard } from './BookingWizard';
import * as api from '@/lib/api';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/api', () => ({
  getServices: vi.fn(),
  getStaff: vi.fn(),
  getAvailability: vi.fn(),
  createAppointment: vi.fn(),
}));

const mockServices = [
  {
    id: 'srv-1',
    name: 'Corte y Peinado Glow',
    description: 'Corte de diseño personalizado con lavado y peinado.',
    price: 15000,
    duration: 60,
    category: 'cabello',
    imageUrl: '/images/hair.jpg',
    active: true,
    order: 1,
  },
  {
    id: 'srv-2',
    name: 'Manicuría Rusa & Kapping',
    description: 'Tratamiento completo de cutículas y nivelación.',
    price: 12000,
    duration: 90,
    category: 'unas',
    imageUrl: '/images/nails.jpg',
    active: true,
    order: 2,
  },
  {
    id: 'srv-3',
    name: 'Lifting de Pestañas',
    description: 'Servicio inactivo para pruebas de filtro.',
    price: 9500,
    duration: 45,
    category: 'facial',
    imageUrl: '/images/lashes.jpg',
    active: false,
    order: 3,
  },
];

const mockStaff = [
  {
    id: 'staff-1',
    name: 'Camila Rodriguez',
    avatarUrl: '/images/camila.jpg',
    specialties: ['Colorista', 'Balayage'],
    active: true,
  },
  {
    id: 'staff-2',
    name: 'Lucía Fernández',
    avatarUrl: '/images/lucia.jpg',
    specialties: ['Nail Artist'],
    active: true,
  },
];

const mockSlots = [
  { time: '10:00', available: true },
  { time: '11:30', available: false },
  { time: '14:00', available: true },
  { time: '16:00', available: true },
];

describe('BookingWizard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getServices as any).mockResolvedValue(mockServices);
    (api.getStaff as any).mockResolvedValue(mockStaff);
    (api.getAvailability as any).mockResolvedValue(mockSlots);
    (api.createAppointment as any).mockResolvedValue({
      id: 'apt-101',
      token: 'secure-token-123',
    });
  });

  it('renders loading state initially and then shows active services', async () => {
    render(<BookingWizard />);

    expect(screen.getByText(/Cargando agenda de turnos en vivo/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Reserva tu Turno Online')).toBeInTheDocument();
    });

    // Active services must be visible
    expect(screen.getByText('Corte y Peinado Glow')).toBeInTheDocument();
    expect(screen.getByText('Manicuría Rusa & Kapping')).toBeInTheDocument();
    // Inactive service must be filtered out
    expect(screen.queryByText('Lifting de Pestañas')).not.toBeInTheDocument();

    // Staff members should be listed
    expect(screen.getByText('Camila Rodriguez')).toBeInTheDocument();
    expect(screen.getByText('Lucía Fernández')).toBeInTheDocument();
  });

  it('filters services by category', async () => {
    render(<BookingWizard />);

    await waitFor(() => {
      expect(screen.getByText('Corte y Peinado Glow')).toBeInTheDocument();
    });

    // Click on "Uñas & Manicuría" category tab
    const nailsTab = screen.getByRole('button', { name: /Uñas & Manicuría/i });
    fireEvent.click(nailsTab);

    expect(screen.getByText('Manicuría Rusa & Kapping')).toBeInTheDocument();
    expect(screen.queryByText('Corte y Peinado Glow')).not.toBeInTheDocument();

    // Click back on "Todos los Servicios"
    const allTab = screen.getByRole('button', { name: /Todos los Servicios/i });
    fireEvent.click(allTab);

    expect(screen.getByText('Corte y Peinado Glow')).toBeInTheDocument();
    expect(screen.getByText('Manicuría Rusa & Kapping')).toBeInTheDocument();
  });

  it('allows selecting service and staff, and continuing to Step 2', async () => {
    render(<BookingWizard />);

    await waitFor(() => {
      expect(screen.getByText('Corte y Peinado Glow')).toBeInTheDocument();
    });

    const nextButton = screen.getByRole('button', { name: /Continuar a Fecha y Hora/i });
    expect(nextButton).toBeDisabled();

    // Select service
    const serviceCard = screen.getByText('Corte y Peinado Glow').closest('div');
    expect(serviceCard).toBeTruthy();
    fireEvent.click(serviceCard!);

    expect(screen.getByText('✓ Seleccionado')).toBeInTheDocument();
    expect(nextButton).not.toBeDisabled();

    // Select staff
    const staffBtn = screen.getByRole('button', { name: /Camila Rodriguez/i });
    fireEvent.click(staffBtn);

    // Advance to Step 2
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/Horarios disponibles:/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Servicio seleccionado:/i)).toBeInTheDocument();
    expect(api.getAvailability).toHaveBeenCalled();
  });

  it('renders available time slots and disables unavailable slots in Step 2', async () => {
    render(<BookingWizard />);

    await waitFor(() => {
      expect(screen.getByText('Corte y Peinado Glow')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Corte y Peinado Glow'));
    fireEvent.click(screen.getByRole('button', { name: /Continuar a Fecha y Hora/i }));

    await waitFor(() => {
      expect(screen.getByText('10:00 hs')).toBeInTheDocument();
    });

    const availableSlot = screen.getByRole('button', { name: '10:00 hs' });
    const unavailableSlot = screen.getByRole('button', { name: '11:30 hs' });

    expect(availableSlot).not.toBeDisabled();
    expect(unavailableSlot).toBeDisabled();

    const continueToContactBtn = screen.getByRole('button', { name: /Continuar a Tus Datos/i });
    expect(continueToContactBtn).toBeDisabled();

    // Select available slot
    fireEvent.click(availableSlot);
    expect(continueToContactBtn).not.toBeDisabled();
  });

  it('displays empty state message when no slots are available', async () => {
    (api.getAvailability as any).mockResolvedValueOnce([]);

    render(<BookingWizard />);

    await waitFor(() => {
      expect(screen.getByText('Corte y Peinado Glow')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Corte y Peinado Glow'));
    fireEvent.click(screen.getByRole('button', { name: /Continuar a Fecha y Hora/i }));

    await waitFor(() => {
      expect(screen.getByText(/No hay horarios libres para esta fecha/i)).toBeInTheDocument();
    });
  });

  it('allows navigating back to Step 1 from Step 2', async () => {
    render(<BookingWizard />);

    await waitFor(() => {
      expect(screen.getByText('Corte y Peinado Glow')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Corte y Peinado Glow'));
    fireEvent.click(screen.getByRole('button', { name: /Continuar a Fecha y Hora/i }));

    await waitFor(() => {
      expect(screen.getByText(/Horarios disponibles:/i)).toBeInTheDocument();
    });

    const backButton = screen.getByRole('button', { name: /Volver a Servicios/i });
    fireEvent.click(backButton);

    expect(screen.getByText('Todos los Servicios')).toBeInTheDocument();
    expect(screen.getByText('✓ Seleccionado')).toBeInTheDocument();
  });

  it('completes the full booking flow and redirects to self-service portal token URL', async () => {
    render(<BookingWizard />);

    await waitFor(() => {
      expect(screen.getByText('Corte y Peinado Glow')).toBeInTheDocument();
    });

    // Step 1: Select service & staff
    fireEvent.click(screen.getByText('Corte y Peinado Glow'));
    fireEvent.click(screen.getByRole('button', { name: /Camila Rodriguez/i }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar a Fecha y Hora/i }));

    // Step 2: Select slot & continue
    await waitFor(() => {
      expect(screen.getByText('10:00 hs')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: '10:00 hs' }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar a Tus Datos/i }));

    // Step 3: Contact Details
    await waitFor(() => {
      expect(screen.getByText(/Resumen de tu Cita/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Camila Rodriguez')).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/Ej: Sofia Martínez/i);
    const phoneInput = screen.getByPlaceholderText(/Ej: 11 1234 5678/i);
    const emailInput = screen.getByPlaceholderText(/tu@email.com/i);
    const notesInput = screen.getByPlaceholderText(/Ej: Tengo cabello con alisado previo/i);

    fireEvent.change(nameInput, { target: { value: 'Valentina Rossi' } });
    fireEvent.change(phoneInput, { target: { value: '11 5555 9999' } });
    fireEvent.change(emailInput, { target: { value: 'valentina@example.com' } });
    fireEvent.change(notesInput, { target: { value: 'Puntas secas, corte en capas' } });

    const submitBtn = screen.getByRole('button', { name: /Confirmar Reserva Ahora/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createAppointment).toHaveBeenCalledTimes(1);
    });

    expect(api.createAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        customerName: 'Valentina Rossi',
        customerPhone: '11 5555 9999',
        customerEmail: 'valentina@example.com',
        notes: 'Puntas secas, corte en capas',
        serviceId: 'srv-1',
        staffId: 'staff-1',
      })
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/turno/secure-token-123');
    });
  });

  it('redirects to /#confirmado if appointment response does not include a token', async () => {
    (api.createAppointment as any).mockResolvedValueOnce({
      id: 'apt-no-token',
    });

    render(<BookingWizard />);

    await waitFor(() => {
      expect(screen.getByText('Corte y Peinado Glow')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Corte y Peinado Glow'));
    fireEvent.click(screen.getByRole('button', { name: /Continuar a Fecha y Hora/i }));

    await waitFor(() => {
      expect(screen.getByText('10:00 hs')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: '10:00 hs' }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar a Tus Datos/i }));

    await waitFor(() => {
      expect(screen.getByText(/Resumen de tu Cita/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Ej: Sofia Martínez/i), {
      target: { value: 'Lucía Gómez' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Ej: 11 1234 5678/i), {
      target: { value: '11 4444 3333' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Reserva Ahora/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/#confirmado');
    });
  });

  it('validates contact form fields and prevents submission with invalid data', async () => {
    render(<BookingWizard />);

    await waitFor(() => {
      expect(screen.getByText('Corte y Peinado Glow')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Corte y Peinado Glow'));
    fireEvent.click(screen.getByRole('button', { name: /Continuar a Fecha y Hora/i }));

    await waitFor(() => {
      expect(screen.getByText('10:00 hs')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: '10:00 hs' }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar a Tus Datos/i }));

    await waitFor(() => {
      expect(screen.getByText(/Resumen de tu Cita/i)).toBeInTheDocument();
    });

    // Submitting with empty form
    const form = screen.getByRole('button', { name: /Confirmar Reserva Ahora/i }).closest('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(
        screen.getByText(/Por favor ingresa tu nombre completo y un teléfono válido/i)
      ).toBeInTheDocument();
    });

    expect(api.createAppointment).not.toHaveBeenCalled();
  });

  it('displays API error message when appointment creation fails', async () => {
    (api.createAppointment as any).mockRejectedValueOnce(
      new Error('El horario seleccionado acaba de ser reservado por otro cliente.')
    );

    render(<BookingWizard />);

    await waitFor(() => {
      expect(screen.getByText('Corte y Peinado Glow')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Corte y Peinado Glow'));
    fireEvent.click(screen.getByRole('button', { name: /Continuar a Fecha y Hora/i }));

    await waitFor(() => {
      expect(screen.getByText('10:00 hs')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: '10:00 hs' }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar a Tus Datos/i }));

    await waitFor(() => {
      expect(screen.getByText(/Resumen de tu Cita/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Ej: Sofia Martínez/i), {
      target: { value: 'Sofia Martínez' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Ej: 11 1234 5678/i), {
      target: { value: '11 2233 4455' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Reserva Ahora/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/El horario seleccionado acaba de ser reservado por otro cliente/i)
      ).toBeInTheDocument();
    });
  });

  it('allows navigating between unlocked steps via stepper header and step back button', async () => {
    render(<BookingWizard />);

    await waitFor(() => {
      expect(screen.getByText('Corte y Peinado Glow')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Corte y Peinado Glow'));
    fireEvent.click(screen.getByRole('button', { name: /Continuar a Fecha y Hora/i }));

    await waitFor(() => {
      expect(screen.getByText('10:00 hs')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: '10:00 hs' }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar a Tus Datos/i }));

    await waitFor(() => {
      expect(screen.getByText(/Resumen de tu Cita/i)).toBeInTheDocument();
    });

    // Click "Cambiar Horario" to go back to Step 2
    fireEvent.click(screen.getByRole('button', { name: /Cambiar Horario/i }));
    expect(screen.getByText(/Horarios disponibles:/i)).toBeInTheDocument();

    // Click Stepper '1' to go back to Step 1
    const step1Pill = screen.getByText('Servicio').closest('div');
    fireEvent.click(step1Pill!);
    expect(screen.getByText('Todos los Servicios')).toBeInTheDocument();
  });
});
