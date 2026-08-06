// ============================================
// Auto-seed Admin User on Initialization
// ============================================

import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export async function ensureAdminUserExists() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      const defaultEmail = process.env.INITIAL_ADMIN_EMAIL;
      const defaultPassword = process.env.INITIAL_ADMIN_PASSWORD;

      if (!defaultEmail || !defaultPassword) {
        console.warn('⚠️ INITIAL_ADMIN_EMAIL or INITIAL_ADMIN_PASSWORD not set. Skipping admin user creation.');
        return;
      }

      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      await prisma.user.create({
        data: {
          email: defaultEmail,
          name: 'Sofía (Administradora)',
          password: hashedPassword,
          role: 'ADMIN',
        },
      });

      console.log('👤 Initial Admin user created successfully.');
    }
  } catch (error) {
    console.error('⚠️ Could not seed admin user:', error);
  }
}
