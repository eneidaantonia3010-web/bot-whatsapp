'use client';

import { usePathname } from 'next/navigation';
import { useTranslation } from '@/i18n/I18nContext';

export function Footer() {
  const pathname = usePathname();
  const { t } = useTranslation();

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="w-full py-16 md:py-24 bg-[#090b0c] border-t border-white/5">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-gutter flex flex-col md:flex-row justify-between items-start gap-12">
        {/* Brand & Mission */}
        <div className="max-w-md">
          <div className="font-headline-md text-headline-md text-primary mb-4 md:mb-6 transition-all hover:text-secondary cursor-default tracking-tighter">
            GLOW STUDIO
          </div>
          <p className="text-on-surface-variant font-body-md text-body-md leading-relaxed">
            {t('footer.tagline')}
          </p>
        </div>
        
        {/* Quick Links */}
        <div className="flex flex-wrap gap-10 md:gap-16">
          <div className="flex flex-col gap-4 md:gap-6">
            <span className="text-secondary font-label-md tracking-[0.2em] text-[12px] uppercase">Explorar</span>
            <a className="nav-link text-on-surface-variant hover:text-white transition-colors text-label-md uppercase" href="#servicios">{t('nav.services')}</a>
            <a className="nav-link text-on-surface-variant hover:text-white transition-colors text-label-md uppercase" href="#equipo">{t('nav.team')}</a>
            <a className="nav-link text-on-surface-variant hover:text-white transition-colors text-label-md uppercase" href="#galeria">{t('nav.gallery')}</a>
          </div>
          <div className="flex flex-col gap-4 md:gap-6">
            <span className="text-secondary font-label-md tracking-[0.2em] text-[12px] uppercase">Legal</span>
            <a className="nav-link text-on-surface-variant hover:text-white transition-colors text-label-md uppercase" href="#">Privacidad</a>
            <a className="nav-link text-on-surface-variant hover:text-white transition-colors text-label-md uppercase" href="#">Términos</a>
          </div>
        </div>
        
        {/* Socials & Copyright */}
        <div className="flex flex-col items-start md:items-end gap-6 md:gap-8 w-full md:w-auto">
          <div className="flex gap-4 md:gap-6">
            <a className="w-10 h-10 md:w-12 md:h-12 rounded-full glass-panel flex items-center justify-center hover:bg-secondary/20 transition-all" href="#"><span className="material-symbols-outlined text-on-surface" style={{ fontVariationSettings: "'FILL' 1" }}>public</span></a>
            <a className="w-10 h-10 md:w-12 md:h-12 rounded-full glass-panel flex items-center justify-center hover:bg-secondary/20 transition-all" href="#"><span className="material-symbols-outlined text-on-surface" style={{ fontVariationSettings: "'FILL' 1" }}>photo_camera</span></a>
          </div>
          <div className="font-body-md text-label-md text-on-surface-variant text-left md:text-right">
            © {new Date().getFullYear()} GLOW STUDIO LUXE.<br/>{t('footer.rightsReserved')}
          </div>
        </div>
      </div>
    </footer>
  );
}
