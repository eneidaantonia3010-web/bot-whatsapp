'use client';

import { motion } from 'motion/react';
import Image from 'next/image';
import { At } from '@phosphor-icons/react';
import { TEAM } from '@/lib/constants';
import { StaggerContainer, StaggerItem } from '@/components/AnimatedSection';

import { useTranslation } from '@/i18n/I18nContext';

export function Team() {
  const { t } = useTranslation();

  return (
    <section id="equipo" className="section-padding bg-[#0F0F16] relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-[#FF2D85]/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="text-center mb-16 max-w-3xl mx-auto px-4">
        <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold tracking-[0.2em] uppercase bg-[#FF2D85]/10 text-[#FF2D85] border border-[#FF2D85]/20 mb-4">
          {t('team.badge')}
        </span>
        <h2 
          className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white mb-6 tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {t('team.title')}
        </h2>
        <p className="text-gray-300 max-w-lg mx-auto text-base md:text-lg leading-relaxed">
          {t('team.subtitle')}
        </p>
      </div>

      {/* Team Grid */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto px-4">
        {TEAM.map((member) => (
          <StaggerItem key={member.name}>
            <div className="group text-center p-6 rounded-2xl bg-[#12121A]/75 backdrop-blur-xl border border-white/10 hover:border-[#FF2D85]/40 hover:shadow-[0_10px_35px_rgba(255,45,133,0.15)] transition-all duration-500 flex flex-col items-center">
              {/* Image */}
              <div className="relative w-36 h-36 md:w-40 md:h-40 mx-auto mb-6">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-[#DF006E] to-[#9D4EDD] opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 blur-sm" />
                <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-white/20 shadow-xl bg-[#0F0F16]">
                  <Image
                    src={member.imageUrl}
                    alt={member.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="160px"
                  />
                </div>
                {/* Hover overlay with social */}
                <motion.div
                  className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                >
                  <motion.a
                    href="#"
                    className="w-10 h-10 rounded-full bg-white/90 text-black flex items-center justify-center hover:bg-white transition-colors"
                    whileHover={{ scale: 1.1 }}
                    aria-label={`Instagram de ${member.name}`}
                  >
                    <At className="w-4 h-4 text-black" />
                  </motion.a>
                </motion.div>
              </div>

              {/* Info */}
              <h3 
                className="text-xl font-semibold text-white mb-1"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {member.name}
              </h3>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#FF2D85] mb-3">{member.role}</p>
              <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
                {member.bio}
              </p>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </section>
  );
}
