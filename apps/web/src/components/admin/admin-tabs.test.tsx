import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import {
  DashboardTab,
  CustomersTab,
  ServicesTab,
  AnalyticsTab,
  CalendarTab,
  MockAppointment,
  MetricsData,
  FinancialData,
  ServiceItem,
  CustomerItem,
  WeekDay,
  getCategoryBadge,
} from './tabs';

describe('Admin Dashboard Modular Tabs', () => {
  const mockMetrics: MetricsData = {
    appointmentsThisMonth: 42,
    newClientsThisMonth: 15,
    revenueThisMonth: 1500000,
    pendingAppointments: 5,
  };

  const mockAppointments: MockAppointment[] = [
    {
      id: 'apt-1',
      customerName: 'Valeria Lynch',
      customerPhone: '+5491112345678',
      service: 'Balayage VIP',
      category: 'cabello',
      date: '2026-09-10',
      time: '14:00',
      status: 'PENDING',
      source: 'WHATSAPP',
      price: 45000,
    },
    {
      id: 'apt-2',
      customerName: 'Susana Gimenez',
      customerPhone: '+5491187654321',
      service: 'Esmaltado Semipermanente',
      category: 'unas',
      date: '2026-09-10',
      time: '16:30',
      status: 'CONFIRMED',
      source: 'WEB',
      price: 15000,
    },
  ];

  describe('DashboardTab', () => {
    it('renders all metric cards correctly', () => {
      const setStatusFilter = vi.fn();
      const setSelectedAppointment = vi.fn();
      const handleStatusChange = vi.fn();

      render(
        <DashboardTab
          metricsData={mockMetrics}
          statusFilter="ALL"
          setStatusFilter={setStatusFilter}
          filteredAppointments={mockAppointments}
          setSelectedAppointment={setSelectedAppointment}
          handleStatusChange={handleStatusChange}
        />
      );

      expect(screen.getByText('Turnos del Mes')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('Clientas Nuevas')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('Valeria Lynch')).toBeInTheDocument();
      expect(screen.getByText('Susana Gimenez')).toBeInTheDocument();
    });

    it('triggers handleStatusChange when quick action is clicked', () => {
      const handleStatusChange = vi.fn();

      render(
        <DashboardTab
          metricsData={mockMetrics}
          statusFilter="ALL"
          setStatusFilter={vi.fn()}
          filteredAppointments={mockAppointments}
          setSelectedAppointment={vi.fn()}
          handleStatusChange={handleStatusChange}
        />
      );

      const confirmBtn = screen.getByTitle('Confirmar Turno');
      fireEvent.click(confirmBtn);

      expect(handleStatusChange).toHaveBeenCalledWith('apt-1', 'CONFIRMED');
    });
  });

  describe('CustomersTab', () => {
    const mockCustomers: CustomerItem[] = [
      { id: 'c-1', name: 'Florencia Pena', phone: '+5491122334455', visits: 10, totalSpent: 300000, level: 'VIP' },
      { id: 'c-2', name: 'Moria Casan', phone: '+5491199887766', visits: 4, totalSpent: 120000, level: 'Frecuente' },
    ];

    it('renders customer cards and allows filtering by search input', () => {
      const setCustomerSearch = vi.fn();
      const setSelectedCustomer = vi.fn();

      const { rerender } = render(
        <CustomersTab
          customerSearch=""
          setCustomerSearch={setCustomerSearch}
          customersList={mockCustomers}
          setSelectedCustomer={setSelectedCustomer}
        />
      );

      expect(screen.getByText('Florencia Pena')).toBeInTheDocument();
      expect(screen.getByText('Moria Casan')).toBeInTheDocument();

      const searchInput = screen.getByPlaceholderText('Buscar por nombre o teléfono...');
      fireEvent.change(searchInput, { target: { value: 'Moria' } });
      expect(setCustomerSearch).toHaveBeenCalledWith('Moria');

      // Test filtered list via prop update
      rerender(
        <CustomersTab
          customerSearch="Moria"
          setCustomerSearch={setCustomerSearch}
          customersList={mockCustomers}
          setSelectedCustomer={setSelectedCustomer}
        />
      );

      expect(screen.queryByText('Florencia Pena')).not.toBeInTheDocument();
      expect(screen.getByText('Moria Casan')).toBeInTheDocument();
    });
  });

  describe('ServicesTab', () => {
    const mockServices: ServiceItem[] = [
      { id: 'srv-1', name: 'Lifting de Pestañas', description: 'Realce natural', price: 18000, duration: 60, category: 'pestanas', active: true },
      { id: 'srv-2', name: 'Perfilado con Henna', description: 'Diseño de cejas', price: 12000, duration: 45, category: 'pestanas', active: false },
    ];

    it('renders services list with active/paused badges', () => {
      const handleToggle = vi.fn();
      const handleOpenNew = vi.fn();
      const setEditing = vi.fn();
      const setForm = vi.fn();
      const setModal = vi.fn();

      render(
        <ServicesTab
          servicesList={mockServices}
          handleOpenNewService={handleOpenNew}
          handleToggleServiceActive={handleToggle}
          setEditingService={setEditing}
          setServiceForm={setForm}
          setShowServiceModal={setModal}
        />
      );

      expect(screen.getByText('Lifting de Pestañas')).toBeInTheDocument();
      expect(screen.getByText('Perfilado con Henna')).toBeInTheDocument();
      expect(screen.getByText('Disponible')).toBeInTheDocument();
      expect(screen.getByText('Pausado')).toBeInTheDocument();

      const addBtn = screen.getByText('Agregar Servicio');
      fireEvent.click(addBtn);
      expect(handleOpenNew).toHaveBeenCalledTimes(1);
    });
  });

  describe('AnalyticsTab', () => {
    const mockFinancial: FinancialData = {
      revenueThisMonth: 1850000,
      revenuePrevMonth: 1600000,
      revenueGrowthPct: 15.6,
      totalAppointmentsMonth: 52,
      averageTicket: 35576,
      projectedRevenue: 2100000,
      cancellationRate: 3.8,
      cancelledMonth: 2,
      topServices: [
        { name: 'Balayage VIP', count: 20, revenue: 900000 },
        { name: 'Capping Gel', count: 18, revenue: 360000 },
      ],
      categoryDistribution: [
        { name: 'Cabello', count: 25, revenue: 1100000 },
      ],
      peakHours: [
        { hour: '15:00hs', count: 16 },
      ],
      weeklyRevenue: [
        { week: 'Semana 1', revenue: 450000 },
        { week: 'Semana 2', revenue: 500000 },
      ],
    };

    it('renders revenue, cancellation rate and top services', () => {
      render(<AnalyticsTab financialData={mockFinancial} />);

      expect(screen.getByText('Ingreso Mensual Actual')).toBeInTheDocument();
      expect(screen.getByText('Tasa de Cancelación')).toBeInTheDocument();
      expect(screen.getByText('3.8%')).toBeInTheDocument();
      expect(screen.getByText('Balayage VIP')).toBeInTheDocument();
      expect(screen.getByText('Capping Gel')).toBeInTheDocument();
    });
  });

  describe('CalendarTab', () => {
    const mockWeekDays: WeekDay[] = [
      {
        date: new Date('2026-09-07T12:00:00.000Z'),
        dateStr: '2026-09-07',
        label: '7 sep',
        shortDay: 'Lun',
        isToday: false,
      },
      {
        date: new Date('2026-09-08T12:00:00.000Z'),
        dateStr: '2026-09-08',
        label: '8 sep',
        shortDay: 'Mar',
        isToday: true,
      },
    ];

    it('renders agenda header, week navigation, and calendar controls', () => {
      const setWeekOffset = vi.fn();
      const setCalendarView = vi.fn();
      const setShowBlockModal = vi.fn();
      const setShowWaitlistModal = vi.fn();
      const handleDeleteBlockedTime = vi.fn();
      const setSelectedAppointment = vi.fn();

      render(
        <CalendarTab
          weekOffset={0}
          setWeekOffset={setWeekOffset}
          calendarView="week"
          setCalendarView={setCalendarView}
          getWeekDays={() => mockWeekDays}
          appointments={mockAppointments}
          blockedTimes={[]}
          waitlist={[]}
          setShowBlockModal={setShowBlockModal}
          setShowWaitlistModal={setShowWaitlistModal}
          handleDeleteBlockedTime={handleDeleteBlockedTime}
          setSelectedAppointment={setSelectedAppointment}
        />
      );

      expect(screen.getByText('Agenda Interactiva de Turnos')).toBeInTheDocument();
      expect(screen.getByText('Semana')).toBeInTheDocument();
      expect(screen.getByText('Mes')).toBeInTheDocument();

      const blockBtn = screen.getByRole('button', { name: /Bloquear Horario/i });
      fireEvent.click(blockBtn);
      expect(setShowBlockModal).toHaveBeenCalledWith(true);

      const waitlistBtn = screen.getByRole('button', { name: /Lista de Espera/i });
      fireEvent.click(waitlistBtn);
      expect(setShowWaitlistModal).toHaveBeenCalledWith(true);

      const mesBtn = screen.getByText('Mes');
      fireEvent.click(mesBtn);
      expect(setCalendarView).toHaveBeenCalledWith('month');

      const hoyBtn = screen.getByText('Hoy');
      fireEvent.click(hoyBtn);
      expect(setWeekOffset).toHaveBeenCalledWith(0);
    });
  });

  describe('getCategoryBadge', () => {
    it('returns appropriate badges for all supported categories and fallback', () => {
      expect(getCategoryBadge('cabello').label).toBe('Cabello');
      expect(getCategoryBadge('unas').label).toBe('Uñas');
      expect(getCategoryBadge('pestanas').label).toBe('Pestañas & Cejas');
      expect(getCategoryBadge('facial').label).toBe('Facial');
      expect(getCategoryBadge('desconocido').label).toBe('Belleza');
      expect(getCategoryBadge('').label).toBe('Belleza');
    });
  });
});
