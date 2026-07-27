'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { List, X, Sparkle, Globe } from '@phosphor-icons/react';
import { SALON } from '@/lib/constants';
import { useTranslation } from '@/i18n/I18nContext';

export function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { language, setLanguage, t } = useTranslation();

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { href: '#inicio', label: t('header.navHome') },
    { href: '#servicios', label: t('header.navServices') },
    { href: '#reservar', label: t('header.navCalendar') },
    { href: '#galeria', label: t('header.navGallery') },
    { href: '#testimonios', label: t('header.navTestimonials') },
    { href: '#equipo', label: t('header.navTeam') },
  ];

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:pt-6 pointer-events-none flex justify-center"
    >
      {/* Fluid Island Navbar - Luxury Dark Glassmorphism */}
      <div 
        className={`pointer-events-auto transition-all duration-500 w-full md:w-auto ${
          scrolled
            ? 'bg-[#12121A]/90 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
            : 'bg-[#12121A]/70 backdrop-blur-lg border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.3)]'
        } rounded-2xl md:rounded-[var(--radius-full)] px-4 py-3 md:px-6 md:py-3 flex flex-wrap items-center justify-between gap-4 md:gap-8 max-w-full`}
      >
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 p-[1px] shadow-lg shadow-pink-500/20">
            <div className="w-full h-full bg-[#0F0F16] rounded-full flex items-center justify-center">
              <Sparkle weight="fill" className="w-4 h-4 text-pink-400 group-hover:rotate-180 transition-transform duration-500" />
            </div>
          </div>
          <span className="font-semibold tracking-tight text-white text-base font-display whitespace-nowrap">
            {SALON.name}
          </span>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 flex-wrap">
          {navItems.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs font-medium text-slate-300 hover:text-pink-400 transition-colors duration-300 whitespace-nowrap"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Language Selector & CTA */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {/* Language Toggle Button */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10">
            <button
              onClick={() => setLanguage('es')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1 ${
                language === 'es'
                  ? 'bg-pink-500 text-white shadow-md shadow-pink-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Español"
            >
              🇪🇸 ES
            </button>
            <button
              onClick={() => setLanguage('it')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1 ${
                language === 'it'
                  ? 'bg-pink-500 text-white shadow-md shadow-pink-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Italiano"
            >
              🇮🇹 IT
            </button>
          </div>

          <a
            href="#reservar"
            className="btn-gradient px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg hover:shadow-pink-500/30 transition-all whitespace-nowrap"
          >
            {t('header.btnBook')}
          </a>
        </div>

        {/* Mobile Controls (Lang + Menu) */}
        <div className="flex md:hidden items-center gap-2">
          {/* Language Selector Mobile */}
          <div className="flex items-center gap-1 bg-white/10 p-1 rounded-full border border-white/10">
            <button
              onClick={() => setLanguage(language === 'es' ? 'it' : 'es')}
              className="px-2.5 py-1 rounded-full text-xs font-semibold bg-pink-500 text-white shadow-sm flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5" /> {language.toUpperCase()}
            </button>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-white hover:text-pink-400 transition-colors"
            aria-label="Menú"
          >
            {isOpen ? <X weight="bold" className="w-6 h-6" /> : <List weight="bold" className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-20 inset-x-4 dark-glass-panel rounded-2xl border border-white/10 shadow-2xl overflow-hidden pointer-events-auto md:hidden"
          >
            <div className="px-6 py-6 flex flex-col gap-4">
              {navItems.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="text-sm font-medium text-slate-300 hover:text-pink-400 transition-colors py-2 border-b border-white/5"
                >
                  {link.label}
                </a>
              ))}

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-semibold text-slate-400">Idioma / Lingua:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLanguage('es')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${language === 'es' ? 'bg-pink-500 text-white' : 'bg-white/10 text-slate-300'}`}
                  >
                    🇪🇸 Español
                  </button>
                  <button
                    onClick={() => setLanguage('it')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${language === 'it' ? 'bg-pink-500 text-white' : 'bg-white/10 text-slate-300'}`}
                  >
                    🇮🇹 Italiano
                  </button>
                </div>
              </div>

              <a
                href="#reservar"
                onClick={() => setIsOpen(false)}
                className="mt-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-center text-xs font-semibold rounded-full shadow-lg shadow-pink-500/25"
              >
                {t('header.btnBook')}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
