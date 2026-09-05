'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, UserPlus, Trash, X } from '@phosphor-icons/react';

interface UsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  usersList: any[];
  newUserEmail: string;
  setNewUserEmail: (val: string) => void;
  newUserName: string;
  setNewUserName: (val: string) => void;
  newUserPassword: string;
  setNewUserPassword: (val: string) => void;
  newUserRole: 'ADMIN' | 'STAFF';
  setNewUserRole: (val: 'ADMIN' | 'STAFF') => void;
  userActionError: string | null;
  onCreateUser: (e: React.FormEvent) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
}

export function UsersModal({
  isOpen,
  onClose,
  usersList,
  newUserEmail,
  setNewUserEmail,
  newUserName,
  setNewUserName,
  newUserPassword,
  setNewUserPassword,
  newUserRole,
  setNewUserRole,
  userActionError,
  onCreateUser,
  onDeleteUser,
}: UsersModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-xl dark-glass-panel rounded-3xl p-6 border border-white/10 space-y-6 z-10"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" /> Gestión del Equipo & Accesos
              </h3>
              <button
                onClick={onClose}
                className="p-1 rounded-xl hover:bg-white/10 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Create User Form */}
            <form
              onSubmit={onCreateUser}
              className="space-y-3 bg-white/[0.02] p-4 rounded-2xl border border-white/5 text-xs"
            >
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
              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-md"
              >
                Crear Usuario
              </button>
            </form>

            {/* Active Users List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Usuarios Activos</h4>
              {usersList.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-xs"
                >
                  <div>
                    <p className="font-semibold text-white">{u.email}</p>
                    <p className="text-[10px] text-slate-400">
                      {u.name || 'Sin nombre'} • Rol: {u.role}
                    </p>
                  </div>
                  {u.email !== 'admin@glowstudio.com' && (
                    <button
                      onClick={() => onDeleteUser(u.id)}
                      className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                    >
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
  );
}
