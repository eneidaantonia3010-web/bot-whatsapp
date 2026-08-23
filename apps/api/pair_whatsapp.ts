import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import fs from 'fs';
import path from 'path';

const logger = pino({ level: 'error' });
const QR_PATH = process.env.QR_OUTPUT_PATH || path.join(process.cwd(), 'whatsapp_qr.png');
const AUTH_FOLDER = path.join(__dirname, 'auth_info_baileys');

async function run() {
  console.log('🚀 Iniciando generador de QR con almacenamiento seguro...');

  // Crear o cargar estado local
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
  const { version } = await fetchLatestBaileysVersion();
  console.log(`📱 Versión de Baileys: ${version.join('.')}`);

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger,
    browser: ['Glow Studio Admin', 'Chrome', '120.0.0'],
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n=========================================');
      console.log('⚡ ¡NUEVO CÓDIGO QR GENERADO!');
      console.log('🖼️ Guardando imagen en el Escritorio...');
      
      try {
        await QRCode.toFile(QR_PATH, qr, {
          width: 450,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          }
        });
        console.log(`✅ ¡IMAGEN QR CREADA!: ${QR_PATH}`);
        console.log('👉 Escanéala con WhatsApp.');
        console.log('=========================================\n');
      } catch (err) {
        console.error('Error guardando imagen QR:', err);
      }
    }

    if (connection === 'open') {
      console.log('\n🎉 =========================================');
      console.log('🎉 ¡WHATSAPP VINCULADO CON ÉXITO!');
      console.log('🎉 Sesión activa y lista para operar.');
      console.log('🎉 =========================================\n');
      
      // Borrar la imagen del QR tras conectar
      try {
        if (fs.existsSync(DESKTOP_PATH)) {
          fs.unlinkSync(DESKTOP_PATH);
        }
      } catch (e) {}

      console.log('✅ WhatsApp conectado. Manteniendo proceso activo para verificar mensajes...');
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error)?.output?.statusCode;
      console.log(`⚠️ Conexión cerrada (${statusCode}).`);
      if (statusCode === DisconnectReason.loggedOut) {
        console.log('❌ Sesión cerrada.');
        try {
          fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
        } catch(e) {}
        process.exit(1);
      } else {
        console.log('🔄 Reconectando...');
        run();
      }
    }
  });
}

run().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
