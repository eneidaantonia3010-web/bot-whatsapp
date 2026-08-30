// ============================================
// Glow Studio by Sofia — Shared Contracts & Types
// ============================================

// --------------------------------------------------
// 1. Prisma Domain Enums
// --------------------------------------------------

export type Role = 'ADMIN' | 'STAFF';

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

export type RecurrenceInterval =
  | 'NONE'
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY';

export type WaitlistStatus =
  | 'WAITING'
  | 'OFFERED'
  | 'BOOKED'
  | 'EXPIRED'
  | 'CANCELLED';

export type Platform =
  | 'INSTAGRAM'
  | 'WHATSAPP'
  | 'WEB';

export type MessageDirection =
  | 'INBOUND'
  | 'OUTBOUND';

// --------------------------------------------------
// 2. Core Domain Models (Aligned with Prisma Schema)
// --------------------------------------------------

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  image: string | null;
  createdAt: string;
  updatedAt?: string;
}

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
  createdAt?: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  notes: string | null;
  preferences?: Record<string, unknown> | null;
  blocked?: boolean;
  blockedReason?: string | null;
  lateCancellationsCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Staff {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  specialties: string[];
  active: boolean;
  calendarId?: string | null;
  workingHours?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Appointment {
  id: string;
  token?: string | null;
  date: string;
  endDate: string;
  status: AppointmentStatus;
  notes: string | null;
  recurrence?: RecurrenceInterval;
  lateCancellation?: boolean;
  reminderSent24h?: boolean;
  reminderSent1h?: boolean;
  customerId: string;
  customer: Customer;
  serviceId: string;
  service: Service;
  staffId?: string | null;
  staff?: Staff | null;
  calendarEventId?: string | null;
  source: Platform;
  review?: Review | null;
  createdAt: string;
  updatedAt?: string;
}

export interface AppointmentWithDetails extends Appointment {
  customer: Customer;
  service: Service;
  staff?: Staff | null;
  review?: Review | null;
}

export interface Waitlist {
  id: string;
  customerId: string;
  customer: Customer;
  serviceId: string;
  service: Service;
  preferredDate: string;
  timeRange: string | null;
  status: WaitlistStatus;
  offeredAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface BlockedTime {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  allDay: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  authorName: string;
  serviceName?: string | null;
  verified: boolean;
  appointmentId?: string | null;
  appointment?: Appointment | null;
  createdAt: string;
}

export interface MessageLog {
  id: string;
  platform: Platform;
  senderId: string;
  senderName: string | null;
  message: string;
  response: string | null;
  direction: MessageDirection;
  customerId?: string | null;
  customer?: Customer | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  alt: string | null;
  category: string | null;
  order: number;
  active?: boolean;
  createdAt?: string;
}

export interface ConversationState {
  senderId: string;
  state: Record<string, unknown>;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
  createdAt: string;
}

export interface MessageQueueItem {
  id: string;
  jid: string;
  message: string;
  platform: Platform;
  priority: number;
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
  attempts: number;
  maxAttempts: number;
  lastError?: string | null;
  nextRetryAt: string;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// --------------------------------------------------
// 3. Request & Input DTOs
// --------------------------------------------------

export interface BookingRequest {
  date: string;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerInstagram?: string;
  notes?: string;
  staffId?: string;
  recurrence?: RecurrenceInterval;
}

export interface CreateAppointmentInput extends BookingRequest {}

export interface UpdateAppointmentInput {
  date?: string;
  endDate?: string;
  status?: AppointmentStatus;
  notes?: string | null;
  staffId?: string | null;
  serviceId?: string;
  recurrence?: RecurrenceInterval;
  lateCancellation?: boolean;
}

export interface CreateServiceInput {
  name: string;
  description?: string | null;
  price: number;
  duration: number;
  category: string;
  imageUrl?: string | null;
  active?: boolean;
  order?: number;
}

export interface UpdateServiceInput extends Partial<CreateServiceInput> {}

export interface CreateBlockedTimeInput {
  startDate: string;
  endDate: string;
  reason: string;
  allDay?: boolean;
}

export interface CreateWaitlistInput {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  serviceId: string;
  preferredDate: string;
  timeRange?: string;
  notes?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthSession {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    image?: string;
  };
}

// --------------------------------------------------
// 4. API Responses & Pagination Contracts
// --------------------------------------------------

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: PaginationMeta;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// --------------------------------------------------
// 5. Shared Service Contracts
// --------------------------------------------------

export interface TimeSlot {
  time: string;
  available: boolean;
  reason?: string;
}

export interface BookingServiceContract {
  getAvailability(date: string, serviceId: string, staffId?: string): Promise<TimeSlot[]>;
  createBooking(data: BookingRequest): Promise<Appointment>;
  getBookingByToken(token: string): Promise<AppointmentWithDetails>;
  rescheduleBooking(token: string, newDate: string): Promise<Appointment>;
  cancelBooking(token: string, reason?: string): Promise<Appointment>;
}

// --------------------------------------------------
// 6. Analytics, Metrics & WhatsApp Status
// --------------------------------------------------

export interface DashboardMetrics {
  appointmentsThisMonth: number;
  newClientsThisMonth: number;
  revenueThisMonth: number;
  pendingAppointments: number;
}

export interface FinancialAnalytics {
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
}

export interface WhatsAppStatus {
  configured: boolean;
  state?: string;
  phone?: string;
  instanceName?: string;
}

// --------------------------------------------------
// 7. UI & Frontend Specific Models
// --------------------------------------------------

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
