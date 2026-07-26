'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Lock, EnvelopeSimple, Eye, EyeSlash, Sparkle, WarningCircle, CircleNotch } from '@phosphor-icons/react';
import { loginUser } from '@/lib/api';
import { setToken } from '@/lib/auth';

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor ingresá tu email y contraseña.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await loginUser({ email, password });
      setToken(res.token);
      router.push('/admin');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Error al iniciar sesión. Verificá tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100svh] bg-[var(--color-bg)] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[var(--color-bg-alt)] rounded-full blur-3xl opacity-50 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-bg-alt)] p-8 rounded-[var(--radius-xl)] shadow-2xl relative z-10"
      >
        {/* Header Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-bg-alt)] mb-3 text-[var(--color-ink)]">
            <Sparkle className="w-6 h-6" />
          </div>
          <h1
            className="text-2xl md:text-3xl font-semibold text-[var(--color-ink)] tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Glow Studio
          </h1>
          <p className="text-[var(--color-ink-muted)] text-sm mt-1">
            Acceso al Panel Administrativo
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 rounded-[var(--radius-md)] bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-sm"
          >
            <WarningCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink)] uppercase tracking-wider mb-2">
              Correo Electrónico
            </label>
            <div className="relative">
              <EnvelopeSimple className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@glowstudio.com"
                required
                className="w-full pl-11 pr-4 py-3 bg-[var(--color-bg)] border border-[var(--color-bg-alt)] rounded-[var(--radius-md)] text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-ink)] transition-colors placeholder:text-[var(--color-ink-muted)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink)] uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-11 pr-11 py-3 bg-[var(--color-bg)] border border-[var(--color-bg-alt)] rounded-[var(--radius-md)] text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-ink)] transition-colors placeholder:text-[var(--color-ink-muted)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
              >
                {showPassword ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-[var(--color-ink)] text-[var(--color-surface)] font-medium text-sm rounded-[var(--radius-md)] hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <>
                <CircleNotch className="w-5 h-5 animate-spin" />
                <span>Ingresando...</span>
              </>
            ) : (
              <span>Ingresar al Sistema</span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-[var(--color-ink-muted)]">
          Glow Studio by Sofia &copy; {new Date().getFullYear()} — Todos los derechos reservados.
        </div>
      </motion.div>
    </div>
  );
}
