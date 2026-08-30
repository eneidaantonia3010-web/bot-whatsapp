// ============================================
// Baileys PostgreSQL Session Auth Store
// Dedicated table: baileys_sessions
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

async function dbRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, attempt * 350));
    }
  }
  throw new Error('Database operation failed after retries');
}

export async function usePrismaAuthState(): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  clearState: () => Promise<void>;
}> {
  // 1. Load or initialize credentials
  const credsRecord = await dbRetry(() =>
    prisma.baileysSession.findUnique({
      where: { key: CREDS_KEY },
    })
  );

  let creds: AuthenticationCreds;
  if (credsRecord && credsRecord.value) {
    creds = JSON.parse(JSON.stringify(credsRecord.value), BufferJSON.reviver);
  } else {
    creds = initAuthCreds();
  }

  // 2. Save credentials callback
  const saveCreds = async () => {
    const serializedCreds = JSON.parse(JSON.stringify(creds, BufferJSON.replacer));
    await dbRetry(() =>
      prisma.baileysSession.upsert({
        where: { key: CREDS_KEY },
        create: { key: CREDS_KEY, value: serializedCreds },
        update: { value: serializedCreds },
      })
    );
  };

  // 3. Clear all authentication state on logout
  const clearState = async () => {
    await dbRetry(() => prisma.baileysSession.deleteMany({}));
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
              const record = await dbRetry(() =>
                prisma.baileysSession.findUnique({
                  where: { key },
                })
              );

              if (record && record.value) {
                const value = JSON.parse(JSON.stringify(record.value), BufferJSON.reviver);
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
                  dbRetry(() =>
                    prisma.baileysSession.upsert({
                      where: { key },
                      create: { key, value: serializedValue },
                      update: { value: serializedValue },
                    })
                  )
                );
              } else {
                tasks.push(
                  dbRetry(() =>
                    prisma.baileysSession.deleteMany({
                      where: { key },
                    })
                  )
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
