'use client';

import { motion } from 'motion/react';
import { useTranslation } from '@/i18n/I18nContext';

export function Services() {
  const { t } = useTranslation();

  return (
    <section className="py-12 md:py-section-gap px-margin-mobile md:px-gutter max-w-container-max mx-auto relative" id="servicios">
      <div className="text-center mb-10 md:mb-20">
        <motion.h2 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="font-headline-lg-mobile lg:font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-on-surface mb-4 md:mb-6"
        >
          {t('services.title')}
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl mx-auto leading-relaxed"
        >
          {t('services.subtitle')}
        </motion.p>
      </div>

      {/* Tabs */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.1 }}
        className="flex overflow-x-auto hide-scrollbar gap-4 md:gap-6 mb-12 md:mb-20 pb-4 justify-start md:justify-center"
      >
        <button className="px-6 md:px-10 py-3 rounded-full border border-secondary text-secondary bg-secondary/10 font-label-md text-label-md whitespace-nowrap tracking-widest hover:bg-secondary/20 transition-all uppercase">{t('services.categories.all')}</button>
        <button className="px-6 md:px-10 py-3 rounded-full border border-white/10 text-on-surface-variant hover:text-on-surface hover:border-white/30 glass-panel font-label-md text-label-md whitespace-nowrap transition-all tracking-widest uppercase">{t('services.categories.hair')}</button>
        <button className="px-6 md:px-10 py-3 rounded-full border border-white/10 text-on-surface-variant hover:text-on-surface hover:border-white/30 glass-panel font-label-md text-label-md whitespace-nowrap transition-all tracking-widest uppercase">{t('services.categories.nails')}</button>
        <button className="px-6 md:px-10 py-3 rounded-full border border-white/10 text-on-surface-variant hover:text-on-surface hover:border-white/30 glass-panel font-label-md text-label-md whitespace-nowrap transition-all tracking-widest uppercase">{t('services.categories.lashes')}</button>
        <button className="px-6 md:px-10 py-3 rounded-full border border-white/10 text-on-surface-variant hover:text-on-surface hover:border-white/30 glass-panel font-label-md text-label-md whitespace-nowrap transition-all tracking-widest uppercase">{t('services.categories.facial')}</button>
      </motion.div>

      {/* Grid of Services */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
        {/* Service Card 1 */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="glass-panel rounded-[24px] md:rounded-[32px] p-6 md:p-10 flex flex-col group relative overflow-hidden transition-all duration-700 hover:border-secondary/40 hover:-translate-y-4 shadow-xl"
        >
          <div className="absolute top-0 right-0 p-6 md:p-8">
            <span className="font-headline-md text-secondary/90 text-xl md:text-2xl">ARS $45k</span>
          </div>
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-white/5 flex items-center justify-center mb-6 md:mb-8 group-hover:bg-secondary/20 transition-all duration-500 transform group-hover:rotate-12">
            <span className="material-symbols-outlined text-secondary text-2xl md:text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>cut</span>
          </div>
          <h3 className="font-headline-lg text-[22px] md:text-headline-md text-on-surface mb-3 md:mb-4 leading-tight">Balayage Signature</h3>
          <p className="font-body-md text-body-md text-on-surface-variant mb-8 md:mb-10 flex-grow leading-relaxed">Técnica francesa artesanal de iluminación a mano alzada para un degradado orgánico, natural y sofisticado que no requiere mantenimiento constante.</p>
          <div className="flex justify-between items-center mt-auto border-t border-white/10 pt-6 md:pt-8">
            <div className="flex items-center gap-2 md:gap-3 text-on-surface-variant">
              <span className="material-symbols-outlined text-lg md:text-xl">schedule</span>
              <span className="font-label-md text-[12px] md:text-label-md tracking-widest">3-4 HS</span>
            </div>
            <button className="text-secondary hover:text-white transition-colors font-label-md text-[12px] md:text-label-md flex items-center gap-2 group/btn tracking-widest uppercase">
              Reservar <span className="material-symbols-outlined text-lg group-hover/btn:translate-x-2 transition-transform">arrow_forward</span>
            </button>
          </div>
        </motion.div>

        {/* Service Card 2 */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="glass-panel rounded-[24px] md:rounded-[32px] p-6 md:p-10 flex flex-col group relative overflow-hidden transition-all duration-700 hover:border-secondary/40 hover:-translate-y-4 shadow-xl"
        >
          <div className="absolute top-0 right-0 p-6 md:p-8">
            <span className="font-headline-md text-secondary/90 text-xl md:text-2xl">ARS $18k</span>
          </div>
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-white/5 flex items-center justify-center mb-6 md:mb-8 group-hover:bg-secondary/20 transition-all duration-500 transform group-hover:rotate-12">
            <span className="material-symbols-outlined text-secondary text-2xl md:text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>spa</span>
          </div>
          <h3 className="font-headline-lg text-[22px] md:text-headline-md text-on-surface mb-3 md:mb-4 leading-tight">Tratamiento K18</h3>
          <p className="font-body-md text-body-md text-on-surface-variant mb-8 md:mb-10 flex-grow leading-relaxed">Reconstrucción biomimética molecular profunda. Repara los puentes de queratina dañados por químicos o calor, restaurando fuerza y elasticidad real.</p>
          <div className="flex justify-between items-center mt-auto border-t border-white/10 pt-6 md:pt-8">
            <div className="flex items-center gap-2 md:gap-3 text-on-surface-variant">
              <span className="material-symbols-outlined text-lg md:text-xl">schedule</span>
              <span className="font-label-md text-[12px] md:text-label-md tracking-widest">1.5 HS</span>
            </div>
            <button className="text-secondary hover:text-white transition-colors font-label-md text-[12px] md:text-label-md flex items-center gap-2 group/btn tracking-widest uppercase">
              Reservar <span className="material-symbols-outlined text-lg group-hover/btn:translate-x-2 transition-transform">arrow_forward</span>
            </button>
          </div>
        </motion.div>

        {/* Service Card 3 */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="glass-panel rounded-[24px] md:rounded-[32px] p-6 md:p-10 flex flex-col group relative overflow-hidden transition-all duration-700 hover:border-secondary/40 hover:-translate-y-4 shadow-xl"
        >
          <div className="absolute top-0 right-0 p-6 md:p-8">
            <span className="font-headline-md text-secondary/90 text-xl md:text-2xl">ARS $12k</span>
          </div>
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-white/5 flex items-center justify-center mb-6 md:mb-8 group-hover:bg-secondary/20 transition-all duration-500 transform group-hover:rotate-12">
            <span className="material-symbols-outlined text-secondary text-2xl md:text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>back_hand</span>
          </div>
          <h3 className="font-headline-lg text-[22px] md:text-headline-md text-on-surface mb-3 md:mb-4 leading-tight">Manicura Premium</h3>
          <p className="font-body-md text-body-md text-on-surface-variant mb-8 md:mb-10 flex-grow leading-relaxed">Esmaltado semipermanente con nivelación de placa y color de alta pigmentación. Brillo de cristal impecable garantizado por más de 21 días.</p>
          <div className="flex justify-between items-center mt-auto border-t border-white/10 pt-6 md:pt-8">
            <div className="flex items-center gap-2 md:gap-3 text-on-surface-variant">
              <span className="material-symbols-outlined text-lg md:text-xl">schedule</span>
              <span className="font-label-md text-[12px] md:text-label-md tracking-widest">1.5 HS</span>
            </div>
            <button className="text-secondary hover:text-white transition-colors font-label-md text-[12px] md:text-label-md flex items-center gap-2 group/btn tracking-widest uppercase">
              Reservar <span className="material-symbols-outlined text-lg group-hover/btn:translate-x-2 transition-transform">arrow_forward</span>
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
