const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const staffData = [
    {
      name: 'Sofía García',
      email: 'sofia@glowstudio.com',
      phone: '+5491178296781',
      bio: 'Fundadora & Estilista Senior con más de 15 años transformando miradas y estilos.',
      specialties: ['Cortes de Precisión', 'Balayage VIP', 'Asesoría de Imagen'],
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face',
      active: true,
    },
    {
      name: 'Camila Torres',
      email: 'camila@glowstudio.com',
      phone: '+5491155550001',
      bio: 'Especialista en colorimetría avanzada, rubios perfectos y tratamientos K18.',
      specialties: ['Colorimetría', 'Balayage', 'Tratamiento Keratina'],
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
      active: true,
    },
    {
      name: 'Valentina Ruiz',
      email: 'valentina@glowstudio.com',
      phone: '+5491155550002',
      bio: 'Master Nail Artist certificada. Especialista en esculpidas y soft gel.',
      specialties: ['Uñas Soft Gel', 'Nail Art Ruso', 'Esmaltado Semipermanente'],
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
      active: true,
    },
    {
      name: 'Lucía Méndez',
      email: 'lucia@glowstudio.com',
      phone: '+5491155550003',
      bio: 'Cosmetóloga y especialista en estética facial y diseño de mirada.',
      specialties: ['Facial Glow Profundo', 'Lifting de Pestañas', 'Perfilado de Cejas'],
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=face',
      active: true,
    },
  ];

  for (const s of staffData) {
    await prisma.staff.upsert({
      where: { email: s.email },
      update: s,
      create: s,
    });
  }

  console.log('✅ Staff members seeded successfully in database!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
