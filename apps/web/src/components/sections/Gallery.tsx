'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { X, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useTranslation } from '@/i18n/I18nContext';

const GALLERY_IMAGES = [
  { 
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBkAxZeh7GVbGTZLlu9QPwzA1hoOhahSCpP22JSMVSBQo_6YGopokxzzZX5KPs2vVTTZNBIFPEMesxUm-W9-7SeLEMd10vYx5k7DwhdlQ47lfE3cke6aqlAN2sxn5tEFzlyEBVZEdQGkjFjpQ4PjAZYRDHavjPF9MbGb9FoQTd83c5pCpXAhBtNp-kXh80S2PKMHypfMdwfYmk2lNXX_wuxQ07Ap0IQtg13J5jiAAjLmboa3gHVYJYsNz_VotzS6k5M_JSRzJKeZKQ',
    alt: 'Interior del salón', 
    category: 'salon',
    aspect: 'aspect-[4/5]'
  },
  { 
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB_x8nL6GNOFHRlSRZWh04GKA6Q0CAuOH-dy4sH8Fdg3VE8kyRb3sqYP0szBkF3W5fnXcmagMmn78b75AzlL0Zt9cngYgo2RJh97n4YzDaOEuIh8wB5hdr2hHYGlj87Bxf795sBPol6d_J-2KoDedUpD-mXo2p2h4hS8GPUAsGK7fgILmsYg8RRAUaOHZhJ96ecP7XLHh5AhCiWlhevMCqj7Nl-KWb6jsMUmEcbU84lvlwzhjAni8SDwcJkOPmjr-Dv_M65QrvpcEU',
    alt: 'Área de lavado premium', 
    category: 'salon',
    aspect: 'aspect-square'
  },
  { 
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDq2IL3MDNxYyVwMqlwcyhoMMituG7WcLFYWk-wjIUK7nGYzQnrw9W7yl1BEFuuEmPQkYFTa-YZX7qqgbjn7M5TDWdWHAt11ZLPNfuJAjNF6K3f8OxgWV9rwH2QP3DW4ctbsIcLDSl50VPfiMdWayq1nVNYQmYO5UC2AcsQCcoJKWyTMuaBA_XlN3WazVkC2mTHhf09iIGaBI_HIWtYaDPjm_sBMDKYY592ZZ_seY9vn6wCoCXIjxXhKJSqWYpusFLjpwc8J_MM-og',
    alt: 'Coloración profesional', 
    category: 'cabello',
    aspect: 'aspect-[3/4]'
  },
  { 
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCjwwfX3M-5_uNYjwmY-SX_Y_0zdyULznWKemN0YISwfz50avZKCIMxmroBYyVKPXCxjXckOO1sRzPaoWIlIiGEjB0DQqM9-CIAi4s5wj9cG_C20MVH8-KaqEApb7Qmikx1Fz8YAUOTJFSX2tfn6x5vKyOyucHIkVga30fZr-tDnpeg_EYS_n4W5wtcYhGylO6RQ6vN6XAN-YP051_MNU7-KPI0YKuyB9jEFVOO6DFBouhWcuklPtd8jPRDKmMHV8VUaYARaxTJVKI',
    alt: 'Uñas gel diseño floral', 
    category: 'unas',
    aspect: 'aspect-square'
  },
  { 
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDihK9O8iuE99PxOPDt-NxQ_z3rgZex6U2dQ8SdYOCw2dl3ESYiRpEVGjl9V2n3dYTlq5RSMaoL0HvIszVj0QmZCmvbXiQx18gv0qmnhE-CIbtM5D0OMNeGI1pWCG5dWAkUqAGznKHcXQXMXUuybK1DxC5U70qPHruyjX1pTiDDXl5iVcFDgbZ1VX-zJA0nmUB1S0Z8N1fo0qwfm55M5oJI22-VsshrQRPZAntjRJ-PP-o2TSeEN_G8ZrjVP0SfoiDCK9lF8TioHDA',
    alt: 'Facial glow treatment', 
    category: 'facial',
    aspect: 'aspect-[4/5]'
  },
  { 
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDZbJWmvXUmXQvBNaz9fg7Pejhq8r40PZ2wsKNXku96cGz2hTx_g8Xi37wXUNB0PnAl9-TEOWTLuMyLVFPpJLw6qs4UHpkQd_YbO60YXDWLwZJ7jrv_aK77KZSxaYlswVObXLVMhLIrlaRxo14mdWDXxiMbMDr928q906eyL6c9RQXjPQts06RDlr1DxmQhDConV9ME60TrOY0DWIMwcwx11xVHwqK4qrZRKwBqGgSyOMxH3b9MUj1sIb19PRH2Im0CwftORSCJmt4',
    alt: 'Productos premium', 
    category: 'salon',
    aspect: 'aspect-[3/4]'
  },
  { 
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDsebpxaz3rb6NqZhLyNV-hs9YUtZ21Q1pfondbcxD0MhQD8LW5sjE0uAwBIJ2Ttpip80z1u1aEjYZ5beErN2f1DKF3qQCdEUkuDU4ctlBzEkSEcQIFo0mFPVhXN2xKAZGDm0PvWWcvF0ZPHB1onzlGUIRhrwSKsEwBUKSnvTvkuVKzX1aPVVSebFEv8QcLaV72KdjVwYTMEuYTgNYfRgUYpJDcdYabw8w7BoyaAyntDEa1sWh6zdtfr4EykLkGaid-w4IQZQZXPmo',
    alt: 'Brushing perfecto', 
    category: 'cabello',
    aspect: 'aspect-square'
  },
  { 
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD46IhOWrDfrt2gbO0uuECfyxIA4uoqav8r9KU__RJuiq8Wbx7ZDPt9J-PdN0JMJV4ofWn21eeejmKRm6AcgPx55ebWCurd6rXcE6OOXsMyES2OhvTUdD7b58xaVXRscT8OGRJ1greVhlkEw6TM7ARRccuEJ1Y_t791AkTUGgviL9GCAYc0IC4CtJVdVkiPLbCnhD_vCI-HUibkICfMOiYI-97Xe-qtNYZn3UXwTOYDpCOgalqSvEDO3_-x7s3Vv3XGex5iTrWI_c8',
    alt: 'Esmaltado semi pastel', 
    category: 'unas',
    aspect: 'aspect-[4/5]'
  },
  { 
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBvIvGKBWBmlLLSI5Cjs6wwoEs-9i7SBN_LzGCXxg4QsMgbeYqKGLPxLcNkEicR4AwoJJ2lmiQllkyPnA4bUL00qREgKkZyqZmxEJ5QayIN8fjjAmI7PJuTZSYGrxOdc7gw2IGucxdvu3iHeQfLoLUcPuH91fyNecUg70l6yFa0pcxHiR8Ndmlgp0TU7TPpT5ex242qBufrdHxHiEOkgI5cTflypv-ddJHDENL1ccBE3fL20fiZrO9pe75LDe-k3Z-kLBv5msrw-Ho',
    alt: 'Mascarilla hidratante', 
    category: 'facial',
    aspect: 'aspect-square'
  },
];

export function Gallery() {
  const [activeCategory, setActiveCategory] = useState('todos');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { t } = useTranslation();

  const categories = [
    { id: 'todos', label: 'Todos los Trabajos' },
    { id: 'cabello', label: 'Balayage & Color' },
    { id: 'unas', label: 'Diseño de Uñas' },
    { id: 'pestanas', label: 'Lifting & Cejas' },
    { id: 'facial', label: 'Limpieza Facial' },
  ];

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
    <section id="galeria" className="w-full max-w-[1200px] mx-auto px-6 pt-28 pb-20 flex flex-col items-center relative">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#df006e]/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-16">
        <span className="inline-block border border-[#df006e] text-[#ffb1c5] text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
          NUESTRO TRABAJO
        </span>
        <h2 
          className="text-4xl md:text-6xl font-bold text-[#e1e3e4] mb-6 tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Galería de Inspiración
        </h2>
        <p className="text-[#c8c5cb] text-lg max-w-lg mx-auto">
          Cada servicio es una obra de arte. Mirá lo que hacemos y dejate inspirar.
        </p>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap justify-center gap-4 mb-16">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`text-xs font-semibold uppercase tracking-wider px-6 py-2.5 rounded-full transition-all duration-300 ${
              activeCategory === cat.id
                ? 'bg-[#df006e] text-white shadow-[0_0_20px_rgba(223,0,110,0.4)]'
                : 'border border-[#47464b] text-[#c8c5cb] hover:border-[#df006e] hover:text-[#ffb1c5] bg-white/[0.03] backdrop-blur-md'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Gallery Masonry Grid */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6 w-full">
        <AnimatePresence mode="popLayout">
          {filtered.map((image, index) => (
            <motion.div
              key={image.url}
              layout
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5, delay: (index % 3) * 0.1 }}
              className="break-inside-avoid"
            >
              <div
                onClick={() => openLightbox(index)}
                className="relative group overflow-hidden rounded-xl cursor-pointer border border-white/10 bg-[#191c1d]"
              >
                <Image
                  src={image.url}
                  alt={image.alt}
                  width={600}
                  height={750}
                  className={`w-full h-auto object-cover ${image.aspect} transition-transform duration-700 group-hover:scale-105`}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  unoptimized
                />
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c0f10]/90 via-[#0c0f10]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6 z-10">
                  <span 
                    className="text-xl font-semibold text-white translate-y-4 group-hover:translate-y-0 transition-transform duration-300"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {image.alt}
                  </span>
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
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4"
            onClick={closeLightbox}
          >
            <button
              onClick={closeLightbox}
              className="absolute top-6 right-6 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
            >
              <X className="w-6 h-6" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 md:left-8 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
            >
              <CaretLeft className="w-6 h-6" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 md:right-8 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
            >
              <CaretRight className="w-6 h-6" />
            </button>

            <div className="relative max-w-4xl max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
              <Image
                src={filtered[lightboxIndex].url}
                alt={filtered[lightboxIndex].alt}
                width={1200}
                height={900}
                className="rounded-xl object-contain max-h-[80vh] w-auto mx-auto border border-white/10"
                unoptimized
              />
              <p className="text-center text-white/80 text-base mt-4 font-medium" style={{ fontFamily: 'var(--font-display)' }}>
                {filtered[lightboxIndex].alt}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

