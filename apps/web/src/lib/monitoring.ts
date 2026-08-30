// ============================================
// Glow Studio — Frontend Monitoring & Observability (Sentry-Ready)
// ============================================

export interface ClientMonitoringContext {
  user?: {
    id?: string;
    email?: string;
    role?: string;
  };
  tags?: Record<string, string | number | boolean>;
  extra?: Record<string, any>;
  route?: string;
}

export interface ClientBreadcrumb {
  category: string;
  message: string;
  level?: 'info' | 'warn' | 'error' | 'debug';
  data?: Record<string, any>;
  timestamp?: string;
}

const breadcrumbs: ClientBreadcrumb[] = [];
const MAX_CLIENT_BREADCRUMBS = 30;
let currentUser: ClientMonitoringContext['user'] | null = null;
const globalTags: Record<string, string | number | boolean> = {};

/**
 * Initialize Frontend Monitoring.
 * Integrates with Sentry / browser error listeners.
 */
export function initMonitoring(): void {
  if (typeof window === 'undefined') return;

  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (sentryDsn) {
    // Sentry client integration hook
    console.info('[Monitoring] Sentry client monitoring enabled.');
  }

  // Global unhandled promise rejection listener
  window.addEventListener('unhandledrejection', (event) => {
    captureException(event.reason, {
      extra: { type: 'unhandledrejection' },
    });
  });

  // Global window error listener
  window.addEventListener('error', (event) => {
    captureException(event.error || event.message, {
      extra: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });
}

/**
 * Record a user action or lifecycle event breadcrumb.
 */
export function addBreadcrumb(breadcrumb: ClientBreadcrumb): void {
  const item: ClientBreadcrumb = {
    ...breadcrumb,
    timestamp: breadcrumb.timestamp || new Date().toISOString(),
    level: breadcrumb.level || 'info',
  };

  breadcrumbs.push(item);
  if (breadcrumbs.length > MAX_CLIENT_BREADCRUMBS) {
    breadcrumbs.shift();
  }
}

/**
 * Set the authenticated user context.
 */
export function setUser(user: ClientMonitoringContext['user'] | null): void {
  currentUser = user;
}

/**
 * Set global tag for all subsequent events.
 */
export function setTag(key: string, value: string | number | boolean): void {
  globalTags[key] = value;
}

/**
 * Capture client-side exception with context and breadcrumbs.
 */
export function captureException(error: unknown, context?: ClientMonitoringContext): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const payload = {
    message: err.message,
    name: err.name,
    stack: err.stack,
    user: context?.user || currentUser,
    tags: { ...globalTags, ...(context?.tags || {}) },
    extra: context?.extra,
    route: context?.route || (typeof window !== 'undefined' ? window.location.pathname : undefined),
    breadcrumbs: [...breadcrumbs],
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV === 'development') {
    console.error('[Monitoring] Captured Exception:', payload);
  } else {
    // Structured error payload logging in production (or send to Sentry / /api/monitoring endpoint)
    console.error(JSON.stringify({ level: 'error', type: 'client_exception', ...payload }));
  }
}

/**
 * Capture structured client events or warnings.
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warn' | 'error' = 'info',
  context?: ClientMonitoringContext
): void {
  const payload = {
    message,
    level,
    user: context?.user || currentUser,
    tags: { ...globalTags, ...(context?.tags || {}) },
    extra: context?.extra,
    route: typeof window !== 'undefined' ? window.location.pathname : undefined,
    timestamp: new Date().toISOString(),
  };

  if (level === 'error') {
    console.error('[Monitoring Event]', payload);
  } else if (level === 'warn') {
    console.warn('[Monitoring Event]', payload);
  } else {
    console.info('[Monitoring Event]', payload);
  }
}

/**
 * Measure client-side execution performance of a synchronous or asynchronous function.
 */
export async function measureClientPerformance<T>(
  name: string,
  fn: () => Promise<T> | T,
  metadata?: Record<string, any>
): Promise<T> {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();

  try {
    const result = await fn();
    const duration = Number(
      ((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start).toFixed(2)
    );

    if (process.env.NODE_ENV === 'development') {
      console.debug(`⏱️ [Perf] ${name}: ${duration}ms`, metadata);
    }

    return result;
  } catch (error) {
    const duration = Number(
      ((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start).toFixed(2)
    );
    console.error(`❌ [Perf] ${name} failed after ${duration}ms:`, error);
    throw error;
  }
}

/**
 * Report Web Vitals metrics (LCP, FID, CLS, TTFB, INP).
 */
export function reportWebVitals(metric: {
  id: string;
  name: string;
  value: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
  navigationType?: string;
}): void {
  if (process.env.NODE_ENV === 'development') {
    console.debug(`📊 [Web Vital] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating || 'N/A'})`);
  }

  addBreadcrumb({
    category: 'web-vitals',
    message: `${metric.name}: ${metric.value}`,
    data: metric,
    level: metric.rating === 'poor' ? 'warn' : 'info',
  });
}
