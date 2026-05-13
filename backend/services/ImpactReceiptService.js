import pool from '../db.js';
import crypto from 'crypto';

class ImpactReceiptService {
  async generateReceipt(data) {
    const {
      aidEventId,
      providerCommunityId,
      recipientCommunityId,
      aidType,
      quantity,
      unit,
      verifiedBy,
      verificationMethod,
      narrative
    } = data;

    // Create a hash of the core fields for integrity
    const coreData = `${providerCommunityId}:${recipientCommunityId}:${aidType}:${quantity}:${unit}:${new Date().toISOString()}`;
    const receiptHash = crypto.createHash('sha256').update(coreData).digest('hex');

    const query = `
      INSERT INTO impact_receipts (
        receipt_hash, aid_event_id, provider_community_id, recipient_community_id,
        aid_type, quantity, unit, verified_by, verification_method, narrative
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const result = await pool.query(query, [
      receiptHash, aidEventId, providerCommunityId, recipientCommunityId,
      aidType, quantity, unit, verifiedBy, verificationMethod, narrative
    ]);

    return result.rows[0];
  }

  async getCommunityReceipts(communityId) {
    const query = `
      SELECT * FROM impact_receipts
      WHERE provider_community_id = $1 OR recipient_community_id = $1
      ORDER BY issued_at DESC
    `;
    const result = await pool.query(query, [communityId]);
    return result.rows;
  }
}

export default new ImpactReceiptService();
