'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { List, X, Sparkle } from '@phosphor-icons/react';
import { SALON, NAV_LINKS } from '@/lib/constants';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 px-4 pt-4 md:pt-6 pointer-events-none flex justify-center"
    >
      {/* Fluid Island Navbar */}
      <div 
        className={`pointer-events-auto transition-all duration-500 w-full md:w-auto ${
          scrolled
            ? 'glass shadow-[var(--shadow-lifted)]'
            : 'bg-[var(--color-surface)] shadow-[var(--shadow-soft)]'
        } rounded-2xl md:rounded-[var(--radius-full)] px-4 py-3 md:px-6 md:py-3 flex items-center justify-between gap-12 border border-[var(--color-bg-alt)]`}
      >
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 group shrink-0">
          <Sparkle
            weight="fill"
            className="w-5 h-5 text-[var(--color-accent)] transition-transform duration-500 group-hover:rotate-180"
          />
          <span className="font-semibold tracking-tight text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
            {SALON.name}
          </span>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors duration-300"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTA Button */}
        <div className="hidden md:block">
          <a
            href="#reservar"
            className="double-bezel inline-block"
          >
            <div className="double-bezel-inner bg-[var(--color-ink)] text-[var(--color-white)] px-5 py-2 text-sm font-medium hover:bg-[var(--color-ink-light)] transition-colors duration-300">
              Reservar Turno
            </div>
          </a>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 text-[var(--color-ink)] hover:text-[var(--color-accent)] transition-colors"
          aria-label="Menú"
        >
          {isOpen ? <X weight="bold" className="w-6 h-6" /> : <List weight="bold" className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-20 left-4 right-4 glass rounded-2xl border border-[var(--color-bg-alt)] shadow-[var(--shadow-lifted)] overflow-hidden pointer-events-auto md:hidden"
          >
            <div className="px-6 py-6 flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="text-base font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors py-2 border-b border-[var(--color-bg-alt)]"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="#reservar"
                onClick={() => setIsOpen(false)}
                className="mt-4 px-6 py-3 bg-[var(--color-ink)] text-[var(--color-white)] text-center text-sm font-medium rounded-[var(--radius-full)]"
              >
                Reservar Turno
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
