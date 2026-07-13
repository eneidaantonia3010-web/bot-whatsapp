// ============================================
// Glow Studio by Sofia — Types
// ============================================

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  category: string;
  imageUrl: string | null;
  active: boolean;
  order: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Appointment {
  id: string;
  date: string;
  endDate: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  notes: string | null;
  customerId: string;
  customer: Customer;
  serviceId: string;
  service: Service;
  source: 'INSTAGRAM' | 'WHATSAPP' | 'WEB';
  calendarEventId: string | null;
  createdAt: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  alt: string | null;
  category: string | null;
  order: number;
}

export interface MessageLog {
  id: string;
  platform: 'INSTAGRAM' | 'WHATSAPP' | 'WEB';
  senderId: string;
  senderName: string | null;
  message: string;
  response: string | null;
  direction: 'INBOUND' | 'OUTBOUND';
  createdAt: string;
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  imageUrl: string;
}

export interface Testimonial {
  id: number;
  name: string;
  text: string;
  rating: number;
  imageUrl: string;
  service: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface DashboardMetrics {
  appointmentsThisMonth: number;
  newClientsThisMonth: number;
  revenueThisMonth: number;
  pendingAppointments: number;
}
