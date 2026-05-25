import express from 'express';
import WalletService from '../services/WalletService.js';
import resolveUser from '../middlewares/resolveUser.js';
import pool from '../db.js';

const router = express.Router();

router.post('/register', resolveUser, async (req, res) => {
  try {
    const { address, chain, walletType, isPrimary, communityId } = req.body;

    if (communityId) {
      const adminCheck = await pool.query(
        "SELECT 1 FROM communities WHERE id = $1 AND $2 = ANY(members) AND EXISTS (SELECT 1 FROM users WHERE id = $2 AND roles @> '{admin}')",
        [communityId, req.user.id]
      );
      if (adminCheck.rows.length === 0) return res.status(403).json({ error: 'Community admin required' });
    }

    const userId = communityId ? null : req.user.id;

    const wallet = await WalletService.registerWallet({
      userId,
      communityId,
      address,
      chain,
      walletType,
      isPrimary
    });
    res.status(201).json(wallet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/user/:userId', resolveUser, async (req, res) => {
  try {
    if (req.user.id !== parseInt(req.params.userId)) {
      return res.status(403).json({ error: 'Cannot view another user\'s wallets' });
    }
    const wallets = await WalletService.getWalletsByUser(req.params.userId);
    res.json(wallets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/community/:communityId', resolveUser, async (req, res) => {
  try {
    const wallets = await WalletService.getWalletsByCommunity(req.params.communityId);
    res.json(wallets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:address', resolveUser, async (req, res) => {
  try {
    const wallet = await WalletService.getWalletByAddress(req.params.address);
    if (!wallet || (wallet.user_id && wallet.user_id !== req.user.id)) {
      return res.status(403).json({ error: 'Wallet not found or not yours' });
    }

    if (wallet.community_id) {
      const adminCheck = await pool.query(
        "SELECT 1 FROM communities WHERE id = $1 AND $2 = ANY(members) AND EXISTS (SELECT 1 FROM users WHERE id = $2 AND roles @> '{admin}')",
        [wallet.community_id, req.user.id]
      );
      if (adminCheck.rows.length === 0) return res.status(403).json({ error: 'Community admin required to delete community wallet' });
    }

    const success = await WalletService.deleteWallet(req.params.address);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:address/primary', resolveUser, async (req, res) => {
  try {
    const wallet = await WalletService.getWalletByAddress(req.params.address);
    if (!wallet || (wallet.user_id && wallet.user_id !== req.user.id)) {
      return res.status(403).json({ error: 'Wallet not found or not yours' });
    }

    if (wallet.community_id) {
      const adminCheck = await pool.query(
        "SELECT 1 FROM communities WHERE id = $1 AND $2 = ANY(members) AND EXISTS (SELECT 1 FROM users WHERE id = $2 AND roles @> '{admin}')",
        [wallet.community_id, req.user.id]
      );
      if (adminCheck.rows.length === 0) return res.status(403).json({ error: 'Community admin required' });
    }

    const success = await WalletService.setPrimaryWallet(req.params.address);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
