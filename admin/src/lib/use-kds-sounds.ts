import { useEffect, useRef, useCallback, useState } from 'react';
import { sileo } from 'sileo';
import { useRealtimeStore } from './realtime-store';
import { WS_EVENTS, ORDER_STATUS_LABELS } from '@saas/shared';
import type {
  WsOrderCreatedPayload,
  WsOrderStateChangedPayload,
  WsOrderCancelledPayload,
} from '@saas/shared';

/**
 * Genera un sonido corto usando Web Audio API.
 * No requiere archivos de audio externos.
 *
 * @param type - Tipo de sonido a reproducir.
 *   - 'new-order': Ascending chime (dos tonos) para nueva orden entrante.
 *   - 'status-change': Pop corto para cambio de estado.
 *   - 'cancel': Sonido descendente para cancelación.
 */
function playSound(type: 'new-order' | 'status-change' | 'cancel'): void {
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.value = 0.15; // volumen moderado

    if (type === 'new-order') {
      // Ascending chime: dos tonos rápidos
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = 523.25; // C5
      osc1.connect(gain);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.12);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = 659.25; // E5
      const gain2 = ctx.createGain();
      gain2.gain.value = 0.12;
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.1);
      osc2.stop(ctx.currentTime + 0.25);
    } else if (type === 'status-change') {
      // Short pop: tono rápido y seco
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 880; // A5
      osc.connect(gain);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'cancel') {
      // Descending tone
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.25);
      osc.connect(gain);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }

    // Cleanup after sound finishes
    setTimeout(() => ctx.close(), 500);
  } catch {
    // Silently fail if AudioContext is not available
  }
}

/**
 * Hook que escucha eventos WebSocket en tiempo real y:
 *   - Reproduce sonidos de notificación (nueva orden, cambio de estado, cancelación)
 *   - Muestra toasts con sileo para eventos relevantes
 *
 * El sonido se puede silenciar/activar con `toggleMuted`.
 */
export function useKdsSounds(): { muted: boolean; toggleMuted: () => void } {
  const socket = useRealtimeStore((s) => s.socket);
  const [muted, setMuted] = useState(
    () => localStorage.getItem('kds-sound-muted') === 'true',
  );

  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const toggleMuted = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem('kds-sound-muted', String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onCreated = (payload: WsOrderCreatedPayload): void => {
      const order = payload.order;
      const shortId = order.id.slice(-6).toUpperCase();
      const tableLabel = order.tableId ? ` Mesa ${order.tableId.slice(-3)}` : '';
      const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);

      // Toast notification
      sileo.info({
        title: `🆕 Nueva orden #${shortId}`,
        description: `${itemCount} ítem${itemCount !== 1 ? 's' : ''}${tableLabel} — Bs ${Number(order.total).toFixed(2)}`,
      });

      // Sound
      if (!mutedRef.current) {
        playSound('new-order');
      }
    };

    const onStateChanged = (payload: WsOrderStateChangedPayload): void => {
      const shortId = payload.orderId.slice(-6).toUpperCase();

      const fromLabel = payload.from ? (ORDER_STATUS_LABELS[payload.from] ?? payload.from) : '—';
      const toLabel = ORDER_STATUS_LABELS[payload.to] ?? payload.to;

      // Toast for KDS-relevant transitions
      if (['SENT_TO_KITCHEN', 'IN_PREPARATION', 'READY', 'DELIVERED'].includes(payload.to)) {
        sileo.success({
          title: `🔄 #${shortId}: ${fromLabel} → ${toLabel}`,
          description: payload.reason ?? 'Estado actualizado',
        });
      }

      // Sound
      if (!mutedRef.current) {
        if (payload.to === 'CANCELLED') {
          playSound('cancel');
        } else {
          playSound('status-change');
        }
      }
    };

    const onCancelled = (payload: WsOrderCancelledPayload): void => {
      const shortId = payload.orderId.slice(-6).toUpperCase();

      sileo.error({
        title: `❌ Orden #${shortId} cancelada`,
        description: payload.cancellationReason ?? 'Sin motivo especificado',
      });

      if (!mutedRef.current) {
        playSound('cancel');
      }
    };

    socket.on(WS_EVENTS.ORDER_CREATED, onCreated);
    socket.on(WS_EVENTS.ORDER_STATE_CHANGED, onStateChanged);
    socket.on(WS_EVENTS.ORDER_CANCELLED, onCancelled);

    return () => {
      socket.off(WS_EVENTS.ORDER_CREATED, onCreated);
      socket.off(WS_EVENTS.ORDER_STATE_CHANGED, onStateChanged);
      socket.off(WS_EVENTS.ORDER_CANCELLED, onCancelled);
    };
  }, [socket]);

  return { muted, toggleMuted };
}
