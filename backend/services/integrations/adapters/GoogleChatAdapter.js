import axios from 'axios';
import BaseAdapter from './BaseAdapter.js';

class GoogleChatAdapter extends BaseAdapter {
  constructor() {
    super('google_chat');
  }

  async initialize() {
    console.log('Google Chat Adapter Initializing (MVP - Webhook only)...');
    this.isReady = true;
  }

  /**
   * Broadcast to Google Chat
   * For MVP, we expect a webhook URL in integration.config.webhook_url
   */
  async broadcast(integration, payload) {
    if (!this.isReady) return;

    const { type, entity } = payload;
    const webhookUrl = integration.config?.webhook_url || integration.external_channel_id;

    if (!webhookUrl || !webhookUrl.startsWith('https://chat.googleapis.com/v1/spaces/')) {
      console.warn(`Invalid or missing Google Chat webhook URL for integration ${integration.id}`);
      return;
    }

    try {
      let messageText = '';
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      if (type === 'need') {
        messageText = `🚨 *New Need: ${entity.name}*\n${entity.description}\n\n*Urgency:* ${entity.urgency || 'Medium'}\n*Link:* ${frontendUrl}/needs/${entity.id}`;
      } else if (type === 'resource') {
        messageText = `📦 *New Resource: ${entity.name}*\n${entity.description}\n\n*Category:* ${entity.category}\n*Link:* ${frontendUrl}/resources/${entity.id}`;
      } else if (type === 'alert') {
        messageText = `⚠️ *Community Alert*\n${entity.message || entity.text}`;
      } else {
        messageText = `*Cerbanimo Notification*\n${JSON.stringify(entity)}`;
      }

      await axios.post(webhookUrl, { text: messageText });
      return { success: true };
    } catch (err) {
      console.error('Error broadcasting to Google Chat:', err.response?.data || err.message);
    }
  }

  async notifyUser(externalUserId, payload) {
    console.log(`Google Chat individual notification not implemented in Webhook MVP (Target: ${externalUserId})`);
    // Google Chat individual DMs require a full Chat App with OAuth, not just webhooks.
  }
}

export default new GoogleChatAdapter();
