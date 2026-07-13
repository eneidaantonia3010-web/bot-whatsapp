'use client';

import { motion } from 'motion/react';
import Image from 'next/image';
import { At } from '@phosphor-icons/react';
import { TEAM } from '@/lib/constants';
import { StaggerContainer, StaggerItem } from '@/components/AnimatedSection';

export function Team() {
  return (
    <section id="equipo" className="section-padding bg-cream">
      {/* Header */}
      <div className="text-center mb-16">
        <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-rosa mb-4">
          Nuestro Equipo
        </span>
        <h2 className="font-[Playfair_Display] text-4xl md:text-5xl lg:text-6xl font-semibold text-ink mb-6">
          Las manos detrás de la magia
        </h2>
        <p className="text-ink-muted max-w-lg mx-auto">
          Un equipo apasionado de profesionales que aman lo que hacen y se nota en cada detalle.
        </p>
      </div>

      {/* Team Grid */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
        {TEAM.map((member) => (
          <StaggerItem key={member.name}>
            <div className="group text-center">
              {/* Image */}
              <div className="relative w-40 h-40 md:w-48 md:h-48 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-rosa/20 to-salvia/20 group-hover:scale-110 transition-transform duration-500" />
                <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white shadow-[var(--shadow-soft)]">
                  <Image
                    src={member.imageUrl}
                    alt={member.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="200px"
                  />
                </div>
                {/* Hover overlay with social */}
                <motion.div
                  className="absolute inset-0 rounded-full flex items-center justify-center bg-ink/0 group-hover:bg-ink/20 transition-all duration-500"
                >
                  <motion.a
                    href="#"
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-white"
                    whileHover={{ scale: 1.1 }}
                    aria-label={`Instagram de ${member.name}`}
                  >
                    <At className="w-4 h-4 text-ink" />
                  </motion.a>
                </motion.div>
              </div>

              {/* Info */}
              <h3 className="font-[Playfair_Display] text-xl font-semibold text-ink mb-1">
                {member.name}
              </h3>
              <p className="text-sm font-medium text-rosa mb-3">{member.role}</p>
              <p className="text-sm text-ink-muted leading-relaxed max-w-xs mx-auto">
                {member.bio}
              </p>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </section>
  );
}
