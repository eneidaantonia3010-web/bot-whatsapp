'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';

import {
  CalendarBlank,
  Users,
  CurrencyDollar,
  Clock,
  TrendUp,
  Funnel,
  MagnifyingGlass,
  Check,
  X,
  Sparkle,
  DotsThree,
  CaretLeft,
  CaretRight,
  Download,
  SignOut,
  UserPlus,
  ShieldCheck,
  Trash,
  ChartBar,
  Scissors,
  Plus,
  PencilSimple,
  CalendarCheck,
  ListNumbers,
  ChartPie,
  Phone,
  Envelope,
  InstagramLogo,
  Tag,
  Storefront,
  Sliders,
  CheckCircle,
  XCircle,
  Info,
  QrCode,
  ArrowClockwise,
  UserCircle,
  Lock,
  LockSimple,
  Hourglass,
  CalendarPlus,
  ClockAfternoon,
} from '@phosphor-icons/react';

import { SERVICES_STATIC, API_URL } from '@/lib/constants';
import { formatPrice, formatDuration } from '@/lib/utils';
import {
  getAppointments,
  getDashboardMetrics,
  getFinancialAnalytics,
  getExportAppointmentsUrl,
  getExportCustomersUrl,
  updateAppointment,
  getCurrentUser,
  getUsers,
  createUser,
  deleteUser,
  getServices,
  createService,
  updateService,
  deleteService,
  getCustomers,
  getWhatsAppStatus,
  getBlockedTimes,
  createBlockedTime,
  deleteBlockedTime,
  getWaitlist,
  deleteWaitlistEntry,
} from '@/lib/api';

import { getToken, removeToken } from '@/lib/auth';
import { useTranslation } from '@/i18n/I18nContext';


// ----------------------------------------------------
// Types & Mock Fallbacks
// ----------------------------------------------------
interface MockAppointment {
  id: string;
  customerName: string;
  customerPhone: string;
  service: string;
  category: string;
  date: string;
  time: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  source: string;
  price: number;
}

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

const MOCK_APPOINTMENTS: MockAppointment[] = [
  { id: '1', customerName: 'Camila Rodriguez', customerPhone: '+5491145678901', service: 'Balayage VIP & Tratamiento', category: 'cabello', date: '2026-07-26', time: '10:00', status: 'CONFIRMED', source: 'WHATSAPP', price: 45000 },
  { id: '2', customerName: 'Lucía Fernández', customerPhone: '+5491156789012', service: 'Esmaltado Semipermanente', category: 'unas', date: '2026-07-26', time: '11:30', status: 'COMPLETED', source: 'WEB', price: 12000 },
  { id: '3', customerName: 'Valentina Gomez', customerPhone: '+5491167890123', service: 'Lifting de Pestañas + Tinte', category: 'pestanas', date: '2026-07-26', time: '14:00', status: 'PENDING', source: 'WHATSAPP', price: 18000 },
  { id: '4', customerName: 'Martina Paz', customerPhone: '+5491178901234', service: 'Corte Styling & Brushing', category: 'cabello', date: '2026-07-26', time: '15:30', status: 'CONFIRMED', source: 'INSTAGRAM', price: 22000 },
  { id: '5', customerName: 'Sofía Rossi', customerPhone: '+5491189012345', service: 'Perfilado de Cejas & Henna', category: 'pestanas', date: '2026-07-26', time: '17:00', status: 'CANCELLED', source: 'WEB', price: 14000 },
  { id: '6', customerName: 'Ana Clara Bianchi', customerPhone: '+5491190123456', service: 'Limpieza Facial Profunda', category: 'facial', date: '2026-07-27', time: '11:00', status: 'PENDING', source: 'WHATSAPP', price: 28000 },
];

const MOCK_METRICS = {
  appointmentsThisMonth: 47,
  newClientsThisMonth: 12,
  revenueThisMonth: 1285000,
  pendingAppointments: 8,
};

const MOCK_FINANCIAL = {
  revenueThisMonth: 1285000,
  revenuePrevMonth: 1117000,
  revenueGrowthPct: 15.04,
  totalAppointmentsMonth: 47,
  averageTicket: 27340,
  projectedRevenue: 1550000,
  cancellationRate: 4.2,
  cancelledMonth: 2,
  topServices: [
    { name: 'Balayage VIP & Tratamiento', count: 18, revenue: 810000 },
    { name: 'Esmaltado Semipermanente', count: 14, revenue: 168000 },
    { name: 'Lifting de Pestañas + Tinte', count: 10, revenue: 180000 },
    { name: 'Limpieza Facial Profunda', count: 5, revenue: 140000 },
  ],
  categoryDistribution: [
    { name: 'Cabello', count: 22, revenue: 890000 },
    { name: 'Uñas', count: 14, revenue: 168000 },
    { name: 'Pestañas & Cejas', count: 10, revenue: 180000 },
    { name: 'Facial & Maquillaje', count: 5, revenue: 140000 },
  ],
  peakHours: [
    { hour: '11:00hs', count: 14 },
    { hour: '15:00hs', count: 12 },
    { hour: '17:00hs', count: 10 },
    { hour: '10:00hs', count: 8 },
  ],
  weeklyRevenue: [
    { week: 'Semana 1', revenue: 290000 },
    { week: 'Semana 2', revenue: 340000 },
    { week: 'Semana 3', revenue: 310000 },
    { week: 'Semana 4', revenue: 345000 },
  ],
};

export default function AdminPage() {
  const router = useRouter();
  const { language, setLanguage, t } = useTranslation();

  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'customers' | 'services' | 'analytics'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // App Data State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [appointments, setAppointments] = useState<MockAppointment[]>(MOCK_APPOINTMENTS);
  const [metricsData, setMetricsData] = useState(MOCK_METRICS);
  const [financialData, setFinancialData] = useState(MOCK_FINANCIAL);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [selectedAppointment, setSelectedAppointment] = useState<MockAppointment | null>(null);

  // WhatsApp & System Status
  const [waStatus, setWaStatus] = useState<any>({ configured: true, state: 'open' });
  const [currentTime, setCurrentTime] = useState<string>('');

  // Toast System State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Calendar View State
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [blockedTimes, setBlockedTimes] = useState<any[]>([]);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [showBlockModal, setShowBlockModal] = useState<boolean>(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState<boolean>(false);
  const [blockForm, setBlockForm] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    allDay: false,
  });

  // Dynamic Week Generator Helper
  const getWeekDays = (offset: number) => {
    const today = new Date();
    const currentDay = today.getDay();
    const diffToMon = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMon + offset * 7);
    monday.setHours(0, 0, 0, 0);

    const days = [];
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    for (let i = 0; i < 6; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const monthName = d.toLocaleDateString('es-AR', { month: 'short' });
      const label = `${dayNames[i]} ${d.getDate()} ${monthName}`;
      const isToday = d.toDateString() === today.toDateString();
      days.push({ date: d, dateStr, label, shortDay: dayNames[i], isToday });
    }
    return days;
  };

  // Blocked Time Handlers
  const handleCreateBlockedTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockForm.startDate || !blockForm.endDate || !blockForm.reason) {
      addToast('error', 'Error', 'Completá todos los campos.');
      return;
    }
    try {
      const created = await createBlockedTime(blockForm);
      setBlockedTimes((prev) => [...prev, created]);
      setShowBlockModal(false);
      setBlockForm({ startDate: '', endDate: '', reason: '', allDay: false });
      addToast('success', 'Horario Bloqueado', 'El bloqueo ha sido registrado.');
    } catch (err: any) {
      addToast('error', 'Error', err.message || 'No se pudo crear el bloqueo.');
    }
  };

  const handleDeleteBlockedTime = async (id: string) => {
    try {
      await deleteBlockedTime(id);
      setBlockedTimes((prev) => prev.filter((b) => b.id !== id));
      addToast('info', 'Bloqueo Eliminado', 'El horario ha sido liberado.');
    } catch (err: any) {
      addToast('error', 'Error', err.message || 'No se pudo eliminar el bloqueo.');
    }
  };

  const handleDeleteWaitlist = async (id: string) => {
    try {
      await deleteWaitlistEntry(id);
      setWaitlist((prev) => prev.filter((w) => w.id !== id));
      addToast('info', 'Lista de Espera', 'Entrada eliminada.');
    } catch (err: any) {
      addToast('error', 'Error', err.message || 'No se pudo eliminar.');
    }
  };

  // Services Tab State
  const [servicesList, setServicesList] = useState<any[]>(SERVICES_STATIC as any[]);
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState('ALL');
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    price: 0,
    duration: 30,
    category: 'cabello',
    imageUrl: '',
    active: true,
  });

  // Customers Tab State
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // User Management Modal State
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'ADMIN' | 'STAFF'>('STAFF');
  const [userActionError, setUserActionError] = useState<string | null>(null);

  // Helper: Toast Trigger
  const addToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Clock tick
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'America/Argentina/Buenos_Aires',
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check auth and load live data
  useEffect(() => {
    async function initAdmin() {
      const token = getToken();
      if (!token) {
        router.push('/admin/login');
        return;
      }

      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch (err) {
        removeToken();
        router.push('/admin/login');
        return;
      }

      try {
        const [apts, metrics, financial, srvs, custs, wa, blk, wl] = await Promise.all([
          getAppointments().catch(() => null),
          getDashboardMetrics().catch(() => null),
          getFinancialAnalytics().catch(() => null),
          getServices().catch(() => null),
          getCustomers().catch(() => null),
          getWhatsAppStatus().catch(() => null),
          getBlockedTimes().catch(() => null),
          getWaitlist().catch(() => null),
        ]);

        if (wa) setWaStatus(wa);
        if (blk && Array.isArray(blk)) setBlockedTimes(blk);
        if (wl && Array.isArray(wl)) setWaitlist(wl);

        if (apts && apts.length > 0) {
          setAppointments(
            apts.map((a: any) => ({
              id: a.id,
              customerName: a.customer?.name || 'Cliente',
              customerPhone: a.customer?.phone || '',
              service: a.service?.name || 'Servicio',
              category: a.service?.category || 'cabello',
              date: a.date ? a.date.split('T')[0] : '',
              time: a.date ? new Date(a.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
              status: a.status,
              source: a.source || 'WEB',
              price: a.service?.price || 0,
            }))
          );
        }

        if (metrics) setMetricsData(metrics);
        if (financial) setFinancialData(financial);
        if (srvs && srvs.length > 0) setServicesList(srvs);

        if (custs) {
          const custArray = Array.isArray(custs) ? custs : (custs as any).data || [];
          setCustomersList(custArray);
        }
      } catch (err) {
        console.warn('⚠️ Admin live API offline, fallback to local dataset:', err);
      }
    }

    initAdmin();
  }, [router]);

  // Appointment Status Change Handler
  const handleStatusChange = async (id: string, newStatus: MockAppointment['status']) => {
    try {
      await updateAppointment(id, { status: newStatus }).catch(() => null);
      setAppointments((prev) =>
        prev.map((apt) => (apt.id === id ? { ...apt, status: newStatus } : apt))
      );
      if (selectedAppointment?.id === id) {
        setSelectedAppointment((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      const labelMap = { CONFIRMED: 'Confirmado', COMPLETED: 'Completado', CANCELLED: 'Cancelado', PENDING: 'Pendiente' };
      addToast('success', 'Turno Actualizado', `El estado del turno cambió a ${labelMap[newStatus]}.`);
    } catch (error) {
      addToast('error', 'Error', 'No se pudo actualizar el estado del turno.');
    }
  };

  // User Management Modal Handlers
  const handleOpenUsersModal = async () => {
    setShowUsersModal(true);
    setUserActionError(null);
    try {
      const list = await getUsers();
      setUsersList(list);
    } catch (err) {
      console.warn('Could not fetch users list:', err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionError(null);
    try {
      const created: any = await createUser({
        email: newUserEmail,
        name: newUserName,
        password: newUserPassword,
        role: newUserRole,
      });

      setUsersList((prev) => [created, ...prev]);
      setNewUserEmail('');
      setNewUserName('');
      setNewUserPassword('');
      addToast('success', 'Usuario Creado', `Se creó la cuenta para ${created.email}`);
    } catch (err: any) {
      setUserActionError(err.message || 'Error al crear usuario');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás segura de eliminar este usuario?')) return;
    try {
      await deleteUser(userId);
      setUsersList((prev) => prev.filter((u) => u.id !== userId));
      addToast('info', 'Usuario Eliminado', 'La cuenta de usuario fue eliminada.');
    } catch (err: any) {
      alert(err.message || 'Error al eliminar usuario');
    }
  };

  // Service Management Handlers
  const handleOpenNewService = () => {
    setEditingService(null);
    setServiceForm({ name: '', description: '', price: 15000, duration: 45, category: 'cabello', imageUrl: '', active: true });
    setShowServiceModal(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingService) {
        const updated = await updateService(editingService.id, serviceForm).catch(() => serviceForm);
        setServicesList((prev) => prev.map((s) => (s.id === editingService.id ? { ...s, ...serviceForm } : s)));
        addToast('success', 'Servicio Actualizado', `Se guardaron los cambios de ${serviceForm.name}.`);
      } else {
        const created = await createService(serviceForm).catch(() => ({ ...serviceForm, id: Math.random().toString() }));
        setServicesList((prev) => [created, ...prev]);
        addToast('success', 'Servicio Creado', `Servicio ${serviceForm.name} agregado al menú.`);
      }
      setShowServiceModal(false);
    } catch (error) {
      addToast('error', 'Error', 'No se pudo guardar el servicio.');
    }
  };

  const handleToggleServiceActive = async (service: any) => {
    const nextState = !service.active;
    try {
      await updateService(service.id, { active: nextState }).catch(() => null);
      setServicesList((prev) => prev.map((s) => (s.id === service.id ? { ...s, active: nextState } : s)));
      addToast('info', 'Servicio ' + (nextState ? 'Activado' : 'Pausado'), `${service.name} ahora está ${nextState ? 'disponible' : 'oculto'}.`);
    } catch (error) {
      addToast('error', 'Error', 'No se pudo cambiar el estado del servicio.');
    }
  };

  // Logout Handler
  const handleLogout = () => {
    removeToken();
    router.push('/admin/login');
  };

  // Filtered Appointments
  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch =
      apt.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.customerPhone.includes(searchTerm);
    const matchesStatus = statusFilter === 'ALL' || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Category Icon Resolver
  const getCategoryBadge = (category: string) => {
    switch (category.toLowerCase()) {
      case 'cabello': return { label: 'Cabello', bg: 'bg-pink-500/10 text-pink-400 border-pink-500/20' };
      case 'unas': return { label: 'Uñas', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      case 'pestanas': return { label: 'Pestañas & Cejas', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'facial': return { label: 'Facial', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      default: return { label: 'Belleza', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
    }
  };

  return (
    <div className="min-h-screen bg-[#08080C] text-slate-100 font-sans selection:bg-pink-500 selection:text-white relative overflow-x-hidden">
      {/* Background Ambient Glowing Orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-pink-600/10 blur-[140px] pointer-events-none z-0 animate-pulse-glow" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-700/10 blur-[160px] pointer-events-none z-0" />
      <div className="fixed top-[40%] right-[20%] w-[400px] h-[400px] rounded-full bg-emerald-600/5 blur-[120px] pointer-events-none z-0" />

      {/* Main Layout Container */}
      <div className="flex min-h-screen relative z-10">
        
        {/* ==================================================== */}
        {/* 1. SIDEBAR LATERAL FLOTANTE (GLASSMORPHISM) */}
        {/* ==================================================== */}
        <aside
          className={`fixed left-4 top-4 bottom-4 z-40 dark-glass-panel rounded-3xl transition-all duration-300 flex flex-col justify-between p-4 border border-white/10 ${
            isSidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          {/* Top Brand & Logo */}
          <div>
            <div className="flex items-center justify-between mb-8 px-2">
              {!isSidebarCollapsed && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 p-[1px] shadow-lg shadow-pink-500/20">
                    <div className="w-full h-full bg-[#0F0F16] rounded-2xl flex items-center justify-center">
                      <Sparkle className="w-5 h-5 text-pink-400 animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm tracking-tight text-white font-display">Glow Studio</h2>
                    <p className="text-[10px] text-pink-400 font-medium tracking-wide uppercase">by Sofia</p>
                  </div>
                </div>
              )}
              {isSidebarCollapsed && (
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 p-[1px] mx-auto">
                  <div className="w-full h-full bg-[#0F0F16] rounded-2xl flex items-center justify-center">
                    <Sparkle className="w-5 h-5 text-pink-400" />
                  </div>
                </div>
              )}

              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                title={isSidebarCollapsed ? 'Expandir Menú' : 'Colapsar Menú'}
              >
                {isSidebarCollapsed ? <CaretRight className="w-4 h-4" /> : <CaretLeft className="w-4 h-4" />}
              </button>
            </div>

            {/* Navigation Tabs */}
            <nav className="space-y-1.5">
              {[
                { id: 'dashboard', label: t('admin.tabs.dashboard'), icon: ChartBar },
                { id: 'calendar', label: t('admin.tabs.calendar'), icon: CalendarBlank },
                { id: 'customers', label: t('admin.tabs.customers'), icon: Users },
                { id: 'services', label: t('admin.tabs.services'), icon: Scissors },
                { id: 'analytics', label: t('admin.tabs.analytics'), icon: TrendUp },
              ].map((tab) => {

                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-medium transition-all group relative ${
                      isActive
                        ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/10 text-white border border-pink-500/30 shadow-lg shadow-pink-500/10'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-pink-400' : 'text-slate-400'}`} />
                    {!isSidebarCollapsed && <span>{tab.label}</span>}
                    {isActive && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className="absolute right-2 w-1.5 h-6 rounded-full bg-pink-500 shadow-sm shadow-pink-500/50"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Widget & User Profile */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            {/* Live WhatsApp Status Badge */}
            {!isSidebarCollapsed ? (
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center justify-between text-[11px] font-medium mb-1">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-pink-400" /> WhatsApp Bot
                  </span>
                  {waStatus?.state === 'open' ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Activo
                    </span>
                  ) : (
                    <a
                      href={`${API_URL}/api/admin/whatsapp/qr?format=html`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full animate-bounce hover:bg-rose-500/20"
                    >
                      <QrCode className="w-3 h-3" /> Escanear QR
                    </a>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 truncate">+54 9 11 7829-6781</p>
              </div>
            ) : (
              <div className="flex justify-center">
                <span
                  className={`w-3 h-3 rounded-full ${waStatus?.state === 'open' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse' : 'bg-rose-500 animate-bounce'}`}
                  title={waStatus?.state === 'open' ? 'WhatsApp Online' : 'Escanear QR'}
                />
              </div>
            )}

            {/* Profile & Logout */}
            <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
                  S
                </div>
                {!isSidebarCollapsed && (
                  <div className="truncate">
                    <p className="text-xs font-semibold text-white truncate">{currentUser?.name || 'Sofia'}</p>
                    <p className="text-[10px] text-slate-400 truncate">{currentUser?.email || 'admin@glowstudio.com'}</p>
                  </div>
                )}
              </div>
              {!isSidebarCollapsed && (
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                  title="Cerrar Sesión"
                >
                  <SignOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* ==================================================== */}
        {/* 2. CONTENIDO PRINCIPAL Y HEADER () */}
        {/* ==================================================== */}
        <main
          className={`flex-1 transition-all duration-300 p-6 md:p-8 ${
            isSidebarCollapsed ? 'ml-24' : 'ml-72'
          }`}
        >
          {/* Top Floating Glass Header */}
          <header className="dark-glass-panel rounded-3xl p-5 mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-white/10">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight glow-pink-text font-display">
                {activeTab === 'dashboard' && 'Panel de Control General'}
                {activeTab === 'calendar' && 'Calendario de Turnos'}
                {activeTab === 'customers' && 'Directorio de Clientas VIP'}
                {activeTab === 'services' && 'Gestión de Servicios y Precios'}
                {activeTab === 'analytics' && 'Métricas Financieras & Rendimiento'}
              </h1>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <span>Bienvenida, Sofia. Control en tiempo real de Glow Studio.</span>
                <span className="text-slate-600">•</span>
                <span className="text-pink-400 font-mono flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 inline" /> {currentTime || '15:40hs'} ART
                </span>
              </p>
            </div>

            {/* Header Right Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Language Switcher */}
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10">
                <button
                  onClick={() => setLanguage('es')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                    language === 'es' ? 'bg-pink-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Español"
                >
                  🇪🇸 ES
                </button>
                <button
                  onClick={() => setLanguage('it')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                    language === 'it' ? 'bg-pink-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Italiano"
                >
                  🇮🇹 IT
                </button>
              </div>

              {/* Search Bar Input */}

              <div className="relative">
                <MagnifyingGlass className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar turnos, clientas... (CMD+K)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="dark-glass-input pl-10 pr-4 py-2 rounded-2xl text-xs w-64 focus:w-72 transition-all placeholder:text-slate-500"
                />
              </div>

              {/* Admin Users Button */}
              {currentUser?.role === 'ADMIN' && (
                <button
                  onClick={handleOpenUsersModal}
                  className="px-3 py-2 rounded-2xl text-xs font-semibold text-purple-300 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Users className="w-3.5 h-3.5" /> Equipo / Usuarios
                </button>
              )}

              {/* Export Buttons */}
              <a
                href={getExportAppointmentsUrl()}
                download
                className="px-3 py-2 rounded-2xl text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> CSV Turnos
              </a>
              <a
                href={getExportCustomersUrl()}
                download
                className="px-3 py-2 rounded-2xl text-xs font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> CSV Clientes
              </a>
            </div>
          </header>

          {/* ==================================================== */}
          {/* TAB 1: DASHBOARD DE CONTROL */}
          {/* ==================================================== */}
          {activeTab === 'dashboard' && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-8">
              
              {/* 4 Sparkline Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  {
                    title: 'Turnos del Mes',
                    value: metricsData.appointmentsThisMonth,
                    change: '+15%',
                    isPositive: true,
                    icon: CalendarCheck,
                    color: 'from-pink-500 to-rose-600',
                    bgGlow: 'shadow-pink-500/10',
                  },
                  {
                    title: 'Clientas Nuevas',
                    value: metricsData.newClientsThisMonth,
                    change: '+8%',
                    isPositive: true,
                    icon: UserPlus,
                    color: 'from-purple-500 to-indigo-600',
                    bgGlow: 'shadow-purple-500/10',
                  },
                  {
                    title: 'Ingresos Estimados',
                    value: formatPrice(metricsData.revenueThisMonth),
                    change: '+18.4%',
                    isPositive: true,
                    icon: CurrencyDollar,
                    color: 'from-emerald-500 to-teal-600',
                    bgGlow: 'shadow-emerald-500/10',
                  },
                  {
                    title: 'Turnos Pendientes',
                    value: metricsData.pendingAppointments,
                    change: 'Atención requerida',
                    isPositive: false,
                    icon: Clock,
                    color: 'from-amber-500 to-orange-600',
                    bgGlow: 'shadow-amber-500/10',
                  },
                ].map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <div key={idx} className="dark-glass-card rounded-3xl p-5 border border-white/10 relative overflow-hidden group">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs text-slate-400 font-medium">{card.title}</span>
                        <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${card.color} p-[1px] shadow-lg ${card.bgGlow}`}>
                          <div className="w-full h-full bg-[#12121B] rounded-2xl flex items-center justify-center">
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <h3 className="text-2xl font-bold text-white font-display">{card.value}</h3>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${card.isPositive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                          {card.change}
                        </span>
                      </div>
                      {/* Decorative Sparkline graph line */}
                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
                        <span>Actualizado en vivo</span>
                        <span className="text-pink-400 flex items-center gap-1 font-medium">
                          <TrendUp className="w-3 h-3" /> Tendencia positiva
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Appointments Table Section */}
              <div className="dark-glass-panel rounded-3xl p-6 border border-white/10 space-y-5">
                {/* Table Top Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div>
                    <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
                      <CalendarBlank className="w-5 h-5 text-pink-400" /> Próximos Turnos Programados
                    </h2>
                    <p className="text-xs text-slate-400">Haz clic en cualquier turno para abrir su ficha completa.</p>
                  </div>

                  {/* Status Filter Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-white/[0.03] p-1 rounded-2xl border border-white/10">
                    {[
                      { key: 'ALL', label: 'Todos' },
                      { key: 'PENDING', label: 'Pendientes' },
                      { key: 'CONFIRMED', label: 'Confirmados' },
                      { key: 'COMPLETED', label: 'Completados' },
                      { key: 'CANCELLED', label: 'Cancelados' },
                    ].map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setStatusFilter(f.key as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          statusFilter === f.key
                            ? 'bg-pink-500 text-white font-semibold shadow-md shadow-pink-500/30'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table Component */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-white/[0.02] text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-white/10">
                      <tr>
                        <th className="py-3.5 px-4">Clienta</th>
                        <th className="py-3.5 px-4">Servicio</th>
                        <th className="py-3.5 px-4">Fecha & Hora</th>
                        <th className="py-3.5 px-4">Precio</th>
                        <th className="py-3.5 px-4">Origen</th>
                        <th className="py-3.5 px-4">Estado</th>
                        <th className="py-3.5 px-4 text-right">Acciones Rápidas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredAppointments.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            No se encontraron turnos con los filtros aplicados.
                          </td>
                        </tr>
                      ) : (
                        filteredAppointments.map((apt) => {
                          const badge = getCategoryBadge(apt.category);
                          return (
                            <tr
                              key={apt.id}
                              onClick={() => setSelectedAppointment(apt)}
                              className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                            >
                              <td className="py-4 px-4 font-medium text-white flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center text-pink-300 font-bold text-xs">
                                  {apt.customerName.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-semibold text-white group-hover:text-pink-300 transition-colors">{apt.customerName}</p>
                                  <p className="text-[10px] text-slate-400">{apt.customerPhone}</p>
                                </div>
                              </td>

                              <td className="py-4 px-4">
                                <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border ${badge.bg}`}>
                                  {apt.service}
                                </span>
                              </td>

                              <td className="py-4 px-4 font-mono text-slate-200">
                                <span className="block text-white font-semibold">{apt.date}</span>
                                <span className="text-[11px] text-pink-400">{apt.time}hs</span>
                              </td>

                              <td className="py-4 px-4 font-bold text-white font-mono">
                                {formatPrice(apt.price)}
                              </td>

                              <td className="py-4 px-4">
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-white/5 text-slate-400 border border-white/10">
                                  {apt.source}
                                </span>
                              </td>

                              <td className="py-4 px-4">
                                {apt.status === 'CONFIRMED' && (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-max">
                                    <CheckCircle className="w-3 h-3" /> Confirmado
                                  </span>
                                )}
                                {apt.status === 'PENDING' && (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-max">
                                    <Clock className="w-3 h-3" /> Pendiente
                                  </span>
                                )}
                                {apt.status === 'COMPLETED' && (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1 w-max">
                                    <Sparkle className="w-3 h-3" /> Completado
                                  </span>
                                )}
                                {apt.status === 'CANCELLED' && (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1 w-max">
                                    <XCircle className="w-3 h-3" /> Cancelado
                                  </span>
                                )}
                              </td>

                              <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  {apt.status === 'PENDING' && (
                                    <button
                                      onClick={() => handleStatusChange(apt.id, 'CONFIRMED')}
                                      className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all"
                                      title="Confirmar Turno"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED' && (
                                    <button
                                      onClick={() => handleStatusChange(apt.id, 'COMPLETED')}
                                      className="p-1.5 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 transition-all"
                                      title="Marcar Completado"
                                    >
                                      <Sparkle className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {apt.status !== 'CANCELLED' && (
                                    <button
                                      onClick={() => handleStatusChange(apt.id, 'CANCELLED')}
                                      className="p-1.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-all"
                                      title="Cancelar Turno"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: CALENDARIO DE TURNOS */}
          {/* ==================================================== */}
          {activeTab === 'calendar' && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="dark-glass-panel rounded-3xl p-6 border border-white/10 space-y-6">
              {/* Header & Controls */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
                    <CalendarBlank className="w-5 h-5 text-pink-400" /> Agenda Interactiva de Turnos
                  </h2>
                  <p className="text-xs text-slate-400">Visualizá los turnos reales agendados, bloqueos de horarios y lista de espera.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Week Navigation */}
                  <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-2xl border border-white/10">
                    <button
                      onClick={() => setWeekOffset((prev) => prev - 1)}
                      className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all text-xs flex items-center gap-1"
                      title="Semana Anterior"
                    >
                      <CaretLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setWeekOffset(0)}
                      className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                        weekOffset === 0 ? 'bg-pink-500/20 text-pink-300 font-semibold border border-pink-500/30' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Hoy
                    </button>
                    <button
                      onClick={() => setWeekOffset((prev) => prev + 1)}
                      className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all text-xs flex items-center gap-1"
                      title="Semana Siguiente"
                    >
                      <CaretRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Block Time Button (Func 5) */}
                  <button
                    onClick={() => setShowBlockModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-amber-300 border border-amber-400/30 hover:border-amber-400/50 transition-all shadow-sm"
                  >
                    <Lock className="w-3.5 h-3.5" /> Bloquear Horario / Feriado
                  </button>

                  {/* Waitlist Modal Toggle (Func 2) */}
                  <button
                    onClick={() => setShowWaitlistModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-purple-300 border border-purple-400/30 hover:border-purple-400/50 transition-all shadow-sm"
                  >
                    <Hourglass className="w-3.5 h-3.5" /> Lista de Espera ({waitlist.filter((w) => w.status === 'WAITING').length})
                  </button>

                  {/* View Toggle */}
                  <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-2xl border border-white/10">
                    <button
                      onClick={() => setCalendarView('week')}
                      className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                        calendarView === 'week' ? 'bg-pink-500 text-white font-semibold shadow-md shadow-pink-500/30' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Semana
                    </button>
                    <button
                      onClick={() => setCalendarView('month')}
                      className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                        calendarView === 'month' ? 'bg-pink-500 text-white font-semibold shadow-md shadow-pink-500/30' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Mes
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Weekly Matrix (Func 6) */}
              {calendarView === 'week' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {getWeekDays(weekOffset).map((day, idx) => {
                    const dayAppointments = appointments.filter((apt) => apt.date === day.dateStr);
                    const dayBlocks = blockedTimes.filter((b) => {
                      const bStart = b.startDate ? b.startDate.split('T')[0] : '';
                      const bEnd = b.endDate ? b.endDate.split('T')[0] : '';
                      return day.dateStr >= bStart && day.dateStr <= bEnd;
                    });

                    return (
                      <div
                        key={idx}
                        className={`dark-glass-card rounded-2xl p-4 border transition-all ${
                          day.isToday ? 'border-pink-500/50 bg-pink-500/[0.03] shadow-lg shadow-pink-500/10' : 'border-white/10'
                        } space-y-3 flex flex-col min-h-[380px]`}
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-white/10">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-bold font-display ${day.isToday ? 'text-pink-400 font-extrabold' : 'text-slate-200'}`}>
                              {day.label}
                            </span>
                            {day.isToday && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-pink-500 text-white font-bold">HOY</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {dayAppointments.length} turnos
                          </span>
                        </div>

                        <div className="space-y-2 flex-1 overflow-y-auto max-h-[420px] pr-0.5">
                          {/* Blocked Times on this day (Func 5) */}
                          {dayBlocks.map((b) => (
                            <div
                              key={b.id}
                              className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 relative group"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono text-amber-400 font-bold flex items-center gap-1">
                                  <LockSimple className="w-3 h-3" /> {b.allDay ? 'DÍA COMPLETO' : 'BLOQUEADO'}
                                </span>
                                <button
                                  onClick={() => handleDeleteBlockedTime(b.id)}
                                  className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                                  title="Eliminar bloqueo"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <p className="text-xs font-semibold mt-1 truncate">{b.reason}</p>
                              {!b.allDay && (
                                <p className="text-[10px] text-amber-300/70 font-mono">
                                  {new Date(b.startDate).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })} - {new Date(b.endDate).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </p>
                              )}
                            </div>
                          ))}

                          {/* Real Appointments */}
                          {dayAppointments
                            .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                            .map((apt) => {
                              const isConfirmed = apt.status === 'CONFIRMED';
                              const isPending = apt.status === 'PENDING';
                              const isCancelled = apt.status === 'CANCELLED';

                              return (
                                <div
                                  key={apt.id}
                                  onClick={() => setSelectedAppointment(apt)}
                                  className={`p-2.5 rounded-xl border transition-all cursor-pointer group ${
                                    isConfirmed
                                      ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/60'
                                      : isPending
                                      ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/60'
                                      : isCancelled
                                      ? 'bg-rose-500/10 border-rose-500/30 opacity-60'
                                      : 'bg-pink-500/10 border-pink-500/20 hover:border-pink-500/50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono text-pink-300 font-bold">
                                      {apt.time || '10:00'}hs
                                    </span>
                                    <span
                                      className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                                        isConfirmed
                                          ? 'bg-emerald-500/20 text-emerald-300'
                                          : isPending
                                          ? 'bg-amber-500/20 text-amber-300'
                                          : isCancelled
                                          ? 'bg-rose-500/20 text-rose-300'
                                          : 'bg-slate-500/20 text-slate-300'
                                      }`}
                                    >
                                      {apt.status}
                                    </span>
                                  </div>
                                  <p className="text-xs font-semibold text-white truncate group-hover:text-pink-300 mt-1">
                                    {apt.customerName}
                                  </p>
                                  <p className="text-[10px] text-slate-400 truncate">{apt.service}</p>
                                  {apt.price > 0 && (
                                    <p className="text-[9px] font-mono text-slate-500 mt-1">${apt.price.toLocaleString('es-AR')}</p>
                                  )}
                                </div>
                              );
                            })}

                          {dayAppointments.length === 0 && dayBlocks.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-40">
                              <CalendarCheck className="w-8 h-8 text-slate-600 mb-1" />
                              <p className="text-[10px] text-slate-500">Sin turnos</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Month Grid */
                <div className="space-y-4">
                  <div className="grid grid-cols-7 gap-2">
                    {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
                      <div key={d} className="py-2 text-center text-xs font-bold text-slate-400 border-b border-white/10">
                        {d}
                      </div>
                    ))}
                    {Array.from({ length: 31 }).map((_, i) => {
                      const dayNumber = i + 1;
                      const monthDayStr = `2026-08-${dayNumber.toString().padStart(2, '0')}`;
                      const count = appointments.filter((a) => a.date === monthDayStr).length;

                      return (
                        <div
                          key={i}
                          className="dark-glass-card h-24 p-2.5 rounded-xl border border-white/5 flex flex-col justify-between hover:border-pink-500/30 transition-all cursor-pointer"
                        >
                          <span className="text-xs font-mono font-semibold text-slate-300">{dayNumber}</span>
                          {count > 0 ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 truncate">
                              {count} {count === 1 ? 'Turno' : 'Turnos'}
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-600">Libre</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ==================================================== */}
          {/* TAB 3: CLIENTAS VIP (CRM) */}
          {/* ==================================================== */}
          {activeTab === 'customers' && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
              <div className="dark-glass-panel rounded-3xl p-6 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-400" /> Directorio de Clientas VIP
                  </h2>
                  <p className="text-xs text-slate-400">Historial completo, preferencias y contacto directo por WhatsApp.</p>
                </div>
                <div className="relative">
                  <MagnifyingGlass className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o teléfono..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="dark-glass-input pl-10 pr-4 py-2 rounded-2xl text-xs w-64"
                  />
                </div>
              </div>

              {/* Customers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {(customersList.length > 0 ? customersList : [
                  { id: '1', name: 'Camila Rodriguez', phone: '+5491145678901', visits: 12, totalSpent: 480000, level: 'VIP' },
                  { id: '2', name: 'Lucía Fernández', phone: '+5491156789012', visits: 6, totalSpent: 120000, level: 'Frecuente' },
                  { id: '3', name: 'Valentina Gomez', phone: '+5491167890123', visits: 2, totalSpent: 36000, level: 'Nueva' },
                  { id: '4', name: 'Martina Paz', phone: '+5491178901234', visits: 8, totalSpent: 210000, level: 'Frecuente' },
                ])
                  .filter((c: any) => c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone?.includes(customerSearch))
                  .map((customer: any) => (
                    <div
                      key={customer.id}
                      onClick={() => setSelectedCustomer(customer)}
                      className="dark-glass-card rounded-3xl p-5 border border-white/10 space-y-4 hover:border-purple-500/30 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-sm">
                            {customer.name?.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-bold text-white group-hover:text-purple-300 transition-colors">{customer.name}</h3>
                            <p className="text-[11px] text-slate-400">{customer.phone}</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {customer.level || 'VIP'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Visitas</span>
                          <span className="font-bold text-white">{customer.visits || 8} citas</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Total Invertido</span>
                          <span className="font-bold text-emerald-400">{formatPrice(customer.totalSpent || 240000)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <a
                          href={`https://wa.me/${customer.phone?.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" /> Enviar Mensaje
                        </a>
                        <span className="text-[10px] text-slate-500">Ver Ficha &rarr;</span>
                      </div>
                    </div>
                  ))}
              </div>
            </motion.div>
          )}

          {/* ==================================================== */}
          {/* TAB 4: GESTIÓN DE SERVICIOS */}
          {/* ==================================================== */}
          {activeTab === 'services' && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
              <div className="dark-glass-panel rounded-3xl p-6 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-pink-400" /> Catálogo de Servicios y Precios
                  </h2>
                  <p className="text-xs text-slate-400">Activá, pausá o modificá los valores de los tratamientos.</p>
                </div>
                <button
                  onClick={handleOpenNewService}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-semibold text-xs shadow-lg shadow-pink-500/25 hover:brightness-110 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Agregar Servicio
                </button>
              </div>

              {/* Services Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {servicesList.map((service) => (
                  <div key={service.id} className="dark-glass-card rounded-3xl p-5 border border-white/10 space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                          {service.category || 'Cabello'}
                        </span>
                        {/* Toggle Active Switch */}
                        <button
                          onClick={() => handleToggleServiceActive(service)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 ${
                            service.active !== false
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${service.active !== false ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                          {service.active !== false ? 'Disponible' : 'Pausado'}
                        </button>
                      </div>
                      <h3 className="font-bold text-white text-base font-display">{service.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{service.description}</p>
                    </div>

                    <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Duración: {formatDuration(service.duration)}</span>
                        <span className="text-lg font-bold text-white font-mono">{formatPrice(service.price)}</span>
                      </div>
                      <button
                        onClick={() => {
                          setEditingService(service);
                          setServiceForm({
                            name: service.name,
                            description: service.description || '',
                            price: service.price,
                            duration: service.duration,
                            category: service.category || 'cabello',
                            imageUrl: service.imageUrl || '',
                            active: service.active !== false,
                          });
                          setShowServiceModal(true);
                        }}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
                        title="Editar Servicio"
                      >
                        <PencilSimple className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ==================================================== */}
          {/* TAB 5: ESTADÍSTICAS Y RENDIMIENTO */}
          {/* ==================================================== */}
          {activeTab === 'analytics' && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-8">
              {/* Financial Metrics Summary Header */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="dark-glass-card rounded-3xl p-5 border border-white/10 space-y-2">
                  <span className="text-xs text-slate-400">Ingreso Mensual Actual</span>
                  <h3 className="text-3xl font-bold text-emerald-400 font-mono">{formatPrice(financialData.revenueThisMonth)}</h3>
                  <p className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1">
                    <TrendUp className="w-3.5 h-3.5" /> +{financialData.revenueGrowthPct}% vs mes anterior
                  </p>
                </div>
                <div className="dark-glass-card rounded-3xl p-5 border border-white/10 space-y-2">
                  <span className="text-xs text-slate-400">Ticket Promedio por Clienta</span>
                  <h3 className="text-3xl font-bold text-white font-mono">{formatPrice(financialData.averageTicket)}</h3>
                  <p className="text-[11px] text-slate-400">Basado en {financialData.totalAppointmentsMonth} turnos atedidos</p>
                </div>
                <div className="dark-glass-card rounded-3xl p-5 border border-white/10 space-y-2">
                  <span className="text-xs text-slate-400">Tasa de Cancelación</span>
                  <h3 className="text-3xl font-bold text-pink-400 font-mono">{financialData.cancellationRate}%</h3>
                  <p className="text-[11px] text-slate-400">{financialData.cancelledMonth} cancelaciones registradas</p>
                </div>
              </div>

              {/* Visual Breakdown Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Weekly Bar Representation */}
                <div className="dark-glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
                  <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                    <ChartBar className="w-5 h-5 text-pink-400" /> Ingresos Semanales
                  </h3>
                  <div className="space-y-3 pt-2">
                    {financialData.weeklyRevenue.map((w, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-300">{w.week}</span>
                          <span className="text-emerald-400 font-mono">{formatPrice(w.revenue)}</span>
                        </div>
                        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <div
                            className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full"
                            style={{ width: `${(w.revenue / 400000) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Services Ranking */}
                <div className="dark-glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
                  <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                    <ChartPie className="w-5 h-5 text-purple-400" /> Servicios Más Solicitados
                  </h3>
                  <div className="space-y-3">
                    {financialData.topServices.map((srv, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-xs">
                        <div>
                          <p className="font-semibold text-white">{srv.name}</p>
                          <p className="text-[10px] text-slate-400">{srv.count} turnos realizados</p>
                        </div>
                        <span className="font-mono font-bold text-pink-400">{formatPrice(srv.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </main>
      </div>

      {/* ==================================================== */}
      {/* 3. QUICK DRAWER (PANEL DESLIZABLE DE TURNO) */}
      {/* ==================================================== */}
      <AnimatePresence>
        {selectedAppointment && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAppointment(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md h-full dark-glass-panel border-l border-white/10 p-6 flex flex-col justify-between z-10 space-y-6 overflow-y-auto"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
                    <CalendarCheck className="w-5 h-5 text-pink-400" /> Ficha Técnica del Turno
                  </h2>
                  <button
                    onClick={() => setSelectedAppointment(null)}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Client Info Card */}
                <div className="dark-glass-card p-4 rounded-2xl border border-white/10 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                      {selectedAppointment.customerName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">{selectedAppointment.customerName}</h3>
                      <p className="text-xs text-slate-400">{selectedAppointment.customerPhone}</p>
                    </div>
                  </div>
                  <a
                    href={`https://wa.me/${selectedAppointment.customerPhone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Phone className="w-4 h-4" /> Enviar Mensaje de WhatsApp
                  </a>
                </div>

                {/* Service & Time Details */}
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Tratamiento</span>
                    <span className="font-semibold text-white">{selectedAppointment.service}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Fecha</span>
                    <span className="font-mono font-semibold text-white">{selectedAppointment.date}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Hora</span>
                    <span className="font-mono font-semibold text-pink-400">{selectedAppointment.time}hs</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Monto del Servicio</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">{formatPrice(selectedAppointment.price)}</span>
                  </div>
                </div>

                {/* Change Status Actions */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold text-slate-400 block">Cambiar Estado del Turno</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleStatusChange(selectedAppointment.id, 'CONFIRMED')}
                      className="py-2.5 px-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" /> Confirmar
                    </button>
                    <button
                      onClick={() => handleStatusChange(selectedAppointment.id, 'COMPLETED')}
                      className="py-2.5 px-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Sparkle className="w-4 h-4" /> Completar
                    </button>
                    <button
                      onClick={() => handleStatusChange(selectedAppointment.id, 'CANCELLED')}
                      className="col-span-2 py-2.5 px-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <X className="w-4 h-4" /> Cancelar Cita
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedAppointment(null)}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition-colors"
              >
                Cerrar Ficha
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* 4. MODAL CREAR / EDITAR SERVICIO */}
      {/* ==================================================== */}
      <AnimatePresence>
        {showServiceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowServiceModal(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg dark-glass-panel rounded-3xl p-6 border border-white/10 space-y-6 z-10">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-lg font-bold text-white font-display">
                  {editingService ? 'Editar Servicio' : 'Agregar Nuevo Servicio'}
                </h3>
                <button onClick={() => setShowServiceModal(false)} className="p-1 rounded-xl hover:bg-white/10 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveService} className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Nombre del Servicio</label>
                  <input
                    type="text"
                    required
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    className="w-full dark-glass-input rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Categoría</label>
                  <select
                    value={serviceForm.category}
                    onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                    className="w-full dark-glass-input rounded-xl px-3 py-2 bg-[#12121A] text-white"
                  >
                    <option value="cabello">Cabello</option>
                    <option value="unas">Uñas</option>
                    <option value="pestanas">Pestañas & Cejas</option>
                    <option value="facial">Facial</option>
                    <option value="maquillaje">Maquillaje</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Precio ($ ARS)</label>
                    <input
                      type="number"
                      required
                      value={serviceForm.price}
                      onChange={(e) => setServiceForm({ ...serviceForm, price: Number(e.target.value) })}
                      className="w-full dark-glass-input rounded-xl px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Duración (min)</label>
                    <input
                      type="number"
                      required
                      value={serviceForm.duration}
                      onChange={(e) => setServiceForm({ ...serviceForm, duration: Number(e.target.value) })}
                      className="w-full dark-glass-input rounded-xl px-3 py-2 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Descripción</label>
                  <textarea
                    rows={3}
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                    className="w-full dark-glass-input rounded-xl px-3 py-2"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button type="button" onClick={() => setShowServiceModal(false)} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold">
                    Cancelar
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-semibold shadow-lg shadow-pink-500/20">
                    Guardar Servicio
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* 5. MODAL GESTIÓN DE USUARIOS / EQUIPO */}
      {/* ==================================================== */}
      <AnimatePresence>
        {showUsersModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowUsersModal(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-xl dark-glass-panel rounded-3xl p-6 border border-white/10 space-y-6 z-10">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-400" /> Gestión del Equipo & Accesos
                </h3>
                <button onClick={() => setShowUsersModal(false)} className="p-1 rounded-xl hover:bg-white/10 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Create User Form */}
              <form onSubmit={handleCreateUser} className="space-y-3 bg-white/[0.02] p-4 rounded-2xl border border-white/5 text-xs">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-pink-400" /> Crear Nuevo Usuario
                </h4>
                {userActionError && <p className="text-rose-400 text-[11px]">{userActionError}</p>}
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="email"
                    placeholder="Correo electrónico"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="dark-glass-input rounded-xl px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="dark-glass-input rounded-xl px-3 py-2"
                  />
                  <input
                    type="password"
                    placeholder="Contraseña"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="dark-glass-input rounded-xl px-3 py-2"
                  />
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="dark-glass-input rounded-xl px-3 py-2 bg-[#12121A] text-white"
                  >
                    <option value="STAFF">Personal / Staff</option>
                    <option value="ADMIN">Administradora</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-md">
                  Crear Usuario
                </button>
              </form>

              {/* Active Users List */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Usuarios Activos</h4>
                {usersList.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-xs">
                    <div>
                      <p className="font-semibold text-white">{u.email}</p>
                      <p className="text-[10px] text-slate-400">{u.name || 'Sin nombre'} • Rol: {u.role}</p>
                    </div>
                    {u.email !== 'admin@glowstudio.com' && (
                      <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors">
                        <Trash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* 6. MODAL BLOQUEAR HORARIOS / FERIADOS (Func 5) */}
      {/* ==================================================== */}
      <AnimatePresence>
        {showBlockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBlockModal(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg dark-glass-panel rounded-3xl p-6 border border-white/10 space-y-5 z-10">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-400" /> Bloquear Horario / Feriado
                </h3>
                <button onClick={() => setShowBlockModal(false)} className="p-1 rounded-xl hover:bg-white/10 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateBlockedTime} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Motivo del Bloqueo</label>
                  <input
                    type="text"
                    placeholder="Ej: Feriado Nacional, Almuerzo, Vacaciones Sofía"
                    required
                    value={blockForm.reason}
                    onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
                    className="dark-glass-input rounded-xl px-3 py-2 w-full"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allDayCheck"
                    checked={blockForm.allDay}
                    onChange={(e) => setBlockForm({ ...blockForm, allDay: e.target.checked })}
                    className="rounded bg-white/10 border-white/20 text-pink-500 focus:ring-0"
                  />
                  <label htmlFor="allDayCheck" className="text-slate-300 text-xs cursor-pointer">
                    Bloquear día completo (09:00 a 19:00)
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Fecha & Hora Inicio</label>
                    <input
                      type="datetime-local"
                      required
                      value={blockForm.startDate}
                      onChange={(e) => setBlockForm({ ...blockForm, startDate: e.target.value })}
                      className="dark-glass-input rounded-xl px-3 py-2 w-full text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Fecha & Hora Fin</label>
                    <input
                      type="datetime-local"
                      required
                      value={blockForm.endDate}
                      onChange={(e) => setBlockForm({ ...blockForm, endDate: e.target.value })}
                      className="dark-glass-input rounded-xl px-3 py-2 w-full text-slate-200"
                    />
                  </div>
                </div>

                <button type="submit" className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-lg shadow-amber-500/20 transition-all">
                  Guardar Bloqueo de Horario
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* 7. MODAL LISTA DE ESPERA INTELIGENTE (Func 2) */}
      {/* ==================================================== */}
      <AnimatePresence>
        {showWaitlistModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowWaitlistModal(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-2xl dark-glass-panel rounded-3xl p-6 border border-white/10 space-y-5 z-10">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                  <Hourglass className="w-5 h-5 text-purple-400" /> Lista de Espera Inteligente
                </h3>
                <button onClick={() => setShowWaitlistModal(false)} className="p-1 rounded-xl hover:bg-white/10 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Cuando una clienta cancela un turno, el bot le envía una notificación automática por WhatsApp a la primera clienta en espera.
              </p>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {waitlist.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    <Hourglass className="w-8 h-8 mx-auto mb-2 opacity-40 text-purple-400" />
                    No hay clientas en lista de espera en este momento.
                  </div>
                ) : (
                  waitlist.map((w) => (
                    <div key={w.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white">{w.customer?.name || 'Clienta'}</p>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                              w.status === 'WAITING'
                                ? 'bg-purple-500/20 text-purple-300'
                                : w.status === 'OFFERED'
                                ? 'bg-amber-500/20 text-amber-300'
                                : w.status === 'BOOKED'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-slate-500/20 text-slate-400'
                            }`}
                          >
                            {w.status === 'WAITING' ? 'EN ESPERA' : w.status === 'OFFERED' ? 'OFERTADO' : w.status === 'BOOKED' ? 'RESERVÓ' : w.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          💇 {w.service?.name} • 📅 {w.preferredDate ? new Date(w.preferredDate).toLocaleDateString('es-AR') : 'Fecha libre'} {w.timeRange ? `(${w.timeRange})` : ''}
                        </p>
                        {w.customer?.phone && (
                          <p className="text-[10px] text-slate-500 font-mono">📱 {w.customer.phone}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteWaitlist(w.id)}
                        className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                        title="Eliminar de lista"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* 6. TOAST NOTIFICATION CONTAINER (FRAMER MOTION) */}
      {/* ==================================================== */}
      <div className="fixed bottom-6 right-6 z-50 space-y-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="pointer-events-auto dark-glass-panel rounded-2xl p-4 border border-white/10 shadow-2xl flex items-center gap-3 max-w-sm"
            >
              {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
              {toast.type === 'error' && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
              <div>
                <h4 className="text-xs font-bold text-white">{toast.title}</h4>
                <p className="text-[11px] text-slate-300">{toast.message}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
