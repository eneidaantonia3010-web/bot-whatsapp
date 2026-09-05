'use client';

import React from 'react';
import {
  Clock,
  MagnifyingGlass,
  Users,
  Download,
} from '@phosphor-icons/react';

interface AdminHeaderProps {
  activeTab: 'dashboard' | 'calendar' | 'customers' | 'services' | 'analytics';
  currentTime: string;
  language: string;
  setLanguage: (lang: any) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  currentUser: any;
  handleOpenUsersModal: () => void;
  getExportAppointmentsUrl: () => string;
  getExportCustomersUrl: () => string;
}

export function AdminHeader({
  activeTab,
  currentTime,
  language,
  setLanguage,
  searchTerm,
  setSearchTerm,
  currentUser,
  handleOpenUsersModal,
  getExportAppointmentsUrl,
  getExportCustomersUrl,
}: AdminHeaderProps) {
  return (
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
  );
}
