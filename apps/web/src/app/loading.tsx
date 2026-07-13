'use client';

import { Sparkle } from '@phosphor-icons/react';

export default function Loading() {
  return (
    <div className="min-h-[100svh] bg-[var(--color-bg)] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--color-bg-alt)] flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Sparkle weight="fill" className="w-8 h-8 text-[var(--color-accent)]" />
        </div>
        <p className="text-[var(--color-ink-muted)] text-sm font-medium">Cargando...</p>
      </div>
    </div>
  );
}
