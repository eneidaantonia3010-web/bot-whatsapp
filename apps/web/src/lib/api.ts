// ============================================
// Glow Studio by Sofia — API Client
// ============================================

import { API_URL } from './constants';
import { getAuthHeaders } from './auth';
import type { Service, Appointment, GalleryImage, Customer, DashboardMetrics, TimeSlot } from '@/types';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options?.headers,
  };

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `API Error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// Authentication
export const loginUser = (credentials: { email: string; password: string }) =>
  fetchAPI<{ token: string; user: { id: string; email: string; name: string; role: 'ADMIN' | 'STAFF'; image?: string } }>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify(credentials),
    }
  );

export const getCurrentUser = () =>
  fetchAPI<{ id: string; email: string; name: string; role: 'ADMIN' | 'STAFF'; image?: string }>('/api/auth/me');

// User Management (Admin Only)
export const getUsers = () =>
  fetchAPI<Array<{ id: string; email: string; name?: string; role: 'ADMIN' | 'STAFF'; createdAt: string }>>('/api/users');

export const createUser = (data: { email: string; name?: string; password: string; role: 'ADMIN' | 'STAFF' }) =>
  fetchAPI('/api/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateUser = (id: string, data: { email?: string; name?: string; password?: string; role?: 'ADMIN' | 'STAFF' }) =>
  fetchAPI(`/api/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteUser = (id: string) =>
  fetchAPI(`/api/users/${id}`, {
    method: 'DELETE',
  });

// Services
export const getServices = () => fetchAPI<Service[]>('/api/services');
export const getServiceById = (id: string) => fetchAPI<Service>(`/api/services/${id}`);
export const createService = (data: { name: string; description: string; price: number; duration: number; category: string; imageUrl?: string }) =>
  fetchAPI<Service>('/api/services', {
    method: 'POST',
    body: JSON.stringify(data),
  });
export const updateService = (id: string, data: Partial<Service>) =>
  fetchAPI<Service>(`/api/services/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
export const deleteService = (id: string) =>
  fetchAPI(`/api/services/${id}`, {
    method: 'DELETE',
  });


// Appointments
export const getAppointments = (params?: Record<string, string>) => {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchAPI<Appointment[]>(`/api/appointments${query}`);
};

export const createAppointment = (data: {
  date: string;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
}) =>
  fetchAPI<Appointment>('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateAppointment = (id: string, data: Partial<Appointment>) =>
  fetchAPI<Appointment>(`/api/appointments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

// Availability
export const getAvailability = (date: string, serviceId: string) =>
  fetchAPI<TimeSlot[]>(`/api/appointments/availability?date=${date}&serviceId=${serviceId}`);

// Gallery
export const getGalleryImages = () => fetchAPI<GalleryImage[]>('/api/gallery');

// Customers
export const getCustomers = () => fetchAPI<Customer[]>('/api/customers');

// Admin Metrics & Analytics
export const getDashboardMetrics = () => fetchAPI<DashboardMetrics>('/api/admin/metrics');
export const getFinancialAnalytics = () =>
  fetchAPI<{
    revenueThisMonth: number;
    revenuePrevMonth: number;
    revenueGrowthPct: number;
    totalAppointmentsMonth: number;
    averageTicket: number;
    projectedRevenue: number;
    cancellationRate: number;
    cancelledMonth: number;
    topServices: Array<{ name: string; category?: string; count: number; revenue: number }>;
    categoryDistribution: Array<{ name: string; count: number; revenue: number }>;
    peakHours: Array<{ hour: string; count: number }>;
    weeklyRevenue: Array<{ week: string; revenue: number }>;
  }>('/api/analytics/financial');

export const getWhatsAppStatus = () =>
  fetchAPI<{ configured: boolean; state?: string; phone?: string; instanceName?: string }>('/api/whatsapp-admin/status');




export const getExportAppointmentsUrl = () => `${API_URL}/api/exports/appointments.csv`;
export const getExportCustomersUrl = () => `${API_URL}/api/exports/customers.csv`;

// Chatbot
export const sendChatMessage = (message: string, senderId: string) =>
  fetchAPI<{ response: string }>('/api/messages', {
    method: 'POST',
    body: JSON.stringify({ message, senderId, platform: 'WEB' }),
  });
