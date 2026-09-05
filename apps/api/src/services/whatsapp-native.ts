// ============================================
// Native In-App WhatsApp Service (@whiskeysockets/baileys)
// Integrated directly into Express API with PostgreSQL Session Storage
// Includes Humanized Presence Simulation (composing) & Anti-Ban Dynamic Texts
// ============================================

import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidGroup,
  isJidBroadcast,
  downloadMediaMessage,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import { usePrismaAuthState } from './baileys-store';
import { prisma } from './prisma';
import {
  enqueueForSender,
  enqueueGlobalOutbound,
  registerSocketForQueue,
  startPersistentQueueWorker,
  enqueuePersistentMessage,
  triggerQueueDrain,
} from './message-queue';
import { config } from '../config';

const BOT_URL = config.BOT_URL;
const SALON_WHATSAPP = config.SALON_WHATSAPP;

let sock: ReturnType<typeof makeWASocket> | null = null;
let currentQRBase64: string | null = null;
let currentPairingCode: string | null = null;
let connectionState: 'connecting' | 'open' | 'close' = 'connecting';
let clearAuthState: (() => Promise<void>) | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 15;
let reconnectTimer: NodeJS.Timeout | null = null;
let isInitializing = false;

function getReconnectDelay(attempt: number): number {
  const base = Math.min(1000 * Math.pow(2, attempt), 30000);
  const jitter = base * 0.2 * (Math.random() * 2 - 1);
  return Math.max(1000, Math.floor(base + jitter));
}

const logger = pino({ level: 'error' });

// Variaciones de saludos y cierres para evitar textos planos repetitivos
const GREETING_VARIATIONS = [
  '¡Hola!',
  '¡Hola, qué tal!',
  '¡Hola! Bienvenida 💕',
  '¡Hola! ¿Cómo estás?',
  '¡Hola! Es un gusto saludarte ✨',
];

const EMOJI_VARIATIONS = ['✨', '💕', '🌸', '💇‍♀️', '💎', '💅', '💖'];

function addHumanDynamicVariation(text: string): string {
  if (!text) return text;
  
  let result = text;

  // Variar saludos iniciales estáticos
  if (result.startsWith('¡Hola!')) {
    const randomGreeting = GREETING_VARIATIONS[Math.floor(Math.random() * GREETING_VARIATIONS.length)];
    result = result.replace(/^¡Hola!/, randomGreeting);
  }

  // Variar emoji al final si no tiene uno
  const randomEmoji = EMOJI_VARIATIONS[Math.floor(Math.random() * EMOJI_VARIATIONS.length)];
  if (!result.trim().endsWith('✨') && !result.trim().endsWith('💕')) {
    result = `${result.trim()} ${randomEmoji}`;
  }

  return result;
}

/**
 * Attempt to transcribe an audio message via the Python bot's Groq Whisper endpoint.
 * Returns the transcribed text or null on failure.
 */
async function transcribeAudioMessage(msg: any): Promise<string | null> {
  if (!sock) return null;

  try {
    // Download the audio buffer from WhatsApp
    const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
      logger,
      reuploadRequest: sock.updateMediaMessage,
    });

    if (!buffer || buffer.length === 0) {
      console.warn('⚠️ Audio download returned empty buffer');
      return null;
    }

    // Create FormData with the audio file
    const formData = new FormData();
    const blob = new Blob([buffer as any], { type: 'audio/ogg' });
    formData.append('file', blob, 'voice_message.ogg');

    // Send to bot transcription endpoint
    const transController = new AbortController();
    const transTimeout = setTimeout(() => transController.abort(), 20000); // 20s timeout for audio

    const response = await fetch(`${BOT_URL}/transcribe-audio-file`, {
      method: 'POST',
      headers: {
        ...(config.API_SECRET_KEY ? { 'x-api-key': config.API_SECRET_KEY } : {}),
      },
      body: formData,
      signal: transController.signal
    });
    
    clearTimeout(transTimeout);

    if (response.ok) {
      const data = (await response.json()) as { text: string | null; status: string };
      if (data.text) {
        console.log(`🎤 Audio transcribed: "${data.text.substring(0, 80)}..."`);
        return data.text;
      }
    } else {
      console.error(`❌ Audio transcription API returned status ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error transcribing audio message:', error);
  }

  return null;
}

export async function destroyCurrentSocket(): Promise<void> {
  if (sock) {
    try {
      sock.ev.removeAllListeners('creds.update');
      sock.ev.removeAllListeners('connection.update');
      sock.ev.removeAllListeners('messages.upsert');
      sock.ws?.close();
      sock.end(undefined);
    } catch (e) {
      console.warn('Warning cleaning up previous WhatsApp socket:', e);
    } finally {
      sock = null;
    }
  }
}

export async function initNativeWhatsApp(): Promise<void> {
  if (isInitializing) {
    console.log('⚠️ Native WhatsApp: Initialization already in progress, skipping concurrent call.');
    return;
  }
  isInitializing = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  console.log('🚀 Initializing Native In-App WhatsApp Service (Baileys + PostgreSQL Store)...');
  await destroyCurrentSocket();

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
      markOnlineOnConnect: true,
    });

    // Save creds on update
    sock.ev.on('creds.update', saveCreds);

    // Connection updates
    sock.ev.on('connection.update', async (update: any) => {
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
        reconnectAttempts = 0; // Reset counter on successful connection
        currentQRBase64 = null; // Clear QR once connected
        console.log('🟢 Native WhatsApp: Connection OPEN & ACTIVE!');
        
        // Register active socket with persistent queue processor
        registerSocketForQueue(() => sock, () => connectionState);
        startPersistentQueueWorker(8000);
        triggerQueueDrain();

        if (sock) {
          try {
            await sock.sendPresenceUpdate('available');
          } catch (presenceErr) {
            console.warn('⚠️ Error updating initial available presence:', presenceErr);
          }
        }
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
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            const delay = getReconnectDelay(reconnectAttempts);
            reconnectAttempts++;
            console.log(`🔄 Reconnecting Native WhatsApp in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(initNativeWhatsApp, delay);
          } else {
            console.error('🚨 Max reconnection attempts reached for Native WhatsApp. Waiting 2 minutes before reset...');
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => {
              reconnectAttempts = 0;
              initNativeWhatsApp();
            }, 120000);
          }
        }
      }
    });

    // Incoming messages handler
    sock.ev.on('messages.upsert', async (m: any) => {
      if (m.type !== 'notify') return;

      for (const msg of m.messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const remoteJid = msg.key.remoteJid;
        if (!remoteJid || isJidGroup(remoteJid) || isJidBroadcast(remoteJid)) continue;

        // Extract text message (or transcribe audio)
        let textMessage =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          msg.message.videoMessage?.caption;

        // Handle audio/voice messages via transcription
        const hasAudio = msg.message.audioMessage;
        if (!textMessage && hasAudio) {
          const transcribedText = await transcribeAudioMessage(msg);
          if (transcribedText) {
            textMessage = transcribedText;
          }
        }

        // Handle image messages via Groq Vision analysis
        const hasImage = msg.message.imageMessage;
        if (!textMessage && hasImage) {
          try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
              logger,
              reuploadRequest: sock!.updateMediaMessage,
            });

            if (buffer && buffer.length > 0) {
              const base64Image = Buffer.from(buffer as any).toString('base64');
              console.log(`🖼️ Image received from ${msg.key.remoteJid}, analyzing with Vision AI...`);

              const visionController = new AbortController();
              const visionTimeout = setTimeout(() => visionController.abort(), 20000);

              const visionResp = await fetch(`${BOT_URL}/analyze-image`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(config.API_SECRET_KEY ? { 'x-api-key': config.API_SECRET_KEY } : {}),
                },
                body: JSON.stringify({
                  image_base64: base64Image,
                  sender_id: msg.key.remoteJid,
                  caption: hasImage.caption || '',
                }),
                signal: visionController.signal
              });
              
              clearTimeout(visionTimeout);

              if (visionResp.ok) {
                const visionData = (await visionResp.json()) as { interpreted_text: string | null; status: string };
                if (visionData.interpreted_text) {
                  console.log(`🖼️ Image interpreted: "${visionData.interpreted_text.substring(0, 80)}..."`);
                  textMessage = visionData.interpreted_text;
                }
              }
            }
          } catch (imgErr: any) {
            console.warn(`⚠️ Image analysis error: ${imgErr.message}`);
            // Fall back to caption if available
            if (hasImage.caption) {
              textMessage = hasImage.caption;
            }
          }
        }

        if (!textMessage) continue;

        const senderName = msg.pushName || remoteJid.split('@')[0];
        const targetJid = remoteJid.endsWith('@lid') && ((msg.key as any).remoteJidAlt || (msg.key as any).participantPn)
          ? ((msg.key as any).remoteJidAlt || (msg.key as any).participantPn)
          : remoteJid;

        const clearPresence = async () => {
          if (sock && connectionState === 'open') {
            try {
              await sock.sendPresenceUpdate('paused', remoteJid);
              if (targetJid !== remoteJid) {
                await sock.sendPresenceUpdate('paused', targetJid);
              }
            } catch (err: any) {
              console.warn('⚠️ Could not pause presence:', err?.message);
            }
          }
        };

        // Send instant read receipt and start typing indicator
        if (sock && connectionState === 'open') {
          try {
            await sock.readMessages([msg.key]);
            await sock.presenceSubscribe(remoteJid);
            await sock.sendPresenceUpdate('composing', remoteJid);
          } catch (pErr) {
            // Ignore presence startup error
          }
        }

        // Enqueue per sender to prevent race conditions
        await enqueueForSender(remoteJid, async () => {
          console.log(`📩 Native WA message from ${remoteJid} (${senderName}): ${textMessage}`);

          // Blacklist check
          try {
            const cleanPhone = remoteJid.split('@')[0];
            const customer = await prisma.customer.findFirst({
              where: {
                OR: [{ phone: cleanPhone }, { phone: `+${cleanPhone}` }],
              },
            });

            if (customer?.blocked) {
              console.warn(`🚫 Ignoring message from blocked customer: ${remoteJid}`);
              await clearPresence();
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
          } catch (dbErr: any) {
            console.warn(`⚠️ DB log warning: ${dbErr.message}`);
          }

          let botSucceeded = false;

          // Call Python AI Bot
          try {
            console.log(`🤖 Calling Python Bot at: ${BOT_URL}/process-message`);
            
            const botController = new AbortController();
            const botTimeout = setTimeout(() => botController.abort(), 30000); // 30s safety timeout
            
            const agentResponse = await fetch(`${BOT_URL}/process-message`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.API_SECRET_KEY,
              },
              body: JSON.stringify({
                message: textMessage,
                sender_id: remoteJid,
                platform: 'WHATSAPP',
              }),
              signal: botController.signal
            });
            
            clearTimeout(botTimeout);

            if (agentResponse.ok) {
              const data = (await agentResponse.json()) as { response: string; image_url?: string };
              let reply = data.response;
              const imageUrl = data.image_url;

              if (reply && reply.trim()) {
                botSucceeded = true;
                reply = addHumanDynamicVariation(reply);

                console.log(`🤖 Native WA Bot reply for ${remoteJid}: ${reply.substring(0, 100)}...`);

                // Save OUTBOUND log
                try {
                  await prisma.messageLog.create({
                    data: {
                      platform: 'WHATSAPP',
                      senderId: remoteJid,
                      message: reply,
                      direction: 'OUTBOUND',
                    },
                  });
                } catch (logErr: any) {
                  console.warn(`⚠️ DB outbound log warning: ${logErr.message}`);
                }

                // Send reply via Global Outbound Queue (Visible, natural presence simulation)
                if (sock && connectionState === 'open') {
                  await enqueueGlobalOutbound(async () => {
                    if (!sock || connectionState !== 'open') return;

                    // 1. Simular presencia "composing" (escribiendo) visible y natural (1.5s - 2.3s)
                    const typingDelay = Math.floor(Math.random() * 800) + 1500;
                    console.log(`✍️ Presence 'composing' (escribiendo...) for ${typingDelay}ms to ${targetJid}`);
                    
                    try {
                      await sock.sendPresenceUpdate('composing', targetJid);
                      if (targetJid !== remoteJid) {
                        await sock.sendPresenceUpdate('composing', remoteJid);
                      }
                    } catch (ePresence) {
                      console.warn('Presence update error:', ePresence);
                    }

                    await new Promise((res) => setTimeout(res, typingDelay));

                    // 2. Enviar el mensaje (con imagen del portfolio si está disponible)
                    try {
                      if (imageUrl) {
                        console.log(`🖼️ Fetching portfolio image for ${targetJid}: ${imageUrl}`);
                        const imgController = new AbortController();
                        const imgTimeout = setTimeout(() => imgController.abort(), 6000); // 6s timeout

                        try {
                          const imgRes = await fetch(imageUrl, { signal: imgController.signal });
                          clearTimeout(imgTimeout);

                          if (imgRes.ok) {
                            const arrayBuf = await imgRes.arrayBuffer();
                            const buffer = Buffer.from(arrayBuf);
                            await sock.sendMessage(targetJid, {
                              image: buffer,
                              mimetype: 'image/jpeg',
                              caption: reply,
                            }, { quoted: msg });
                            console.log(`✅ Native WA reply sent to ${targetJid} (with image)`);
                          } else {
                            throw new Error(`HTTP ${imgRes.status}`);
                          }
                        } catch (fetchErr: any) {
                          console.error(`⚠️ Image fetch failed for ${targetJid}: ${fetchErr.message}. Sending text only.`);
                          await sock.sendMessage(targetJid, { text: reply }, { quoted: msg });
                        }
                      } else {
                        await sock.sendMessage(targetJid, { text: reply }, { quoted: msg });
                        console.log(`✅ Native WA reply sent to ${targetJid} (text only)`);
                      }
                    } catch (e1) {
                      console.error(`⚠️ Error sending to ${targetJid}, trying direct text fallback:`, e1);
                      await sock.sendMessage(targetJid, { text: reply });
                    } finally {
                      await clearPresence();
                    }
                  });
                }
              }
            } else {
              const errBody = await agentResponse.text().catch(() => '');
              console.error(`❌ Bot API returned HTTP ${agentResponse.status} for ${remoteJid}: ${errBody}`);
            }
          } catch (error: any) {
            console.error(`❌ Error processing Native WA message for ${remoteJid}:`, error?.message || error);
          } finally {
            // Guarantee presence is cancelled if bot didn't succeed or reply was not queued
            if (!botSucceeded) {
              await clearPresence();

              // Send graceful fallback so customer is never left in silence
              try {
                if (sock && connectionState === 'open') {
                  const fallbackMsg =
                    "¡Hola! Bienvenida a *Glow Studio by Sofia* ✨\n\n" +
                    "Disculpá la demora momentánea 💕 Podés consultar todos nuestros servicios y turnos disponibles directamente desde nuestra web oficial:\n" +
                    `${config.FRONTEND_URL || 'https://glow-studio-web.onrender.com'}\n\n` +
                    "O dejanos tu consulta que en instantes te responderemos personalmente 💕";
                  
                  await sock.sendMessage(targetJid, { text: fallbackMsg }, { quoted: msg });
                  console.log(`✅ Sent graceful fallback reply to ${targetJid}`);
                }
              } catch (fallbackErr: any) {
                console.error(`❌ Could not send fallback message to ${targetJid}:`, fallbackErr?.message);
              }
            }
          }
        });
      }
    });
  } catch (error) {
    console.error('❌ Error initializing Native WhatsApp Service:', error);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(initNativeWhatsApp, 10000);
  } finally {
    isInitializing = false;
  }
}

export async function requestNativePairingCode(phoneNumber: string): Promise<string | null> {
  if (!sock) {
    console.warn('⚠️ Native WhatsApp socket is not initialized.');
    return null;
  }

  if (connectionState === 'open') {
    console.warn('⚠️ WhatsApp is already connected.');
    return null;
  }

  try {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const code = await sock.requestPairingCode(cleanPhone);
    currentPairingCode = code;
    console.log(`🔑 Pairing Code generated for ${cleanPhone}: ${code}`);
    return code;
  } catch (error) {
    console.error('❌ Error generating Pairing Code:', error);
    return null;
  }
}

export function getNativePairingCode() {
  return currentPairingCode;
}

export function getNativeStatus() {
  return {
    configured: true,
    instanceName: 'glow-studio-native',
    phone: SALON_WHATSAPP,
    state: connectionState,
    hasQR: !!currentQRBase64,
    pairingCode: currentPairingCode,
  };
}

export function getNativeQRBase64() {
  return currentQRBase64;
}

export async function sendNativeWhatsAppMessage(to: string, message: string): Promise<boolean> {
  const formattedJid = to.includes('@') ? to : `${to.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
  const dynamicMessage = addHumanDynamicVariation(message);

  if (!sock || connectionState !== 'open') {
    console.warn(`⚠️ Native WhatsApp is not currently open. Enqueueing message for ${formattedJid} in persistent DB queue.`);
    try {
      await enqueuePersistentMessage({
        jid: formattedJid,
        message: { text: dynamicMessage },
        priority: 2, // High priority for manual/admin responses
      });
      return true;
    } catch (qErr) {
      console.error('❌ Failed to enqueue message into DB queue:', qErr);
      return false;
    }
  }

  try {
    return await enqueueGlobalOutbound(async () => {
      if (!sock || connectionState !== 'open') {
        await enqueuePersistentMessage({
          jid: formattedJid,
          message: { text: dynamicMessage },
          priority: 2,
        });
        return true;
      }

      // 1. Simular presencia 'composing' (escribiendo...) visible (1.5s - 2.2s)
      const typingDelay = Math.floor(Math.random() * 700) + 1500;
      try {
        await sock.presenceSubscribe(formattedJid);
        await sock.sendPresenceUpdate('composing', formattedJid);
      } catch (pErr) {
        // ignore
      }
      await new Promise((res) => setTimeout(res, typingDelay));

      // 2. Enviar mensaje
      await sock.sendMessage(formattedJid, { text: dynamicMessage });
      
      try {
        await sock.sendPresenceUpdate('paused', formattedJid);
      } catch {
        // ignore
      }

      console.log(`✅ Native WhatsApp message sent to ${formattedJid}`);
      return true;
    });
  } catch (error) {
    console.error(`❌ Error sending Native WhatsApp message to ${to}:`, error);
    // Persist to queue on failure
    await enqueuePersistentMessage({
      jid: formattedJid,
      message: { text: dynamicMessage },
      priority: 2,
    });
    return true;
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
