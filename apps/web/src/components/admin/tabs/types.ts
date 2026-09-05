export interface MockAppointment {
  id: string;
  customerName: string;
  customerPhone: string;
  service: string;
  category: string;
  date: string;
  time: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  source: string;
  price: number;
}

export interface MetricsData {
  appointmentsThisMonth: number;
  newClientsThisMonth: number;
  revenueThisMonth: number;
  pendingAppointments: number;
}

export interface FinancialData {
  revenueThisMonth: number;
  revenuePrevMonth: number;
  revenueGrowthPct: number;
  totalAppointmentsMonth: number;
  averageTicket: number;
  projectedRevenue: number;
  cancellationRate: number;
  cancelledMonth: number;
  topServices: Array<{ name: string; count: number; revenue: number }>;
  categoryDistribution: Array<{ name: string; count: number; revenue: number }>;
  peakHours: Array<{ hour: string; count: number }>;
  weeklyRevenue: Array<{ week: string; revenue: number }>;
}

export interface ServiceItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  category?: string;
  imageUrl?: string;
  active?: boolean;
}

export interface CustomerItem {
  id: string;
  name: string;
  phone: string;
  visits?: number;
  totalSpent?: number;
  level?: string;
}

export interface BlockedTimeItem {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  allDay: boolean;
}

export interface WaitlistItem {
  id: string;
  customerName: string;
  customerPhone: string;
  requestedDate: string;
  notes?: string;
  status: 'WAITING' | 'NOTIFIED' | 'CANCELLED' | 'CONVERTED';
}

export interface WeekDay {
  date: Date;
  dateStr: string;
  label: string;
  shortDay: string;
  isToday: boolean;
}

export function getCategoryBadge(category: string) {
  switch ((category || '').toLowerCase()) {
    case 'cabello':
      return { label: 'Cabello', bg: 'bg-pink-500/10 text-pink-400 border-pink-500/20' };
    case 'unas':
      return { label: 'Uñas', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
    case 'pestanas':
      return { label: 'Pestañas & Cejas', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    case 'facial':
      return { label: 'Facial', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    default:
      return { label: 'Belleza', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
  }
}
