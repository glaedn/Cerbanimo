import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Stack, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import PlatformConnectionCard from './PlatformConnectionCard';
import theme from '../../styles/theme';
import { toast } from 'react-hot-toast';

const ConnectedAccountsPanel = ({ initialDiscordId }) => {
  const { getAccessTokenSilently } = useAuth0();
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isManualLinkOpen, setIsManualLinkOpen] = useState(false);
  const [manualPlatform, setManualPlatform] = useState('');
  const [manualExternalId, setManualExternalId] = useState('');

  const fetchIntegrations = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/integrations/user`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIntegrations(response.data);
    } catch (err) {
      console.error('Error fetching integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleDisconnect = async (id) => {
    if (!window.confirm('Are you sure you want to disconnect this account?')) return;
    try {
      const token = await getAccessTokenSilently();
      await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/integrations/user/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Account disconnected');
      fetchIntegrations();
    } catch (err) {
      console.error('Error disconnecting:', err);
      toast.error('Failed to disconnect');
    }
  };

  const handleManualLink = async () => {
    try {
      const token = await getAccessTokenSilently();
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/integrations/user`, {
        platform: manualPlatform,
        external_user_id: manualExternalId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`${manualPlatform} linked!`);
      setIsManualLinkOpen(false);
      fetchIntegrations();
    } catch (err) {
      console.error('Error linking:', err);
      toast.error('Failed to link account');
    }
  };

  if (loading) return <CircularProgress size={24} sx={{ color: theme.colors.primary }} />;

  const discordIntegration = integrations.find(i => i.platform === 'discord');

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h6" sx={{ color: theme.colors.primary, fontFamily: theme.typography.fontFamilyAccent, mb: 2, textAlign: 'center' }}>
        Connected Platforms
      </Typography>

      <Stack spacing={2}>
        <PlatformConnectionCard
          platform="discord"
          displayName="Discord"
          icon="https://cdn-icons-png.flaticon.com/512/2111/2111370.png"
          isConnected={!!discordIntegration}
          externalUsername={discordIntegration?.username || discordIntegration?.external_user_id}
          onConnect={() => {
            setManualPlatform('discord');
            setManualExternalId(initialDiscordId || '');
            setIsManualLinkOpen(true);
          }}
          onDisconnect={() => handleDisconnect(discordIntegration.id)}
        />

        <PlatformConnectionCard
          platform="google_chat"
          displayName="Google Chat"
          icon="https://upload.wikimedia.org/wikipedia/commons/d/da/Google_Chat_icon_%282020%29.svg"
          isConnected={integrations.some(i => i.platform === 'google_chat')}
          externalUsername={integrations.find(i => i.platform === 'google_chat')?.username}
          onConnect={() => {
            setManualPlatform('google_chat');
            setManualExternalId('');
            setIsManualLinkOpen(true);
          }}
          onDisconnect={() => handleDisconnect(integrations.find(i => i.platform === 'google_chat')?.id)}
        />
      </Stack>

      <Dialog
        open={isManualLinkOpen}
        onClose={() => setIsManualLinkOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: theme.colors.backgroundPaper,
            border: `1px solid ${theme.colors.primary}`,
            color: theme.colors.textPrimary
          }
        }}
      >
        <DialogTitle sx={{ fontFamily: theme.typography.fontFamilyAccent }}>Link {manualPlatform}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: theme.colors.textSecondary }}>
            Enter your external {manualPlatform} User ID to link your account.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="External User ID"
            fullWidth
            variant="outlined"
            value={manualExternalId}
            onChange={(e) => setManualExternalId(e.target.value)}
            sx={{
              '& .MuiInputLabel-root': { color: theme.colors.textSecondary },
              '& .MuiOutlinedInput-root': {
                color: theme.colors.textPrimary,
                '& fieldset': { borderColor: theme.colors.border },
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsManualLinkOpen(false)} sx={{ color: theme.colors.textSecondary }}>Cancel</Button>
          <Button onClick={handleManualLink} variant="contained" sx={{ backgroundColor: theme.colors.primary }}>Link Account</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConnectedAccountsPanel;
