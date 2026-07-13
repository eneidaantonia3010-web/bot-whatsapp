// ============================================
// Glow Studio by Sofia — Database Seed
// ============================================

import { PrismaClient, Role, AppointmentStatus, Platform, MessageDirection } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ---- ADMIN USER ----
  const admin = await prisma.user.upsert({
    where: { email: 'sofia@glowstudio.com' },
    update: {},
    create: {
      email: 'sofia@glowstudio.com',
      name: 'Sofia García',
      password: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36zQv2s1mDEQYfO37VMJhxO', // hashed "admin123"
      role: Role.ADMIN,
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
    },
  });
  console.log(`✅ Admin user created: ${admin.email}`);

  // ---- SERVICES ----
  const servicesData = [
    {
      name: 'Corte Signature',
      description: 'Nuestro corte estrella. Incluye lavado, corte personalizado y brushing profesional. Una experiencia completa para renovar tu look.',
      price: 25000,
      duration: 45,
      category: 'cabello',
      imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=600&fit=crop',
      order: 1,
    },
    {
      name: 'Corte Hombre Premium',
      description: 'Corte masculino de precisión con toalla caliente, masaje capilar y finalizado con productos premium.',
      price: 15000,
      duration: 30,
      category: 'cabello',
      imageUrl: 'https://images.unsplash.com/photo-1503951914875-452b3f8dbeab?w=800&h=600&fit=crop',
      order: 2,
    },
    {
      name: 'Uñas Gel Luxury',
      description: 'Esmaltado en gel con diseño artístico incluido. Duración garantizada de 3 semanas. Amplia carta de colores.',
      price: 28000,
      duration: 75,
      category: 'unas',
      imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&h=600&fit=crop',
      order: 3,
    },
    {
      name: 'Esmaltado Semi Pro',
      description: 'Esmaltado semipermanente profesional. Secado UV, acabado espejo. Ideal para el día a día.',
      price: 18000,
      duration: 45,
      category: 'unas',
      imageUrl: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=800&h=600&fit=crop',
      order: 4,
    },
    {
      name: 'Facial Glow',
      description: 'Tratamiento facial completo: limpieza profunda, exfoliación enzimática, hidratación con ácido hialurónico y masaje facial.',
      price: 35000,
      duration: 60,
      category: 'facial',
      imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&h=600&fit=crop',
      order: 5,
    },
    {
      name: 'Tratamiento Anti-frizz Keratina',
      description: 'Alisado con keratina brasileña premium. Elimina el frizz por hasta 4 meses. Cabello sedoso y manejable.',
      price: 45000,
      duration: 120,
      category: 'tratamientos',
      imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=600&fit=crop',
      order: 6,
    },
  ];

  const services = [];
  for (const data of servicesData) {
    const service = await prisma.service.create({ data });
    services.push(service);
    console.log(`✅ Service: ${service.name} — $${service.price.toLocaleString()}`);
  }

  // ---- CUSTOMERS ----
  const customersData = [
    { name: 'Valentina López', phone: '+5411555501', email: 'valentina@email.com', instagram: '@vale.lopez' },
    { name: 'Camila Rodríguez', phone: '+5411555502', email: 'camila@email.com', instagram: '@cami.rod' },
    { name: 'Martina García', phone: '+5411555503', email: 'martina@email.com', instagram: '@martigarcia' },
    { name: 'Sofía Fernández', phone: '+5411555504', email: 'sofia.f@email.com', instagram: '@sofi.fern' },
    { name: 'Isabella Martínez', phone: '+5411555505', email: 'isabella@email.com', instagram: '@isa.martinez' },
    { name: 'Lucía Gómez', phone: '+5411555506', email: 'lucia@email.com', instagram: '@lu.gomez' },
    { name: 'Catalina Díaz', phone: '+5411555507', email: 'catalina@email.com', instagram: '@cata.diaz' },
    { name: 'Emilia Sánchez', phone: '+5411555508', email: 'emilia@email.com', instagram: '@emi.sanchez' },
    { name: 'Julieta Torres', phone: '+5411555509', email: 'julieta@email.com', instagram: '@juli.torres' },
    { name: 'Renata Ruiz', phone: '+5411555510', email: 'renata@email.com', instagram: '@rena.ruiz' },
    { name: 'Florencia Moreno', phone: '+5411555511', email: 'flor@email.com', instagram: '@flor.moreno' },
    { name: 'Agustina Álvarez', phone: '+5411555512', email: 'agustina@email.com', instagram: '@agus.alvarez' },
    { name: 'Milagros Romero', phone: '+5411555513', email: 'mili@email.com', instagram: '@mili.romero' },
    { name: 'Bianca Acosta', phone: '+5411555514', email: 'bianca@email.com', instagram: '@bian.acosta' },
    { name: 'Delfina Herrera', phone: '+5411555515', email: 'delfina@email.com', instagram: '@delfi.herrera' },
    { name: 'Alma Medina', phone: '+5411555516', email: 'alma@email.com', instagram: '@alma.medina' },
    { name: 'Olivia Castro', phone: '+5411555517', email: 'olivia@email.com', instagram: '@oli.castro' },
    { name: 'Mía Vargas', phone: '+5411555518', email: 'mia@email.com', instagram: '@mia.vargas' },
    { name: 'Antonella Flores', phone: '+5411555519', email: 'anto@email.com', instagram: '@anto.flores' },
    { name: 'Lola Benítez', phone: '+5411555520', email: 'lola@email.com', instagram: '@lola.benitez' },
  ];

  const customers = [];
  for (const data of customersData) {
    const customer = await prisma.customer.create({ data });
    customers.push(customer);
  }
  console.log(`✅ ${customers.length} customers created`);

  // ---- GALLERY IMAGES ----
  const galleryData = [
    // Salon / Ambiente (6)
    { url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=1000&fit=crop', alt: 'Interior del salón', category: 'salon', order: 1 },
    { url: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&h=600&fit=crop', alt: 'Área de lavado premium', category: 'salon', order: 2 },
    { url: 'https://images.unsplash.com/photo-1633681122956-5c5b6a1ccbe7?w=800&h=900&fit=crop', alt: 'Estación de styling', category: 'salon', order: 3 },
    { url: 'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?w=600&h=800&fit=crop', alt: 'Espejo y herramientas', category: 'salon', order: 4 },
    { url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=600&fit=crop', alt: 'Productos premium', category: 'salon', order: 5 },
    { url: 'https://images.unsplash.com/photo-1629397685944-7073f5589754?w=800&h=1000&fit=crop', alt: 'Decoración del salón', category: 'salon', order: 6 },
    // Cabello (6)
    { url: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&h=1000&fit=crop', alt: 'Coloración profesional', category: 'cabello', order: 7 },
    { url: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=800&h=600&fit=crop', alt: 'Brushing perfecto', category: 'cabello', order: 8 },
    { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=900&fit=crop', alt: 'Cabello sedoso post-keratina', category: 'cabello', order: 9 },
    { url: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&h=1000&fit=crop', alt: 'Corte moderno', category: 'cabello', order: 10 },
    { url: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=800&h=600&fit=crop', alt: 'Peinado de evento', category: 'cabello', order: 11 },
    { url: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=800&h=1000&fit=crop', alt: 'Mechas balayage', category: 'cabello', order: 12 },
    // Uñas (6)
    { url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&h=800&fit=crop', alt: 'Uñas gel diseño floral', category: 'unas', order: 13 },
    { url: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=800&h=600&fit=crop', alt: 'Esmaltado semi pastel', category: 'unas', order: 14 },
    { url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=600&h=800&fit=crop', alt: 'Nail art premium', category: 'unas', order: 15 },
    { url: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&h=800&fit=crop', alt: 'French manicure elegante', category: 'unas', order: 16 },
    { url: 'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=800&h=600&fit=crop', alt: 'Proceso de esmaltado', category: 'unas', order: 17 },
    { url: 'https://images.unsplash.com/photo-1583521214690-73421a1829a9?w=800&h=1000&fit=crop', alt: 'Diseño minimalista', category: 'unas', order: 18 },
    // Facial (6)
    { url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&h=600&fit=crop', alt: 'Facial glow treatment', category: 'facial', order: 19 },
    { url: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800&h=1000&fit=crop', alt: 'Mascarilla hidratante', category: 'facial', order: 20 },
    { url: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600&h=800&fit=crop', alt: 'Limpieza profunda', category: 'facial', order: 21 },
    { url: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&h=600&fit=crop', alt: 'Skincare premium', category: 'facial', order: 22 },
    { url: 'https://images.unsplash.com/photo-1552693673-1bf958298935?w=800&h=800&fit=crop', alt: 'Masaje facial relajante', category: 'facial', order: 23 },
    { url: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800&h=1000&fit=crop', alt: 'Resultado facial glow', category: 'facial', order: 24 },
    // Ambiente / Detalles (6)
    { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop', alt: 'Detalles de bienvenida', category: 'ambiente', order: 25 },
    { url: 'https://images.unsplash.com/photo-1540555700478-4be289fbec6a?w=600&h=900&fit=crop', alt: 'Rincón de relajación', category: 'ambiente', order: 26 },
    { url: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800&h=600&fit=crop', alt: 'Flores frescas del salón', category: 'ambiente', order: 27 },
    { url: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=800&h=1000&fit=crop', alt: 'Set de herramientas', category: 'ambiente', order: 28 },
    { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=600&fit=crop', alt: 'Texturas y colores', category: 'ambiente', order: 29 },
    { url: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=800&h=800&fit=crop', alt: 'Momento de cuidado', category: 'ambiente', order: 30 },
  ];

  for (const data of galleryData) {
    await prisma.galleryImage.create({ data });
  }
  console.log(`✅ ${galleryData.length} gallery images created`);

  // ---- APPOINTMENTS ----
  const now = new Date();
  const appointmentsData = [];

  // Generate 10 appointments spread across the next 2 weeks
  const timeSlots = [9, 10, 11, 13, 14, 15, 16, 17];
  const statuses: AppointmentStatus[] = [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.PENDING,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.PENDING,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.PENDING,
  ];

  for (let i = 0; i < 10; i++) {
    const daysAhead = Math.floor(i * 1.4) + 1; // Spread across ~14 days
    const date = new Date(now);
    date.setDate(date.getDate() + daysAhead);
    date.setHours(timeSlots[i % timeSlots.length], 0, 0, 0);

    // Ensure it's not Sunday (0)
    if (date.getDay() === 0) {
      date.setDate(date.getDate() + 1);
    }

    const service = services[i % services.length];
    const endDate = new Date(date);
    endDate.setMinutes(endDate.getMinutes() + service.duration);

    appointmentsData.push({
      date,
      endDate,
      status: statuses[i],
      customerId: customers[i].id,
      serviceId: service.id,
      source: i % 3 === 0 ? Platform.INSTAGRAM : i % 3 === 1 ? Platform.WHATSAPP : Platform.WEB,
      notes: i % 3 === 0 ? 'Reservado por Instagram' : undefined,
    });
  }

  for (const data of appointmentsData) {
    await prisma.appointment.create({ data });
  }
  console.log(`✅ ${appointmentsData.length} appointments created`);

  // ---- MESSAGE LOGS (sample) ----
  const messagesData = [
    {
      platform: Platform.INSTAGRAM,
      senderId: 'ig_user_001',
      senderName: 'Valentina López',
      message: 'Hola! Quiero sacar turno para uñas gel 💅',
      response: '¡Hola Valentina! ✨ Te cuento que tenemos disponibilidad para Uñas Gel Luxury esta semana. ¿Qué día te queda mejor?',
      direction: MessageDirection.INBOUND,
    },
    {
      platform: Platform.INSTAGRAM,
      senderId: 'ig_user_002',
      senderName: 'Camila Rodríguez',
      message: 'Cuánto sale el facial?',
      response: '¡Hola Camila! 🌟 Nuestro Facial Glow tiene un valor de $35.000 e incluye limpieza profunda + hidratación con ácido hialurónico. Dura 1 hora. ¿Te gustaría agendar?',
      direction: MessageDirection.INBOUND,
    },
    {
      platform: Platform.WHATSAPP,
      senderId: '+5411555501',
      senderName: 'Valentina López',
      message: 'Confirmo mi turno del martes!',
      direction: MessageDirection.INBOUND,
    },
  ];

  for (const data of messagesData) {
    await prisma.messageLog.create({ data });
  }
  console.log(`✅ ${messagesData.length} message logs created`);

  console.log('\n🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
