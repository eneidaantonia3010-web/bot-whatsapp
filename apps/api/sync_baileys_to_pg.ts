import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../.env') });
import { prisma } from './src/services/prisma';

const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');

async function syncAuthToPostgres() {
  console.log('🔄 Sincronizando credenciales de WhatsApp (auth_info_baileys) a PostgreSQL...');

  if (!fs.existsSync(AUTH_DIR)) {
    console.error('❌ auth_info_baileys no existe');
    return;
  }

  const files = fs.readdirSync(AUTH_DIR);
  console.log(`📂 Encontrados ${files.length} archivos de sesión.`);

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const content = fs.readFileSync(path.join(AUTH_DIR, file), 'utf8');
    const json = JSON.parse(content);

    let senderId = '';
    if (file === 'creds.json') {
      senderId = 'baileys_creds';
    } else {
      // pre-key-1.json -> baileys_key_pre-key_1
      const nameWithoutExt = file.replace('.json', '');
      const parts = nameWithoutExt.split('-');
      const id = parts.pop();
      const type = parts.join('-');
      senderId = `baileys_key_${type}_${id}`;
    }

    try {
      await prisma.conversationState.upsert({
        where: { senderId },
        create: {
          senderId,
          state: json,
        },
        update: {
          state: json,
        },
      });
      console.log(`✅ Sincronizado en DB: ${senderId}`);
    } catch (e: any) {
      console.error(`❌ Error sincronizando ${senderId}:`, e.message);
    }
  }

  console.log('🎉 ¡Todas las credenciales de WhatsApp fueron guardadas en PostgreSQL con éxito!');
}

syncAuthToPostgres()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
