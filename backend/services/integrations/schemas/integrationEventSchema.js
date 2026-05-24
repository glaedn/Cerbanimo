/**
 * Schema for normalized Cerbanimo integration events.
 *
 * {
 *   platform: "discord" | "google_chat",
 *   type: "message.created" | "command.executed" | "user.joined",
 *   externalWorkspaceId: "...",
 *   externalChannelId: "...",
 *   externalUserId: "...",
 *   content: "...",
 *   metadata: {},
 *   raw: {} // Original payload from platform
 * }
 */

export const normalizeEvent = (platform, raw) => {
    // Basic structural shell
    return {
        platform,
        cerbanimoTimestamp: new Date().toISOString(),
        raw
    };
};
