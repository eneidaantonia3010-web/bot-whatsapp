'use client';

import { usePathname } from 'next/navigation';
import { Sparkle, MapPin, Phone, At, EnvelopeSimple } from '@phosphor-icons/react';
import { SALON } from '@/lib/constants';
import { useTranslation } from '@/i18n/I18nContext';

export function Footer() {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();
  const { t } = useTranslation();

  if (pathname?.startsWith('/admin')) {
    return null;
  }


  const navItems = [
    { href: '#inicio', label: t('header.navHome') },
    { href: '#servicios', label: t('header.navServices') },
    { href: '#reservar', label: t('header.navCalendar') },
    { href: '#galeria', label: t('header.navGallery') },
    { href: '#testimonios', label: t('header.navTestimonials') },
    { href: '#equipo', label: t('header.navTeam') },
  ];

  return (
    <footer className="bg-[var(--color-ink)] text-white/80 py-16 md:py-20 border-t border-white/10">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Sparkle weight="fill" className="w-5 h-5 text-pink-400" />
              <span className="font-[var(--font-display)] text-xl font-semibold text-white">
                {SALON.name}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-white/60 mb-6">
              {t('footer.tagline')}
            </p>
            <div className="flex gap-4">
              <a
                href={SALON.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-pink-500 hover:border-pink-500 transition-all duration-300"
                aria-label="Instagram"
              >
                <At className="w-4 h-4" />
              </a>
              <a
                href={SALON.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-emerald-500 hover:border-emerald-500 transition-all duration-300"
                aria-label="WhatsApp"
              >
                <Phone className="w-4 h-4" />
              </a>
              <a
                href={`mailto:${SALON.email}`}
                className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-pink-500 hover:border-pink-500 transition-all duration-300"
                aria-label="Email"
              >
                <EnvelopeSimple className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-[var(--font-display)] text-lg font-semibold text-white mb-6">
              Navegación
            </h3>
            <ul className="space-y-3">
              {navItems.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-white/60 hover:text-pink-400 transition-colors duration-300"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-[var(--font-display)] text-lg font-semibold text-white mb-6">
              {t('footer.locationTitle')}
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-pink-400 mt-0.5 shrink-0" />
                <span className="text-sm text-white/60">{SALON.address}</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-pink-400 mt-0.5 shrink-0" />
                <span className="text-sm text-white/60">{SALON.phone}</span>
              </li>
              <li className="flex items-start gap-3">
                <EnvelopeSimple className="w-4 h-4 text-pink-400 mt-0.5 shrink-0" />
                <span className="text-sm text-white/60">{SALON.email}</span>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h3 className="font-[var(--font-display)] text-lg font-semibold text-white mb-6">
              {t('footer.hoursTitle')}
            </h3>
            <ul className="space-y-3 text-sm text-white/60">
              <li>{t('footer.hoursWeekdays')}</li>
              <li>{t('footer.hoursSaturday')}</li>
              <li>{t('footer.hoursSunday')}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10 mt-12 pt-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-white/40">
            © {currentYear} {SALON.fullName}. {t('footer.rightsReserved')}
          </p>
          <p className="text-xs text-white/40">
            Glow Studio by Sofia ✨
          </p>
        </div>
      </div>
    </footer>
  );
}
