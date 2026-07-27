'use client';

import { motion } from 'motion/react';
import Image from 'next/image';
import { ArrowDown, ArrowRight, Sparkle } from '@phosphor-icons/react';
import { useTranslation } from '@/i18n/I18nContext';

export function Hero() {
  const { t } = useTranslation();

  return (
    <section id="inicio" className="relative min-h-[90vh] flex items-center pt-28 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
      {/* Ambient Glow Backgrounds */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="glow-blob bg-[#df006e]/20 w-[500px] h-[500px] top-[-100px] left-[-200px]" />
        <div className="glow-blob bg-[#9d4edd]/20 w-[600px] h-[600px] bottom-[-200px] right-[-200px]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full">
        {/* Text Content */}
        <div className="lg:col-span-6 flex flex-col items-start gap-6 z-10">
          <div className="glass-panel px-4 py-2 rounded-full border border-[#ffb1c5]/30 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ffb1c5] animate-pulse" />
            <span className="text-xs font-semibold text-[#ffb1c5] uppercase tracking-wider">
              {t('hero.badge')}
            </span>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight font-display tracking-tight"
          >
            {t('hero.titleLine1')}{' '}
            <span className="text-gradient italic font-normal">{t('hero.titleHighlight')}</span>
          </motion.h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed">
            {t('hero.description')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full sm:w-auto">
            <a
              href="#reservar"
              className="btn-gradient px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest text-center flex justify-center items-center gap-2 shadow-lg hover:shadow-pink-500/25 transition-all"
            >
              {t('hero.ctaPrimary')}
              <ArrowRight weight="bold" className="w-4 h-4" />
            </a>
            <a
              href="#servicios"
              className="glass-panel hover:bg-white/10 transition-colors px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest text-white text-center flex justify-center items-center border border-white/20"
            >
              {t('hero.ctaSecondary')}
            </a>
          </div>
        </div>

        {/* Image Frame (Arch Shaped Glass Panel) */}
        <div className="lg:col-span-6 relative mt-12 lg:mt-0">
          <div className="relative w-full aspect-[4/5] max-w-md mx-auto lg:max-w-none rounded-t-full rounded-b-3xl overflow-hidden glass-panel p-2">
            <div className="absolute inset-0 rounded-t-full rounded-b-3xl border border-[#ffb1c5]/20 m-4 z-10 pointer-events-none" />
            <div className="relative w-full h-full rounded-t-full rounded-b-[20px] overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1000&q=80"
                alt="Glow Studio interior"
                fill
                priority
                className="object-cover grayscale-[10%] hover:grayscale-0 transition-all duration-700 hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>

          {/* Rating Floating Element */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="absolute -bottom-6 -left-4 glass-panel p-4 rounded-2xl flex items-center gap-4 border border-white/10 z-20 shadow-2xl"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center shrink-0">
              <Sparkle weight="fill" className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-white m-0 leading-tight">4.9/5 ★</p>
              <p className="text-xs text-slate-400 m-0 font-medium">Top Rated VIP Salon</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
