// ============================================
// Message Queue per Sender ID (Concurrency Control)
// ============================================

const senderQueues = new Map<string, Promise<any>>();

export function enqueueForSender<T>(senderId: string, task: () => Promise<T>): Promise<T> {
  const currentQueue = senderQueues.get(senderId) || Promise.resolve();

  const taskPromise = currentQueue.then(async () => {
    return await task();
  });

  // Keep internal chain resilient even if task fails
  const chainPromise = taskPromise.catch((err) => {
    console.error(`❌ Queue execution error for sender ${senderId}:`, err);
  });

  senderQueues.set(senderId, chainPromise);

  chainPromise.finally(() => {
    if (senderQueues.get(senderId) === chainPromise) {
      senderQueues.delete(senderId);
    }
  });

  return taskPromise;
}

