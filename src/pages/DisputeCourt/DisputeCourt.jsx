// src/pages/DisputeCourt/DisputeCourt.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useUserProfile } from '../../hooks/useUserProfile';
import { Box, Typography, Card, CardContent, Button, Slider, TextField, Chip, Divider, IconButton, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useIsMobile } from '../../hooks/useIsMobile';
import './DisputeCourt.css';

const DisputeCourt = () => {
  const isMobile = useIsMobile();
  const { profile } = useUserProfile();
  const { getAccessTokenSilently } = useAuth0();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [vote, setVote] = useState('');
  const [splitPerc, setSplitPerc] = useState(50);
  const [comment, setComment] = useState('');

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/verification_v2/disputes/active`);
      setDisputes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (!selectedDispute || !vote) return;
    try {
      if (window.navigator.vibrate) window.navigator.vibrate(50);
      const token = await getAccessTokenSilently();
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/verification_v2/disputes/${selectedDispute.id}/votes`, {
        voterId: profile.id,
        vote,
        splitPercentage: vote === 'split' ? splitPerc : 0,
        comment
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (window.navigator.vibrate) window.navigator.vibrate([20, 50, 20]);
      alert('Verdict submitted to the ledger.');
      setSelectedDispute(null);
      fetchDisputes();
    } catch (err) {
      console.error(err);
      alert('Failed to submit verdict.');
    }
  };

  const isJuror = (dispute) => {
    return dispute.jurors && dispute.jurors.includes(profile?.id);
  };

  if (loading && disputes.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh" bgcolor="#000">
        <CircularProgress sx={{ color: '#00ffff' }} />
      </Box>
    );
  }

  return (
    <Box className={`dispute-court-container ${isMobile ? 'mobile-court' : ''}`} sx={{ pb: isMobile ? '80px' : '20px', pt: isMobile ? '20px' : '80px' }}>
      <Box className="hud-header" sx={{ flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'center' : 'baseline', gap: isMobile ? 1 : 0 }}>
        <Typography variant={isMobile ? "h5" : "h3"} className="hud-title" sx={{ fontSize: isMobile ? '1.2rem' : '2rem', fontFamily: 'Orbitron' }}>DISPUTE COURT</Typography>
        <Typography className="hud-status" sx={{ color: '#00ffff', opacity: 0.8, fontFamily: 'Space Mono' }}>ACTIVE_TRIALS: {disputes.length}</Typography>
      </Box>

      <Box className="court-main" sx={{ flexDirection: isMobile ? 'column' : 'row', p: isMobile ? 1 : 2 }}>
        {(!isMobile || !selectedDispute) && (
          <Box className="dispute-list" sx={{ width: isMobile ? '100%' : '300px', pr: isMobile ? 0 : 2 }}>
            {disputes.map(d => (
              <Card key={d.id} className={`dispute-item ${selectedDispute?.id === d.id ? 'selected' : ''}`} onClick={() => setSelectedDispute(d)} sx={{ mb: 2 }}>
                <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                  <Typography variant="h6" sx={{ fontSize: isMobile ? '1rem' : '1.25rem', fontFamily: 'Orbitron', color: '#00ffff' }}>{d.task_name}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.7, fontSize: isMobile ? '0.75rem' : '0.875rem', mt: 1 }}>Reason: {d.reason}</Typography>
                  {isJuror(d) && (
                    <Chip
                      label="ASSIGNED_JUROR"
                      size="small"
                      sx={{ mt: 2, bgcolor: 'rgba(255, 0, 255, 0.2)', color: '#ff00ff', border: '1px solid #ff00ff', fontWeight: 'bold' }}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
            {disputes.length === 0 && (
              <Typography sx={{ opacity: 0.5, textAlign: 'center', mt: 4, fontFamily: 'Space Mono' }}>NO ACTIVE DISPUTES</Typography>
            )}
          </Box>
        )}

        {selectedDispute ? (
          <Box className="dispute-detail" sx={{ p: isMobile ? 2 : 4, bgcolor: 'rgba(0,0,0,0.6)', borderRadius: isMobile ? 0 : 1, border: '1px solid rgba(0,255,255,0.2)' }}>
            {isMobile && (
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => setSelectedDispute(null)}
                sx={{ color: '#00ffff', mb: 3, fontFamily: 'Orbitron' }}
              >
                RETURN TO DOCKET
              </Button>
            )}

            <Typography variant={isMobile ? "h5" : "h4"} sx={{ color: '#ff00ff', textShadow: '0 0 10px #ff00ff', mb: 2, fontFamily: 'Orbitron' }}>
              {selectedDispute.task_name}
            </Typography>

            <Typography variant="body1" sx={{ color: '#e0e0e0', mb: 3, lineHeight: 1.6 }}>
              {selectedDispute.task_desc}
            </Typography>

            <Divider sx={{ my: 3, bgcolor: 'rgba(0,255,255,0.2)' }} />

            {isJuror(selectedDispute) ? (
              <Box className="jury-actions" sx={{ border: '1px solid #ff00ff', p: isMobile ? 2 : 4, bgcolor: 'rgba(255, 0, 255, 0.05)' }}>
                <Typography variant="h6" sx={{ color: '#ff00ff', fontFamily: 'Orbitron', mb: 3, textAlign: 'center' }}>JUROR_VERDICT_INPUT</Typography>

                <Box className="vote-options" sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2 }}>
                  <Button
                    fullWidth
                    variant={vote === 'uphold' ? 'contained' : 'outlined'}
                    onClick={() => setVote('uphold')}
                    color="success"
                    sx={{ height: '48px', fontWeight: 'bold' }}
                  >
                    UPHOLD
                  </Button>
                  <Button
                    fullWidth
                    variant={vote === 'overturn' ? 'contained' : 'outlined'}
                    onClick={() => setVote('overturn')}
                    color="error"
                    sx={{ height: '48px', fontWeight: 'bold' }}
                  >
                    OVERTURN
                  </Button>
                  <Button
                    fullWidth
                    variant={vote === 'split' ? 'contained' : 'outlined'}
                    onClick={() => setVote('split')}
                    color="secondary"
                    sx={{ height: '48px', fontWeight: 'bold' }}
                  >
                    SPLIT_REWARD
                  </Button>
                </Box>

                {vote === 'split' && (
                  <Box sx={{ mt: 4, px: 2 }}>
                    <Typography gutterBottom sx={{ fontFamily: 'Space Mono', color: '#ff00ff' }}>REWARD_SPLIT: {splitPerc}% / {100 - splitPerc}%</Typography>
                    <Slider
                      value={splitPerc}
                      onChange={(e, val) => setSplitPerc(val)}
                      min={0} max={100} step={5}
                      sx={{ color: '#ff00ff' }}
                    />
                  </Box>
                )}

                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="JUSTIFICATION_LOG"
                  variant="outlined"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  sx={{ mt: 4, '& .MuiOutlinedInput-root': { color: '#00ffff', '& fieldset': { borderColor: 'rgba(0,255,255,0.3)' } } }}
                  InputLabelProps={{ style: { color: '#00ffff', fontFamily: 'Space Mono' } }}
                />

                <Button
                  fullWidth
                  variant="contained"
                  disabled={!vote}
                  sx={{ mt: 4, bgcolor: '#ff00ff', color: '#000', fontWeight: 'bold', height: '56px', '&:hover': { bgcolor: '#cc00cc' } }}
                  onClick={handleVote}
                >
                  EXECUTE_VERDICT
                </Button>
              </Box>
            ) : (
              <Box className="spectator-view" sx={{ p: 4, border: '1px dashed rgba(0, 255, 255, 0.3)', textAlign: 'center' }}>
                <Typography color="secondary" sx={{ fontFamily: 'Orbitron' }}>SPECTATOR_MODE: ACCESS_DENIED_TO_VERDICT_CONTROLS</Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.6 }}>Only assigned guild jurors may cast votes on this dispute.</Typography>
              </Box>
            )}
          </Box>
        ) : (
          !isMobile && (
            <Box className="empty-detail" sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: 0.5 }}>
              <Typography variant="h5" sx={{ fontFamily: 'Orbitron' }}>SELECT_DOCKET_FOR_EVIDENCE_REVIEW</Typography>
            </Box>
          )
        )}
      </Box>
    </Box>
  );
};

export default DisputeCourt;
