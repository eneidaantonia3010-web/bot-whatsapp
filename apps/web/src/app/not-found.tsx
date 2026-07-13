'use client';

import Link from 'next/link';
import { Sparkle, ArrowLeft } from '@phosphor-icons/react';

export default function NotFound() {
  return (
    <div className="min-h-[100svh] bg-[var(--color-bg)] flex items-center justify-center px-6">
      <div className="text-center max-w-md relative z-10">
        {/* Animated 404 */}
        <div className="relative mb-8">
          <span 
            className="text-[10rem] md:text-[12rem] font-bold text-[var(--color-bg-alt)] leading-none select-none"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-[var(--color-surface)] shadow-[var(--shadow-soft)] flex items-center justify-center border border-[var(--color-bg-alt)]">
              <Sparkle weight="fill" className="w-10 h-10 text-[var(--color-accent)]" />
            </div>
          </div>
        </div>

        <h1 
          className="text-3xl md:text-4xl font-semibold text-[var(--color-ink)] mb-4 tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Página no encontrada
        </h1>

        <p className="text-[var(--color-ink-muted)] mb-10 leading-relaxed text-lg">
          Parece que esta página se fue a un tratamiento de spa y todavía no volvió. 
          Mientras tanto, ¿qué tal si volvés al inicio?
        </p>

        <Link
          href="/"
          className="double-bezel inline-block group"
        >
          <div className="double-bezel-inner bg-[var(--color-ink)] text-[var(--color-white)] px-8 py-4 text-sm font-medium hover:bg-[var(--color-ink-light)] transition-colors duration-300 flex items-center justify-center gap-2">
            <ArrowLeft weight="bold" className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Volver al Inicio
          </div>
        </Link>
      </div>
    </div>
  );
}
