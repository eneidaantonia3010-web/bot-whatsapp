const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@glowstudio.com' },
    update: { password: hash, role: 'ADMIN' },
    create: {
      email: 'admin@glowstudio.com',
      name: 'Glow Studio Admin',
      password: hash,
      role: 'ADMIN'
    }
  });
  console.log('Admin user created successfully:', user.email);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
