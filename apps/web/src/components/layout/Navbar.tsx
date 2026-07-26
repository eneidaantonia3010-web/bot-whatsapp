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
      {/* Fluid Island Navbar */}
      <div 
        className={`pointer-events-auto transition-all duration-500 w-full md:w-auto ${
          scrolled
            ? 'glass shadow-[var(--shadow-lifted)]'
            : 'bg-[var(--color-surface)] shadow-[var(--shadow-soft)]'
        } rounded-2xl md:rounded-[var(--radius-full)] px-4 py-3 md:px-6 md:py-3 flex flex-wrap items-center justify-between gap-4 md:gap-8 border border-[var(--color-bg-alt)] max-w-full`}
      >
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 group shrink-0">
          <Sparkle
            weight="fill"
            className="w-5 h-5 text-[var(--color-accent)] transition-transform duration-500 group-hover:rotate-180 shrink-0"
          />
          <span className="font-semibold tracking-tight text-[var(--color-ink)] whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>
            {SALON.name}
          </span>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-5 flex-wrap">
          {navItems.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors duration-300 whitespace-nowrap"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Language Selector & CTA */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {/* Language Toggle Button */}
          <div className="flex items-center gap-1 bg-[var(--color-bg-alt)] p-1 rounded-full border border-black/5">
            <button
              onClick={() => setLanguage('es')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
                language === 'es'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-500 hover:text-black'
              }`}
              title="Español"
            >
              🇪🇸 ES
            </button>
            <button
              onClick={() => setLanguage('it')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
                language === 'it'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-500 hover:text-black'
              }`}
              title="Italiano"
            >
              🇮🇹 IT
            </button>
          </div>

          <a
            href="#reservar"
            className="double-bezel inline-block"
          >
            <div className="double-bezel-inner bg-[var(--color-ink)] text-[var(--color-white)] px-5 py-2 text-sm font-medium hover:bg-[var(--color-ink-light)] transition-colors duration-300 whitespace-nowrap">
              {t('header.btnBook')}
            </div>
          </a>
        </div>

        {/* Mobile Controls (Lang + Menu) */}
        <div className="flex md:hidden items-center gap-2">
          {/* Language Selector Mobile */}
          <div className="flex items-center gap-1 bg-[var(--color-bg-alt)] p-1 rounded-full">
            <button
              onClick={() => setLanguage(language === 'es' ? 'it' : 'es')}
              className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white text-black shadow-sm flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5 text-pink-500" /> {language.toUpperCase()}
            </button>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-[var(--color-ink)] hover:text-[var(--color-accent)] transition-colors"
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
            className="absolute top-20 inset-x-4 glass rounded-2xl border border-[var(--color-bg-alt)] shadow-[var(--shadow-lifted)] overflow-hidden pointer-events-auto md:hidden"
          >
            <div className="px-6 py-6 flex flex-col gap-4">
              {navItems.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="text-base font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors py-2 border-b border-[var(--color-bg-alt)]"
                >
                  {link.label}
                </a>
              ))}

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-semibold text-gray-500">Idioma / Lingua:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLanguage('es')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${language === 'es' ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'}`}
                  >
                    🇪🇸 Español
                  </button>
                  <button
                    onClick={() => setLanguage('it')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${language === 'it' ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'}`}
                  >
                    🇮🇹 Italiano
                  </button>
                </div>
              </div>

              <a
                href="#reservar"
                onClick={() => setIsOpen(false)}
                className="mt-2 px-6 py-3 bg-[var(--color-ink)] text-[var(--color-white)] text-center text-sm font-medium rounded-[var(--radius-full)]"
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
