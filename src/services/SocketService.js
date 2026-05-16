import { io } from 'socket.io-client';
import { queryClient } from '../lib/queryClient';
import { audioEngine } from '../audio/AudioEngine';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect(userId, token) {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(import.meta.env.VITE_BACKEND_URL, {
      transports: ['websocket'],
      query: { userId },
      auth: { token }
    });

    this.socket.on('connect', () => {
      console.log('[SocketService] Connected:', this.socket.id);
      this.socket.emit('join', userId);
      this.startPresenceHeartbeat(userId);
    });

    this.setupEventHandlers();
  }

  startPresenceHeartbeat(userId) {
    if (this.presenceInterval) clearInterval(this.presenceInterval);
    this.presenceInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('presence:heartbeat', {
          userId,
          context: window.location.pathname,
          timestamp: new Date().toISOString()
        });
      }
    }, 10000); // 10 seconds
  }

  setupEventHandlers() {
    if (!this.socket) return;

    // Generic Event Ingestion
    this.socket.on('event', (event) => {
      console.log('[SocketService] Received Event:', event);
      this.handleIngestion(event);
    });

    this.socket.on('presence:update', ({ scopeId, userIds }) => {
      import('../store/useAppStore').then(module => {
        module.useAppStore.getState().updatePresence(scopeId, userIds);
      });
    });

    // Legacy/Specific Handlers
    this.socket.on('notification', (notification) => {
      console.log('[SocketService] Notification:', notification);
      // Invalidate notifications query
      queryClient.invalidateQueries(['notifications']);
    });

    this.socket.on('audio:event', ({ type, payload }) => {
      console.log('[SocketService] Audio Event:', type, payload);
      audioEngine.trigger(type, payload);
    });

    this.socket.on('levelUpdate', (data) => {
      console.log('[SocketService] Level Update:', data);
      queryClient.invalidateQueries(['profile']);
      // We might want to trigger a global UI event for this too
    });
  }

  handleIngestion(event) {
    const { entity_type, entity_id } = event;

    // 1. Invalidate Cache
    if (entity_type) {
      queryClient.invalidateQueries([entity_type]);
      if (entity_id) {
        queryClient.invalidateQueries([entity_type, entity_id]);
      }
    }

    // 2. Add to Realtime Event Stream in Store
    // Dynamically import store to avoid circular dependency if any
    import('../store/useAppStore').then(module => {
      const store = module.useAppStore.getState();
      store.addRealtimeEvent({
        ...event,
        receivedAt: new Date().toISOString(),
        id: event.id || Math.random().toString(36).substr(2, 9)
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
