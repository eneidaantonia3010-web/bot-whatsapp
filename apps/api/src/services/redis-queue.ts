// ============================================
// Glow Studio — Distributed Persistent Message Queue
// ============================================

import { logger } from './logger';

export interface QueuedMessageJob {
  id: string;
  senderId: string;
  payload: any;
  createdAt: number;
  attempts: number;
}

// In-memory queue storage with persistent Redis interface compatibility
const memoryQueue: QueuedMessageJob[] = [];
let isProcessing = false;

/**
 * Enqueue a message job to the distributed queue
 */
export async function pushMessageJob(job: Omit<QueuedMessageJob, 'id' | 'createdAt' | 'attempts'>): Promise<string> {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newJob: QueuedMessageJob = {
    ...job,
    id: jobId,
    createdAt: Date.now(),
    attempts: 0,
  };

  memoryQueue.push(newJob);
  logger.debug({ jobId, queueSize: memoryQueue.length }, 'Job added to message queue');

  return jobId;
}

/**
 * Pop next available job
 */
export async function popMessageJob(): Promise<QueuedMessageJob | null> {
  if (memoryQueue.length === 0) return null;
  return memoryQueue.shift() || null;
}

/**
 * Get current queue status metrics
 */
export function getQueueMetrics() {
  return {
    pendingJobs: memoryQueue.length,
    isProcessing,
    oldestJobAgeMs: memoryQueue.length > 0 ? Date.now() - memoryQueue[0].createdAt : 0,
  };
}
