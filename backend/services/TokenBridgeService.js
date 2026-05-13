import WalletService from './WalletService.js';
import { awardTokensInternal, deductTokensInternal } from './tokenService.js';
import TreasuryService from './TreasuryService.js';
import pool from '../db.js';

class TokenBridgeService {
  constructor() {
    // Initial feature flags. In a real system, these might come from env vars or a DB config table.
    this.flags = {
      ON_CHAIN_SETTLEMENT_ENABLED: process.env.ENABLE_ON_CHAIN_SETTLEMENT === 'true',
      FORCE_OFF_CHAIN: true // Default to true for now as ContractService is a skeleton
    };
  }

  /**
   * Routes a token transaction.
   * @param {Object} params
   * @param {number} params.senderId - User ID or Community ID
   * @param {number} params.receiverId - User ID or Community ID
   * @param {number} params.amount - Amount in cotokens
   * @param {string} params.type - 'user_to_user', 'community_to_user', 'user_to_community', 'system_to_user'
   * @param {string} params.reason - Purpose of transaction
   * @param {Object} params.metadata - Extra info (related entities, etc.)
   */
  async routeTransaction(params, externalClient = null) {
    const { senderId, receiverId, amount, type, reason, metadata = {} } = params;

    const shouldGoOnChain = this.flags.ON_CHAIN_SETTLEMENT_ENABLED && !this.flags.FORCE_OFF_CHAIN;

    if (shouldGoOnChain) {
      // Future on-chain logic would go here
      // 1. Check if both parties have primary wallets on the target chain
      // 2. Call ContractService to initiate transfer
      // 3. Record tx_hash and on_chain_status in token_transactions
      return this.handleOnChainSettlement(params, externalClient);
    } else {
      return this.handleOffChainInternal(params, externalClient);
    }
  }

  async handleOffChainInternal(params, externalClient = null) {
    const { senderId, receiverId, amount, type, reason, metadata } = params;
    const db = externalClient || pool;

    switch (type) {
      case 'system_to_user':
        return await awardTokensInternal(db, receiverId, amount, reason, null);

      case 'user_to_user':
        return await awardTokensInternal(db, receiverId, amount, reason, senderId);

      case 'user_to_system':
        return await deductTokensInternal(db, senderId, amount, reason);

      case 'user_to_community':
        // Deduct from user and deposit to community treasury
        const deduction = await deductTokensInternal(db, senderId, amount, reason);
        await TreasuryService.depositToTreasury(receiverId, amount, reason, {
          createdBy: senderId,
          ...metadata
        }, externalClient);
        return deduction;

      case 'community_to_user':
        return await TreasuryService.transferFunds(senderId, receiverId, amount, 'user', reason, {
          createdBy: metadata.createdBy,
          ...metadata
        }, externalClient);

      case 'community_to_user_internal':
        // This is called from TreasuryService.transferFunds to avoid infinite loop
        // It should perform the actual DB updates
        await db.query(
          'UPDATE users SET cotokens = cotokens + $1 WHERE id = $2',
          [amount, receiverId]
        );

        const ledgerEntry = {
          mode: "earn",
          type: "community_payout",
          tokens: amount,
          reason: reason,
          creationDate: new Date(),
          communityId: senderId
        };

        await db.query(
          `UPDATE users SET token_ledger = array_append(COALESCE(token_ledger, '{}'), $1::jsonb) WHERE id = $2`,
          [JSON.stringify(ledgerEntry), receiverId]
        );

        return await db.query(
          `INSERT INTO token_transactions (sender_id, receiver_id, amount, reason, transaction_date)
           VALUES (NULL, $1, $2, $3, NOW())`,
          [receiverId, amount, reason]
        );

      default:
        throw new Error(`Unsupported transaction type: ${type}`);
    }
  }

  async handleOnChainSettlement(params) {
    // Placeholder for Phase 2: Blockchain Integration
    console.log('Routing to on-chain settlement (Not fully implemented yet)');
    return this.handleOffChainInternal(params);
  }
}

export default new TokenBridgeService();
