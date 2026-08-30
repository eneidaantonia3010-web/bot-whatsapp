'use client';

import { motion } from 'motion/react';
import { useTranslation } from '@/i18n/I18nContext';

const TEAM_MEMBERS = [
  {
    name: 'Sofía García',
    role: 'Fundadora & Estilista Senior',
    desc: 'Con más de 15 años de experiencia, Sofía lidera la visión creativa del estudio.',
    img: '/images/team-sofia.jpg',
  },
  {
    name: 'Camila Torres',
    role: 'Especialista en Color',
    desc: 'Experta en balayage y coloración artística.',
    img: '/images/team-camila.jpg',
  },
  {
    name: 'Valentina Ruiz',
    role: 'Nail Artist',
    desc: 'Artista de uñas certificada internacionalmente.',
    img: '/images/team-valentina.jpg',
  },
  {
    name: 'Lucía Méndez',
    role: 'Especialista en Skincare',
    desc: 'Cosmetóloga profesional dedicada a revitalizar tu piel.',
    img: '/images/team-lucia.jpg',
  }
];

export function Team() {
  const { t } = useTranslation();

  return (
    <section className="w-full max-w-container-max mx-auto px-margin-mobile md:px-gutter py-section-gap flex flex-col items-center" id="equipo">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center text-center max-w-3xl mx-auto mb-16"
      >
        <span className="inline-block border border-secondary text-secondary font-label-md text-label-md uppercase tracking-wider px-4 py-1.5 rounded-full mb-6">{t('team.badge')}</span>
        <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-6">{t('team.title')}</h2>
        <p className="text-on-surface-variant text-body-lg">{t('team.subtitle')}</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
        {TEAM_MEMBERS.map((member, i) => (
          <motion.div 
            key={member.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="glass-panel rounded-2xl p-8 flex flex-col items-center text-center group hover:bg-white/[0.05] transition-colors duration-500"
          >
            <div className="glow-halo mb-6 w-32 h-32 flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
              <img className="w-full h-full rounded-full object-cover border-4 border-background" src={member.img} alt={member.name} />
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-2">{member.name}</h3>
            <p className="font-label-md text-label-md text-secondary uppercase tracking-wider mb-4">{member.role}</p>
            <p className="text-on-surface-variant text-body-md">{member.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
