'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { X, CaretLeft, CaretRight } from '@phosphor-icons/react';

const GALLERY_CATEGORIES = [
  { id: 'todos', label: 'Todos' },
  { id: 'salon', label: 'Salón' },
  { id: 'cabello', label: 'Cabello' },
  { id: 'unas', label: 'Uñas' },
  { id: 'facial', label: 'Facial' },
  { id: 'ambiente', label: 'Ambiente' },
];

const GALLERY_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=1000&fit=crop', alt: 'Interior del salón', category: 'salon' },
  { url: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&h=600&fit=crop', alt: 'Área de lavado premium', category: 'salon' },
  { url: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&h=1000&fit=crop', alt: 'Coloración profesional', category: 'cabello' },
  { url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&h=800&fit=crop', alt: 'Uñas gel diseño floral', category: 'unas' },
  { url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&h=600&fit=crop', alt: 'Facial glow treatment', category: 'facial' },
  { url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=600&fit=crop', alt: 'Productos premium', category: 'salon' },
  { url: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=800&h=600&fit=crop', alt: 'Brushing perfecto', category: 'cabello' },
  { url: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=800&h=600&fit=crop', alt: 'Esmaltado semi pastel', category: 'unas' },
  { url: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800&h=1000&fit=crop', alt: 'Mascarilla hidratante', category: 'facial' },
  { url: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&h=1000&fit=crop', alt: 'Corte moderno', category: 'cabello' },
  { url: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&h=800&fit=crop', alt: 'French manicure elegante', category: 'unas' },
  { url: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600&h=800&fit=crop', alt: 'Limpieza profunda', category: 'facial' },
  { url: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=800&h=600&fit=crop', alt: 'Peinado de evento', category: 'cabello' },
  { url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=600&h=800&fit=crop', alt: 'Nail art premium', category: 'unas' },
  { url: '/images/rincon_relajacion.png', alt: 'Rincón de relajación', category: 'ambiente' },
  { url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&h=600&fit=crop', alt: 'Skincare premium', category: 'facial' },
  { url: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=800&h=1000&fit=crop', alt: 'Mechas balayage', category: 'cabello' },
  { url: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800&h=600&fit=crop', alt: 'Flores frescas del salón', category: 'ambiente' },
];

export function Gallery() {
  const [activeCategory, setActiveCategory] = useState('todos');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filtered =
    activeCategory === 'todos'
      ? GALLERY_IMAGES
      : GALLERY_IMAGES.filter((img) => img.category === activeCategory);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const nextImage = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % filtered.length);
    }
  };

  const prevImage = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + filtered.length) % filtered.length);
    }
  };

  return (
    <section id="galeria" className="section-padding bg-[var(--color-bg-alt)]">
      {/* Header */}
      <div className="text-center mb-16">
        <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-[var(--color-ink-muted)] mb-4">
          Nuestro Trabajo
        </span>
        <h2 
          className="text-4xl md:text-5xl lg:text-6xl font-semibold text-[var(--color-ink)] mb-6 tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Galería de <span className="text-[var(--color-ink-muted)] italic font-light">Inspiración</span>
        </h2>
        <p className="text-[var(--color-ink-light)] max-w-lg mx-auto text-lg">
          Cada servicio es una obra de arte. Mirá lo que hacemos y dejate inspirar.
        </p>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap justify-center gap-3 mb-12">
        {GALLERY_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
              activeCategory === cat.id
                ? 'bg-[var(--color-ink)] text-[var(--color-white)]'
                : 'bg-[var(--color-surface)] text-[var(--color-ink-light)] hover:text-[var(--color-ink)]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Masonry Grid with Scroll Reveal */}
      <div className="columns-2 md:columns-3 lg:columns-4 gap-4 max-w-7xl mx-auto px-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((image, index) => (
            <motion.div
              key={image.url}
              layout
              initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, margin: "-50px" }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.7, delay: (index % 4) * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="mb-4 break-inside-avoid"
            >
              <div
                onClick={() => openLightbox(index)}
                className="group relative rounded-[var(--radius-xl)] overflow-hidden cursor-pointer bg-[var(--color-bg)]"
              >
                <Image
                  src={image.url}
                  alt={image.alt}
                  width={400}
                  height={image.url.includes('1000') ? 500 : image.url.includes('900') ? 450 : image.url.includes('800') ? 400 : 300}
                  className="w-full h-auto object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-110"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                />
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink)]/90 via-[var(--color-ink)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end justify-center z-10 w-full h-full">
                  <div className="p-6 pb-8 w-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 ease-out flex flex-col justify-end items-center text-center">
                    <p className="text-[var(--color-white)] text-sm md:text-base font-semibold drop-shadow-md break-words w-full px-4">
                      {image.alt}
                    </p>
                    <p className="text-[var(--color-white)]/90 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] mt-2 drop-shadow-md break-words w-full px-4">
                      {image.category === 'unas' ? 'Uñas' : image.category === 'salon' ? 'Salón' : image.category}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && filtered[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[var(--color-ink)]/95 backdrop-blur-xl flex items-center justify-center"
            onClick={closeLightbox}
          >
            {/* Close Button */}
            <button
              onClick={closeLightbox}
              className="absolute top-6 right-6 z-10 w-12 h-12 rounded-full bg-[var(--color-white)]/10 hover:bg-[var(--color-white)]/20 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-[var(--color-white)]" />
            </button>

            {/* Navigation */}
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 md:left-8 z-10 w-14 h-14 rounded-full bg-[var(--color-white)]/10 hover:bg-[var(--color-white)]/20 flex items-center justify-center transition-colors backdrop-blur-md"
            >
              <CaretLeft className="w-6 h-6 text-[var(--color-white)]" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 md:right-8 z-10 w-14 h-14 rounded-full bg-[var(--color-white)]/10 hover:bg-[var(--color-white)]/20 flex items-center justify-center transition-colors backdrop-blur-md"
            >
              <CaretRight className="w-6 h-6 text-[var(--color-white)]" />
            </button>

            {/* Image */}
            <motion.div
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative max-w-5xl max-h-[85vh] mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-2 bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-2xl">
                <Image
                  src={filtered[lightboxIndex].url}
                  alt={filtered[lightboxIndex].alt}
                  width={1200}
                  height={800}
                  className="rounded-[var(--radius-lg)] object-contain max-h-[80vh] w-auto mx-auto"
                  sizes="90vw"
                />
              </div>
              <p className="text-center text-[var(--color-white)]/70 text-sm mt-6 font-medium">
                {filtered[lightboxIndex].alt}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
