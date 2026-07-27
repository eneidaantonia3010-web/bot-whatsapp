'use client';

import { motion } from 'motion/react';
import Image from 'next/image';
import { At } from '@phosphor-icons/react';
import { StaggerContainer, StaggerItem } from '@/components/AnimatedSection';
import { useTranslation } from '@/i18n/I18nContext';

const STITCH_TEAM = [
  {
    name: 'Sofía García',
    role: 'Fundadora & Estilista Senior',
    bio: 'Con más de 15 años de experiencia, Sofía lidera la visión creativa del estudio, especializándose en cortes de vanguardia.',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAM1OXSWpeeqdOT6tT1sCFy8ZrTf_0EIwJaYE5LR0NqCbtjeHFxlig1cCOwl85cx3E12tRtNn3rCH3S0LNocNenuJSksTjpUu3vrG-Zu5XdlrpBTKjky60yIymyYI4XsvqPBiidTCXN4rEA0pKkE_GdkV0QMHk3graTs1C6GIk5E5fL2FFgs-e0aomRmITsD9QbIx5Hl619cA7Gbf_RgQpuQeGA2VvJYhOs9rw45StNWFc5h4CZhPlZ9EbZOQrX16NSzaOH9XH4pxs',
  },
  {
    name: 'Camila Torres',
    role: 'Especialista en Color',
    bio: 'Experta en balayage y coloración artística, Camila transforma el cabello en lienzos de color vibrante y natural.',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCqVwKohiECIn2FzTxQgYGnAOEIppzMgH1o83CkKnGcHxZeNIOC7PZb3IuSDtcMY6EcI3I_mSxjYA6hSVT6BEmjOk8o1nM0fsRzhieQk-ZSiuAYscbowFHj1BuSxJoFlQq3S2-Ze6tcOq2TKcBSeHScJw7RWNOsqC-k8si6UsDN_syNOpxmCBpMAib_TtHFF0t-KRxRGRdZKiplZBGzqDFCuDLe1-e1LR1aWh2PjJY3vUwD9SUVyLMc9iLnpKKlzFd8cKVJ5Pb0q8w',
  },
  {
    name: 'Valentina Ruiz',
    role: 'Nail Artist',
    bio: 'Artista de uñas certificada internacionalmente, creadora de diseños únicos y especialista en esculpidas de precisión.',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCpfJ21N74IXTkZi0gEDEirXIjcnnHzanvD3c5h2uot4QqVm2IdsVjaKTKp8Set5qmMPdPalPTtqydyKgOITaOlWpqXgD6cvHFg6z8h1P9DVEJLdkcEfwIkLR94AybgZJMrZf1q1Nzf7lDztRDVy_FCsmM2YiF9bviOb63dLjJg1bPlQETBwTMiTxqgGewK61XYqaUfIWGL7eOJl8pub28W08GOPPouQcGLpJloA__VHLiclkXELga877Jp_qxzt5xgjxNAHfU7oxs',
  },
  {
    name: 'Lucía Méndez',
    role: 'Especialista en Skincare',
    bio: 'Cosmetóloga profesional dedicada a revitalizar tu piel con tratamientos avanzados y productos de la más alta calidad.',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBLzr-jaZ0Gwu-OpYZnrADxghOMkqA-SMJ6gDBkyoXieT1-X36EnGEo6DFcH8n2eE4FGMhmsmaESFtaObDKekHrG-ZmCceFZkNGLTki8XHpp-VUpP_BmAt-tM1Wu_RPJ70Vg4KfEP9FaVXqeuQsjYgW-LMQEdGbyOBrLpbqoWymG2sPRkIXAxCfP0mOEv0VDtm3_WpslL51LAKH2sXgy9y67328leFz9bDeKq6Kz9Pv-MkVslWJpePSJVX2hpMJtLJnStbe5XTUBYU',
  },
];

export function Team() {
  const { t } = useTranslation();

  return (
    <section id="equipo" className="w-full max-w-[1200px] mx-auto px-6 py-28 flex flex-col items-center relative">
      {/* Header */}
      <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-16">
        <span className="inline-block border border-[#df006e] text-[#ffb1c5] text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
          PROFESIONALES APASIONADOS
        </span>
        <h2 
          className="text-4xl md:text-5xl font-bold text-[#e1e3e4] mb-6 tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Nuestro Equipo de Especialistas
        </h2>
        <p className="text-[#c8c5cb] text-lg max-w-lg mx-auto">
          Talento, capacitación continua y dedicación en cada detalle.
        </p>
      </div>

      {/* Team Grid */}
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
        {STITCH_TEAM.map((member) => (
          <StaggerItem key={member.name}>
            <div className="glass-panel rounded-2xl p-8 flex flex-col items-center text-center group hover:bg-white/[0.05] transition-colors duration-500 border border-white/10 bg-white/[0.03] backdrop-blur-xl h-full">
              {/* Glow Halo Avatar */}
              <div className="glow-halo mb-6 w-32 h-32 flex-shrink-0 group-hover:scale-105 transition-transform duration-500 p-[2px] rounded-full bg-gradient-to-br from-[#df006e] to-[#a456e5]">
                <div className="w-full h-full rounded-full overflow-hidden border-4 border-[#111415] relative">
                  <Image
                    src={member.imageUrl}
                    alt={member.name}
                    fill
                    className="object-cover"
                    sizes="128px"
                    unoptimized
                  />
                </div>
              </div>

              {/* Info */}
              <h3 
                className="text-2xl font-semibold text-[#e1e3e4] mb-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {member.name}
              </h3>
              <p className="text-xs font-semibold text-[#ffb1c5] uppercase tracking-wider mb-4">
                {member.role}
              </p>
              <p className="text-sm text-[#c8c5cb] leading-relaxed">
                {member.bio}
              </p>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </section>
  );
}

