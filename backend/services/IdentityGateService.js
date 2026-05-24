import crypto from 'crypto';
import pool from '../db.js';

const TIER_PROMPTS = {
  tier1: 'Link Discord to earn tokens, build trust, and reserve tasks.',
  tier2: 'Add your location and skills to get matched to work near you.',
  tier3: 'Add interests to discover communities and projects aligned with what you care about.'
};

const normalizeList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((entry) => {
      if (typeof entry !== 'string') return entry;
      try {
        return JSON.parse(entry);
      } catch {
        return entry;
      }
    }).filter(Boolean);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? normalizeList(parsed) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const hasLocation = (profile) => Boolean(
  profile?.location ||
  profile?.location_point ||
  profile?.formatted_address ||
  profile?.city ||
  profile?.state ||
  profile?.country
);

class IdentityGateService {
  calculateTier(profile = {}) {
    const hasDiscord = Boolean(profile.discord_user_id);
    const skills = normalizeList(profile.skills);
    const interests = normalizeList(profile.interests);

    const requirements = {
      tier1: {
        met: hasDiscord,
        fields: ['discord_user_id'],
        prompt: TIER_PROMPTS.tier1
      },
      tier2: {
        met: hasDiscord && hasLocation(profile) && skills.length > 0,
        fields: ['location', 'skills'],
        prompt: TIER_PROMPTS.tier2
      },
      tier3: {
        met: hasDiscord && hasLocation(profile) && skills.length > 0 && interests.length > 0,
        fields: ['interests'],
        prompt: TIER_PROMPTS.tier3
      }
    };

    let tier = 0;
    if (requirements.tier1.met) tier = 1;
    if (requirements.tier2.met) tier = 2;
    if (requirements.tier3.met) tier = 3;

    return {
      tier,
      requirements,
      missingFields: Object.values(requirements)
        .filter((requirement) => !requirement.met)
        .flatMap((requirement) => requirement.fields),
      nextPrompt: tier < 3 ? requirements[`tier${tier + 1}`].prompt : null
    };
  }

  async getUserTier(userId, client = pool) {
    const result = await client.query(
      `SELECT id, discord_user_id, skills, interests, city, state, country, formatted_address, location_point
       FROM users
       WHERE id = $1`,
      [userId]
    );
    if (result.rows.length === 0) {
      throw new Error(`User ${userId} not found`);
    }
    return this.calculateTier(result.rows[0]);
  }

  async requireDiscordLinked(userId, client = pool) {
    const result = await client.query(
      'SELECT discord_user_id FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error(`User ${userId} not found`);
    }

    if (!result.rows[0].discord_user_id) {
      const error = new Error('Discord link required before earning tokens or trust.');
      error.status = 403;
      error.code = 'DISCORD_LINK_REQUIRED';
      throw error;
    }

    return true;
  }

  async filterDiscordLinkedUserIds(userIds = [], client = pool) {
    const uniqueIds = [...new Set(userIds.filter(Boolean).map(Number))];
    if (uniqueIds.length === 0) return [];

    const result = await client.query(
      'SELECT id FROM users WHERE id = ANY($1::int[]) AND discord_user_id IS NOT NULL',
      [uniqueIds]
    );
    return result.rows.map((row) => row.id);
  }

  generateTotpSecret() {
    return this.base32Encode(crypto.randomBytes(20));
  }

  buildOtpAuthUrl({ secret, email, issuer = 'Cerbanimo' }) {
    const label = encodeURIComponent(`${issuer}:${email || 'account'}`);
    const encodedIssuer = encodeURIComponent(issuer);
    return `otpauth://totp/${label}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  }

  verifyTotp(token, secret, window = 1) {
    const normalizedToken = String(token || '').replace(/\s+/g, '');
    if (!/^\d{6}$/.test(normalizedToken) || !secret) return false;

    const step = Math.floor(Date.now() / 30000);
    for (let offset = -window; offset <= window; offset += 1) {
      if (this.generateTotpAtStep(secret, step + offset) === normalizedToken) {
        return true;
      }
    }
    return false;
  }

  generateTotpAtStep(secret, step) {
    const key = this.base32Decode(secret);
    const buffer = Buffer.alloc(8);
    buffer.writeUInt32BE(Math.floor(step / 0x100000000), 0);
    buffer.writeUInt32BE(step >>> 0, 4);
    const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = (
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)
    ) % 1000000;
    return String(code).padStart(6, '0');
  }

  base32Encode(buffer) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (const byte of buffer) {
      bits += byte.toString(2).padStart(8, '0');
    }
    return bits.match(/.{1,5}/g)
      .map((chunk) => alphabet[parseInt(chunk.padEnd(5, '0'), 2)])
      .join('');
  }

  base32Decode(secret) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const clean = String(secret).replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
    let bits = '';
    for (const char of clean) {
      const value = alphabet.indexOf(char);
      if (value === -1) throw new Error('Invalid TOTP secret');
      bits += value.toString(2).padStart(5, '0');
    }
    const bytes = bits.match(/.{1,8}/g)
      .filter((byte) => byte.length === 8)
      .map((byte) => parseInt(byte, 2));
    return Buffer.from(bytes);
  }
}

export { TIER_PROMPTS };
export default new IdentityGateService();
