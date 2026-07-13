'use client';

import { Sparkle, MapPin, Clock, Phone, At, EnvelopeSimple } from '@phosphor-icons/react';
import { SALON, NAV_LINKS } from '@/lib/constants';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-ink text-cream/80">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Sparkle weight="fill" className="w-5 h-5 text-rosa" />
              <span className="font-[Playfair_Display] text-xl font-semibold text-cream">
                {SALON.name}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-cream/60 mb-6">
              {SALON.slogan}. Una experiencia de belleza premium diseñada para que te sientas única.
            </p>
            <div className="flex gap-4">
              <a
                href={SALON.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-cream/20 flex items-center justify-center hover:bg-rosa hover:border-rosa transition-all duration-300"
                aria-label="Instagram"
              >
                <At className="w-4 h-4" />
              </a>
              <a
                href={SALON.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-cream/20 flex items-center justify-center hover:bg-salvia hover:border-salvia transition-all duration-300"
                aria-label="WhatsApp"
              >
                <Phone className="w-4 h-4" />
              </a>
              <a
                href={`mailto:${SALON.email}`}
                className="w-10 h-10 rounded-full border border-cream/20 flex items-center justify-center hover:bg-rosa hover:border-rosa transition-all duration-300"
                aria-label="Email"
              >
                <EnvelopeSimple className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-[Playfair_Display] text-lg font-semibold text-cream mb-6">
              Navegación
            </h3>
            <ul className="space-y-3">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-cream/60 hover:text-rosa transition-colors duration-300"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-[Playfair_Display] text-lg font-semibold text-cream mb-6">
              Contacto
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-rosa mt-0.5 shrink-0" />
                <span className="text-sm text-cream/60">{SALON.address}</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-rosa mt-0.5 shrink-0" />
                <span className="text-sm text-cream/60">{SALON.phone}</span>
              </li>
              <li className="flex items-start gap-3">
                <EnvelopeSimple className="w-4 h-4 text-rosa mt-0.5 shrink-0" />
                <span className="text-sm text-cream/60">{SALON.email}</span>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h3 className="font-[Playfair_Display] text-lg font-semibold text-cream mb-6">
              Horarios
            </h3>
            <ul className="space-y-3">
              {SALON.hoursDetail.map((item) => (
                <li key={item.day} className="flex justify-between text-sm">
                  <span className="text-cream/60">{item.day}</span>
                  <span className="text-cream/80 font-medium">{item.hours}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-cream/10">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-cream/40">
            © {currentYear} {SALON.fullName}. Todos los derechos reservados.
          </p>
          <p className="text-xs text-cream/40">
            Hecho con ✨ en Buenos Aires
          </p>
        </div>
      </div>
    </footer>
  );
}
