import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useUserProfile } from '../../hooks/useUserProfile';
import { Box, Typography, Card, CardContent, Button, Slider, TextField, Chip, Divider } from '@mui/material';
import './DisputeCourt.css';

const DisputeCourt = () => {
  const { profile } = useUserProfile();
  const { getAccessTokenSilently } = useAuth0();
  const [disputes, setDisputes] = useState([]);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [vote, setVote] = useState('');
  const [splitPerc, setSplitPerc] = useState(50);
  const [comment, setComment] = useState('');

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/verification_v2/disputes/active`);
      setDisputes(res.data);
    } catch (err) { console.error(err); }
  };

  const handleVote = async () => {
    if (!selectedDispute || !vote) return;
    try {
      const token = await getAccessTokenSilently();
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/verification_v2/disputes/${selectedDispute.id}/votes`, {
        voterId: profile.id,
        vote,
        splitPercentage: vote === 'split' ? splitPerc : 0,
        comment
      }, { headers: { Authorization: `Bearer ${token}` } });

      alert('Vote cast successfully!');
      setSelectedDispute(null);
      fetchDisputes();
    } catch (err) { console.error(err); }
  };

  const isJuror = (dispute) => {
    return dispute.jurors && dispute.jurors.includes(profile?.id);
  };

  return (
    <div className="dispute-court-container">
      <div className="hud-header">
        <h1 className="hud-title">DISPUTE COURT</h1>
        <div className="hud-status">ACTIVE_TRIALS: {disputes.length}</div>
      </div>

      <div className="court-main">
        <div className="dispute-list">
          {disputes.map(d => (
            <Card key={d.id} className={`dispute-item ${selectedDispute?.id === d.id ? 'selected' : ''}`} onClick={() => setSelectedDispute(d)}>
              <CardContent>
                <Typography variant="h6">{d.task_name}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>Reason: {d.reason}</Typography>
                {isJuror(d) && <Chip label="ASSIGNED_JUROR" color="secondary" size="small" sx={{ mt: 1 }} />}
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedDispute ? (
          <div className="dispute-detail">
            <h2>{selectedDispute.task_name}</h2>
            <p>{selectedDispute.task_desc}</p>
            <Divider sx={{ my: 2, bgcolor: 'rgba(0,255,255,0.2)' }} />

            {isJuror(selectedDispute) ? (
              <div className="jury-actions">
                <h3>JUROR_VERDICT</h3>
                <div className="vote-options">
                  <Button variant={vote === 'uphold' ? 'contained' : 'outlined'} onClick={() => setVote('uphold')} color="success">UPHOLD</Button>
                  <Button variant={vote === 'overturn' ? 'contained' : 'outlined'} onClick={() => setVote('overturn')} color="error">OVERTURN</Button>
                  <Button variant={vote === 'split' ? 'contained' : 'outlined'} onClick={() => setVote('split')} color="secondary">SPLIT_REWARD</Button>
                </div>

                {vote === 'split' && (
                  <Box sx={{ mt: 4, px: 2 }}>
                    <Typography gutterBottom>SPLIT_PERCENTAGE: {splitPerc}%</Typography>
                    <Slider value={splitPerc} onChange={(e, val) => setSplitPerc(val)} min={0} max={100} step={5} />
                  </Box>
                )}

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="COMMENTS (OPTIONAL)"
                  variant="outlined"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  sx={{ mt: 3, '& .MuiOutlinedInput-root': { color: '#00ffff', '& fieldset': { borderColor: 'rgba(0,255,255,0.3)' } } }}
                />

                <Button fullWidth variant="contained" sx={{ mt: 3, bgcolor: '#ff00ff' }} onClick={handleVote}>SUBMIT_VERDICT</Button>
              </div>
            ) : (
              <div className="spectator-view">
                <Typography color="secondary">YOU_ARE_NOT_A_JUROR_FOR_THIS_DISPUTE</Typography>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-detail">
            <Typography>SELECT_A_DISPUTE_TO_REVIEW_EVIDENCE</Typography>
          </div>
        )}
      </div>
    </div>
  );
};

export default DisputeCourt;
