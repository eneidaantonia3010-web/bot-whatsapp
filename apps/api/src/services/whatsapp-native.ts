// ============================================
// Native In-App WhatsApp Service (@whiskeysockets/baileys)
// Integrated directly into Express API with PostgreSQL Session Storage
// ============================================

import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidGroup,
  isJidBroadcast,
  proto,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import { usePrismaAuthState } from './baileys-store';
import { prisma } from './prisma';
import { enqueueForSender } from './message-queue';

let BOT_URL = process.env.BOT_URL || 'https://glow-studio-bot-7ghr.onrender.com';
if (process.env.NODE_ENV === 'production' && (!process.env.BOT_URL || BOT_URL.includes('localhost'))) {
  BOT_URL = 'https://glow-studio-bot-7ghr.onrender.com';
}
const SALON_WHATSAPP = process.env.SALON_WHATSAPP || '5491173566392';

let sock: ReturnType<typeof makeWASocket> | null = null;
let currentQRBase64: string | null = null;
let connectionState: 'connecting' | 'open' | 'close' = 'connecting';
let clearAuthState: (() => Promise<void>) | null = null;

const logger = pino({ level: 'error' });

export async function initNativeWhatsApp(): Promise<void> {
  console.log('🚀 Initializing Native In-App WhatsApp Service (Baileys + PostgreSQL Store)...');

  try {
    const { state, saveCreds, clearState } = await usePrismaAuthState();
    clearAuthState = clearState;

    const { version } = await fetchLatestBaileysVersion();
    console.log(`📱 Baileys version: ${version.join('.')}`);

    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
      logger,
      browser: ['Glow Studio by Sofia', 'Chrome', '120.0.0'],
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });

    // Save creds on update
    sock.ev.on('creds.update', saveCreds);

    // Connection updates
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('⚡ New Native WhatsApp QR Code generated!');
        try {
          currentQRBase64 = await QRCode.toDataURL(qr);
        } catch (err) {
          console.error('Error generating QR base64:', err);
        }
      }

      if (connection === 'connecting') {
        connectionState = 'connecting';
        console.log('🔄 Native WhatsApp: Connecting to socket...');
      }

      if (connection === 'open') {
        connectionState = 'open';
        currentQRBase64 = null; // Clear QR once connected
        console.log('🟢 Native WhatsApp: Connection OPEN & ACTIVE!');
      }

      if (connection === 'close') {
        connectionState = 'close';
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.warn(`⚠️ Native WhatsApp: Connection closed. Code: ${statusCode}, Should Reconnect: ${shouldReconnect}`);

        if (statusCode === DisconnectReason.loggedOut) {
          console.error('🚨 Native WhatsApp: Session logged out. Clearing PostgreSQL state...');
          if (clearAuthState) await clearAuthState();
          currentQRBase64 = null;
        }

        if (shouldReconnect) {
          console.log('🔄 Reconnecting Native WhatsApp in 5 seconds...');
          setTimeout(initNativeWhatsApp, 5000);
        }
      }
    });

    // Incoming messages handler
    sock.ev.on('messages.upsert', async (m) => {
      if (m.type !== 'notify') return;

      for (const msg of m.messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const remoteJid = msg.key.remoteJid;
        if (!remoteJid || isJidGroup(remoteJid) || isJidBroadcast(remoteJid)) continue;

        // Extract text message
        const textMessage =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          msg.message.videoMessage?.caption;

        if (!textMessage) continue;

        const senderName = msg.pushName || remoteJid.split('@')[0];

        // Enqueue per sender to prevent race conditions
        await enqueueForSender(remoteJid, async () => {
          console.log(`📩 Native WA message from ${remoteJid} (${senderName}): ${textMessage}`);

          // Blacklist check
          const cleanPhone = remoteJid.split('@')[0];
          const customer = await prisma.customer.findFirst({
            where: {
              OR: [{ phone: cleanPhone }, { phone: `+${cleanPhone}` }],
            },
          });

          if (customer?.blocked) {
            console.warn(`🚫 Ignoring message from blocked customer: ${remoteJid}`);
            return;
          }

          // Save INBOUND log
          await prisma.messageLog.create({
            data: {
              platform: 'WHATSAPP',
              senderId: remoteJid,
              senderName,
              message: textMessage,
              direction: 'INBOUND',
            },
          });

          // Call Python AI Bot
          try {
            console.log(`🤖 Calling Python Bot at: ${BOT_URL}/process-message`);
            const agentResponse = await fetch(`${BOT_URL}/process-message`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: textMessage,
                sender_id: remoteJid,
                platform: 'WHATSAPP',
              }),
            });

            if (agentResponse.ok) {
              const data = (await agentResponse.json()) as { response: string };
              const reply = data.response;
              console.log(`🤖 Native WA Bot reply for ${remoteJid}: ${reply.substring(0, 100)}...`);

              // Save OUTBOUND log
              await prisma.messageLog.create({
                data: {
                  platform: 'WHATSAPP',
                  senderId: remoteJid,
                  message: reply,
                  direction: 'OUTBOUND',
                },
              });

              // Send reply back via native Baileys socket
              if (sock && connectionState === 'open') {
                await sock.sendMessage(remoteJid, { text: reply });
                console.log(`✅ Native WA reply sent to ${remoteJid}`);
              }
            } else {
              console.error(`❌ Bot API returned status ${agentResponse.status}`);
            }
          } catch (error) {
            console.error(`❌ Error processing Native WA message:`, error);
          }
        });
      }
    });
  } catch (error) {
    console.error('❌ Error initializing Native WhatsApp Service:', error);
    setTimeout(initNativeWhatsApp, 10000);
  }
}

export function getNativeStatus() {
  return {
    configured: true,
    instanceName: 'glow-studio-native',
    phone: SALON_WHATSAPP,
    state: connectionState,
    hasQR: !!currentQRBase64,
  };
}

export function getNativeQRBase64() {
  return currentQRBase64;
}

export async function sendNativeWhatsAppMessage(to: string, message: string): Promise<boolean> {
  if (!sock || connectionState !== 'open') {
    console.warn('⚠️ Native WhatsApp is not open. Cannot send message.');
    return false;
  }

  try {
    const formattedJid = to.includes('@') ? to : `${to.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    await sock.sendMessage(formattedJid, { text: message });
    console.log(`✅ Native WhatsApp message sent to ${formattedJid}`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending Native WhatsApp message to ${to}:`, error);
    return false;
  }
}

export async function logoutNativeWhatsApp(): Promise<void> {
  if (sock) {
    try {
      await sock.logout();
    } catch (e) {
      // ignore
    }
  }
  if (clearAuthState) {
    await clearAuthState();
  }
  connectionState = 'close';
  currentQRBase64 = null;
  setTimeout(initNativeWhatsApp, 3000);
}
