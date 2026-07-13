'use client';

import { motion } from 'motion/react';
import Image from 'next/image';
import { ArrowDown, ArrowRight, Sparkle } from '@phosphor-icons/react';
import { SALON } from '@/lib/constants';

export function Hero() {
  return (
    <section id="inicio" className="relative min-h-[100svh] pt-32 pb-20 overflow-hidden flex items-center">
      {/* Background elements */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[var(--color-accent)] opacity-[0.03] rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
      
      <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10">
        
        {/* Left Column - Editorial Text */}
        <div className="lg:col-span-6 flex flex-col items-start text-left">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--color-ink-muted)]/20 bg-[var(--color-surface)] shadow-[var(--shadow-soft)] mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
            <span className="text-xs font-semibold text-[var(--color-ink-muted)] tracking-[0.2em] uppercase">
              {SALON.slogan}
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-[3.5rem] md:text-[5rem] lg:text-[5.5rem] font-semibold text-[var(--color-ink)] leading-[0.95] tracking-tight mb-8"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Donde tu<br />
            <span className="text-[var(--color-ink-muted)] italic font-light">belleza brilla</span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
            className="text-lg text-[var(--color-ink-light)] max-w-md mb-12 leading-relaxed"
          >
            {SALON.heroSubtext}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
            className="flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto"
          >
            <a
              href="#reservar"
              className="double-bezel w-full sm:w-auto group"
            >
              <div className="double-bezel-inner bg-[var(--color-ink)] text-[var(--color-white)] px-8 py-4 text-sm font-medium hover:bg-[var(--color-ink-light)] transition-colors duration-300 flex items-center justify-center gap-2 w-full sm:w-auto">
                Reservar Ahora
                <ArrowRight weight="bold" className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </a>
            <a
              href="#servicios"
              className="px-8 py-4 text-[var(--color-ink)] font-medium rounded-full text-sm hover:bg-[var(--color-ink)]/5 transition-all w-full sm:w-auto text-center"
            >
              Ver Servicios
            </a>
          </motion.div>
        </div>

        {/* Right Column - Image Cascade / Float */}
        <motion.div 
          initial={{ opacity: 0, x: 40, rotate: 2 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 relative h-[500px] lg:h-[700px] w-full"
        >
          {/* Main Floating Image */}
          <div className="absolute inset-0 rounded-[var(--radius-2xl)] overflow-hidden shadow-[var(--shadow-lifted)] border border-[var(--color-bg-alt)] z-10">
            <Image
              src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1000&q=80"
              alt="Glow Studio interior"
              fill
              priority
              className="object-cover scale-105 hover:scale-100 transition-transform duration-[2s] ease-out"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            {/* Soft inner shadow for depth */}
            <div className="absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] rounded-[var(--radius-2xl)] pointer-events-none" />
          </div>

          {/* Accent Graphic / Secondary Card (creates spatial rhythm) */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="absolute -bottom-8 -left-8 bg-[var(--color-surface)] p-5 rounded-2xl shadow-[var(--shadow-lifted)] border border-[var(--color-bg-alt)] z-20 hidden md:flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--color-bg-alt)] flex items-center justify-center">
              <Sparkle weight="fill" className="w-6 h-6 text-[var(--color-accent)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-ink)]">Atención Premium</p>
              <p className="text-xs text-[var(--color-ink-muted)]">Cuidamos cada detalle</p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 hidden md:block"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ArrowDown weight="bold" className="w-5 h-5 text-[var(--color-ink-muted)]" />
        </motion.div>
      </motion.div>
    </section>
  );
}
