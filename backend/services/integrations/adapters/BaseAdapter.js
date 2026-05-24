/**
 * Base class for all platform adapters.
 * Every adapter (Discord, Google Chat, Slack, etc.) must extend this class.
 */
class BaseAdapter {
    constructor(platform) {
        this.platform = platform;
        this.isReady = false;
    }

    /**
     * Initialize the adapter (login, connect webhooks, etc.)
     */
    async initialize() {
        throw new Error(`initialize() not implemented for ${this.platform} adapter`);
    }

    /**
     * Standard method to send a broadcast message to a channel/community
     */
    async broadcast(target, payload) {
        throw new Error(`broadcast() not implemented for ${this.platform} adapter`);
    }

    /**
     * Standard method to notify a specific user
     */
    async notifyUser(externalUserId, payload) {
        throw new Error(`notifyUser() not implemented for ${this.platform} adapter`);
    }

    /**
     * Normalize incoming platform-specific events into Cerbanimo events
     */
    normalizeEvent(rawEvent) {
        throw new Error(`normalizeEvent() not implemented for ${this.platform} adapter`);
    }
}

export default BaseAdapter;
