import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });
import { prisma } from '../apps/api/src/services/prisma';

async function main() {
  const result = await prisma.appointment.deleteMany({});
  console.log(`🧹 Turnos de prueba eliminados: ${result.count}`);
}

main().finally(async () => {
  await prisma.$disconnect();
});
