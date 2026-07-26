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
} from '@phosphor-icons/react';

import { SERVICES_STATIC } from '@/lib/constants';
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
} from '@/lib/api';
import { getToken, removeToken } from '@/lib/auth';

const MOCK_METRICS = {
  appointmentsThisMonth: 47,
  newClientsThisMonth: 12,
  revenueThisMonth: 1285000,
  pendingAppointments: 8,
};

interface MockAppointment {
  id: string;
  customerName: string;
  customerPhone?: string;
  service: string;
  category?: string;
  date: string;
  time: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  source: 'WEB' | 'INSTAGRAM' | 'WHATSAPP';
  price: number;
}

const MOCK_APPOINTMENTS: MockAppointment[] = [
  { id: '1', customerName: 'Valentina López', customerPhone: '+5491144445555', service: 'Uñas Gel Luxury', category: 'unas', date: '2026-07-25', time: '10:00', status: 'CONFIRMED', source: 'INSTAGRAM', price: 28000 },
  { id: '2', customerName: 'Camila Rodríguez', customerPhone: '+5491133334444', service: 'Facial Glow', category: 'facial', date: '2026-07-25', time: '11:00', status: 'PENDING', source: 'WEB', price: 35000 },
  { id: '3', customerName: 'Martina García', customerPhone: '+5491122223333', service: 'Corte Signature', category: 'cabello', date: '2026-07-25', time: '14:00', status: 'CONFIRMED', source: 'WHATSAPP', price: 25000 },
  { id: '4', customerName: 'Sofía Fernández', customerPhone: '+5491155556666', service: 'Anti-frizz Keratina', category: 'tratamientos', date: '2026-07-26', time: '09:00', status: 'PENDING', source: 'INSTAGRAM', price: 45000 },
  { id: '5', customerName: 'Isabella Martínez', customerPhone: '+5491166667777', service: 'Esmaltado Semi Pro', category: 'unas', date: '2026-07-26', time: '10:30', status: 'CONFIRMED', source: 'WEB', price: 18000 },
];

const STATUS_STYLES = {
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400', label: 'Pendiente' },
  CONFIRMED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400', label: 'Confirmado' },
  COMPLETED: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400', label: 'Completado' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400', label: 'Cancelado' },
};

const SOURCE_ICONS: Record<string, string> = {
  WEB: '🌐',
  INSTAGRAM: '📸',
  WHATSAPP: '💬',
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  unas: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  cabello: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  facial: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  tratamientos: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  todos: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'customers' | 'services' | 'analytics'>('dashboard');

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [appointments, setAppointments] = useState<MockAppointment[]>(MOCK_APPOINTMENTS);
  const [metricsData, setMetricsData] = useState(MOCK_METRICS);
  const [financialData, setFinancialData] = useState<any>(null);

  // Calendar tab state
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week');
  const [selectedAppointment, setSelectedAppointment] = useState<MockAppointment | null>(null);

  // Services tab state
  const [servicesList, setServicesList] = useState<any[]>(SERVICES_STATIC as any[]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    price: 0,
    duration: 30,
    category: 'cabello',
    imageUrl: '',
  });

  // Customers tab state
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // User management modal states
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'ADMIN' | 'STAFF'>('STAFF');
  const [userActionError, setUserActionError] = useState<string | null>(null);

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
        console.warn('⚠️ Token de sesión inválido o expirado. Redirigiendo a login...');
        removeToken();
        router.push('/admin/login');
        return;
      }

      try {
        const [apts, metrics, financial, srvs, custs] = await Promise.all([
          getAppointments().catch(() => null),
          getDashboardMetrics().catch(() => null),
          getFinancialAnalytics().catch(() => null),
          getServices().catch(() => null),
          getCustomers().catch(() => null),
        ]);

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
        console.warn('⚠️ Admin API call offline, fallback to mock data:', err);
      }
    }

    initAdmin();
  }, [router]);

  const handleSignOut = () => {
    removeToken();
    router.push('/admin/login');
  };

  const loadUsersList = async () => {
    try {
      const list = await getUsers();
      setUsersList(list);
    } catch (err: any) {
      setUserActionError(err.message || 'Error al cargar lista de usuarios');
    }
  };

  const handleOpenUsersModal = () => {
    setShowUsersModal(true);
    setUserActionError(null);
    loadUsersList();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionError(null);
    try {
      await createUser({
        email: newUserEmail,
        name: newUserName,
        password: newUserPassword,
        role: newUserRole,
      });
      setNewUserEmail('');
      setNewUserName('');
      setNewUserPassword('');
      loadUsersList();
    } catch (err: any) {
      setUserActionError(err.message || 'Error al crear usuario');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('¿Seguro que querés eliminar este usuario?')) return;
    setUserActionError(null);
    try {
      await deleteUser(id);
      loadUsersList();
    } catch (err: any) {
      setUserActionError(err.message || 'Error al eliminar usuario');
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      apt.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.service.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleUpdateStatus = async (id: string, newStatus: MockAppointment['status']) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, status: newStatus } : apt))
    );
    try {
      await updateAppointment(id, { status: newStatus });
    } catch (err) {
      console.warn('⚠️ Could not persist status update to backend:', err);
    }
  };

  // Service CRUD handlers
  const handleOpenServiceModal = (service?: any) => {
    if (service) {
      setEditingService(service);
      setServiceForm({
        name: service.name,
        description: service.description || '',
        price: service.price,
        duration: service.duration,
        category: service.category || 'cabello',
        imageUrl: service.imageUrl || '',
      });
    } else {
      setEditingService(null);
      setServiceForm({
        name: '',
        description: '',
        price: 0,
        duration: 45,
        category: 'cabello',
        imageUrl: '',
      });
    }
    setShowServiceModal(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingService) {
        const updated = await updateService(editingService.id, serviceForm);
        setServicesList((prev) => prev.map((s) => (s.id === editingService.id ? { ...s, ...serviceForm } : s)));
      } else {
        const created = await createService(serviceForm);
        setServicesList((prev) => [...prev, created || { ...serviceForm, id: Date.now().toString() }]);
      }
      setShowServiceModal(false);
    } catch (err) {
      console.error('Error saving service:', err);
      // Fallback local update
      if (editingService) {
        setServicesList((prev) => prev.map((s) => (s.id === editingService.id ? { ...s, ...serviceForm } : s)));
      } else {
        setServicesList((prev) => [...prev, { ...serviceForm, id: Date.now().toString() }]);
      }
      setShowServiceModal(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('¿Desactivar este servicio del menú?')) return;
    try {
      await deleteService(id);
      setServicesList((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setServicesList((prev) => prev.filter((s) => s.id !== id));
    }
  };

  // Filtered Customers
  const filteredCustomers = customersList.filter((c) => {
    if (!customerSearch) return true;
    const q = customerSearch.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const metrics = [
    {
      label: 'Turnos del Mes',
      value: metricsData.appointmentsThisMonth,
      icon: CalendarBlank,
      color: 'text-[var(--color-ink)]',
      bgColor: 'bg-[var(--color-bg-alt)]',
      change: '+12%',
    },
    {
      label: 'Clientes Nuevos',
      value: metricsData.newClientsThisMonth,
      icon: Users,
      color: 'text-[var(--color-ink)]',
      bgColor: 'bg-[var(--color-bg-alt)]',
      change: '+8%',
    },
    {
      label: 'Ingreso del Mes',
      value: formatPrice(metricsData.revenueThisMonth),
      icon: CurrencyDollar,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      change: '+15%',
    },
    {
      label: 'Turnos Pendientes',
      value: metricsData.pendingAppointments,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      change: null,
    },
  ];

  const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
  const daysOfWeek = [
    { key: '2026-07-20', day: 'Lun 20' },
    { key: '2026-07-21', day: 'Mar 21' },
    { key: '2026-07-22', day: 'Mié 22' },
    { key: '2026-07-23', day: 'Jue 23' },
    { key: '2026-07-24', day: 'Vie 24' },
    { key: '2026-07-25', day: 'Sáb 25' },
  ];

  return (
    <div className="min-h-[100svh] bg-[var(--color-bg)] pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1
              className="text-3xl md:text-4xl font-semibold text-[var(--color-ink)] tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Panel de Administración
            </h1>
            <p className="text-[var(--color-ink-muted)] text-sm mt-1">
              Bienvenida, Sofia. Gestión integral de turnos, clientas, servicios y finanzas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {currentUser?.role === 'ADMIN' && (
              <button
                onClick={handleOpenUsersModal}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--color-ink)] bg-[var(--color-surface)] border border-[var(--color-bg-alt)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-alt)] transition-colors shadow-sm"
              >
                <Users className="w-3.5 h-3.5 text-purple-600" />
                Usuarios
              </button>
            )}
            <a
              href={getExportAppointmentsUrl()}
              download
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--color-ink)] bg-[var(--color-surface)] border border-[var(--color-bg-alt)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-alt)] transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              CSV Turnos
            </a>
            <a
              href={getExportCustomersUrl()}
              download
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--color-ink)] bg-[var(--color-surface)] border border-[var(--color-bg-alt)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-alt)] transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              CSV Clientes
            </a>

            {/* Profile & Logout */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-[var(--color-bg-alt)]">
                <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                  {currentUser.role}
                </span>
                <button
                  onClick={handleSignOut}
                  title="Cerrar Sesión"
                  className="p-2 text-[var(--color-ink-muted)] hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                >
                  <SignOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Top Navigation Tabs */}
        <div className="flex border-b border-[var(--color-bg-alt)] mb-8 overflow-x-auto">
          {[
            { id: 'dashboard', label: '📊 Dashboard', icon: ChartBar },
            { id: 'calendar', label: '📅 Calendario', icon: CalendarBlank },
            { id: 'customers', label: '👥 Clientes', icon: Users },
            { id: 'services', label: '💅 Servicios', icon: Scissors },
            { id: 'analytics', label: '📈 Estadísticas', icon: TrendUp },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold border-b-2 transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[var(--color-ink)] text-[var(--color-ink)]'
                  : 'border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {metrics.map((metric, index) => (
                <div
                  key={metric.label}
                  className="bg-[var(--color-surface)] border border-[var(--color-bg-alt)] rounded-2xl p-6 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-lifted)] transition-shadow duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-[var(--radius-xl)] ${metric.bgColor} flex items-center justify-center`}>
                      <metric.icon className={`w-5 h-5 ${metric.color}`} />
                    </div>
                    {metric.change && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                        <TrendUp weight="bold" className="w-3 h-3" />
                        {metric.change}
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-semibold text-[var(--color-ink)] mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                    {metric.value}
                  </p>
                  <p className="text-sm font-medium text-[var(--color-ink-muted)]">{metric.label}</p>
                </div>
              ))}
            </div>

            {/* Appointments Table */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-bg-alt)] rounded-2xl shadow-[var(--shadow-soft)] overflow-hidden">
              <div className="p-6 border-b border-[var(--color-bg-alt)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
                  Próximos Turnos
                </h2>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-ink-muted)]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar cliente..."
                      className="pl-9 pr-4 py-2 rounded-[var(--radius-lg)] border border-[var(--color-bg-alt)] bg-[var(--color-bg)] text-sm focus:outline-none focus:border-[var(--color-ink)] focus:ring-1 focus:ring-[var(--color-ink)] w-full sm:w-64 transition-all"
                    />
                  </div>
                  <div className="flex gap-2">
                    {[
                      { value: 'all', label: 'Todos' },
                      { value: 'PENDING', label: 'Pendientes' },
                      { value: 'CONFIRMED', label: 'Confirmados' },
                    ].map((filter) => (
                      <button
                        key={filter.value}
                        onClick={() => setStatusFilter(filter.value)}
                        className={`px-4 py-2 rounded-[var(--radius-lg)] text-xs font-semibold transition-all duration-200 ${
                          statusFilter === filter.value
                            ? 'bg-[var(--color-ink)] text-[var(--color-white)]'
                            : 'bg-[var(--color-bg-alt)] text-[var(--color-ink-light)] hover:text-[var(--color-ink)]'
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--color-bg-alt)] bg-[var(--color-bg)]">
                      <th className="text-left text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider px-6 py-4">Cliente</th>
                      <th className="text-left text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider px-6 py-4">Servicio</th>
                      <th className="text-left text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider px-6 py-4">Fecha & Hora</th>
                      <th className="text-left text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider px-6 py-4">Estado</th>
                      <th className="text-left text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider px-6 py-4">Origen</th>
                      <th className="text-left text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider px-6 py-4">Monto</th>
                      <th className="text-right text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider px-6 py-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-bg-alt)]">
                    {filteredAppointments.map((apt) => {
                      const status = STATUS_STYLES[apt.status as keyof typeof STATUS_STYLES] || STATUS_STYLES.PENDING;
                      return (
                        <tr key={apt.id} className="hover:bg-[var(--color-bg)]/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-[var(--color-ink)]">{apt.customerName}</td>
                          <td className="px-6 py-4 text-[var(--color-ink-light)]">{apt.service}</td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-[var(--color-ink)]">{apt.date}</div>
                            <div className="text-xs text-[var(--color-ink-muted)]">{apt.time}hs</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${status.bg} ${status.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-medium text-[var(--color-ink-light)] flex items-center gap-1.5">
                              {SOURCE_ICONS[apt.source]} {apt.source}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-[var(--color-ink)]">{formatPrice(apt.price)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {apt.status === 'PENDING' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(apt.id, 'CONFIRMED')}
                                    className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-colors"
                                    title="Confirmar"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(apt.id, 'CANCELLED')}
                                    className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 transition-colors"
                                    title="Cancelar"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {apt.status === 'CONFIRMED' && (
                                <button
                                  onClick={() => handleUpdateStatus(apt.id, 'COMPLETED')}
                                  className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors"
                                  title="Marcar completado"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: CALENDARIO */}
        {activeTab === 'calendar' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-[var(--color-surface)] border border-[var(--color-bg-alt)] p-4 rounded-2xl">
              <div className="flex items-center gap-2">
                <CalendarBlank className="w-5 h-5 text-[var(--color-ink)]" />
                <h2 className="text-lg font-semibold text-[var(--color-ink)]">Calendario de Reservas</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCalendarView('week')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    calendarView === 'week' ? 'bg-[var(--color-ink)] text-white' : 'bg-[var(--color-bg-alt)] text-[var(--color-ink)]'
                  }`}
                >
                  Vista Semanal
                </button>
                <button
                  onClick={() => setCalendarView('month')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    calendarView === 'month' ? 'bg-[var(--color-ink)] text-white' : 'bg-[var(--color-bg-alt)] text-[var(--color-ink)]'
                  }`}
                >
                  Vista Mensual
                </button>
              </div>
            </div>

            {/* Weekly Calendar Grid */}
            {calendarView === 'week' ? (
              <div className="bg-[var(--color-surface)] border border-[var(--color-bg-alt)] rounded-2xl overflow-x-auto shadow-sm p-4">
                <div className="min-w-[700px]">
                  {/* Grid Header Days */}
                  <div className="grid grid-cols-7 border-b border-[var(--color-bg-alt)] pb-3 text-center text-xs font-semibold text-[var(--color-ink-muted)]">
                    <div className="py-1">Hora</div>
                    {daysOfWeek.map((d) => (
                      <div key={d.key} className="py-1">{d.day}</div>
                    ))}
                  </div>

                  {/* Time Slots */}
                  {timeSlots.map((slot) => (
                    <div key={slot} className="grid grid-cols-7 border-b border-[var(--color-bg-alt)]/50 py-2 items-center text-center">
                      <div className="text-xs font-semibold text-[var(--color-ink-muted)]">{slot} hs</div>
                      {daysOfWeek.map((d) => {
                        const matchingApts = appointments.filter(
                          (a) => a.date === d.key && a.time.startsWith(slot.substring(0, 2))
                        );
                        return (
                          <div key={d.key} className="px-1 min-h-[40px] flex flex-col justify-center">
                            {matchingApts.map((apt) => {
                              const catStyle = CATEGORY_COLORS[apt.category || 'cabello'] || CATEGORY_COLORS.cabello;
                              return (
                                <button
                                  key={apt.id}
                                  onClick={() => setSelectedAppointment(apt)}
                                  className={`text-left p-1.5 rounded-lg border text-[11px] font-medium leading-tight shadow-sm transition-transform hover:scale-105 ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                                >
                                  <div className="font-bold truncate">{apt.customerName}</div>
                                  <div className="opacity-80 truncate">{apt.service}</div>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Month Calendar Grid */
              <div className="bg-[var(--color-surface)] border border-[var(--color-bg-alt)] rounded-2xl p-6 shadow-sm">
                <h3 className="text-md font-semibold text-[var(--color-ink)] mb-4 text-center">Julio 2026</h3>
                <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-[var(--color-ink-muted)] mb-2">
                  <div>Dom</div><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 31 }).map((_, i) => {
                    const dayNum = i + 1;
                    const dateStr = `2026-07-${dayNum.toString().padStart(2, '0')}`;
                    const count = appointments.filter((a) => a.date === dateStr).length;
                    return (
                      <div
                        key={dayNum}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          count > 0 ? 'bg-purple-50 border-purple-200 text-purple-900 font-bold' : 'bg-gray-50 border-gray-100 text-gray-400'
                        }`}
                      >
                        <div className="text-sm">{dayNum}</div>
                        {count > 0 && <div className="text-[10px] text-purple-600 mt-1">{count} turnos</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 3: CLIENTES */}
        {activeTab === 'customers' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <div className="relative w-full sm:w-80">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-ink-muted)]" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Buscar clienta por nombre o teléfono..."
                  className="pl-9 pr-4 py-2.5 rounded-xl border border-[var(--color-bg-alt)] bg-[var(--color-surface)] text-sm w-full focus:outline-none focus:border-[var(--color-ink)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(filteredCustomers.length > 0 ? filteredCustomers : [
                { id: '1', name: 'Valentina López', phone: '+54 9 11 4444-5555', email: 'valentina@gmail.com', _count: { appointments: 5 }, notes: 'Prefiere tonos rosados' },
                { id: '2', name: 'Camila Rodríguez', phone: '+54 9 11 3333-4444', email: 'camila@hotmail.com', _count: { appointments: 3 }, notes: 'Alérgica a la lavanda' },
                { id: '3', name: 'Martina García', phone: '+54 9 11 2222-3333', email: 'martina@outlook.com', _count: { appointments: 8 }, notes: 'Clienta VIP frecuente' },
              ]).map((c) => (
                <div key={c.id} className="bg-[var(--color-surface)] border border-[var(--color-bg-alt)] p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                      {c.name ? c.name.substring(0, 2).toUpperCase() : 'CL'}
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-100">
                      {c._count?.appointments || 1} Visitas
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg text-[var(--color-ink)] mb-1">{c.name}</h3>
                  <p className="text-xs text-[var(--color-ink-muted)] flex items-center gap-1.5 mb-1">
                    <Phone className="w-3.5 h-3.5" /> {c.phone || 'Sin teléfono'}
                  </p>
                  {c.email && (
                    <p className="text-xs text-[var(--color-ink-muted)] flex items-center gap-1.5 mb-3">
                      <Envelope className="w-3.5 h-3.5" /> {c.email}
                    </p>
                  )}
                  {c.notes && (
                    <div className="bg-amber-50/60 text-amber-900 border border-amber-100 p-2.5 rounded-xl text-xs mt-2">
                      💡 <strong>Nota:</strong> {c.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* TAB 4: SERVICIOS */}
        {activeTab === 'services' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[var(--color-ink)]">Menú de Servicios</h2>
              <button
                onClick={() => handleOpenServiceModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[var(--color-ink)] rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> Agregar Servicio
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {servicesList.map((srv) => (
                <div key={srv.id} className="bg-[var(--color-surface)] border border-[var(--color-bg-alt)] rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
                  <div>
                    {srv.imageUrl && (
                      <div className="h-40 overflow-hidden relative">
                        <img src={srv.imageUrl} alt={srv.name} className="w-full h-full object-cover" />
                        <span className="absolute top-3 right-3 text-xs font-bold px-2.5 py-1 bg-white/90 backdrop-blur-md text-[var(--color-ink)] rounded-full uppercase">
                          {srv.category}
                        </span>
                      </div>
                    )}
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-[var(--color-ink)] mb-1">{srv.name}</h3>
                      <p className="text-xs text-[var(--color-ink-muted)] mb-4 line-clamp-2">{srv.description}</p>
                      <div className="flex items-center justify-between text-sm font-semibold">
                        <span className="text-emerald-600">{formatPrice(srv.price)}</span>
                        <span className="text-[var(--color-ink-muted)] flex items-center gap-1 text-xs">
                          <Clock className="w-3.5 h-3.5" /> {srv.duration} min
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t border-[var(--color-bg-alt)] bg-gray-50/50 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenServiceModal(srv)}
                      className="p-2 text-[var(--color-ink-muted)] hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Editar Servicio"
                    >
                      <PencilSimple className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteService(srv.id)}
                      className="p-2 text-[var(--color-ink-muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Desactivar"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* TAB 5: ESTADÍSTICAS */}
        {activeTab === 'analytics' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-[var(--color-surface)] border border-[var(--color-bg-alt)] p-6 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[var(--color-ink-muted)]">Comparativa vs Mes Anterior</span>
                  <TrendUp className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-emerald-600">+{financialData?.revenueGrowthPct || 15}%</p>
                <p className="text-xs text-[var(--color-ink-muted)] mt-1">
                  Ingreso mes anterior: {formatPrice(financialData?.revenuePrevMonth || 1100000)}
                </p>
              </div>

              <div className="bg-[var(--color-surface)] border border-[var(--color-bg-alt)] p-6 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[var(--color-ink-muted)]">Ticket Promedio</span>
                  <CurrencyDollar className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-[var(--color-ink)]">
                  {formatPrice(financialData?.averageTicket || 27300)}
                </p>
                <p className="text-xs text-[var(--color-ink-muted)] mt-1">Por cada clienta que visita el salón</p>
              </div>

              <div className="bg-[var(--color-surface)] border border-[var(--color-bg-alt)] p-6 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[var(--color-ink-muted)]">Tasa de Cancelación</span>
                  <X className="w-4 h-4 text-red-500" />
                </div>
                <p className="text-2xl font-bold text-red-500">{financialData?.cancellationRate || 4}%</p>
                <p className="text-xs text-[var(--color-ink-muted)] mt-1">Solo {financialData?.cancelledMonth || 2} turnos cancelados</p>
              </div>
            </div>

            {/* Weekly Revenue Bar Chart */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-bg-alt)] p-6 rounded-2xl shadow-sm mb-8">
              <h3 className="text-lg font-semibold text-[var(--color-ink)] mb-6">Ingresos Semanales (Mes Actual)</h3>
              <div className="flex items-end gap-6 h-48 border-b border-gray-200 pb-2 px-4">
                {(financialData?.weeklyRevenue || [
                  { week: 'Sem 1', revenue: 280000 },
                  { week: 'Sem 2', revenue: 350000 },
                  { week: 'Sem 3', revenue: 320000 },
                  { week: 'Sem 4', revenue: 335000 },
                ]).map((w: any) => (
                  <div key={w.week} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-xs font-semibold text-emerald-600">{formatPrice(w.revenue)}</span>
                    <div className="w-full bg-emerald-400 rounded-t-xl transition-all hover:bg-emerald-500" style={{ height: `${(w.revenue / 400000) * 100}%` }} />
                    <span className="text-xs text-[var(--color-ink-muted)] font-medium">{w.week}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Services Ranking */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-bg-alt)] p-6 rounded-2xl shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--color-ink)] mb-4">Servicios Más Pedidos</h3>
              <div className="space-y-4">
                {(financialData?.topServices || [
                  { name: 'Uñas Gel Luxury', count: 18, revenue: 504000 },
                  { name: 'Facial Glow', count: 12, revenue: 420000 },
                  { name: 'Corte Signature', count: 10, revenue: 250000 },
                ]).map((srv: any, i: number) => (
                  <div key={srv.name} className="flex items-center justify-between border-b border-[var(--color-bg-alt)] pb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">
                        #{i + 1}
                      </span>
                      <span className="text-sm font-semibold text-[var(--color-ink)]">{srv.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-600">{formatPrice(srv.revenue)}</div>
                      <div className="text-xs text-[var(--color-ink-muted)]">{srv.count} turnos</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* MODAL: Service Create / Edit */}
        {showServiceModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--color-surface)] border border-[var(--color-bg-alt)] rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--color-ink)]">
                  {editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
                </h3>
                <button onClick={() => setShowServiceModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveService} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-ink-muted)] mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-ink-muted)] mb-1">Descripción</label>
                  <textarea
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm h-20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-ink-muted)] mb-1">Precio ($)</label>
                    <input
                      type="number"
                      required
                      value={serviceForm.price}
                      onChange={(e) => setServiceForm({ ...serviceForm, price: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-ink-muted)] mb-1">Duración (min)</label>
                    <input
                      type="number"
                      required
                      value={serviceForm.duration}
                      onChange={(e) => setServiceForm({ ...serviceForm, duration: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-xl text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-ink-muted)] mb-1">Categoría</label>
                  <select
                    value={serviceForm.category}
                    onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
                  >
                    <option value="cabello">Cabello</option>
                    <option value="unas">Uñas</option>
                    <option value="facial">Facial</option>
                    <option value="tratamientos">Tratamientos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-ink-muted)] mb-1">URL de Imagen</label>
                  <input
                    type="url"
                    value={serviceForm.imageUrl}
                    onChange={(e) => setServiceForm({ ...serviceForm, imageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowServiceModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-[var(--color-ink)] rounded-xl hover:bg-gray-800"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Appointment Details */}
        {selectedAppointment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--color-surface)] border border-[var(--color-bg-alt)] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-bold text-[var(--color-ink)]">Detalle del Turno</h3>
                <button onClick={() => setSelectedAppointment(null)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-gray-500">Cliente:</span>
                  <div className="font-semibold text-gray-900">{selectedAppointment.customerName}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Servicio:</span>
                  <div className="font-semibold text-purple-700">{selectedAppointment.service}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Fecha y Hora:</span>
                  <div className="font-medium text-gray-800">{selectedAppointment.date} a las {selectedAppointment.time}hs</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Monto:</span>
                  <div className="font-bold text-emerald-600">{formatPrice(selectedAppointment.price)}</div>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="px-4 py-2 text-xs font-semibold bg-gray-100 rounded-xl"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
