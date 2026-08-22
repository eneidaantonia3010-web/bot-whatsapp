import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import path from 'path';

const logger = pino({ level: 'error' });
const AUTH_FOLDER = path.join(__dirname, 'auth_info_baileys');
const TARGET_PHONE = '5491178296781';

async function sendTestMessage() {
  console.log(`🚀 Conectando a WhatsApp para enviar mensaje de prueba a +${TARGET_PHONE}...`);
  
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    browser: ['Glow Studio Test', 'Chrome', '120.0.0'],
    markOnlineOnConnect: true,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection } = update;

    if (connection === 'open') {
      console.log('🟢 Conexión establecida. Enviando mensaje de prueba...');
      
      const jid = `${TARGET_PHONE}@s.whatsapp.net`;
      const testText = '✨ *Glow Studio by Sofia*\n\n¡Hola! Este es un mensaje de prueba automático. Tu sistema de WhatsApp y el Asistente con IA están 100% conectados, sincronizados y listos para atender a tus clientas. 💕✨';

      try {
        await sock.sendMessage(jid, { text: testText });
        console.log(`✅ ¡Mensaje de prueba enviado con éxito a ${jid}!`);
      } catch (err) {
        console.error('❌ Error al enviar el mensaje:', err);
      }

      setTimeout(() => {
        process.exit(0);
      }, 3000);
    }
  });
}

sendTestMessage().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
