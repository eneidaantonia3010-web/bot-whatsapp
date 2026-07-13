'use client';

import { AnimatedSection } from '@/components/AnimatedSection';
import { Hero } from '@/components/sections/Hero';
import { Services } from '@/components/sections/Services';
import { Gallery } from '@/components/sections/Gallery';
import { Team } from '@/components/sections/Team';
import { Testimonials } from '@/components/sections/Testimonials';
import { BookingCalendar } from '@/components/sections/BookingCalendar';
import { Chatbot } from '@/components/Chatbot';

export default function Home() {
  return (
    <>
      <Hero />

      <AnimatedSection>
        <Services />
      </AnimatedSection>

      <AnimatedSection>
        <Gallery />
      </AnimatedSection>

      <AnimatedSection>
        <Team />
      </AnimatedSection>

      <AnimatedSection>
        <Testimonials />
      </AnimatedSection>

      <AnimatedSection>
        <BookingCalendar />
      </AnimatedSection>

      <Chatbot />
    </>
  );
}
