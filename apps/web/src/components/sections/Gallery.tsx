'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { useTranslation } from '@/i18n/I18nContext';

const GALLERY_IMAGES = [
  { 
    src: '/images/gallery-1.jpg',
    alt: 'Interior del salón',
    aspect: 'aspect-[4/5]',
    category: 'todos'
  },
  { 
    src: '/images/gallery-2.jpg',
    alt: 'Área de lavado premium',
    aspect: 'aspect-square',
    category: 'todos'
  },
  { 
    src: '/images/gallery-3.jpg',
    alt: 'Coloración profesional',
    aspect: 'aspect-[3/4]',
    category: 'cabello'
  },
  { 
    src: '/images/gallery-4.jpg',
    alt: 'Uñas gel diseño floral',
    aspect: 'aspect-square',
    category: 'unas'
  },
  { 
    src: '/images/gallery-5.jpg',
    alt: 'Facial glow treatment',
    aspect: 'aspect-[4/5]',
    category: 'facial'
  },
  { 
    src: '/images/gallery-6.jpg',
    alt: 'Productos premium',
    aspect: 'aspect-[3/4]',
    category: 'todos'
  },
  { 
    src: '/images/gallery-7.jpg',
    alt: 'Brushing perfecto',
    aspect: 'aspect-square',
    category: 'cabello'
  },
  { 
    src: '/images/gallery-8.jpg',
    alt: 'Esmaltado semi pastel',
    aspect: 'aspect-[4/5]',
    category: 'unas'
  },
  { 
    src: '/images/gallery-9.jpg',
    alt: 'Mascarilla hidratante',
    aspect: 'aspect-square',
    category: 'facial'
  }
];

export function Gallery() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('todos');

  const categories = [
    { id: 'todos', label: t('gallery.filters.all') },
    { id: 'cabello', label: t('gallery.filters.balayage') },
    { id: 'unas', label: t('gallery.filters.nails') },
    { id: 'pestanas', label: t('gallery.filters.lashes') },
    { id: 'facial', label: t('gallery.filters.facial') },
  ];

  return (
    <section className="w-full max-w-container-max mx-auto px-margin-mobile md:px-gutter pt-section-gap pb-20 flex flex-col items-center" id="galeria">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center text-center max-w-3xl mx-auto mb-16"
      >
        <span className="inline-block border border-secondary text-secondary font-label-md text-label-md uppercase tracking-wider px-4 py-1.5 rounded-full mb-6">{t('gallery.badge')}</span>
        <h2 className="font-headline-lg-mobile md:font-display-lg text-headline-lg-mobile md:text-display-lg text-on-surface mb-6">{t('gallery.title')}</h2>
        <p className="text-on-surface-variant text-body-lg">{t('gallery.subtitle')}</p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex flex-wrap justify-center gap-4 mb-16"
      >
        {categories.map((cat) => (
          <button 
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`${
              activeCategory === cat.id 
                ? 'bg-secondary text-on-secondary border border-secondary' 
                : 'border border-outline text-on-surface-variant hover:border-secondary hover:text-secondary glass-panel'
            } font-label-md text-label-md uppercase tracking-wider px-6 py-2 rounded-full transition-all duration-300`}
          >
            {cat.label}
          </button>
        ))}
      </motion.div>

      <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6 w-full">
        <AnimatePresence mode="popLayout">
          {GALLERY_IMAGES.filter(img => activeCategory === 'todos' || img.category === activeCategory).map((img, i) => (
            <motion.div 
              key={img.src}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5 }}
              className="relative group overflow-hidden rounded-xl break-inside-avoid"
            >
              <img 
                className={`w-full h-auto object-cover ${img.aspect} transition-transform duration-700 group-hover:scale-105`} 
                src={img.src} 
                alt={img.alt} 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                <span className="font-headline-md text-headline-md text-on-surface translate-y-4 group-hover:translate-y-0 transition-transform duration-300">{img.alt}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
