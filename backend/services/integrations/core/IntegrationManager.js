import pool from '../../../db.js';

class IntegrationManager {
    constructor() {
        this.adapters = new Map();
    }

    registerAdapter(adapter) {
        console.log(`Registering integration adapter for platform: ${adapter.platform}`);
        this.adapters.set(adapter.platform, adapter);
    }

    async initializeAll() {
        for (const [platform, adapter] of this.adapters) {
            try {
                await adapter.initialize();
                console.log(`Adapter for ${platform} initialized successfully.`);
            } catch (err) {
                console.error(`Failed to initialize ${platform} adapter:`, err);
            }
        }
    }

    getAdapter(platform) {
        return this.adapters.get(platform);
    }

    /**
     * Broadcast an event to all connected platforms for a community
     * @param {number} communityId
     * @param {string} type 'need' | 'resource' | 'task' | 'alert'
     * @param {object} entity
     */
    async broadcast(communityId, type, entity) {
        try {
            // Find all active integrations for this community
            const integrations = await pool.query(
                'SELECT platform, external_channel_id, config FROM community_integrations WHERE community_id = $1 AND is_active = true',
                [communityId]
            );

            for (const integration of integrations.rows) {
                const adapter = this.getAdapter(integration.platform);
                if (adapter && adapter.isReady) {
                    await adapter.broadcast(integration, { type, entity });
                }
            }
        } catch (err) {
            console.error(`Error in IntegrationManager.broadcast:`, err);
        }
    }

    /**
     * Notify a user across all their linked platforms
     */
    async notifyUser(userId, payload) {
        try {
            const userIntegrations = await pool.query(
                'SELECT platform, external_user_id FROM user_integrations WHERE user_id = $1',
                [userId]
            );

            for (const ui of userIntegrations.rows) {
                const adapter = this.getAdapter(ui.platform);
                if (adapter && adapter.isReady) {
                    await adapter.notifyUser(ui.external_user_id, payload);
                }
            }
        } catch (err) {
            console.error(`Error in IntegrationManager.notifyUser:`, err);
        }
    }
}

export default new IntegrationManager();
