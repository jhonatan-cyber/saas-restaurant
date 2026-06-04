import { create } from 'zustand';
import type { Socket } from 'socket.io-client';

/**
 * Estado observable de la conexión WebSocket.
 * Cualquier componente puede suscribirse con `useRealtimeStore(s => s.status)`
 * para mostrar indicadores de "en vivo / reconectando".
 *
 * El socket no se persiste: si el user recarga, se reconecta automáticamente
 * con el JWT fresco desde useAuthStore.
 */
type RealtimeStatus = 'disconnected' | 'connecting' | 'connected';

interface RealtimeState {
  socket: Socket | null;
  status: RealtimeStatus;
  lastConnectedAt: string | null;
  lastError: string | null;

  setSocket: (socket: Socket | null) => void;
  setStatus: (status: RealtimeStatus) => void;
  setError: (err: string | null) => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  socket: null,
  status: 'disconnected',
  lastConnectedAt: null,
  lastError: null,

  setSocket: (socket) =>
    set({
      socket,
      status: socket ? 'connecting' : 'disconnected',
    }),

  setStatus: (status) =>
    set({
      status,
      lastConnectedAt: status === 'connected' ? new Date().toISOString() : null,
    }),

  setError: (err) => set({ lastError: err }),
}));
