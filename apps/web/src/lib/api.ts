// ============================================
// Glow Studio by Sofia — API Client
// ============================================

import { API_URL } from './constants';
import type { Service, Appointment, GalleryImage, Customer, DashboardMetrics, TimeSlot } from '@/types';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// Services
export const getServices = () => fetchAPI<Service[]>('/api/services');
export const getServiceById = (id: string) => fetchAPI<Service>(`/api/services/${id}`);

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

// Admin Metrics
export const getDashboardMetrics = () => fetchAPI<DashboardMetrics>('/api/admin/metrics');

// Chatbot
export const sendChatMessage = (message: string, senderId: string) =>
  fetchAPI<{ response: string }>('/api/messages', {
    method: 'POST',
    body: JSON.stringify({ message, senderId, platform: 'WEB' }),
  });
