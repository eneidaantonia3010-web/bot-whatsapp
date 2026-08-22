// ============================================
// Baileys PostgreSQL Session Auth Store
// Uses dedicated baileys_sessions table with fallback to conversation_states
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
  const store = (prisma as any).baileysSession || prisma.conversationState;
  const isDedicatedTable = !!(prisma as any).baileysSession;

  // Load or initialize creds
  let credsRecord: any = null;
  try {
    if (isDedicatedTable) {
      credsRecord = await (prisma as any).baileysSession.findUnique({
        where: { key: CREDS_KEY },
      });
    } else {
      credsRecord = await prisma.conversationState.findUnique({
        where: { senderId: CREDS_KEY },
      });
    }
  } catch (err) {
    // Fallback to conversationState if baileysSession table is not yet pushed
    credsRecord = await prisma.conversationState.findUnique({
      where: { senderId: CREDS_KEY },
    });
  }

  let creds: AuthenticationCreds;
  const rawState = credsRecord?.value || credsRecord?.state;
  if (rawState) {
    creds = JSON.parse(JSON.stringify(rawState), BufferJSON.reviver);
  } else {
    creds = initAuthCreds();
  }

  const saveCreds = async () => {
    const serializedCreds = JSON.parse(JSON.stringify(creds, BufferJSON.replacer));
    try {
      if (isDedicatedTable) {
        await (prisma as any).baileysSession.upsert({
          where: { key: CREDS_KEY },
          create: { key: CREDS_KEY, value: serializedCreds },
          update: { value: serializedCreds },
        });
      } else {
        await prisma.conversationState.upsert({
          where: { senderId: CREDS_KEY },
          create: { senderId: CREDS_KEY, state: serializedCreds },
          update: { state: serializedCreds },
        });
      }
    } catch (err) {
      await prisma.conversationState.upsert({
        where: { senderId: CREDS_KEY },
        create: { senderId: CREDS_KEY, state: serializedCreds },
        update: { state: serializedCreds },
      });
    }
  };

  const clearState = async () => {
    try {
      if (isDedicatedTable) {
        await (prisma as any).baileysSession.deleteMany({});
      }
    } catch (e) {}

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
              let record: any = null;
              try {
                if (isDedicatedTable) {
                  record = await (prisma as any).baileysSession.findUnique({
                    where: { key },
                  });
                } else {
                  record = await prisma.conversationState.findUnique({
                    where: { senderId: key },
                  });
                }
              } catch (e) {
                record = await prisma.conversationState.findUnique({
                  where: { senderId: key },
                });
              }

              const val = record?.value || record?.state;
              if (val) {
                const value = JSON.parse(JSON.stringify(val), BufferJSON.reviver);
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
                if (isDedicatedTable) {
                  tasks.push(
                    (prisma as any).baileysSession.upsert({
                      where: { key },
                      create: { key, value: serializedValue },
                      update: { value: serializedValue },
                    }).catch(() => {
                      return prisma.conversationState.upsert({
                        where: { senderId: key },
                        create: { senderId: key, state: serializedValue },
                        update: { state: serializedValue },
                      });
                    })
                  );
                } else {
                  tasks.push(
                    prisma.conversationState.upsert({
                      where: { senderId: key },
                      create: { senderId: key, state: serializedValue },
                      update: { state: serializedValue },
                    })
                  );
                }
              } else {
                if (isDedicatedTable) {
                  tasks.push(
                    (prisma as any).baileysSession.deleteMany({
                      where: { key },
                    }).catch(() => {})
                  );
                }
                tasks.push(
                  prisma.conversationState.deleteMany({
                    where: { senderId: key },
                  }).catch(() => {})
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
