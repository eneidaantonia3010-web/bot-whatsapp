'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { Star, Quotes, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { TESTIMONIALS } from '@/lib/constants';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

export function Testimonials() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'center' },
    [Autoplay({ delay: 5000, stopOnInteraction: true })]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  return (
    <section id="testimonios" className="section-padding bg-[var(--color-bg)] overflow-hidden">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-16"
      >
        <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-[var(--color-ink-muted)] mb-4">
          Testimonios
        </span>
        <h2 
          className="text-4xl md:text-5xl lg:text-6xl font-semibold text-[var(--color-ink)] mb-6 tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Lo que dicen <span className="text-[var(--color-ink-muted)] italic font-light">ellas</span>
        </h2>
        <p className="text-[var(--color-ink-light)] max-w-lg mx-auto text-lg">
          La mejor publicidad es una clienta feliz. Estas son algunas de sus experiencias.
        </p>
      </motion.div>

      {/* Carousel */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
        whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-5xl mx-auto relative"
      >
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {TESTIMONIALS.map((testimonial) => (
              <div
                key={testimonial.id}
                className="flex-[0_0_100%] min-w-0 px-4 md:flex-[0_0_80%] lg:flex-[0_0_60%]"
              >
                <div className="bg-[var(--color-surface)] rounded-[var(--radius-2xl)] p-8 md:p-12 shadow-[var(--shadow-soft)] border border-[var(--color-bg-alt)] relative hover:shadow-[var(--shadow-lifted)] transition-all duration-500">
                  {/* Quote Icon */}
                  <Quotes weight="fill" className="absolute top-8 right-8 w-12 h-12 text-[var(--color-bg-alt)] rotate-180" />

                  {/* Stars */}
                  <div className="flex gap-1 mb-8">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        weight={i < testimonial.rating ? "fill" : "regular"}
                        className={`w-5 h-5 ${
                          i < testimonial.rating
                            ? 'text-[var(--color-accent)]'
                            : 'text-[var(--color-ink-muted)] opacity-30'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Text */}
                  <p className="text-[var(--color-ink)] text-lg md:text-xl leading-relaxed mb-10 font-medium">
                    &ldquo;{testimonial.text}&rdquo;
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-4">
                    <div className="relative w-14 h-14 rounded-full overflow-hidden border border-[var(--color-bg-alt)] bg-[var(--color-bg)]">
                      <Image
                        src={testimonial.imageUrl}
                        alt={testimonial.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--color-ink)]">{testimonial.name}</p>
                      <p className="text-sm text-[var(--color-ink-muted)] uppercase tracking-wide text-xs mt-0.5">{testimonial.service}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        <button
          onClick={scrollPrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-6 w-12 h-12 rounded-full bg-[var(--color-surface)] shadow-[var(--shadow-soft)] border border-[var(--color-bg-alt)] flex items-center justify-center hover:bg-[var(--color-ink)] hover:text-[var(--color-white)] text-[var(--color-ink)] transition-colors z-10"
          aria-label="Anterior"
        >
          <CaretLeft weight="bold" className="w-5 h-5" />
        </button>
        <button
          onClick={scrollNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-6 w-12 h-12 rounded-full bg-[var(--color-surface)] shadow-[var(--shadow-soft)] border border-[var(--color-bg-alt)] flex items-center justify-center hover:bg-[var(--color-ink)] hover:text-[var(--color-white)] text-[var(--color-ink)] transition-colors z-10"
          aria-label="Siguiente"
        >
          <CaretRight weight="bold" className="w-5 h-5" />
        </button>

        {/* Dots */}
        <div className="flex justify-center gap-3 mt-10">
          {TESTIMONIALS.map((_, index) => (
            <button
              key={index}
              onClick={() => emblaApi?.scrollTo(index)}
              className={`h-2 rounded-full transition-all duration-500 ease-out ${
                index === selectedIndex
                  ? 'bg-[var(--color-ink)] w-8'
                  : 'bg-[var(--color-bg-alt)] hover:bg-[var(--color-ink-muted)] w-2'
              }`}
              aria-label={`Ir al testimonio ${index + 1}`}
            />
          ))}
        </div>
      </motion.div>
    </section>
  );
}
