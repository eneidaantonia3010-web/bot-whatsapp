// ============================================
// Monitoring, Sentry-Ready APM & Performance Tracing (API Backend)
// ============================================

import { logger } from './logger';
import { config } from '../config';

export interface MonitoringContext {
  user?: {
    id?: string;
    email?: string;
    role?: string;
  };
  tags?: Record<string, string | number | boolean>;
  extra?: Record<string, any>;
  req?: {
    method?: string;
    url?: string;
    path?: string;
    ip?: string;
    headers?: Record<string, any>;
  };
}

export interface MetricEntry {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  tags?: Record<string, string>;
  timestamp: string;
}

export interface Breadcrumb {
  category: string;
  message: string;
  level?: 'info' | 'warn' | 'error' | 'debug';
  data?: Record<string, any>;
  timestamp?: string;
}

const recentBreadcrumbs: Breadcrumb[] = [];
const MAX_BREADCRUMBS = 50;

/**
 * Initialize APM / Sentry monitoring service.
 * Ready for @sentry/node integration if SENTRY_DSN is configured.
 */
export function initMonitoring(): void {
  const dsn = process.env.SENTRY_DSN;
  if (dsn) {
    logger.info({ dsn: dsn.substring(0, 15) + '...' }, 'Initializing Sentry backend monitoring...');
    // If Sentry package is installed at runtime, it can be initialized here
  } else {
    logger.info('Structured monitoring & tracing initialized in fallback/logger mode.');
  }
}

/**
 * Add a breadcrumb to the in-memory ring buffer for error context.
 */
export function addBreadcrumb(breadcrumb: Breadcrumb): void {
  const entry: Breadcrumb = {
    ...breadcrumb,
    timestamp: breadcrumb.timestamp || new Date().toISOString(),
    level: breadcrumb.level || 'info',
  };

  recentBreadcrumbs.push(entry);
  if (recentBreadcrumbs.length > MAX_BREADCRUMBS) {
    recentBreadcrumbs.shift();
  }
}

/**
 * Get recently recorded breadcrumbs.
 */
export function getBreadcrumbs(): Breadcrumb[] {
  return [...recentBreadcrumbs];
}

/**
 * Capture an exception with structured diagnostic context.
 */
export function captureException(error: unknown, context?: MonitoringContext): void {
  const errObject = error instanceof Error ? error : new Error(String(error));
  const errorPayload = {
    message: errObject.message,
    name: errObject.name,
    stack: errObject.stack,
    breadcrumbs: getBreadcrumbs(),
    user: context?.user,
    tags: context?.tags,
    extra: context?.extra,
    request: context?.req,
    timestamp: new Date().toISOString(),
  };

  logger.error(errorPayload, `[Monitoring] Exception captured: ${errObject.message}`);
}

/**
 * Capture a structured message / event.
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warn' | 'error' = 'info',
  context?: MonitoringContext
): void {
  const payload = {
    message,
    level,
    user: context?.user,
    tags: context?.tags,
    extra: context?.extra,
    timestamp: new Date().toISOString(),
  };

  if (level === 'error') {
    logger.error(payload, `[Monitoring] Event: ${message}`);
  } else if (level === 'warn') {
    logger.warn(payload, `[Monitoring] Event: ${message}`);
  } else {
    logger.info(payload, `[Monitoring] Event: ${message}`);
  }
}

/**
 * Measure execution duration and performance of an async block.
 */
export async function measurePerformance<T>(
  operationName: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const start = performance.now();
  const startTime = Date.now();

  try {
    const result = await fn();
    const durationMs = Number((performance.now() - start).toFixed(2));

    const logPayload = {
      operation: operationName,
      durationMs,
      startTime: new Date(startTime).toISOString(),
      status: 'success',
      ...metadata,
    };

    if (durationMs > 1000) {
      logger.warn(logPayload, `[Performance] Slow operation detected: ${operationName} (${durationMs}ms)`);
    } else {
      logger.debug(logPayload, `[Performance] Completed ${operationName} in ${durationMs}ms`);
    }

    return result;
  } catch (error: any) {
    const durationMs = Number((performance.now() - start).toFixed(2));
    logger.error(
      {
        operation: operationName,
        durationMs,
        status: 'error',
        error: error?.message,
        ...metadata,
      },
      `[Performance] Operation failed: ${operationName} (${durationMs}ms)`
    );
    throw error;
  }
}

/**
 * Record custom metrics (counters, gauges, response times).
 */
export function recordMetric(
  name: string,
  value: number,
  unit: MetricEntry['unit'] = 'count',
  tags?: Record<string, string>
): void {
  const metric: MetricEntry = {
    name,
    value,
    unit,
    tags,
    timestamp: new Date().toISOString(),
  };

  logger.info({ metric }, `[Metric] ${name}=${value} ${unit}`);
}
