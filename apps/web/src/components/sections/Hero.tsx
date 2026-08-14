'use client';

import { motion } from 'motion/react';
import Image from 'next/image';
import { useTranslation } from '@/i18n/I18nContext';

export function Hero() {
  const { t } = useTranslation();

  return (
    <section id="inicio" className="relative min-h-[100dvh] flex items-center pt-24 md:pt-32 pb-12 md:pb-section-gap px-margin-mobile md:px-gutter max-w-container-max mx-auto overflow-hidden lg:overflow-visible">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center w-full">
        {/* Text Content */}
        <div className="lg:col-span-6 flex flex-col items-start gap-6 md:gap-10 z-10 order-2 lg:order-1">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="glass-panel px-4 md:px-6 py-2 md:py-2.5 rounded-full border border-secondary/30 flex items-center gap-2 md:gap-3"
          >
            <span className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full bg-secondary animate-pulse"></span>
            <span className="font-label-md text-[12px] md:text-label-md text-secondary uppercase tracking-[0.2em]">
              {t('hero.badge')}
            </span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-display-lg-mobile lg:font-display-lg text-display-lg-mobile lg:text-display-lg text-on-surface leading-[1.1]"
          >
            {t('hero.titleLine1')} <span className="text-gradient italic">{t('hero.titleHighlight')}</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl leading-relaxed"
          >
            {t('hero.description')}
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 md:gap-6 mt-4 md:mt-6 w-full sm:w-auto"
          >
            <a className="btn-gradient px-8 md:px-12 py-4 md:py-5 rounded-full font-label-md text-label-md text-center flex justify-center items-center gap-3 group" href="#reservar">
              {t('hero.ctaPrimary')}
              <span className="material-symbols-outlined text-lg group-hover:translate-x-2 transition-transform">arrow_forward</span>
            </a>
            <a className="glass-panel hover:bg-white/10 transition-all px-8 md:px-12 py-4 md:py-5 rounded-full font-label-md text-label-md text-on-surface text-center flex justify-center items-center uppercase" href="#servicios">
              {t('hero.ctaSecondary')}
            </a>
          </motion.div>
        </div>

        {/* Image Frame */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="lg:col-span-6 relative mt-8 lg:mt-0 order-1 lg:order-2" 
          id="hero-image-container"
        >
          <div className="hero-parallax relative w-full aspect-[4/5] arched-frame overflow-hidden glass-panel p-2 md:p-3">
            <div className="absolute inset-0 arched-frame border-2 border-secondary/20 m-4 md:m-6 z-10 pointer-events-none"></div>
            <img 
              alt="Luxury Salon Interior" 
              className="w-full h-full object-cover arched-frame grayscale-[10%] hover:grayscale-0 transition-all duration-1000 scale-105 hover:scale-100" 
              src="/images/hero-bg.jpg"
            />
          </div>

          {/* Floating Stats */}
          <div className="absolute -bottom-6 md:-bottom-10 -left-4 md:-left-10 glass-panel p-4 md:p-8 rounded-2xl md:rounded-3xl flex items-center gap-4 md:gap-6 animate-bounce hover:scale-110 transition-transform cursor-pointer shadow-2xl" style={{ animationDuration: '4s' }}>
            <div className="w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-full bg-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xl md:text-3xl">star</span>
            </div>
            <div>
              <p className="font-display-lg text-[24px] md:text-headline-lg text-on-surface m-0 leading-none">4.9/5</p>
              <p className="font-label-md text-[10px] md:text-label-md text-on-surface-variant m-0 mt-1 uppercase tracking-widest">Top Rated Salon</p>
            </div>
          </div>

          {/* Floating Badge */}
          <div className="absolute top-10 md:top-20 right-0 md:right-4 z-20 glass-panel py-2 md:py-3 px-4 md:px-6 rounded-full border-secondary/40 backdrop-blur-3xl animate-pulse">
            <p className="text-secondary font-label-md text-[11px] md:text-label-md tracking-widest">+10k Clientes Felices</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
