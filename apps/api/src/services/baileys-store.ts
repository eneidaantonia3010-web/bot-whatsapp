// ============================================
// Baileys PostgreSQL Session Auth Store
// ============================================

import {
  AuthenticationCreds,
  AuthenticationState,
  BufferJSON,
  initAuthCreds,
} from '@whiskeysockets/baileys';
import { prisma } from './prisma';

const KEY_PREFIX = 'baileys_key_';
const CREDS_KEY = 'baileys_creds';

export async function usePrismaAuthState(): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  clearState: () => Promise<void>;
}> {
  // Load or initialize creds
  const credsRecord = await prisma.conversationState.findUnique({
    where: { senderId: CREDS_KEY },
  });

  let creds: AuthenticationCreds;
  if (credsRecord && credsRecord.state) {
    creds = JSON.parse(JSON.stringify(credsRecord.state), BufferJSON.reviver);
  } else {
    creds = initAuthCreds();
  }

  const saveCreds = async () => {
    const serializedCreds = JSON.parse(JSON.stringify(creds, BufferJSON.replacer));
    await prisma.conversationState.upsert({
      where: { senderId: CREDS_KEY },
      create: { senderId: CREDS_KEY, state: serializedCreds },
      update: { state: serializedCreds },
    });
  };

  const clearState = async () => {
    await prisma.conversationState.deleteMany({
      where: {
        senderId: {
          startsWith: 'baileys_',
        },
      },
    });
  };

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data: { [id: string]: any } = {};
          await Promise.all(
            ids.map(async (id) => {
              const key = `${KEY_PREFIX}${type}_${id}`;
              const record = await prisma.conversationState.findUnique({
                where: { senderId: key },
              });
              if (record && record.state) {
                const value = JSON.parse(JSON.stringify(record.state), BufferJSON.reviver);
                data[id] = value;
              }
            })
          );
          return data;
        },
        set: async (data: any) => {
          const tasks: Promise<any>[] = [];
          for (const category in data) {
            const categoryData = data[category];
            if (!categoryData) continue;

            for (const id in categoryData) {
              const value = categoryData[id];
              const key = `${KEY_PREFIX}${category}_${id}`;
              if (value) {
                const serializedValue = JSON.parse(JSON.stringify(value, BufferJSON.replacer));
                tasks.push(
                  prisma.conversationState.upsert({
                    where: { senderId: key },
                    create: { senderId: key, state: serializedValue },
                    update: { state: serializedValue },
                  })
                );
              } else {
                tasks.push(
                  prisma.conversationState.deleteMany({
                    where: { senderId: key },
                  })
                );
              }
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds,
    clearState,
  };
}
