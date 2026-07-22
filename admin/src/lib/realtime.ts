import { io } from 'socket.io-client';
import { useAuthStore } from './auth-store';
import { useRealtimeStore } from './realtime-store';
import { WS_NAMESPACE } from '@saas/shared';

/**
 * Manager del WebSocket.
 *
 * - Singleton: una sola conexión por sesión del browser, sin importar
 *   cuántos componentes estén suscritos.
 * - Conecta con el JWT fresco de useAuthStore (no del localStorage).
 * - Auto-reconnect con backoff (configurado en `reconnectionDelay`).
 * - Hooks de lifecycle (connect/disconnect) se montan desde useRealtimeInvalidation
 *   y desde el layout de rutas autenticadas.
 *
 * Por qué un manager y no exponer el Socket directo:
 *  - Centraliza reconnect, cleanup y manejo de errores.
 *  - El store Zustand evita que múltiples components disparen io() cada vez
 *    que se montan.
 */
const API_ROOT_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export function connectRealtime(): void {
  const state = useRealtimeStore.getState();
  if (state.socket?.connected) return;

  const user = useAuthStore.getState().user;
  if (!user) {
    // No hay sesión, no se puede autenticar el WS. Queda disconnected.
    return;
  }

  // Con cookies HttpOnly, el access_token se envía automáticamente
  // en el handshake de Socket.IO. withCredentials: true permite
  // que las cookies se envíen en el upgrade desde el browser.
  const socket = io(`${API_ROOT_URL}${WS_NAMESPACE}`, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
    timeout: 20_000,
  });

  socket.on('connect', () => {
    useRealtimeStore.getState().setStatus('connected');
    useRealtimeStore.getState().setError(null);
  });

  socket.on('disconnect', (reason) => {
    useRealtimeStore.getState().setStatus('disconnected');
    // 'io server disconnect' = el server kickeó. Reconectamos manual
    // porque socket.io NO lo hace automáticamente en ese caso.
    if (reason === 'io server disconnect') {
      socket.connect();
    }
  });

  socket.on('connect_error', (err) => {
    useRealtimeStore.getState().setStatus('disconnected');
    useRealtimeStore.getState().setError(err.message);
    // No logueamos en producción para no spamear la consola si el server
    // está caído; el indicador visual del status es suficiente.
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[realtime] connect_error:', err.message);
    }
  });

  useRealtimeStore.getState().setSocket(socket);
}

export function disconnectRealtime(): void {
  const state = useRealtimeStore.getState();
  state.socket?.disconnect();
  state.setSocket(null);
}

/**
 * Helper para emitir un evento al server.
 * Útil si en el futuro se necesita tráfico cliente→server (ej. "marcar como leído").
 * Por ahora la API es read-only desde el cliente, pero dejamos la puerta abierta.
 */
export function emitRealtime<T = unknown>(event: string, payload: T): void {
  const socket = useRealtimeStore.getState().socket;
  if (!socket?.connected) return;
  socket.emit(event, payload);
}
