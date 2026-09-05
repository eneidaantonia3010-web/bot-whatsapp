'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  CalendarBlank,
  Users,
  TrendUp,
  Sparkle,
  CaretLeft,
  CaretRight,
  SignOut,
  ChartBar,
  Scissors,
  Phone,
  QrCode,
} from '@phosphor-icons/react';
import { API_URL } from '@/lib/constants';

interface AdminSidebarProps {
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  activeTab: 'dashboard' | 'calendar' | 'customers' | 'services' | 'analytics';
  setActiveTab: (tab: 'dashboard' | 'calendar' | 'customers' | 'services' | 'analytics') => void;
  waStatus: any;
  currentUser: any;
  handleLogout: () => void;
  t: (key: string) => string;
}

export function AdminSidebar({
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  activeTab,
  setActiveTab,
  waStatus,
  currentUser,
  handleLogout,
  t,
}: AdminSidebarProps) {
  return (
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
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-pink-400' : 'text-slate-400'
                  }`}
                />
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
              className={`w-3 h-3 rounded-full ${
                waStatus?.state === 'open'
                  ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse'
                  : 'bg-rose-500 animate-bounce'
              }`}
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
  );
}
