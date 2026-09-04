'use client';

import { motion } from 'motion/react';
import { Star, CheckCircle, Clock, ArrowRight, ArrowLeft } from '@phosphor-icons/react';
import { useTranslation } from '@/i18n/I18nContext';

export function Testimonials() {
  const { t } = useTranslation();
  const testimonials = [
    {
      quote: '"¡Increíble experiencia. El Facial Glow me dejó la piel como nueva, luminosa y fresca. La atención fue impecable desde el momento en que entré."',
      name: 'Martina García',
      type: 'Clienta Verificada',
      service: 'Facial Glow',
    },
    {
      quote: '"Mis uñas quedaron perfectas. El nivel de detalle y los productos que usan son de primera calidad. Definitivamente vuelvo."',
      name: 'Isabella Martínez',
      type: 'Clienta Frecuente',
      service: 'Uñas Gel Luxury',
    },
    {
      quote: '"El tratamiento de keratina cambió mi vida. Mi pelo nunca estuvo tan sedoso y sin frizz. El ambiente del estudio es puro relax."',
      name: 'Renata Ruiz',
      type: 'Nueva Clienta',
      service: 'Anti-frizz Keratina',
    },
  ];

  const services = [
    { name: 'Facial Glow', desc: 'Limpieza profunda, exfoliación e hidratación intensiva para una piel radiante.', time: '60 min', price: '$4.500', active: true },
    { name: 'Uñas Gel Luxury', desc: 'Esculpido en gel con diseño premium y esmaltado semipermanente de larga duración.', time: '90 min', price: '$3.200', active: false },
    { name: 'Lifting de Pestañas', desc: 'Curvatura natural y tinte para resaltar tu mirada sin necesidad de extensiones.', time: '45 min', price: '$2.800', active: false },
    { name: 'Anti-frizz Keratina', desc: 'Tratamiento reparador profundo que elimina el frizz y aporta un brillo extremo.', time: '120 min', price: '$8.500', active: false },
    { name: 'Makeup Social', desc: 'Maquillaje profesional para eventos, adaptado a tu estilo y facciones.', time: '60 min', price: '$4.000', active: false },
    { name: 'Masaje Relax', desc: 'Masaje descontracturante y relajante con aceites esenciales aromáticos.', time: '50 min', price: '$3.800', active: false },
  ];

  return (
    <>
      {/* TESTIMONIALS */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-gutter mb-section-gap" id="testimonios">
        <div className="text-center mb-16 flex flex-col items-center">
          <div className="inline-block border border-secondary-container/40 bg-secondary-container/10 rounded-full px-4 py-1 mb-6">
            <span className="font-label-md text-secondary uppercase tracking-widest text-xs">{t('testimonials.badge')}</span>
          </div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-6 max-w-2xl">{t('testimonials.title')}</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mx-auto">{t('testimonials.subtitle')}</p>
        </div>
        <div className="relative">
          <div className="flex md:grid md:grid-cols-3 gap-6 overflow-x-auto md:overflow-visible pb-8 md:pb-0 snap-x snap-mandatory hide-scrollbar items-stretch">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="glass-card rounded-xl p-8 min-w-[85vw] sm:min-w-[320px] md:min-w-0 md:w-full flex-shrink-0 snap-center flex flex-col justify-between group hover:-translate-y-2 transition-transform duration-500 relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 ${i % 2 === 0 ? 'bg-secondary-container/10' : 'bg-on-tertiary-container/10'} rounded-bl-full blur-2xl transition-opacity opacity-0 group-hover:opacity-100`}></div>
                <div className="flex-1 flex flex-col">
                  <div className="flex gap-1 text-secondary mb-6">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} weight="fill" className="w-5 h-5" />
                    ))}
                  </div>
                  <p className="font-body-md text-body-md text-on-surface mb-8 italic flex-1">{t.quote}</p>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-6">
                  <div>
                    <h4 className="font-label-md text-label-md text-on-surface">{t.name}</h4>
                    <span className="font-label-md text-on-surface-variant text-xs">{t.type}</span>
                  </div>
                  <div className="border border-outline-variant rounded-full px-3 py-1 bg-surface-container-low/50">
                    <span className="font-label-md text-secondary text-xs uppercase">{t.service}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex justify-center items-center gap-8 mt-6 md:hidden">
            <button className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-on-surface hover:bg-white/5 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary"></div>
              <div className="w-2 h-2 rounded-full bg-white/20"></div>
              <div className="w-2 h-2 rounded-full bg-white/20"></div>
            </div>
            <button className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-on-surface hover:bg-white/5 transition-colors">
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
