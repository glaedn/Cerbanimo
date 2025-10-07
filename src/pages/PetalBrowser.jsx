import * as React from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, List, ListItem, ListItemText, Link, Paper } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import './PetalBrowser.css';

const PetalBrowser = () => {
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [petals, setPetals] = useState([]);
  const [acceptedPetals, setAcceptedPetals] = useState([]);
  const [approvalPetals, setApprovalPetals] = useState([]);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      const fetchProfileAndPetals = async () => {
        try {
          const token = await getAccessTokenSilently({
            audience: import.meta.env.VITE_BACKEND_URL,
            scope: 'openid profile email read:profile',
          });

          const profileResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile`, {
            params: { sub: user.sub, email: user.email, name: user.name },
            headers: { Authorization: `Bearer ${token}` },
          });

          const usersInterests = profileResponse.data.interests?.map(interest => {
            try {
              const parsedInterest = JSON.parse(interest);
              return parsedInterest.name.toLowerCase().trim();
            } catch (error) {
              return null;
            }
          }).filter(interest => interest !== null) || [];

          const userSkills = profileResponse.data.skills
            .map(skill => {
              try {
                const parsedSkill = JSON.parse(skill);
                return parsedSkill.name.toLowerCase().trim();
              } catch (error) {
                return null;
              }
            })
            .filter(skill => skill !== null);

          const fetchedUserId = profileResponse.data.id || null;
          setUserId(fetchedUserId);

          if (userSkills.length === 0) {
            setError('No skills found. Please update your profile.');
            return;
          }

          const petalsResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/petals/relevant`, {
            params: { skills: userSkills },
            headers: { Authorization: `Bearer ${token}` },
          });

          const sortedPetals = petalsResponse.data.sort((a, b) => {
            const sharedA = a.intentionTags?.filter(tag => typeof tag === 'string' && usersInterests.includes(tag.toLowerCase().trim())).length || 0;
            const sharedB = b.intentionTags?.filter(tag => typeof tag === 'string' && usersInterests.includes(tag.toLowerCase().trim())).length || 0;
            return sharedB - sharedA;
          });

          const petalsWithSharedTags = sortedPetals.map(petal => ({
            ...petal,
            sharedTags: Array.isArray(petal.intentionTags)
              ? petal.intentionTags.filter(tag => typeof tag === 'string' && usersInterests.includes(tag.toLowerCase().trim()))
              : [],
            sharedTagsCount: Array.isArray(petal.intentionTags)
              ? petal.intentionTags.filter(tag => typeof tag === 'string' && usersInterests.includes(tag.toLowerCase().trim())).length
              : 0,
          }));

          setPetals(petalsWithSharedTags);

        } catch (err) {
          setError(`Failed to fetch profile or petals: ${err.response?.data?.message || err.message}`);
        }
      };

      const fetchAcceptedPetals = async () => {
        if (!userId) return;
        try {
          const token = await getAccessTokenSilently();
          const acceptedResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/petals/accepted`, {
            params: { userId: userId.toString() },
            headers: { Authorization: `Bearer ${token}` },
          });
          setAcceptedPetals(acceptedResponse.data);
        } catch (err) {
          setError(`Failed to fetch accepted petals: ${err.response?.data?.message || err.message}`);
        }
      };

      const fetchApprovalPetals = async () => {
        if (!userId) return;
        try {
          const token = await getAccessTokenSilently();
          const approvalResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/petals/reviewer/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setApprovalPetals(approvalResponse.data);
        } catch (err) {
          setError(`Failed to fetch review petals: ${err.response?.data?.message || err.message}`);
        }
      };

      fetchProfileAndPetals();
      fetchAcceptedPetals();
      fetchApprovalPetals();
    }
  }, [isAuthenticated, getAccessTokenSilently, user, userId]);

  return (
    <Box display="flex" flexDirection="row" className="petal-browser">
      <Box className="petal-browser-container" flex={1}>
        <Typography variant="h4" gutterBottom className="petal-title">Sprouting Petals</Typography>
        {error && <Typography color="error">{error}</Typography>}
        <Paper elevation={5} className="petal-list">
          <List>
            {petals.length > 0 ? (
              petals.map((petal) => (
                <ListItem key={petal.id} divider className="petal-item">
                  <ListItemText
                    primary={<span className="petal-name">{petal.name}</span>}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" className="petal-description">{petal.description}</Typography>
                        <br />
                        <Typography component="span" variant="body2" className="petal-tags">
                          {petal.sharedTagsCount > 0 ? `🔹 Shared Interests: ${petal.sharedTags.join(', ')}` : '⚠️ No shared interests'}
                        </Typography>
                        <br />
                        {petal.intention_id && <Link href={`/lotus-map/${petal.intention_id}`} className="petal-link">🚀 View Intention</Link>}
                      </>
                    }
                  />
                </ListItem>
              ))
            ) : <Typography className="no-petals">No sprouting petals found.</Typography>}
          </List>
        </Paper>
      </Box>

      <Box flex={1} className="petal-browser-container">
        <Typography variant="h4" gutterBottom className="petal-title">My Blooming Petals</Typography>
        <Paper elevation={5} className="petal-list">
          <List>
            {acceptedPetals.length > 0 ? (
              acceptedPetals.map((petal) => (
                <ListItem key={petal.id} divider className="petal-item">
                  <ListItemText
                    primary={<span className="petal-name">{petal.name}</span>}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" className="petal-description">{petal.description}</Typography>
                        <br />
                        <Typography component="span" variant="body2" className="petal-status">
                          {petal.status === 'Unfurled' && petal.approvals?.length >= 2 ? `⏳ Awaiting PM Approval` :
                           petal.status === 'Unfurled' ? `✅ Submitted for Peer Review` :
                           `Status: ${petal.status}`}
                        </Typography>
                        <br />
                        <Link href={`/lotus-map/${petal.intention_id}`} className="petal-link">🚀 View Intention</Link>
                      </>
                    }
                  />
                </ListItem>
              ))
            ) : <Typography className="no-petals">No blooming petals yet.</Typography>}
          </List>
        </Paper>
      </Box>

      <Box flex={1} className="petal-browser-container">
        <Typography variant="h4" gutterBottom className="petal-title">Petals to Polish</Typography>
        <Paper elevation={5} className="petal-list">
          <List>
            {approvalPetals.length > 0 ? (
              approvalPetals.map((petal) => (
                <ListItem key={petal.id} divider className="petal-item">
                  <ListItemText
                    primary={<span className="petal-name">{petal.name}</span>}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" className="petal-description">{petal.description}</Typography>
                        <br />
                        <Typography component="span" variant="body2" className="petal-status">
                          {`📝 Needs Polishing (${petal.approvals?.length || 0} approvals, ${petal.rejections?.length || 0} rejections)`}
                        </Typography>
                        {petal.intention_id && <><br /><Link href={`/lotus-map/${petal.intention_id}`} className="petal-link">🚀 View Intention</Link></>}
                        {petal.intention_id && petal.id && <><br /><Link href={`/lotus-map/${petal.intention_id}/${petal.id}`} className="petal-link">✏️ Polish Petal</Link></>}
                      </>
                    }
                  />
                </ListItem>
              ))
            ) : <Typography className="no-petals">No petals to polish.</Typography>}
          </List>
        </Paper>
      </Box>
    </Box>
  );
};

export default PetalBrowser;