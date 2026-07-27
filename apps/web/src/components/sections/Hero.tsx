'use client';

import { motion } from 'motion/react';
import Image from 'next/image';
import { ArrowDown, ArrowRight, Sparkle } from '@phosphor-icons/react';
import { useTranslation } from '@/i18n/I18nContext';

export function Hero() {
  const { t } = useTranslation();

  return (
    <section id="inicio" className="relative min-h-[100svh] pt-32 pb-20 overflow-hidden flex items-center">
      {/* Background elements */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[var(--color-accent)] opacity-[0.03] rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      
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
              {t('hero.badge')}
            </span>
          </motion.div>

          {/* Heading with Bodoni Moda Editorial typography */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="font-display font-bold text-[var(--color-ink)] leading-[1.05] tracking-tight mb-8"
            style={{ 
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.75rem, 5.5vw + 1rem, 5.5rem)'
            }}
          >
            {t('hero.titleLine1')}<br />
            <span className="glow-pink-text italic font-normal tracking-normal">{t('hero.titleHighlight')}</span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
            className="text-base sm:text-lg text-[var(--color-ink-light)] max-w-lg mb-10 leading-relaxed"
          >
            {t('hero.description')}
          </motion.p>

          {/* CTA Buttons with Flex Wrap */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
            className="flex flex-wrap items-center gap-4 w-full sm:w-auto"
          >
            <a
              href="#reservar"
              className="double-bezel w-full sm:w-auto group shrink-0"
            >
              <div className="double-bezel-inner bg-[var(--color-ink)] text-[var(--color-white)] px-8 py-4 text-sm font-medium hover:bg-[var(--color-ink-light)] transition-colors duration-300 flex items-center justify-center gap-2 w-full sm:w-auto whitespace-nowrap">
                {t('hero.ctaPrimary')}
                <ArrowRight weight="bold" className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </a>
            <a
              href="#servicios"
              className="px-8 py-4 text-[var(--color-ink)] font-medium rounded-full text-sm hover:bg-[var(--color-ink)]/5 transition-all w-full sm:w-auto text-center border border-black/10 whitespace-nowrap"
            >
              {t('hero.ctaSecondary')}
            </a>
          </motion.div>
        </div>

        {/* Right Column - Image Cascade / Float */}
        <motion.div 
          initial={{ opacity: 0, x: 40, rotate: 2 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 relative min-h-[420px] sm:min-h-[500px] lg:min-h-[650px] w-full"
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
            <div className="absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] rounded-[var(--radius-2xl)] pointer-events-none" />
          </div>

          {/* Accent Graphic / Secondary Card */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="absolute -bottom-6 -left-6 bg-[var(--color-surface)] p-5 rounded-2xl shadow-[var(--shadow-lifted)] border border-[var(--color-bg-alt)] z-20 hidden md:flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--color-bg-alt)] flex items-center justify-center shrink-0">
              <Sparkle weight="fill" className="w-6 h-6 text-[var(--color-accent)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-ink)]">Glow Studio</p>
              <p className="text-xs text-[var(--color-ink-muted)]">Atención personalizada VIP</p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 hidden md:block"
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
