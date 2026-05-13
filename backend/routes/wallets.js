import express from 'express';
import WalletService from '../services/WalletService.js';
import resolveUser from '../middlewares/resolveUser.js';

const router = express.Router();

router.post('/register', resolveUser, async (req, res) => {
  try {
    const { address, chain, walletType, isPrimary, communityId } = req.body;
    // If communityId is provided, it's a community wallet.
    // In a production app, we'd check if req.user.id is a community admin.
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

router.get('/user/:userId', async (req, res) => {
  try {
    const wallets = await WalletService.getWalletsByUser(req.params.userId);
    res.json(wallets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/community/:communityId', async (req, res) => {
  try {
    const wallets = await WalletService.getWalletsByCommunity(req.params.communityId);
    res.json(wallets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:address', resolveUser, async (req, res) => {
  try {
    // In production, verify ownership of the wallet before deletion
    const success = await WalletService.deleteWallet(req.params.address);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:address/primary', resolveUser, async (req, res) => {
  try {
    const success = await WalletService.setPrimaryWallet(req.params.address);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
