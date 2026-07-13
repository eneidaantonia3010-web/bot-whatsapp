// ============================================
// Glow Studio by Sofia — Constants
// ============================================

import { TeamMember, Testimonial, Service } from '@/types';

export const SALON = {
  name: 'Glow Studio',
  fullName: 'Glow Studio by Sofia',
  slogan: 'Donde tu belleza brilla',
  heroTagline: 'Tu momento de brillar',
  heroSubtext: 'Descubrí una experiencia de belleza única. Tratamientos premium en un espacio diseñado para que te sientas especial.',
  address: 'Av. Corrientes 1234, Buenos Aires',
  phone: '+54 11 5555-4444',
  whatsapp: 'https://wa.me/5411555544444',
  instagram: 'https://instagram.com/glowstudiobysofia',
  email: 'hola@glowstudio.com',
  hours: 'Lunes a Sábado 9:00 a 19:00',
  hoursDetail: [
    { day: 'Lunes a Viernes', hours: '9:00 — 19:00' },
    { day: 'Sábados', hours: '9:00 — 19:00' },
    { day: 'Domingos', hours: 'Cerrado' },
  ],
} as const;

export const CATEGORIES = [
  { id: 'todos', label: 'Todos' },
  { id: 'cabello', label: 'Cabello' },
  { id: 'unas', label: 'Uñas' },
  { id: 'facial', label: 'Facial' },
  { id: 'tratamientos', label: 'Tratamientos' },
] as const;

export const TEAM: TeamMember[] = [
  {
    name: 'Sofía García',
    role: 'Fundadora & Estilista Senior',
    bio: 'Con más de 15 años de experiencia, Sofía creó Glow Studio para ofrecer una experiencia de belleza que transforme no solo tu look, sino tu día completo.',
    imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face',
  },
  {
    name: 'Camila Torres',
    role: 'Especialista en Color',
    bio: 'Experta en balayage y coloración artística. Camila transforma tu cabello en una obra de arte personalizada.',
    imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
  },
  {
    name: 'Valentina Ruiz',
    role: 'Nail Artist',
    bio: 'Artista de uñas certificada internacionalmente. Sus diseños combinan tendencias globales con un toque único.',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
  },
  {
    name: 'Lucía Méndez',
    role: 'Especialista en Skincare',
    bio: 'Cosmetóloga profesional con enfoque en tratamientos faciales rejuvenecedores y técnicas de vanguardia.',
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=face',
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 1,
    name: 'Martina García',
    text: 'Increíble experiencia. El Facial Glow me dejó la piel como nueva. El ambiente del salón es hermoso y las chicas son súper profesionales. ¡Vuelvo siempre!',
    rating: 5,
    imageUrl: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=200&h=200&fit=crop&crop=face',
    service: 'Facial Glow',
  },
  {
    id: 2,
    name: 'Isabella Martínez',
    text: 'Mis uñas quedaron perfectas. El diseño que me hizo Valentina es único, no lo vi en ningún otro salón. Y la atención es 10/10.',
    rating: 5,
    imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face',
    service: 'Uñas Gel Luxury',
  },
  {
    id: 3,
    name: 'Renata Ruiz',
    text: 'El tratamiento de keratina cambió mi vida. Después de años peleando con el frizz, por fin tengo el cabello que siempre quise. ¡Gracias Glow Studio!',
    rating: 5,
    imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop&crop=face',
    service: 'Anti-frizz Keratina',
  },
  {
    id: 4,
    name: 'Florencia Moreno',
    text: 'Sofía es una genia. Mi corte quedó exactamente como lo quería. El lavado con masaje incluido es lo mejor, super relajante.',
    rating: 5,
    imageUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop&crop=face',
    service: 'Corte Signature',
  },
  {
    id: 5,
    name: 'Agustina Álvarez',
    text: 'Reservé por Instagram y fue super fácil. Me contestaron al toque, me dieron turno para el mismo día. El esmaltado semi dura semanas. Lo recomiendo 100%.',
    rating: 4,
    imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop&crop=face',
    service: 'Esmaltado Semi Pro',
  },
];

export const SERVICES_STATIC: Omit<Service, 'id' | 'active' | 'order'>[] = [
  {
    name: 'Corte Signature',
    description: 'Nuestro corte estrella. Incluye lavado, corte personalizado y brushing profesional.',
    price: 25000,
    duration: 45,
    category: 'cabello',
    imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=600&fit=crop',
  },
  {
    name: 'Corte Hombre Premium',
    description: 'Corte masculino de precisión con toalla caliente, masaje capilar y finalizado premium.',
    price: 15000,
    duration: 30,
    category: 'cabello',
    imageUrl: 'https://images.unsplash.com/photo-1503951914875-452b3f8dbeab?w=800&h=600&fit=crop',
  },
  {
    name: 'Uñas Gel Luxury',
    description: 'Esmaltado en gel con diseño artístico incluido. Duración garantizada de 3 semanas.',
    price: 28000,
    duration: 75,
    category: 'unas',
    imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&h=600&fit=crop',
  },
  {
    name: 'Esmaltado Semi Pro',
    description: 'Esmaltado semipermanente profesional. Secado UV, acabado espejo.',
    price: 18000,
    duration: 45,
    category: 'unas',
    imageUrl: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=800&h=600&fit=crop',
  },
  {
    name: 'Facial Glow',
    description: 'Limpieza profunda, exfoliación enzimática, hidratación con ácido hialurónico y masaje facial.',
    price: 35000,
    duration: 60,
    category: 'facial',
    imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&h=600&fit=crop',
  },
  {
    name: 'Tratamiento Anti-frizz Keratina',
    description: 'Alisado con keratina brasileña premium. Elimina el frizz por hasta 4 meses.',
    price: 45000,
    duration: 120,
    category: 'tratamientos',
    imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=600&fit=crop',
  },
];

export const NAV_LINKS = [
  { href: '#servicios', label: 'Servicios' },
  { href: '#galeria', label: 'Galería' },
  { href: '#equipo', label: 'Equipo' },
  { href: '#testimonios', label: 'Testimonios' },
  { href: '#reservar', label: 'Reservar' },
] as const;

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
