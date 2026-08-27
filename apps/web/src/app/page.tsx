'use client';

import { AnimatedSection } from '@/components/AnimatedSection';
import { Hero } from '@/components/sections/Hero';
import { Services } from '@/components/sections/Services';
import { BookingWizard } from '@/components/booking/BookingWizard';
import { Gallery } from '@/components/sections/Gallery';
import { Team } from '@/components/sections/Team';
import { Testimonials } from '@/components/sections/Testimonials';
import { Chatbot } from '@/components/Chatbot';

export default function Home() {
  return (
    <>
      <Hero />

      <AnimatedSection>
        <Services />
      </AnimatedSection>

      <section className="py-20 px-4 sm:px-6 relative">
        <div className="absolute inset-0 bg-radial-gradient opacity-30 pointer-events-none" />
        <AnimatedSection>
          <BookingWizard />
        </AnimatedSection>
      </section>

      <AnimatedSection>
        <Gallery />
      </AnimatedSection>

      <AnimatedSection>
        <Team />
      </AnimatedSection>

      <AnimatedSection>
        <Testimonials />
      </AnimatedSection>

      <Chatbot />
    </>
  );
}
