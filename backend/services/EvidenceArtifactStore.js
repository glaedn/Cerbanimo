import crypto from 'crypto';
import pool from '../db.js';

const MAX_ITEM_BYTES = Number(process.env.CERBANIMO_EVIDENCE_MAX_ITEM_BYTES || 5 * 1024 * 1024);
const MAX_BUNDLE_BYTES = Number(process.env.CERBANIMO_EVIDENCE_MAX_BUNDLE_BYTES || 20 * 1024 * 1024);

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

class EvidenceArtifactStore {
  assertItemSize(byteSize) {
    if (byteSize > MAX_ITEM_BYTES) {
      const error = new Error(`Evidence item is too large. Maximum item size is ${MAX_ITEM_BYTES} bytes.`);
      error.status = 413;
      error.code = 'EVIDENCE_ITEM_TOO_LARGE';
      throw error;
    }
  }

  async assertBundleSize(bundleId, additionalBytes = 0, client = pool) {
    const result = await client.query(
      `SELECT COALESCE(SUM(byte_size), 0)::bigint AS total
       FROM task_evidence_items
       WHERE bundle_id = $1`,
      [bundleId]
    );
    const total = Number(result.rows[0]?.total || 0) + Number(additionalBytes || 0);
    if (total > MAX_BUNDLE_BYTES) {
      const error = new Error(`Evidence bundle is too large. Maximum bundle size is ${MAX_BUNDLE_BYTES} bytes.`);
      error.status = 413;
      error.code = 'EVIDENCE_BUNDLE_TOO_LARGE';
      throw error;
    }
  }

  async putBuffer({ buffer, mediaType, metadata = {}, client = pool }) {
    const content = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || '');
    this.assertItemSize(content.length);
    const contentSha256 = sha256(content);
    const storageKey = `cerbanimo://evidence-blobs/sha256/${contentSha256}`;
    const result = await client.query(
      `INSERT INTO task_evidence_blobs (
         storage_key, media_type, byte_size, content_sha256, content, metadata
       )
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       ON CONFLICT (storage_key)
       DO UPDATE SET metadata = task_evidence_blobs.metadata || EXCLUDED.metadata
       RETURNING *`,
      [
        storageKey,
        mediaType || 'application/octet-stream',
        content.length,
        contentSha256,
        content,
        JSON.stringify(metadata || {})
      ]
    );
    return result.rows[0];
  }

  async getByStorageKey(storageKey, client = pool) {
    const result = await client.query(
      `SELECT *
       FROM task_evidence_blobs
       WHERE storage_key = $1
       LIMIT 1`,
      [storageKey]
    );
    return result.rows[0] || null;
  }

  contentHash(buffer) {
    return sha256(Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || ''));
  }
}

export { MAX_ITEM_BYTES, MAX_BUNDLE_BYTES };
export default new EvidenceArtifactStore();
