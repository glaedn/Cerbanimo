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
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    if (!this.socket) return;

    // Generic Event Ingestion
    this.socket.on('event', (event) => {
      console.log('[SocketService] Received Event:', event);
      this.handleIngestion(event);
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

    // Simple invalidation strategy based on entity type
    if (entity_type) {
      console.log(`[SocketService] Invalidate cache for: ${entity_type}`);
      queryClient.invalidateQueries([entity_type]);

      // If it's a specific entity, we can also invalidate that specific entry
      if (entity_id) {
        queryClient.invalidateQueries([entity_type, entity_id]);
      }
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
