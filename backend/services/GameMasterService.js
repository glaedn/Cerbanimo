import crypto from 'node:crypto';
import process from 'node:process';
import pool from '../db.js';
import ActionQueueService from './ActionQueueService.js';

export const PRESENTATION_MODES = Object.freeze(['game_master', 'plain']);
export const NARRATIVE_INTENSITIES = Object.freeze(['light', 'standard', 'immersive']);
export const STAT_DISPLAY_MODES = Object.freeze(['narrative', 'numeric', 'both']);
export const ROLE_ARCHETYPES = Object.freeze([
  'party_member',
  'builder',
  'organizer',
  'reviewer',
  'scout',
  'scribe',
  'guardian',
  'steward'
]);

const PRIVATE_VISIBILITIES = new Set(['private', 'invite_only', 'members', 'restricted']);

export function hashInviteToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

export function normalizeNarrativePreferences(input = {}, existing = {}) {
  return {
    presentationMode: normalizeEnum(input.presentationMode ?? input.presentation_mode, PRESENTATION_MODES, existing.presentation_mode || existing.presentationMode || 'game_master'),
    narrativeIntensity: normalizeEnum(input.narrativeIntensity ?? input.narrative_intensity, NARRATIVE_INTENSITIES, existing.narrative_intensity || existing.narrativeIntensity || 'standard'),
    preferredGenres: normalizeStringArray(input.preferredGenres ?? input.preferred_genres ?? existing.preferred_genres ?? existing.preferredGenres),
    avoidThemes: normalizeStringArray(input.avoidThemes ?? input.avoid_themes ?? existing.avoid_themes ?? existing.avoidThemes),
    statDisplayMode: normalizeEnum(input.statDisplayMode ?? input.stat_display_mode, STAT_DISPLAY_MODES, existing.stat_display_mode || existing.statDisplayMode || 'both'),
    seenIntro: Boolean(input.seenIntro ?? input.seen_intro ?? existing.seen_intro ?? existing.seenIntro ?? false),
    contentSafetyPreferences: normalizeObject(input.contentSafetyPreferences ?? input.content_safety_preferences ?? existing.content_safety_preferences ?? existing.contentSafetyPreferences)
  };
}

function normalizeEnum(value, allowed, fallback) {
  const normalized = String(value || fallback || '').trim().toLowerCase();
  return allowed.includes(normalized) ? normalized : fallback;
}

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? [...new Set(value.map(item => String(item || '').trim()).filter(Boolean))].slice(0, 16)
    : [];
}

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeLimit(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function httpError(status, message, code = null, details = null) {
  const error = new Error(message);
  error.status = status;
  error.code = code || status;
  error.details = details;
  return error;
}

function isAdmin(authContext = {}) {
  return Array.isArray(authContext.roles) && authContext.roles.includes('admin');
}

function actorUserId(authContext = {}) {
  const id = Number(authContext.actorUserId || authContext.userId || 0);
  return id > 0 ? id : null;
}

function safeProject(project) {
  if (!project) return null;
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    visibility: project.visibility,
    tags: project.tags || [],
    startDate: project.start_date,
    endDate: project.end_date,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    creator: project.creator_id
      ? {
          id: project.creator_id,
          username: project.creator_username || null
        }
      : null
  };
}

function serializePreferences(row) {
  return {
    presentationMode: row.presentation_mode,
    narrativeIntensity: row.narrative_intensity,
    preferredGenres: row.preferred_genres || [],
    avoidThemes: row.avoid_themes || [],
    statDisplayMode: row.stat_display_mode,
    seenIntro: Boolean(row.seen_intro),
    plainOverridePrefixes: row.plain_override_prefixes || [],
    contentSafetyPreferences: row.content_safety_preferences || {},
    updatedAt: row.updated_at
  };
}

function serializeQuestProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    uuid: row.profile_uuid,
    projectId: row.project_id,
    status: row.status,
    version: row.profile_version,
    title: row.title,
    premise: row.premise,
    desiredOutcome: row.desired_outcome,
    genre: row.genre,
    tone: row.tone,
    stakes: row.stakes,
    openingScene: row.opening_scene,
    keyThemes: row.key_themes || [],
    avoidedThemes: row.avoided_themes || [],
    audience: row.audience,
    source: row.source || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function serializeNarrativeSettings(row) {
  return {
    projectId: row.project_id,
    presentationMode: row.presentation_mode,
    narrativeIntensity: row.narrative_intensity,
    genreOverride: row.genre_override,
    avoidThemes: row.avoid_themes || [],
    statDisplayMode: row.stat_display_mode,
    spoilerLevel: row.spoiler_level,
    safetyLevel: row.safety_level,
    updatedAt: row.updated_at
  };
}

function serializePartySettings(row) {
  return {
    projectId: row.project_id,
    minPartySize: Number(row.min_party_size || 1),
    targetPartySize: Number(row.target_party_size || 3),
    maxPartySize: Number(row.max_party_size || 7),
    openRecruitment: Boolean(row.open_recruitment),
    inviteRequired: Boolean(row.invite_required),
    roleSlots: row.role_slots || [],
    updatedAt: row.updated_at
  };
}

function serializeInvite(row, includeSensitive = false) {
  if (!row) return null;
  const serialized = {
    id: row.id,
    uuid: row.invite_uuid,
    projectId: row.project_id,
    status: row.status,
    maxUses: Number(row.max_uses || 1),
    useCount: Number(row.use_count || 0),
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tokenHint: row.token_hint || null
  };
  if (includeSensitive) {
    serialized.createdBy = row.created_by;
    serialized.revokedBy = row.revoked_by;
  }
  return serialized;
}

function serializeCalling(row) {
  if (!row) return null;
  return {
    id: row.id,
    uuid: row.calling_uuid,
    projectId: row.project_id,
    userId: row.user_id,
    callingTitle: row.calling_title,
    roleArchetype: row.role_archetype,
    contributionSummary: row.contribution_summary,
    skillsSnapshot: row.skills_snapshot || {},
    status: row.status,
    source: row.source,
    joinedViaInviteId: row.joined_via_invite_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function serializeEvent(row) {
  return {
    id: row.id,
    uuid: row.event_uuid,
    projectId: row.project_id,
    taskId: row.task_id,
    reviewRoundId: row.review_round_id,
    actorUserId: row.actor_user_id,
    type: row.event_type,
    title: row.title,
    body: row.body,
    facts: row.facts || {},
    visibility: row.visibility,
    createdAt: row.created_at
  };
}

function questProfileFromProject(project, input = {}) {
  const title = String(input.title || project.name || 'Untitled Quest').trim().slice(0, 160);
  const description = String(project.description || input.premise || 'A collaborative Cerbanimo quest.').trim();
  const tags = Array.isArray(project.tags) ? project.tags : [];
  const desiredOutcome = String(input.desiredOutcome || input.desired_outcome || project.project_plan || description).trim().slice(0, 600);
  return {
    title,
    premise: String(input.premise || description).trim().slice(0, 1000),
    desiredOutcome,
    genre: String(input.genre || tags[0] || 'hopeful adventure').trim().slice(0, 80),
    tone: String(input.tone || 'collaborative').trim().slice(0, 80),
    stakes: String(input.stakes || `The party is trying to bring "${title}" from intent into lived reality.`).trim().slice(0, 600),
    openingScene: String(input.openingScene || input.opening_scene || `The quest begins with ${title}: ${description}`).trim().slice(0, 1000),
    keyThemes: normalizeStringArray(input.keyThemes || input.key_themes || tags).slice(0, 8),
    avoidedThemes: normalizeStringArray(input.avoidedThemes || input.avoided_themes).slice(0, 8)
  };
}

class GameMasterService {
  async loadProject(projectId, client = pool) {
    const result = await client.query(
      `SELECT p.*, u.username AS creator_username
       FROM projects p
       LEFT JOIN users u ON u.id = p.creator_id
       WHERE p.id = $1`,
      [projectId]
    );
    return result.rows[0] || null;
  }

  async projectPolicy(project, authContext = {}, client = pool) {
    const actorId = actorUserId(authContext);
    const admin = isAdmin(authContext);
    if (!project) {
      return {
        exists: false,
        canView: false,
        canManage: false,
        canCreateInvite: false,
        canRevokeInvite: false,
        canLaunchQuest: false,
        canUpdateQuestProfile: false,
        canUpdateNarrativeSettings: false,
        canUpdateCalling: false,
        reason: 'Project not found.'
      };
    }

    const owner = Boolean(actorId && Number(project.creator_id) === actorId);
    const publicVisible = !PRIVATE_VISIBILITIES.has(String(project.visibility || 'public').toLowerCase());
    let taskParticipant = false;
    let partyMember = false;
    if (actorId) {
      const [taskResult, callingResult] = await Promise.all([
        client.query(
          `SELECT 1
           FROM tasks
           WHERE project_id = $1
             AND $2 = ANY(assigned_user_ids)
           LIMIT 1`,
          [project.id, actorId]
        ),
        client.query(
          `SELECT 1
           FROM project_character_callings
           WHERE project_id = $1
             AND user_id = $2
             AND status = 'active'
           LIMIT 1`,
          [project.id, actorId]
        )
      ]);
      taskParticipant = taskResult.rowCount > 0;
      partyMember = callingResult.rowCount > 0;
    }

    const canView = admin || owner || taskParticipant || partyMember || publicVisible;
    const canManage = admin || owner;
    return {
      exists: true,
      actorUserId: actorId,
      admin,
      owner,
      taskParticipant,
      partyMember,
      publicVisible,
      canView,
      canManage,
      canCreateInvite: canManage,
      canRevokeInvite: canManage,
      canLaunchQuest: canManage,
      canUpdateQuestProfile: canManage,
      canUpdateNarrativeSettings: canManage,
      canUpdateCalling: Boolean(actorId && canView),
      reason: canView ? 'Project access authorized.' : 'Project is not visible to this actor.'
    };
  }

  assertPolicy(policy, key, message) {
    if (!policy?.[key]) {
      throw httpError(403, message || policy?.reason || 'Not authorized.', 'GAME_MASTER_AUTHORIZATION_DENIED');
    }
  }

  async getNarrativePreferences(userId) {
    if (!userId) throw httpError(401, 'A signed-in user is required.');
    const result = await pool.query(
      `INSERT INTO user_narrative_preferences (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE
       SET user_id = EXCLUDED.user_id
       RETURNING *`,
      [userId]
    );
    return { preferences: serializePreferences(result.rows[0]) };
  }

  async updateNarrativePreferences(userId, input = {}) {
    if (!userId) throw httpError(401, 'A signed-in user is required.');
    const existing = (await this.getNarrativePreferences(userId)).preferences;
    const normalized = normalizeNarrativePreferences(input, existing);
    const result = await pool.query(
      `INSERT INTO user_narrative_preferences (
         user_id, presentation_mode, narrative_intensity, preferred_genres,
         avoid_themes, stat_display_mode, seen_intro, content_safety_preferences
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       ON CONFLICT (user_id) DO UPDATE
       SET presentation_mode = EXCLUDED.presentation_mode,
           narrative_intensity = EXCLUDED.narrative_intensity,
           preferred_genres = EXCLUDED.preferred_genres,
           avoid_themes = EXCLUDED.avoid_themes,
           stat_display_mode = EXCLUDED.stat_display_mode,
           seen_intro = EXCLUDED.seen_intro,
           content_safety_preferences = EXCLUDED.content_safety_preferences,
           updated_at = NOW()
       RETURNING *`,
      [
        userId,
        normalized.presentationMode,
        normalized.narrativeIntensity,
        normalized.preferredGenres,
        normalized.avoidThemes,
        normalized.statDisplayMode,
        normalized.seenIntro,
        JSON.stringify(normalized.contentSafetyPreferences)
      ]
    );
    return { preferences: serializePreferences(result.rows[0]) };
  }

  async ensureQuestProfile(projectId, authContext = {}, client = pool) {
    const project = await this.loadProject(projectId, client);
    const policy = await this.projectPolicy(project, authContext, client);
    this.assertPolicy(policy, 'canView');
    const existing = await client.query(
      `SELECT *
       FROM project_quest_profiles
       WHERE project_id = $1
         AND status = 'active'
       ORDER BY id DESC
       LIMIT 1`,
      [projectId]
    );
    if (existing.rows[0]) {
      return { project, policy, profile: existing.rows[0] };
    }

    const profile = questProfileFromProject(project);
    const inserted = await client.query(
      `INSERT INTO project_quest_profiles (
         project_id, title, premise, desired_outcome, genre, tone, stakes,
         opening_scene, key_themes, avoided_themes, source, created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [
        project.id,
        profile.title,
        profile.premise,
        profile.desiredOutcome,
        profile.genre,
        profile.tone,
        profile.stakes,
        profile.openingScene,
        profile.keyThemes,
        profile.avoidedThemes,
        JSON.stringify({ source: 'project_defaults', generatedBy: 'GameMasterService' }),
        actorUserId(authContext)
      ]
    );
    return {
      project,
      policy,
      profile: inserted.rows[0] || (await client.query(
        `SELECT *
         FROM project_quest_profiles
         WHERE project_id = $1
           AND status = 'active'
         ORDER BY id DESC
         LIMIT 1`,
        [projectId]
      )).rows[0]
    };
  }

  async getQuestProfile({ projectId, authContext }) {
    const { project, policy, profile } = await this.ensureQuestProfile(projectId, authContext);
    return {
      project: safeProject(project),
      profile: serializeQuestProfile(profile),
      allowedActions: this.allowedActions(policy)
    };
  }

  async ensureNarrativeSettings(projectId, client = pool) {
    const result = await client.query(
      `INSERT INTO project_narrative_settings (project_id)
       VALUES ($1)
       ON CONFLICT (project_id) DO UPDATE
       SET project_id = EXCLUDED.project_id
       RETURNING *`,
      [projectId]
    );
    return result.rows[0];
  }

  async ensurePartySettings(projectId, client = pool) {
    const result = await client.query(
      `INSERT INTO project_party_settings (project_id)
       VALUES ($1)
       ON CONFLICT (project_id) DO UPDATE
       SET project_id = EXCLUDED.project_id
       RETURNING *`,
      [projectId]
    );
    return result.rows[0];
  }

  allowedActions(policy = {}) {
    return {
      createInvite: Boolean(policy.canCreateInvite),
      revokeInvite: Boolean(policy.canRevokeInvite),
      joinFromInvite: true,
      launchQuest: Boolean(policy.canLaunchQuest),
      updateQuestProfile: Boolean(policy.canUpdateQuestProfile),
      updateNarrativeSettings: Boolean(policy.canUpdateNarrativeSettings),
      updateCalling: Boolean(policy.canUpdateCalling)
    };
  }

  async getParty({ projectId, authContext, client = pool }) {
    const project = await this.loadProject(projectId, client);
    const policy = await this.projectPolicy(project, authContext, client);
    this.assertPolicy(policy, 'canView');
    const settings = await this.ensurePartySettings(projectId, client);
    const memberResult = await client.query(
      `WITH task_members AS (
         SELECT DISTINCT unnest(assigned_user_ids)::int AS user_id
         FROM tasks
         WHERE project_id = $1
       ),
       member_ids AS (
         SELECT creator_id::int AS user_id
         FROM projects
         WHERE id = $1
           AND creator_id IS NOT NULL
         UNION
         SELECT user_id::int
         FROM project_character_callings
         WHERE project_id = $1
           AND status = 'active'
         UNION
         SELECT user_id
         FROM task_members
         WHERE user_id IS NOT NULL
       )
       SELECT u.id,
              u.username,
              u.profile_picture,
              u.skills,
              c.id AS calling_id,
              c.calling_uuid,
              COALESCE(c.calling_title, CASE WHEN u.id = p.creator_id THEN 'Quest Steward' ELSE 'Party Member' END) AS calling_title,
              COALESCE(c.role_archetype, CASE WHEN u.id = p.creator_id THEN 'steward' ELSE 'party_member' END) AS role_archetype,
              c.contribution_summary,
              c.status AS calling_status,
              c.source,
              u.id = p.creator_id AS project_creator
       FROM member_ids m
       JOIN users u ON u.id = m.user_id
       JOIN projects p ON p.id = $1
       LEFT JOIN project_character_callings c ON c.project_id = $1 AND c.user_id = u.id
       ORDER BY project_creator DESC, u.username ASC`,
      [projectId]
    );

    const inviteRows = policy.canManage
      ? (await client.query(
          `SELECT *
           FROM project_invites
           WHERE project_id = $1
           ORDER BY created_at DESC
           LIMIT 25`,
          [projectId]
        )).rows
      : [];

    return {
      project: safeProject(project),
      settings: serializePartySettings(settings),
      members: memberResult.rows.map(row => ({
        userId: row.id,
        username: row.username,
        profilePicture: row.profile_picture,
        calling: {
          id: row.calling_id,
          uuid: row.calling_uuid,
          title: row.calling_title,
          roleArchetype: row.role_archetype,
          contributionSummary: row.contribution_summary,
          status: row.calling_status || 'active',
          source: row.source || (row.project_creator ? 'project_creator' : 'task_assignment')
        },
        isProjectCreator: Boolean(row.project_creator)
      })),
      invites: inviteRows.map(row => serializeInvite(row, true)),
      shortage: memberResult.rows.length < Number(settings.target_party_size),
      allowedActions: this.allowedActions(policy)
    };
  }

  async getQuestContext({ projectId, authContext }) {
    const { project, policy, profile } = await this.ensureQuestProfile(projectId, authContext);
    this.assertPolicy(policy, 'canView');
    const [settings, party, taskResult, reviewResult, acceptanceResult, chronicle] = await Promise.all([
      this.ensureNarrativeSettings(projectId),
      this.getParty({ projectId, authContext }),
      pool.query(
        `SELECT id, name, status, due_date, automation_classification
         FROM tasks
         WHERE project_id = $1
         ORDER BY created_at ASC
         LIMIT 100`,
        [projectId]
      ),
      pool.query(
        `SELECT rr.id, rr.status, rr.stage, rr.risk_tier, rr.peer_approvals_required,
                rr.peer_approvals_received, rr.peer_deadline_at, rr.pm_deadline_at
         FROM task_review_rounds rr
         JOIN tasks t ON t.id = rr.task_id
         WHERE t.project_id = $1
           AND rr.status NOT IN ('cancelled', 'superseded')
         ORDER BY rr.created_at DESC
         LIMIT 25`,
        [projectId]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count
         FROM task_acceptance_records ar
         JOIN tasks t ON t.id = ar.task_id
         WHERE t.project_id = $1
           AND ar.settlement_status = 'pending'`,
        [projectId]
      ),
      this.getChronicle({ projectId, authContext, limit: 20 })
    ]);

    return {
      project: safeProject(project),
      questProfile: serializeQuestProfile(profile),
      narrativeSettings: serializeNarrativeSettings(settings),
      party: {
        settings: party.settings,
        members: party.members,
        shortage: party.shortage
      },
      tasks: taskResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        status: row.status,
        dueDate: row.due_date,
        automationClassification: row.automation_classification
      })),
      review: {
        activeRounds: reviewResult.rows.map(row => ({
          id: row.id,
          status: row.status,
          stage: row.stage,
          riskTier: row.risk_tier,
          peerApprovalsRequired: row.peer_approvals_required,
          peerApprovalsReceived: row.peer_approvals_received,
          peerDeadlineAt: row.peer_deadline_at,
          pmDeadlineAt: row.pm_deadline_at
        })),
        acceptedPendingSettlement: acceptanceResult.rows[0]?.count || 0
      },
      chronicle: chronicle.events,
      allowedActions: this.allowedActions(policy),
      safety: {
        noRewardOrCompletionClaims: true,
        evidenceContentIncluded: false,
        source: 'cerbanimo_api_v1'
      }
    };
  }

  async updateNarrativeSettings({ projectId, authContext, input = {} }) {
    const project = await this.loadProject(projectId);
    const policy = await this.projectPolicy(project, authContext);
    this.assertPolicy(policy, 'canUpdateNarrativeSettings');
    const existing = await this.ensureNarrativeSettings(projectId);
    const normalized = normalizeNarrativePreferences(input, existing);
    const spoilerLevel = normalizeEnum(input.spoilerLevel ?? input.spoiler_level, ['current', 'foreshadow', 'full'], existing.spoiler_level || 'current');
    const safetyLevel = normalizeEnum(input.safetyLevel ?? input.safety_level, ['standard', 'careful', 'restricted'], existing.safety_level || 'standard');
    const result = await pool.query(
      `UPDATE project_narrative_settings
       SET presentation_mode = $2,
           narrative_intensity = $3,
           genre_override = $4,
           avoid_themes = $5,
           stat_display_mode = $6,
           spoiler_level = $7,
           safety_level = $8,
           updated_by = $9,
           updated_at = NOW()
       WHERE project_id = $1
       RETURNING *`,
      [
        projectId,
        normalized.presentationMode,
        normalized.narrativeIntensity,
        input.genreOverride || input.genre_override || existing.genre_override || null,
        normalized.avoidThemes,
        normalized.statDisplayMode,
        spoilerLevel,
        safetyLevel,
        actorUserId(authContext)
      ]
    );
    await this.recordNarrativeEvent({
      projectId,
      actorUserId: actorUserId(authContext),
      eventType: 'narrative.settings_updated',
      eventKey: `narrative-settings:${Date.now()}`,
      title: 'Narrative settings updated',
      facts: { presentationMode: normalized.presentationMode, narrativeIntensity: normalized.narrativeIntensity }
    });
    return {
      settings: serializeNarrativeSettings(result.rows[0]),
      allowedActions: this.allowedActions(policy)
    };
  }

  async previewQuestProfileUpdate({ projectId, authContext, input = {}, sourceClient = 'api' }) {
    const project = await this.loadProject(projectId);
    const policy = await this.projectPolicy(project, authContext);
    this.assertPolicy(policy, 'canUpdateQuestProfile');
    const proposed = questProfileFromProject(project, input);
    const action = await ActionQueueService.createPreview({
      actorUserId: actorUserId(authContext),
      sourceClient,
      intent: {
        functionName: 'projects.update_quest_profile',
        arguments: { projectId: Number(projectId), ...proposed },
        summary: `Update quest profile for ${project.name}`
      },
      previewPayload: {
        title: `Update quest profile: ${proposed.title}`,
        summary: 'Cerbanimo will supersede the active quest profile after confirmation.',
        functionName: 'projects.update_quest_profile',
        arguments: { projectId: Number(projectId), ...proposed },
        confirmationRequired: true,
        effects: [
          'Supersede the active quest profile',
          'Create a new immutable narrative event',
          'Do not change tasks, rewards, reviews, or project status'
        ]
      },
      riskLevel: 'normal',
      relatedProjectId: projectId
    });
    return {
      proposedProfile: proposed,
      action,
      allowedActions: this.allowedActions(policy)
    };
  }

  async applyQuestProfileUpdate({ projectId, actorUserId: updaterUserId, input = {}, client = pool }) {
    const project = await this.loadProject(projectId, client);
    const profile = questProfileFromProject(project, input);
    await client.query(
      `UPDATE project_quest_profiles
       SET status = 'superseded',
           updated_at = NOW()
       WHERE project_id = $1
         AND status = 'active'`,
      [projectId]
    );
    const result = await client.query(
      `INSERT INTO project_quest_profiles (
         project_id, title, premise, desired_outcome, genre, tone, stakes,
         opening_scene, key_themes, avoided_themes, source, created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)
       RETURNING *`,
      [
        projectId,
        profile.title,
        profile.premise,
        profile.desiredOutcome,
        profile.genre,
        profile.tone,
        profile.stakes,
        profile.openingScene,
        profile.keyThemes,
        profile.avoidedThemes,
        JSON.stringify({ source: 'confirmed_action', action: 'projects.update_quest_profile' }),
        updaterUserId || null
      ]
    );
    await this.recordNarrativeEvent({
      client,
      projectId,
      actorUserId: updaterUserId,
      eventType: 'quest.profile_updated',
      eventKey: `quest-profile:${result.rows[0].id}`,
      title: 'Quest profile updated',
      facts: { profileId: result.rows[0].id, title: profile.title }
    });
    return result.rows[0];
  }

  async createInvite({ projectId, authContext, input = {} }) {
    const project = await this.loadProject(projectId);
    const policy = await this.projectPolicy(project, authContext);
    this.assertPolicy(policy, 'canCreateInvite');
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashInviteToken(token);
    const maxUses = normalizeLimit(input.maxUses ?? input.max_uses, 1, 1, 50);
    const expiresInHours = normalizeLimit(input.expiresInHours ?? input.expires_in_hours, 168, 1, 24 * 60);
    const result = await pool.query(
      `INSERT INTO project_invites (
         project_id, created_by, token_hash, token_hint, max_uses, expires_at
       )
       VALUES ($1, $2, $3, $4, $5, NOW() + ($6::text || ' hours')::interval)
       RETURNING *`,
      [
        projectId,
        actorUserId(authContext),
        tokenHash,
        token.slice(0, 6),
        maxUses,
        String(expiresInHours)
      ]
    );
    await this.recordNarrativeEvent({
      projectId,
      actorUserId: actorUserId(authContext),
      eventType: 'party.invite_created',
      eventKey: `invite:${result.rows[0].id}:created`,
      title: 'Party invite created',
      facts: { inviteId: result.rows[0].id, maxUses }
    });
    const origin = process.env.CERBANIMO_PUBLIC_ORIGIN || process.env.FRONTEND_URL || process.env.BACKEND_URL || '';
    return {
      invite: serializeInvite(result.rows[0], true),
      token,
      inviteUrl: origin ? `${origin.replace(/\/$/, '')}/project-invites/${token}` : null,
      warning: 'This raw invite token is returned once. Cerbanimo stores only a hash.',
      allowedActions: this.allowedActions(policy)
    };
  }

  async revokeInvite({ projectId, inviteId, authContext, reason = null }) {
    const project = await this.loadProject(projectId);
    const policy = await this.projectPolicy(project, authContext);
    this.assertPolicy(policy, 'canRevokeInvite');
    const result = await pool.query(
      `UPDATE project_invites
       SET status = 'revoked',
           revoked_at = NOW(),
           revoked_by = $3,
           updated_at = NOW()
       WHERE id = $1
         AND project_id = $2
         AND status = 'active'
       RETURNING *`,
      [inviteId, projectId, actorUserId(authContext)]
    );
    if (!result.rows[0]) throw httpError(404, 'Active project invite not found.');
    await this.recordNarrativeEvent({
      projectId,
      actorUserId: actorUserId(authContext),
      eventType: 'party.invite_revoked',
      eventKey: `invite:${inviteId}:revoked`,
      title: 'Party invite revoked',
      facts: { inviteId: Number(inviteId), reason: reason || null }
    });
    return {
      invite: serializeInvite(result.rows[0], true),
      allowedActions: this.allowedActions(policy)
    };
  }

  async previewInvite({ token, authContext = {} }) {
    const result = await pool.query(
      `SELECT i.*, p.name AS project_name, p.description AS project_description, p.visibility AS project_visibility
       FROM project_invites i
       JOIN projects p ON p.id = i.project_id
       WHERE i.token_hash = $1
       LIMIT 1`,
      [hashInviteToken(token)]
    );
    const invite = result.rows[0];
    if (!invite) throw httpError(404, 'Project invite not found.');
    const expired = invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now();
    const exhausted = Number(invite.use_count || 0) >= Number(invite.max_uses || 1);
    const active = invite.status === 'active' && !expired && !exhausted;
    return {
      invite: serializeInvite(invite),
      project: {
        id: invite.project_id,
        name: invite.project_name,
        description: invite.project_description,
        visibility: invite.project_visibility
      },
      allowedActions: {
        redeem: Boolean(active && actorUserId(authContext))
      },
      status: active ? 'redeemable' : 'unavailable',
      unavailableReason: active ? null : expired ? 'expired' : exhausted ? 'fully_redeemed' : invite.status
    };
  }

  async redeemInvite({ token, authContext }) {
    const userId = actorUserId(authContext);
    if (!userId) throw httpError(401, 'A signed-in user is required to redeem a project invite.');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const invite = (await client.query(
        `SELECT *
         FROM project_invites
         WHERE token_hash = $1
         FOR UPDATE`,
        [hashInviteToken(token)]
      )).rows[0];
      if (!invite) throw httpError(404, 'Project invite not found.');
      const expired = invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now();
      const existing = (await client.query(
        `SELECT *
         FROM project_character_callings
         WHERE project_id = $1
           AND user_id = $2
         FOR UPDATE`,
        [invite.project_id, userId]
      )).rows[0];
      if (invite.status !== 'active' || expired) throw httpError(409, 'This project invite is no longer active.');
      if (!existing && Number(invite.use_count || 0) >= Number(invite.max_uses || 1)) {
        throw httpError(409, 'This project invite has already been fully redeemed.');
      }

      let calling;
      if (existing) {
        calling = (await client.query(
          `UPDATE project_character_callings
           SET status = 'active',
               joined_via_invite_id = COALESCE(joined_via_invite_id, $3),
               updated_at = NOW()
           WHERE id = $1
             AND user_id = $2
           RETURNING *`,
          [existing.id, userId, invite.id]
        )).rows[0];
      } else {
        calling = (await client.query(
          `INSERT INTO project_character_callings (
             project_id, user_id, calling_title, role_archetype, source, joined_via_invite_id
           )
           VALUES ($1, $2, 'New Companion', 'party_member', 'invite', $3)
           RETURNING *`,
          [invite.project_id, userId, invite.id]
        )).rows[0];
        await client.query(
          `UPDATE project_invites
           SET use_count = use_count + 1,
               updated_at = NOW()
           WHERE id = $1`,
          [invite.id]
        );
      }

      await this.recordNarrativeEvent({
        client,
        projectId: invite.project_id,
        actorUserId: userId,
        eventType: 'party.member_joined',
        eventKey: `invite:${invite.id}:user:${userId}`,
        title: 'A companion joined the quest',
        facts: { inviteId: invite.id, userId }
      });
      await client.query('COMMIT');
      return {
        projectId: invite.project_id,
        calling: serializeCalling(calling),
        allowedActions: {
          updateCalling: true,
          launchQuest: false
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getCalling({ projectId, authContext }) {
    const project = await this.loadProject(projectId);
    const policy = await this.projectPolicy(project, authContext);
    this.assertPolicy(policy, 'canView');
    const userId = actorUserId(authContext);
    const calling = userId
      ? (await pool.query(
          `SELECT *
           FROM project_character_callings
           WHERE project_id = $1
             AND user_id = $2
           LIMIT 1`,
          [projectId, userId]
        )).rows[0] || null
      : null;
    return {
      project: safeProject(project),
      calling: serializeCalling(calling),
      allowedActions: this.allowedActions(policy)
    };
  }

  async updateCalling({ projectId, authContext, input = {} }) {
    const project = await this.loadProject(projectId);
    const policy = await this.projectPolicy(project, authContext);
    this.assertPolicy(policy, 'canUpdateCalling');
    const userId = actorUserId(authContext);
    const roleArchetype = normalizeEnum(input.roleArchetype || input.role_archetype, ROLE_ARCHETYPES, 'party_member');
    const result = await pool.query(
      `INSERT INTO project_character_callings (
         project_id, user_id, calling_title, role_archetype, contribution_summary, skills_snapshot, source
       )
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'manual')
       ON CONFLICT (project_id, user_id) DO UPDATE
       SET calling_title = EXCLUDED.calling_title,
           role_archetype = EXCLUDED.role_archetype,
           contribution_summary = EXCLUDED.contribution_summary,
           skills_snapshot = EXCLUDED.skills_snapshot,
           status = 'active',
           updated_at = NOW()
       RETURNING *`,
      [
        projectId,
        userId,
        String(input.callingTitle || input.calling_title || 'Party Member').trim().slice(0, 120),
        roleArchetype,
        String(input.contributionSummary || input.contribution_summary || '').trim().slice(0, 1000) || null,
        JSON.stringify(normalizeObject(input.skillsSnapshot || input.skills_snapshot))
      ]
    );
    await this.recordNarrativeEvent({
      projectId,
      actorUserId: userId,
      eventType: 'party.calling_updated',
      eventKey: `calling:${projectId}:${userId}:${Date.now()}`,
      title: 'Character calling updated',
      facts: { userId, roleArchetype }
    });
    return {
      calling: serializeCalling(result.rows[0]),
      allowedActions: this.allowedActions(policy)
    };
  }

  async launchPreview({ projectId, authContext }) {
    const context = await this.getQuestContext({ projectId, authContext });
    const policy = await this.projectPolicy(await this.loadProject(projectId), authContext);
    this.assertPolicy(policy, 'canLaunchQuest');
    const minPartySize = Number(context.party.settings.minPartySize || 1);
    const activeTasks = context.tasks.filter(task => String(task.status || '').includes('active'));
    const canLaunch = context.party.members.length >= minPartySize;
    const action = await ActionQueueService.createPreview({
      actorUserId: actorUserId(authContext),
      sourceClient: 'api',
      intent: {
        functionName: 'projects.launch_quest',
        arguments: { projectId: Number(projectId) },
        summary: `Launch quest opening for ${context.project.name}`
      },
      previewPayload: {
        title: `Launch quest: ${context.questProfile.title}`,
        summary: context.questProfile.openingScene,
        functionName: 'projects.launch_quest',
        arguments: { projectId: Number(projectId) },
        confirmationRequired: true,
        effects: [
          'Create a narrative launch event',
          'Show current active tasks as first encounters',
          'Do not complete tasks, award rewards, activate dependencies, or publish a story'
        ],
        missingInputs: canLaunch ? [] : ['party'],
        irreversible: false
      },
      riskLevel: 'normal',
      relatedProjectId: projectId
    });
    return {
      canLaunch,
      missing: canLaunch ? [] : [{ field: 'party', message: `At least ${minPartySize} party member is required.` }],
      openingScene: context.questProfile.openingScene,
      firstEncounters: activeTasks.slice(0, 5),
      action,
      allowedActions: this.allowedActions(policy)
    };
  }

  async getChronicle({ projectId, authContext, limit = 50 }) {
    const project = await this.loadProject(projectId);
    const policy = await this.projectPolicy(project, authContext);
    this.assertPolicy(policy, 'canView');
    const visibility = policy.canManage ? ['private', 'party', 'project', 'public'] : ['party', 'project', 'public'];
    const result = await pool.query(
      `SELECT *
       FROM project_narrative_events
       WHERE project_id = $1
         AND visibility = ANY($2::text[])
       ORDER BY created_at DESC
       LIMIT $3`,
      [projectId, visibility, normalizeLimit(limit, 50, 1, 100)]
    );
    return {
      project: safeProject(project),
      events: result.rows.map(serializeEvent),
      allowedActions: this.allowedActions(policy)
    };
  }

  async recordNarrativeEvent({
    client = pool,
    projectId,
    taskId = null,
    reviewRoundId = null,
    actorUserId: eventActorUserId = null,
    eventType,
    eventKey = null,
    title,
    body = null,
    facts = {},
    visibility = 'party'
  }) {
    if (!projectId || !eventType || !title) return null;
    const result = await client.query(
      `INSERT INTO project_narrative_events (
         project_id, task_id, review_round_id, actor_user_id,
         event_type, event_key, title, body, facts, visibility
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [
        projectId,
        taskId,
        reviewRoundId,
        eventActorUserId,
        eventType,
        eventKey,
        title,
        body,
        JSON.stringify(normalizeObject(facts)),
        visibility
      ]
    );
    return result.rows[0] || null;
  }
}

export default new GameMasterService();
