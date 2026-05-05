import React, { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Chip, Button, IconButton,
  CircularProgress, Tabs, Tab, TextField, InputAdornment,
  Card, CardContent, CardActions, Divider, Avatar, Tooltip,
  Container, Stack
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  PriorityHigh as PriorityIcon,
  Chat as ChatIcon,
  VolunteerActivism as VolunteerIcon,
  ArrowBack as BackIcon,
  AssignmentTurnedIn as FulfilledIcon
} from '@mui/icons-material';
import axios from 'axios';
import theme from '../../styles/theme';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useUserProfile } from '../../hooks/useUserProfile';
import NeedComments from '../../components/NeedComments/NeedComments';
import Modal from '@mui/material/Modal';
import { toast } from 'react-hot-toast';
import './NeedsPage.css';

const NeedsPage = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const { profile } = useUserProfile();
  const { needId } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [needs, setNeeds] = useState([]);
  const [singleNeed, setSingleNeed] = useState(null);
  const [singleNeedComments, setSingleNeedComments] = useState([]);
  const [selectedNeed, setSelectedNeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);

  const fetchNeeds = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessTokenSilently();

      if (needId) {
        const [needRes, commentsRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/needs/${needId}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/need-comments/${needId}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        setSingleNeed(needRes.data);
        setSingleNeedComments(commentsRes.data);
      } else {
        const endpoint = tabValue === 0
          ? `${import.meta.env.VITE_BACKEND_URL}/needs`
          : `${import.meta.env.VITE_BACKEND_URL}/needs/user/${profile?.id}`;

        const response = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNeeds(response.data);
      }
    } catch (err) {
      console.error('Error fetching needs:', err);
      toast.error('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [getAccessTokenSilently, tabValue, profile?.id, needId]);

  useEffect(() => {
    if (isAuthenticated && profile?.id) {
      fetchNeeds();
    }
  }, [isAuthenticated, profile?.id, fetchNeeds]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleOpenComments = (need) => {
    setSelectedNeed(need);
    setIsCommentModalOpen(true);
  };

  const handleMarkFulfilled = async (id) => {
    try {
      const token = await getAccessTokenSilently();
      await axios.put(`${import.meta.env.VITE_BACKEND_URL}/needs/${id}`, {
        ... (singleNeed || needs.find(n => n.id === id)),
        status: 'fulfilled'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Need marked as fulfilled! 🎉');
      fetchNeeds();
    } catch (err) {
      console.error('Error fulfilling need:', err);
      toast.error('Failed to update need status.');
    }
  };

  const handleOfferHelp = async (need) => {
    try {
      const token = await getAccessTokenSilently();
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/need-comments`, {
        need_id: need.id,
        content: `[OFFER] I can help with this! Let's coordinate.`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Help offer sent! Coordination thread updated.');
      fetchNeeds();
    } catch (err) {
      console.error('Error offering help:', err);
      toast.error('Failed to send help offer.');
    }
  };

  const handleVerifyCompletion = async (need) => {
    try {
      const token = await getAccessTokenSilently();
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/verification_v2/events`, {
        taskId: null, // This is a need verification, might need backend support for null taskId if it's strict
        verifierId: profile.id,
        status: 'approved',
        verificationType: 'recipient_confirmed', // Using this type as the meeter confirms it's done
        needId: need.id // Adding needId to the payload
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Completion verified! Trust metrics updated.');
    } catch (err) {
      console.error('Error verifying completion:', err);
      toast.error('Failed to record verification.');
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency?.toLowerCase()) {
      case 'critical': return theme.colors.error;
      case 'high': return theme.colors.accentOrange;
      case 'medium': return theme.colors.accentYellow || '#ffeb3b';
      case 'low': return theme.colors.accentGreen;
      default: return theme.colors.primary;
    }
  };

  const filteredNeeds = needs.filter(need =>
    need.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    need.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderNeedCard = (need) => (
    <Card
      key={need.id}
      className="need-card"
      sx={{
        backgroundColor: 'rgba(28, 28, 30, 0.8)',
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borders.borderRadiusMd,
        mb: 2,
        cursor: 'pointer',
        transition: '0.3s',
        '&:hover': {
          borderColor: theme.colors.primary,
          boxShadow: theme.effects.glowSubtle(theme.colors.primary),
          transform: 'translateY(-2px)'
        }
      }}
      onClick={() => navigate(`/needs/${need.id}`)}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Typography variant="h6" sx={{ color: theme.colors.primary, fontFamily: 'Orbitron', fontSize: '1.1rem' }}>
            {need.name}
          </Typography>
          <Chip
            label={need.urgency?.toUpperCase() || 'MEDIUM'}
            size="small"
            sx={{
              backgroundColor: `${getUrgencyColor(need.urgency)}22`,
              color: getUrgencyColor(need.urgency),
              border: `1px solid ${getUrgencyColor(need.urgency)}`,
              fontFamily: 'Orbitron',
              fontSize: '0.7rem'
            }}
          />
        </Box>

        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2, height: '3em', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {need.description}
        </Typography>

        <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
          {need.category && (
            <Chip label={need.category} size="small" variant="outlined" sx={{ color: theme.colors.textSecondary, borderColor: 'rgba(255,255,255,0.2)' }} />
          )}
          {need.location_text && (
            <Box display="flex" alignItems="center" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
              <LocationIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
              {need.location_text}
            </Box>
          )}
        </Box>

        <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)', mb: 2 }} />

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center">
            <Tooltip title={need.requestor_username || 'Anonymous'}>
              <Avatar size="small" sx={{ width: 24, height: 24, mr: 1, border: `1px solid ${theme.colors.primary}` }} />
            </Tooltip>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              {new Date(need.created_at).toLocaleDateString()}
            </Typography>
          </Box>
          <Box>
            <IconButton size="small" onClick={() => handleOpenComments(need)} sx={{ color: theme.colors.primary }}>
              <ChatIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
      <CardActions sx={{ p: 2, pt: 0 }}>
        {profile?.id === need.requestor_user_id ? (
          <Button
            fullWidth
            variant="contained"
            startIcon={<FulfilledIcon />}
            disabled={need.status === 'fulfilled'}
            sx={{
              backgroundColor: theme.colors.accentGreen,
              color: theme.colors.backgroundDefault,
              fontFamily: 'Orbitron',
              '&:hover': { backgroundColor: '#00b870' }
            }}
            onClick={(e) => { e.stopPropagation(); handleMarkFulfilled(need.id); }}
          >
            {need.status === 'fulfilled' ? 'FULFILLED' : 'MARK FULFILLED'}
          </Button>
        ) : (
          <Button
            fullWidth
            variant="contained"
            startIcon={<VolunteerIcon />}
            disabled={need.status === 'fulfilled'}
            sx={{
              backgroundColor: theme.colors.primary,
              color: theme.colors.backgroundDefault,
              fontFamily: 'Orbitron',
              '&:hover': { backgroundColor: theme.colors.accentBlue }
            }}
            onClick={(e) => { e.stopPropagation(); handleOfferHelp(need); }}
          >
            {need.status === 'fulfilled' ? 'CLOSED' : 'OFFER HELP'}
          </Button>
        )}
      </CardActions>
    </Card>
  );

  if (needId && singleNeed) {
    return (
      <Container maxWidth="md" className="needs-page-container" sx={{ py: 4, pb: isMobile ? 12 : 4 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/needs')}
          sx={{ color: theme.colors.primary, mb: 3, fontFamily: 'Orbitron' }}
        >
          BACK_TO_EXPLORER
        </Button>

        <Paper sx={{
          p: 4,
          backgroundColor: 'rgba(28, 28, 30, 0.9)',
          border: `1px solid ${theme.colors.primary}`,
          boxShadow: theme.effects.glowSubtle(theme.colors.primary),
          borderRadius: theme.borders.borderRadiusLg
        }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
            <Box>
              <Typography variant="h4" sx={{ color: theme.colors.primary, fontFamily: 'Orbitron', mb: 1 }}>
                {singleNeed.name}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Chip
                  label={singleNeed.urgency?.toUpperCase()}
                  sx={{
                    bgcolor: `${getUrgencyColor(singleNeed.urgency)}22`,
                    color: getUrgencyColor(singleNeed.urgency),
                    border: `1px solid ${getUrgencyColor(singleNeed.urgency)}`
                  }}
                />
                <Chip label={singleNeed.category} variant="outlined" sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }} />
              </Stack>
            </Box>
            {singleNeed.status === 'fulfilled' && (
              <Chip icon={<FulfilledIcon />} label="FULFILLED" color="success" sx={{ fontFamily: 'Orbitron' }} />
            )}
          </Box>

          <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 4, lineHeight: 1.6 }}>
            {singleNeed.description}
          </Typography>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                <LocationIcon sx={{ mr: 1, color: theme.colors.primary }} />
                <Typography variant="body2">LOCATION: {singleNeed.location_text || 'Not specified'}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                <ScheduleIcon sx={{ mr: 1, color: theme.colors.primary }} />
                <Typography variant="body2">REQUIRED_BY: {singleNeed.required_before_date ? new Date(singleNeed.required_before_date).toLocaleDateString() : 'ASAP'}</Typography>
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)', my: 4 }} />

          <Typography variant="h6" sx={{ color: theme.colors.primary, fontFamily: 'Orbitron', mb: 3 }}>
            COORDINATION_CHANNEL
          </Typography>

          <NeedComments needId={singleNeed.id} />

          <Box mt={4}>
            {profile?.id === singleNeed.requestor_user_id ? (
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<FulfilledIcon />}
                disabled={singleNeed.status === 'fulfilled'}
                sx={{
                  backgroundColor: theme.colors.accentGreen,
                  color: theme.colors.backgroundDefault,
                  fontFamily: 'Orbitron',
                  py: 2,
                  '&:hover': { backgroundColor: '#00b870' }
                }}
                onClick={() => handleMarkFulfilled(singleNeed.id)}
              >
                {singleNeed.status === 'fulfilled' ? 'MISSION_ACCOMPLISHED' : 'MARK_AS_FULFILLED'}
              </Button>
            ) : singleNeed.status === 'fulfilled' ? (
              // Check if user has offered help
              singleNeedComments.some(c => c.user_id === profile?.id && c.content.includes('[OFFER]')) ? (
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={<FulfilledIcon />}
                  sx={{
                    backgroundColor: theme.colors.secondary,
                    color: theme.colors.textPrimary,
                    fontFamily: 'Orbitron',
                    py: 2,
                    '&:hover': { backgroundColor: theme.colors.accentPink }
                  }}
                  onClick={() => handleVerifyCompletion(singleNeed)}
                >
                  VERIFY_COMPLETION
                </Button>
              ) : (
                <Button fullWidth disabled variant="outlined" sx={{ py: 2, fontFamily: 'Orbitron' }}>
                  NEED_FULFILLED
                </Button>
              )
            ) : (
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<VolunteerIcon />}
                sx={{
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.backgroundDefault,
                  fontFamily: 'Orbitron',
                  py: 2,
                  '&:hover': { backgroundColor: theme.colors.accentBlue }
                }}
                onClick={() => handleOfferHelp(singleNeed)}
              >
                {singleNeedComments.some(c => c.user_id === profile?.id && c.content.includes('[OFFER]'))
                  ? 'HELP_OFFERED'
                  : 'SIGNAL_AVAILABILITY'
                }
              </Button>
            )}
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Box className="needs-page-container" sx={{ p: isMobile ? 2 : 4, pb: isMobile ? 12 : 4 }}>
      <Typography variant="h4" sx={{
        color: theme.colors.primary,
        fontFamily: 'Orbitron',
        mb: 4,
        textAlign: isMobile ? 'center' : 'left',
        textShadow: theme.effects.glowSubtle(theme.colors.primary)
      }}>
        NEEDS_EXPLORER
      </Typography>

      <Box sx={{ mb: 4, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2, alignItems: 'center' }}>
        <TextField
          placeholder="Search needs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth={isMobile}
          sx={{
            width: isMobile ? '100%' : '400px',
            '& .MuiOutlinedInput-root': {
              color: '#fff',
              backgroundColor: 'rgba(255,255,255,0.05)',
              '& fieldset': { borderColor: 'rgba(0, 243, 255, 0.3)' },
              '&:hover fieldset': { borderColor: theme.colors.primary },
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: theme.colors.primary }} />
              </InputAdornment>
            ),
          }}
        />

        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{
            '& .MuiTabs-indicator': { backgroundColor: theme.colors.primary },
            '& .MuiTab-root': { color: 'rgba(255,255,255,0.5)', fontFamily: 'Orbitron' },
            '& .Mui-selected': { color: theme.colors.primary }
          }}
        >
          <Tab label="ALL_NEEDS" />
          <Tab label="MY_REQUESTS" />
        </Tabs>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={10}>
          <CircularProgress sx={{ color: theme.colors.primary }} />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredNeeds.map(need => (
            <Grid item xs={12} sm={6} md={4} key={need.id}>
              {renderNeedCard(need)}
            </Grid>
          ))}
          {filteredNeeds.length === 0 && (
            <Grid item xs={12}>
              <Typography sx={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', py: 10, fontFamily: 'Orbitron' }}>
                NO_NEEDS_FOUND_IN_THIS_SECTOR
              </Typography>
            </Grid>
          )}
        </Grid>
      )}

      <Modal
        open={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Box sx={{
          width: isMobile ? '95%' : '600px',
          maxHeight: '90vh',
          overflowY: 'auto',
          bgcolor: 'rgba(28, 28, 30, 0.95)',
          border: `1px solid ${theme.colors.primary}`,
          borderRadius: theme.borders.borderRadiusMd,
          p: 4,
          outline: 'none',
          position: 'relative'
        }}>
          {selectedNeed && (
            <>
              <Typography variant="h5" sx={{ color: theme.colors.primary, fontFamily: 'Orbitron', mb: 3 }}>
                COMMS: {selectedNeed.name}
              </Typography>
              <NeedComments needId={selectedNeed.id} />
              <Box mt={3} display="flex" justifyContent="flex-end">
                <Button onClick={() => setIsCommentModalOpen(false)} sx={{ color: theme.colors.primary, fontFamily: 'Orbitron' }}>
                  CLOSE
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Modal>

    </Box>
  );
};

export default NeedsPage;
