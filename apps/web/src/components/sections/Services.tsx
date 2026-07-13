'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { Clock, Sparkle, ArrowRight } from '@phosphor-icons/react';
import { SERVICES_STATIC, CATEGORIES } from '@/lib/constants';
import { formatPrice, formatDuration } from '@/lib/utils';
import { StaggerContainer, StaggerItem } from '@/components/AnimatedSection';

export function Services() {
  const [activeCategory, setActiveCategory] = useState('todos');

  const filtered =
    activeCategory === 'todos'
      ? SERVICES_STATIC
      : SERVICES_STATIC.filter((s) => s.category === activeCategory);

  return (
    <section id="servicios" className="section-padding bg-[var(--color-bg)] relative overflow-hidden">
      {/* Abstract Background Element */}
      <div className="absolute -left-40 top-40 w-96 h-96 bg-[var(--color-accent)] opacity-[0.02] rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="text-center mb-16 relative z-10">
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-[var(--color-ink-muted)] mb-4"
        >
          Nuestros Tratamientos
        </motion.span>
        <h2 
          className="text-4xl md:text-5xl lg:text-6xl font-semibold text-[var(--color-ink)] mb-6 tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Arte en cada <span className="text-[var(--color-ink-muted)] italic font-light">detalle</span>
        </h2>
        <p className="text-[var(--color-ink-light)] max-w-lg mx-auto text-lg">
          Experimentá protocolos de belleza diseñados para resultados excepcionales.
        </p>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap justify-center gap-3 mb-12 relative z-10">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
              activeCategory === cat.id
                ? 'bg-[var(--color-ink)] text-[var(--color-white)] shadow-[var(--shadow-soft)]'
                : 'bg-[var(--color-bg-alt)] text-[var(--color-ink-light)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] hover:shadow-sm'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Bento Grid */}
      <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto relative z-10 px-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((service, index) => {
            // Logic for asymmetrical bento grid
            const isFeatured = index === 0 || index === 3;
            return (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                key={service.name}
                className={`group bg-[var(--color-surface)] rounded-[var(--radius-2xl)] overflow-hidden shadow-[var(--shadow-soft)] border border-[var(--color-bg-alt)] hover:shadow-[var(--shadow-lifted)] transition-all duration-500 flex flex-col ${
                  isFeatured ? 'md:col-span-2' : 'col-span-1'
                }`}
              >
                {/* Image Area */}
                <div className={`relative w-full ${isFeatured ? 'h-64 md:h-80' : 'h-56'} overflow-hidden bg-[var(--color-bg-alt)]`}>
                  <Image
                    src={service.imageUrl || ''}
                    alt={service.name}
                    fill
                    className="object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105"
                    sizes={isFeatured ? "(max-width: 768px) 100vw, 66vw" : "(max-width: 768px) 100vw, 33vw"}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink)]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Category Badge */}
                  <div className="absolute top-4 left-4 z-10">
                    <span className="px-3 py-1.5 glass rounded-full text-xs font-semibold text-[var(--color-ink)] tracking-wide uppercase">
                      {service.category === 'unas' ? 'Uñas' : service.category}
                    </span>
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-6 md:p-8 flex flex-col flex-grow justify-between">
                  <div>
                    <h3 
                      className="text-2xl font-semibold text-[var(--color-ink)] mb-3 group-hover:text-[var(--color-accent)] transition-colors duration-300"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {service.name}
                    </h3>
                    <p className="text-[var(--color-ink-muted)] mb-6 line-clamp-2 leading-relaxed">
                      {service.description}
                    </p>
                  </div>

                  {/* Meta / Booking */}
                  <div className="flex items-center justify-between pt-5 border-t border-[var(--color-bg-alt)]">
                    <div className="flex flex-col gap-1">
                      <span className="text-xl font-semibold text-[var(--color-ink)]">
                        {formatPrice(service.price)}
                      </span>
                      <div className="flex items-center gap-1.5 text-[var(--color-ink-muted)] text-xs font-medium uppercase tracking-wide">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDuration(service.duration)}</span>
                      </div>
                    </div>
                    
                    <button className="w-10 h-10 rounded-full bg-[var(--color-bg-alt)] flex items-center justify-center text-[var(--color-ink)] group-hover:bg-[var(--color-ink)] group-hover:text-[var(--color-white)] transition-colors duration-300">
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Bottom CTA */}
      <div className="text-center mt-20 relative z-10">
        <a
          href="#reservar"
          className="double-bezel inline-block group"
        >
          <div className="double-bezel-inner bg-[var(--color-surface)] text-[var(--color-ink)] px-8 py-4 text-sm font-medium hover:bg-[var(--color-ink)] hover:text-[var(--color-white)] transition-all duration-300 flex items-center justify-center gap-2">
            <Sparkle weight="fill" className="w-4 h-4 text-[var(--color-accent)] group-hover:text-[var(--color-white)] transition-colors" />
            Explorar Catálogo Completo
          </div>
        </a>
      </div>
    </section>
  );
}
