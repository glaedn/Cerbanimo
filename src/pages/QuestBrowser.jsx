import * as React from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, List, ListItem, ListItemText, Link, Paper } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import './QuestBrowser.css';
import theme from '../styles/theme';

const QuestBrowser = () => {
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [quests, setQuests] = useState([]);
  const [acceptedQuests, setAcceptedQuests] = useState([]);
  const [approvalQuests, setApprovalQuests] = useState([]);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      const fetchProfileAndQuests = async () => {
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
      
          const questsResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/relevant`, {
            params: { skills: userSkills },
            headers: { Authorization: `Bearer ${token}` },
          });
      
          const sortedQuests = questsResponse.data.sort((a, b) => {
            const sharedA = a.projectTags?.filter(tag => typeof tag === 'string' && usersInterests.includes(tag.toLowerCase().trim())).length || 0;
            const sharedB = b.projectTags?.filter(tag => typeof tag === 'string' && usersInterests.includes(tag.toLowerCase().trim())).length || 0;
            return sharedB - sharedA;
          });
      
          const questsWithSharedTags = sortedQuests.map(quest => ({
            ...quest,
            sharedTags: Array.isArray(quest.projectTags)
              ? quest.projectTags.filter(tag => typeof tag === 'string' && usersInterests.includes(tag.toLowerCase().trim()))
              : [],
            sharedTagsCount: Array.isArray(quest.projectTags)
              ? quest.projectTags.filter(tag => typeof tag === 'string' && usersInterests.includes(tag.toLowerCase().trim())).length
              : 0,
          }));
      
          setQuests(questsWithSharedTags);
      
        } catch (err) {
          setError(`Failed to fetch profile or ${theme.terminology.task_plural}: ${err.response?.data?.message || err.message}`);
        }
      };

      const fetchAcceptedQuests = async () => {
        if (!userId) return;
        try {
          const token = await getAccessTokenSilently();
          const acceptedResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/accepted`, {
            params: { userId: userId.toString() },
            headers: { Authorization: `Bearer ${token}` },
          });
          setAcceptedQuests(acceptedResponse.data);
        } catch (err) {
          setError(`Failed to fetch accepted ${theme.terminology.task_plural}: ${err.response?.data?.message || err.message}`);
        }
      };

      const fetchApprovalQuests = async () => {
        if (!userId) return;
        try {
          const token = await getAccessTokenSilently();
          const approvalResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/reviewer/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setApprovalQuests(approvalResponse.data);
        } catch (err) {
          setError(`Failed to fetch review ${theme.terminology.task_plural}: ${err.response?.data?.message || err.message}`);
        }
      };

      fetchProfileAndQuests();
      fetchAcceptedQuests();
      fetchApprovalQuests();
    }
  }, [isAuthenticated, getAccessTokenSilently, user, userId]);

  return (
    <Box display="flex" flexDirection="row" className="task-browser">
      <Box className="task-browser-container" flex={1}>
        <Typography variant="h4" gutterBottom className="task-title">Available {theme.terminology.task_plural}</Typography>
        {error && <Typography color="error">{error}</Typography>}
        <Paper elevation={5} className="task-list">
          <List>
            {quests.length > 0 ? (
              quests.map((quest) => (
                <ListItem key={quest.id} divider className="task-item">
                  <ListItemText
                    primary={<span className="task-name">{quest.name}</span>}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" className="task-description">{quest.description}</Typography>
                        <br />
                        <Typography component="span" variant="body2" className="task-tags">
                          {quest.sharedTagsCount > 0 ? `🔹 Shared Interests: ${quest.sharedTags.join(', ')}` : '⚠️ No shared interests'}
                        </Typography>
                        <br />
                        {quest.project_id && <Link href={`/visualizer/${quest.project_id}`} className="task-link">🚀 View {theme.terminology.project}</Link>}
                      </>
                    }
                  />
                </ListItem>
              ))
            ) : <Typography className="no-tasks">No matching {theme.terminology.task_plural} found.</Typography>}
          </List>
        </Paper>
      </Box>
      
      <Box flex={1} className="task-browser-container">
        <Typography variant="h4" gutterBottom className="task-title">Accepted {theme.terminology.task_plural}</Typography>
        <Paper elevation={5} className="task-list">
          <List>
            {acceptedQuests.length > 0 ? (
              acceptedQuests.map((quest) => (
                <ListItem key={quest.id} divider className="task-item">
                  <ListItemText
                    primary={<span className="task-name">{quest.name}</span>}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" className="task-description">{quest.description}</Typography>
                        <br />
                        <Typography component="span" variant="body2" className="task-status">
                          {quest.status === 'submitted' && quest.approvals?.length >= 2 ? `⏳ Awaiting ${theme.terminology.project_manager_approval}` :
                           quest.status === 'submitted' ? `✅ Submitted for ${theme.terminology.peer_review_approval}` :
                           `⌛ In Progress`}
                        </Typography>
                        <br />
                        <Link href={`/visualizer/${quest.project_id}`} className="task-link">🚀 View {theme.terminology.project}</Link>
                      </>
                    }
                  />
                </ListItem>
              ))
            ) : <Typography className="no-tasks">No accepted {theme.terminology.task_plural} yet.</Typography>}
          </List>
        </Paper>
      </Box>
      
      <Box flex={1} className="task-browser-container">
        <Typography variant="h4" gutterBottom className="task-title">Review {theme.terminology.task_plural}</Typography>
        <Paper elevation={5} className="task-list">
          <List>
            {approvalQuests.length > 0 ? (
              approvalQuests.map((quest) => (
                <ListItem key={quest.id} divider className="task-item">
                  <ListItemText
                    primary={<span className="task-name">{quest.name}</span>}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" className="task-description">{quest.description}</Typography>
                        <br />
                        <Typography component="span" variant="body2" className="task-status">
                          {`📝 Needs Review (${quest.approvals?.length || 0} approvals, ${quest.rejections?.length || 0} rejections)`}
                        </Typography>
                        {quest.project_id && <><br /><Link href={`/visualizer/${quest.project_id}`} className="task-link">🚀 View {theme.terminology.project}</Link></>}
                        {quest.project_id && quest.id && <><br /><Link href={`/visualizer/${quest.project_id}/${quest.id}`} className="task-link">✏️ Review {theme.terminology.task}</Link></>}
                      </>
                    }
                  />
                </ListItem>
              ))
            ) : <Typography className="no-tasks">No {theme.terminology.task_plural} to review.</Typography>}
          </List>
        </Paper>
      </Box>
    </Box>
  );
};

export default QuestBrowser;