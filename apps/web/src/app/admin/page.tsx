'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { useRealtimeAppointments } from '@/hooks/useRealtimeAppointments';
import {
  DashboardTab,
  CalendarTab,
  CustomersTab,
  ServicesTab,
  AnalyticsTab,
} from '@/components/admin/tabs';
import {
  AppointmentDrawer,
  ServiceModal,
  BlockedTimeModal,
  WaitlistModal,
  UsersModal,
} from '@/components/admin/modals';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';


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
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'>('ALL');
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

  const fetchAdminData = useCallback(async () => {
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

      await fetchAdminData();
    }

    initAdmin();
  }, [router, fetchAdminData]);

  // Realtime Live Event Listener (Server-Sent Events) with auto re-fetch on reconnect
  useRealtimeAppointments(
    (event) => {
      if (event.type === 'APPOINTMENT_CREATED') {
        const apt = event.payload;
        if (apt) {
          const newApt: MockAppointment = {
            id: apt.id,
            customerName: apt.customer?.name || 'Cliente',
            customerPhone: apt.customer?.phone || '',
            service: apt.service?.name || 'Servicio',
            category: apt.service?.category || 'cabello',
            date: apt.date ? apt.date.split('T')[0] : '',
            time: apt.date
              ? new Date(apt.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
              : '',
            status: apt.status || 'PENDING',
            source: apt.source || 'WEB',
            price: apt.service?.price || 0,
          };
          setAppointments((prev) => [newApt, ...prev.filter((p) => p.id !== apt.id)]);
          addToast(
            'success',
            '✨ Nueva Reserva en Vivo',
            `${newApt.customerName} reservó ${newApt.service} para las ${newApt.time}hs.`
          );
        }
      } else if (event.type === 'APPOINTMENT_CANCELLED') {
        const apt = event.payload;
        if (apt) {
          setAppointments((prev) =>
            prev.map((p) => (p.id === apt.id ? { ...p, status: 'CANCELLED' } : p))
          );
          addToast('info', 'Turno Cancelado', 'Un turno ha sido cancelado y su horario liberado.');
        }
      } else if (event.type === 'APPOINTMENT_RESCHEDULED' || event.type === 'APPOINTMENT_CONFIRMED') {
        const apt = event.payload;
        if (apt) {
          setAppointments((prev) =>
            prev.map((p) => (p.id === apt.id ? { ...p, status: apt.status, date: apt.date?.split('T')[0] || p.date } : p))
          );
          addToast('success', 'Turno Actualizado', 'La agenda se actualizó en tiempo real.');
        }
      }
    },
    fetchAdminData
  );

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
      const labelMap: Record<MockAppointment['status'], string> = {
        CONFIRMED: 'Confirmado',
        COMPLETED: 'Completado',
        CANCELLED: 'Cancelado',
        PENDING: 'Pendiente',
        NO_SHOW: 'No Asistió (Ausente)',
      };
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
        <AdminSidebar
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          waStatus={waStatus}
          currentUser={currentUser}
          handleLogout={handleLogout}
          t={t}
        />

        {/* ==================================================== */}
        {/* 2. CONTENIDO PRINCIPAL Y HEADER */}
        {/* ==================================================== */}
        <main
          className={`flex-1 transition-all duration-300 p-6 md:p-8 ${
            isSidebarCollapsed ? 'ml-24' : 'ml-72'
          }`}
        >
          {/* Top Floating Glass Header */}
          <AdminHeader
            activeTab={activeTab}
            currentTime={currentTime}
            language={language}
            setLanguage={setLanguage}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            currentUser={currentUser}
            handleOpenUsersModal={handleOpenUsersModal}
            getExportAppointmentsUrl={getExportAppointmentsUrl}
            getExportCustomersUrl={getExportCustomersUrl}
          />

          {/* ==================================================== */}
          {/* MODULAR ADMIN TABS */}
          {/* ==================================================== */}
          {activeTab === 'dashboard' && (
            <DashboardTab
              metricsData={metricsData}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              filteredAppointments={filteredAppointments}
              setSelectedAppointment={setSelectedAppointment}
              handleStatusChange={handleStatusChange}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarTab
              weekOffset={weekOffset}
              setWeekOffset={setWeekOffset}
              calendarView={calendarView}
              setCalendarView={setCalendarView}
              getWeekDays={getWeekDays}
              appointments={appointments}
              blockedTimes={blockedTimes}
              waitlist={waitlist}
              setShowBlockModal={setShowBlockModal}
              setShowWaitlistModal={setShowWaitlistModal}
              handleDeleteBlockedTime={handleDeleteBlockedTime}
              setSelectedAppointment={setSelectedAppointment}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersTab
              customerSearch={customerSearch}
              setCustomerSearch={setCustomerSearch}
              customersList={customersList}
              setSelectedCustomer={setSelectedCustomer}
            />
          )}

          {activeTab === 'services' && (
            <ServicesTab
              servicesList={servicesList}
              handleOpenNewService={handleOpenNewService}
              handleToggleServiceActive={handleToggleServiceActive}
              setEditingService={setEditingService}
              setServiceForm={setServiceForm}
              setShowServiceModal={setShowServiceModal}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab financialData={financialData} />
          )}

        </main>
      </div>

      {/* ==================================================== */}
      {/* 3. QUICK DRAWER (PANEL DESLIZABLE DE TURNO) */}
      {/* ==================================================== */}
      <AppointmentDrawer
        selectedAppointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onStatusChange={handleStatusChange}
        formatPrice={formatPrice}
      />

      {/* ==================================================== */}
      {/* 4. MODAL CREAR / EDITAR SERVICIO */}
      {/* ==================================================== */}
      <ServiceModal
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        serviceForm={serviceForm}
        setServiceForm={setServiceForm}
        editingService={editingService}
        onSave={handleSaveService}
      />

      {/* ==================================================== */}
      {/* 5. MODAL GESTIÓN DE USUARIOS / EQUIPO */}
      {/* ==================================================== */}
      <UsersModal
        isOpen={showUsersModal}
        onClose={() => setShowUsersModal(false)}
        usersList={usersList}
        newUserEmail={newUserEmail}
        setNewUserEmail={setNewUserEmail}
        newUserName={newUserName}
        setNewUserName={setNewUserName}
        newUserPassword={newUserPassword}
        setNewUserPassword={setNewUserPassword}
        newUserRole={newUserRole}
        setNewUserRole={setNewUserRole}
        userActionError={userActionError}
        onCreateUser={handleCreateUser}
        onDeleteUser={handleDeleteUser}
      />

      {/* ==================================================== */}
      {/* 6. MODAL BLOQUEAR HORARIOS / FERIADOS */}
      {/* ==================================================== */}
      <BlockedTimeModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        blockForm={blockForm}
        setBlockForm={setBlockForm}
        onCreateBlockedTime={handleCreateBlockedTime}
      />

      {/* ==================================================== */}
      {/* 7. MODAL LISTA DE ESPERA INTELIGENTE */}
      {/* ==================================================== */}
      <WaitlistModal
        isOpen={showWaitlistModal}
        onClose={() => setShowWaitlistModal(false)}
        waitlist={waitlist}
        onDeleteWaitlist={handleDeleteWaitlist}
      />

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
