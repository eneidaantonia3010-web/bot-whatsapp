'use client';

// ============================================
// Glow Studio — Realtime Appointments Hook (SSE)
// ============================================

import { useEffect, useRef } from 'react';
import { API_URL } from '@/lib/constants';

export type RealtimeCallback = (event: {
  type: 'APPOINTMENT_CREATED' | 'APPOINTMENT_CANCELLED' | 'APPOINTMENT_CONFIRMED' | 'APPOINTMENT_RESCHEDULED' | 'WHATSAPP_STATUS';
  payload: any;
  timestamp?: string;
}) => void;

export function useRealtimeAppointments(
  onEvent: RealtimeCallback,
  onReconnect?: () => void
) {
  const onEventRef = useRef(onEvent);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    onEventRef.current = onEvent;
    onReconnectRef.current = onReconnect;
  }, [onEvent, onReconnect]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let isReconnecting = false;

    function connect() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('glow_studio_jwt_token') : null;
        const url = `${API_URL}/api/realtime/events${token ? `?token=${encodeURIComponent(token)}` : ''}`;

        eventSource = new EventSource(url);

        eventSource.onopen = () => {
          if (isReconnecting) {
            onReconnectRef.current?.();
            isReconnecting = false;
          }
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data && data.type && data.type !== 'CONNECTED') {
              onEventRef.current(data);
            }
          } catch (err) {
            console.warn('Error parsing SSE event:', err);
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          isReconnecting = true;
          // Reconnect after 5 seconds if connection drops
          reconnectTimer = setTimeout(connect, 5000);
        };
      } catch (e) {
        console.warn('SSE connection initialization error:', e);
        isReconnecting = true;
        reconnectTimer = setTimeout(connect, 5000);
      }
    }

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);
}
