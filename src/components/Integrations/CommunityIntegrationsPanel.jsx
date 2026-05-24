import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, Stack, IconButton, Card, CardContent, CircularProgress, Divider } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import theme from '../../styles/theme';
import { toast } from 'react-hot-toast';

const CommunityIntegrationsPanel = ({ communityId }) => {
  const { getAccessTokenSilently } = useAuth0();
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIntegration, setNewIntegration] = useState({
    platform: 'discord',
    external_workspace_id: '',
    external_channel_id: '',
    config: {}
  });

  const fetchIntegrations = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/integrations/community/${communityId}`, {
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
    if (communityId) fetchIntegrations();
  }, [communityId]);

  const handleAddIntegration = async () => {
    try {
      const token = await getAccessTokenSilently();
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/integrations/community`, {
        ...newIntegration,
        community_id: communityId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Integration added!');
      setShowAddForm(false);
      fetchIntegrations();
    } catch (err) {
      console.error('Error adding integration:', err);
      toast.error('Failed to add integration');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this integration?')) return;
    try {
      const token = await getAccessTokenSilently();
      await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/integrations/community/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Integration removed');
      fetchIntegrations();
    } catch (err) {
      console.error('Error deleting integration:', err);
      toast.error('Failed to remove integration');
    }
  };

  if (loading) return <CircularProgress size={24} />;

  return (
    <Box sx={{ p: 2, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: theme.borders.borderRadiusLg }}>
      <Typography variant="h6" sx={{ color: theme.colors.primary, fontFamily: theme.typography.fontFamilyAccent, mb: 2 }}>
        Community Integrations
      </Typography>

      <Stack spacing={2} mb={3}>
        {integrations.map((integration) => (
          <Card key={integration.id} sx={{ backgroundColor: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.colors.border}` }}>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle2" sx={{ color: theme.colors.accentBlue, textTransform: 'uppercase' }}>
                  {integration.platform}
                </Typography>
                <Typography variant="body2" sx={{ color: theme.colors.textPrimary }}>
                  Workspace: {integration.external_workspace_id}
                </Typography>
                <Typography variant="body2" sx={{ color: theme.colors.textSecondary }}>
                  Channel: {integration.external_channel_id}
                </Typography>
              </Box>
              <IconButton onClick={() => handleDelete(integration.id)} color="error">
                <DeleteIcon />
              </IconButton>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {!showAddForm ? (
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          onClick={() => setShowAddForm(true)}
          fullWidth
          sx={{ borderColor: theme.colors.primary, color: theme.colors.primary }}
        >
          Add Integration
        </Button>
      ) : (
        <Box sx={{ p: 2, border: `1px dashed ${theme.colors.border}`, borderRadius: theme.borders.borderRadiusMd }}>
          <Stack spacing={2}>
            <TextField
              select
              label="Platform"
              value={newIntegration.platform}
              onChange={(e) => setNewIntegration({...newIntegration, platform: e.target.value})}
              SelectProps={{ native: true }}
              fullWidth
            >
              <option value="discord">Discord</option>
              <option value="google_chat">Google Chat (Webhook)</option>
            </TextField>

            <TextField
              label={newIntegration.platform === 'google_chat' ? 'Space Name' : 'Guild ID'}
              value={newIntegration.external_workspace_id}
              onChange={(e) => setNewIntegration({...newIntegration, external_workspace_id: e.target.value})}
              fullWidth
            />

            <TextField
              label={newIntegration.platform === 'google_chat' ? 'Webhook URL' : 'Channel ID'}
              value={newIntegration.external_channel_id}
              onChange={(e) => setNewIntegration({...newIntegration, external_channel_id: e.target.value})}
              fullWidth
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button onClick={() => setShowAddForm(false)} sx={{ flex: 1 }}>Cancel</Button>
              <Button variant="contained" onClick={handleAddIntegration} sx={{ flex: 1, backgroundColor: theme.colors.primary }}>Save</Button>
            </Box>
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default CommunityIntegrationsPanel;
