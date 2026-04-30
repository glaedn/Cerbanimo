import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Snackbar,
  Alert,
  TextField,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import SubmissionModal from '../components/SubmissionModal';
import './MobileTaskDetail.css';

const MobileTaskDetail = () => {
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [project, setProject] = useState(null);
  const [skills, setSkills] = useState([]);
  const [projectTasks, setProjectTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'info' });
  const { user, getAccessTokenSilently } = useAuth0();
  const [profile, setProfile] = useState(null);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getAccessTokenSilently();

        // Fetch Task
        const taskRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/${taskId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTask(taskRes.data);
        setEditForm(taskRes.data);

        // Fetch Project to check for creator_id
        const projectRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/projects/${taskRes.data.project_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProject(projectRes.data);

        // Fetch Profile
        const profileRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile`, {
          params: { sub: user.sub, email: user.email },
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(profileRes.data);

        // Fetch Skills for Edit Mode
        const skillsRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/skills/all`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSkills(skillsRes.data);

        // Fetch all project tasks for dependency management
        const projectTasksRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/p/${taskRes.data.project_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProjectTasks(projectTasksRes.data);

      } catch (err) {
        console.error('Error fetching data:', err);
        setFeedback({ open: true, message: 'Failed to load mission details.', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [taskId, getAccessTokenSilently, user.email, user.sub]);

  const isCreator = profile && project && Number(profile.id) === Number(project.creator_id);
  const isAssigned = profile && task && task.assigned_user_ids?.some(id => Number(id) === Number(profile.id));
  const isReviewer = profile && task && task.reviewer_ids?.includes(Number(profile.id));
  const isSubmitted = task?.status?.toLowerCase().includes('submitted');
  const isCompleted = task?.status?.toLowerCase().includes('completed');
  const impactWeight = Math.max(0, Math.min(100, Number(task?.impact_weight) || 0));

  const handleAction = async (action) => {
    try {
      setActionLoading(true);
      if (window.navigator.vibrate) window.navigator.vibrate(50);
      const token = await getAccessTokenSilently();

      if (action === 'accept' || action === 'drop') {
        await axios.put(`${import.meta.env.VITE_BACKEND_URL}/tasks/${taskId}/${action}`, {
          userId: profile.id
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFeedback({ open: true, message: `Mission ${action === 'accept' ? 'accepted' : 'dropped'}!`, severity: 'success' });
      }

      // Re-fetch task
      const updatedTaskRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTask(updatedTaskRes.data);
      setEditForm(updatedTaskRes.data);
    } catch {
        setFeedback({ open: true, message: `Failed to ${action} mission.`, severity: 'error' });
    } finally {
        setActionLoading(false);
    }
  };

  const handleSubmission = async (submissionData) => {
    try {
      const token = await getAccessTokenSilently();
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/tasks/${taskId}/submit`, {
        proof_of_work_links: submissionData.proofUrls,
        reflection: submissionData.notes,
        platformUserId: profile.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeedback({ open: true, message: 'Mission submitted for review!', severity: 'success' });

      // Re-fetch task
      const updatedTaskRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTask(updatedTaskRes.data);
      setEditForm(updatedTaskRes.data);
    } catch {
        setFeedback({ open: true, message: 'Submission failed.', severity: 'error' });
    }
  };

  const handleSaveEdit = async () => {
    try {
      setActionLoading(true);
      const token = await getAccessTokenSilently();

      const updatedData = {
        ...editForm,
        projectId: task.project_id,
        skill_level: parseInt(editForm.skill_level || 0, 10),
        reward_tokens: parseInt(editForm.reward_tokens || 0, 10),
        active: !editForm.status?.startsWith('inactive'),
        dependencies: (editForm.dependencies || []).map(id => parseInt(id, 10))
      };

      await axios.put(`${import.meta.env.VITE_BACKEND_URL}/tasks/update/${taskId}`, updatedData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFeedback({ open: true, message: 'Mission updated successfully!', severity: 'success' });
      setIsEditing(false);

      // Refresh task
      const updatedTaskRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTask(updatedTaskRes.data);
    } catch (err) {
      console.error('Update failed:', err);
      setFeedback({ open: true, message: 'Failed to update mission.', severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReview = async (approved) => {
    try {
      setActionLoading(true);
      const token = await getAccessTokenSilently();
      await axios.put(`${import.meta.env.VITE_BACKEND_URL}/tasks/${taskId}/review`, {
        action: approved ? 'approve' : 'reject',
        userId: profile.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeedback({ open: true, message: `Mission ${approved ? 'approved' : 'rejected'}.`, severity: 'success' });

      // Refresh task
      const updatedTaskRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTask(updatedTaskRes.data);
    } catch {
      setFeedback({ open: true, message: 'Review failed.', severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePMReview = async (approved) => {
    try {
      setActionLoading(true);
      const token = await getAccessTokenSilently();
      const endpoint = approved ? 'pm-approve' : 'pm-reject';
      await axios.put(`${import.meta.env.VITE_BACKEND_URL}/tasks/${taskId}/${endpoint}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeedback({ open: true, message: `Mission ${approved ? 'approved' : 'rejected'} by PM.`, severity: 'success' });

      // Refresh task
      const updatedTaskRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTask(updatedTaskRes.data);
    } catch {
      setFeedback({ open: true, message: 'PM Review failed.', severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispute = async () => {
    const reason = prompt("STATE THE NATURE OF YOUR DISPUTE:");
    if (!reason) return;

    try {
      const token = await getAccessTokenSilently();
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/verification_v2/disputes`, {
        taskId: taskId,
        openerId: profile.id,
        reason
      }, { headers: { Authorization: `Bearer ${token}` } });
      setFeedback({ open: true, message: "DISPUTE PROTOCOL INITIATED.", severity: 'info' });

      // Refresh task
      const updatedTaskRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTask(updatedTaskRes.data);
    } catch {
      setFeedback({ open: true, message: "FAILED TO OPEN DISPUTE.", severity: 'error' });
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4, height: '100vh', alignItems: 'center' }}><CircularProgress /></Box>;
  if (!task) return <Box sx={{ p: 4 }}><Typography color="error">Mission not found.</Typography></Box>;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
    <Box className="mobile-task-detail-container">
      {/* Header */}
      <Box className="detail-header">
        <IconButton onClick={() => navigate(-1)} sx={{ color: '#00F3FF' }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" className="header-title">MISSION_DATA</Typography>
        {isCreator && !isCompleted && (
          <IconButton onClick={() => setIsEditing(!isEditing)} sx={{ color: isEditing ? '#FF5CA2' : '#00F3FF' }}>
            {isEditing ? <CloseIcon /> : <EditIcon />}
          </IconButton>
        )}
      </Box>

      <Box sx={{ p: 2, pb: 12 }}>
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div
              key="edit-mode"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Paper className="cyber-edit-paper">
                <Typography variant="subtitle2" className="section-label">IDENTIFIER</Typography>
                <TextField
                  fullWidth
                  className="cyber-input"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  sx={{ mb: 2 }}
                />

                <Typography variant="subtitle2" className="section-label">DESCRIPTION</Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  className="cyber-input"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  sx={{ mb: 2 }}
                />

                <Typography variant="subtitle2" className="section-label">SKILL_MODULE</Typography>
                <FormControl fullWidth className="cyber-select" sx={{ mb: 2 }}>
                  <Select
                    value={editForm.skill_id}
                    onChange={(e) => setEditForm({ ...editForm, skill_id: e.target.value })}
                  >
                    {skills.map(skill => (
                      <MenuItem key={skill.id} value={skill.id}>{skill.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Typography variant="subtitle2" className="section-label">VERIFICATION_MODEL</Typography>
                <FormControl fullWidth className="cyber-select" sx={{ mb: 2 }}>
                  <Select
                    value={editForm.verification_model || 'owner'}
                    onChange={(e) => setEditForm({ ...editForm, verification_model: e.target.value })}
                  >
                    <MenuItem value="self">SELF (High Risk)</MenuItem>
                    <MenuItem value="peer">PEER (Medium Risk)</MenuItem>
                    <MenuItem value="quorum">QUORUM (Low Risk)</MenuItem>
                    <MenuItem value="owner">OWNER (Standard)</MenuItem>
                    <MenuItem value="oracle">ORACLE (External Artifact)</MenuItem>
                  </Select>
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" className="section-label">LVL</Typography>
                    <TextField
                      type="number"
                      className="cyber-input"
                      value={editForm.skill_level}
                      onChange={(e) => setEditForm({ ...editForm, skill_level: e.target.value })}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" className="section-label">REWARD</Typography>
                    <TextField
                      type="number"
                      className="cyber-input"
                      value={editForm.reward_tokens}
                      onChange={(e) => setEditForm({ ...editForm, reward_tokens: e.target.value })}
                    />
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" className="section-label">START_DATE</Typography>
                        <DatePicker
                            value={editForm.start_date ? dayjs(editForm.start_date) : null}
                            onChange={(nv) => setEditForm({ ...editForm, start_date: nv ? nv.toISOString() : null })}
                            slotProps={{ textField: { fullWidth: true, className: 'cyber-input' } }}
                        />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" className="section-label">DUE_DATE</Typography>
                        <DatePicker
                            value={editForm.due_date ? dayjs(editForm.due_date) : null}
                            onChange={(nv) => setEditForm({ ...editForm, due_date: nv ? nv.toISOString() : null })}
                            slotProps={{ textField: { fullWidth: true, className: 'cyber-input' } }}
                        />
                    </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" className="section-label">DEPENDENCIES</Typography>
                  <FormControl fullWidth className="cyber-select" sx={{ mb: 1 }}>
                    <Select
                      value=""
                      displayEmpty
                      onChange={(e) => {
                        const depId = parseInt(e.target.value, 10);
                        if (depId && !editForm.dependencies?.includes(depId)) {
                          setEditForm({
                            ...editForm,
                            dependencies: [...(editForm.dependencies || []), depId]
                          });
                        }
                      }}
                    >
                      <MenuItem value="" disabled>ADD_DEPENDENCY</MenuItem>
                      {projectTasks
                        .filter(t => t.id !== parseInt(taskId, 10) && !editForm.dependencies?.includes(t.id))
                        .map(t => (
                          <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                        ))
                      }
                    </Select>
                  </FormControl>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {editForm.dependencies?.map(depId => {
                      const depTask = projectTasks.find(t => t.id === parseInt(depId, 10));
                      return (
                        <Chip
                          key={depId}
                          label={depTask ? depTask.name : `Task ${depId}`}
                          onDelete={() => {
                            setEditForm({
                              ...editForm,
                              dependencies: editForm.dependencies.filter(id => id !== depId)
                            });
                          }}
                          className="cyber-chip dependency"
                          size="small"
                        />
                      );
                    })}
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" className="section-label">PROTOCOLS</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={!editForm.status?.startsWith('inactive')}
                          onChange={(e) => {
                            const isAssigned = editForm.assigned_user_ids?.length > 0;
                            const isUrgent = editForm.status?.startsWith('urgent');
                            let newStatus;
                            if (e.target.checked) {
                              newStatus = isUrgent ? `urgent-${isAssigned ? 'assigned' : 'unassigned'}` : `active-${isAssigned ? 'assigned' : 'unassigned'}`;
                            } else {
                              newStatus = `inactive-${isAssigned ? 'assigned' : 'unassigned'}`;
                            }
                            setEditForm({ ...editForm, status: newStatus });
                          }}
                          sx={{ color: '#00f3ff', '&.Mui-checked': { color: '#00f3ff' } }}
                        />
                      }
                      label={<Typography sx={{ color: '#00f3ff', fontSize: '0.8rem', fontFamily: 'Orbitron' }}>ACTIVE_STATUS</Typography>}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={editForm.status?.startsWith('urgent')}
                          onChange={(e) => {
                            const isAssigned = editForm.assigned_user_ids?.length > 0;
                            const isActive = !editForm.status?.startsWith('inactive');
                            let newStatus;
                            if (e.target.checked) {
                              newStatus = `urgent-${isAssigned ? 'assigned' : 'unassigned'}`;
                            } else {
                              newStatus = isActive ? `active-${isAssigned ? 'assigned' : 'unassigned'}` : `inactive-${isAssigned ? 'assigned' : 'unassigned'}`;
                            }
                            setEditForm({ ...editForm, status: newStatus });
                          }}
                          sx={{ color: '#00f3ff', '&.Mui-checked': { color: '#ff003c' } }}
                        />
                      }
                      label={<Typography sx={{ color: '#00f3ff', fontSize: '0.8rem', fontFamily: 'Orbitron' }}>EMERGENCY_PROTOCOL</Typography>}
                    />
                  </Box>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  className="cyber-save-button"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveEdit}
                  disabled={actionLoading}
                >
                  {actionLoading ? <CircularProgress size={24} /> : 'UPLOAD_CHANGES'}
                </Button>
              </Paper>
            </motion.div>
          ) : (
            <motion.div
              key="view-mode"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Typography variant="h5" className="task-name">
                {task.name}
              </Typography>

              <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                <Chip label={task.skill_name || 'General'} className="cyber-chip skill" />
                <Chip label={`Lvl ${task.skill_level || 1}`} className="cyber-chip level" />
                <Chip label={task.status.toUpperCase()} className={`cyber-chip status ${task.status.toLowerCase()}`} />
              </Box>

              {(task.impact_label || task.outcome_statement) && (
                <Box className="impact-goal-box">
                  <Box className="impact-meter" style={{ '--impact-weight': `${impactWeight}%` }}>
                    <Typography variant="caption" className="impact-label">IMPACT</Typography>
                    <div className="impact-meter-track" aria-hidden="true">
                      <div className="impact-meter-fill" />
                    </div>
                  </Box>
                  <Typography variant="body2" className="impact-text">&quot;{task.impact_label || task.outcome_statement}&quot;</Typography>
                  {task.project_outcome_statement && (
                    <Typography variant="caption" className="impact-text" sx={{ display: 'block', mt: 0.75, opacity: 0.75 }}>
                      Project outcome: {task.project_outcome_statement}
                    </Typography>
                  )}
                </Box>
              )}

              <Paper className="content-paper">
                <Typography variant="subtitle2" className="section-title">MISSION DESCRIPTION</Typography>
                <Typography variant="body2" className="description-text">
                  {task.description}
                </Typography>
              </Paper>

              <Divider sx={{ my: 2, bgcolor: 'rgba(0, 243, 255, 0.2)' }} />

              <Typography variant="subtitle2" className="section-title">DEPENDENCIES</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {task.dependencies?.length > 0 ? (
                  task.dependencies.map(depId => {
                    const depTask = projectTasks.find(t => t.id === parseInt(depId, 10));
                    return (
                      <Chip
                        key={depId}
                        label={depTask ? depTask.name : `Task ${depId}`}
                        className="cyber-chip dependency"
                        size="small"
                        onClick={() => navigate(`/Visualizer/${task.project_id}/${depId}`)}
                      />
                    );
                  })
                ) : (
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>No dependencies.</Typography>
                )}
              </Box>

              <Typography variant="subtitle2" className="section-title">TIMELINE</Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Box sx={{ flex: 1, p: 1.5, bgcolor: 'rgba(0, 243, 255, 0.05)', borderRadius: '4px', border: '1px solid rgba(0, 243, 255, 0.1)' }}>
                    <Typography variant="caption" sx={{ color: 'rgba(0, 243, 255, 0.7)', display: 'block', mb: 0.5 }}>START</Typography>
                    <Typography variant="body2">{task.start_date ? dayjs(task.start_date).format('MMM D, YYYY') : 'NOT_SET'}</Typography>
                  </Box>
                  <Box sx={{ flex: 1, p: 1.5, bgcolor: 'rgba(255, 92, 162, 0.05)', borderRadius: '4px', border: '1px solid rgba(255, 92, 162, 0.1)' }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 92, 162, 0.7)', display: 'block', mb: 0.5 }}>DUE</Typography>
                    <Typography variant="body2">{task.due_date ? dayjs(task.due_date).format('MMM D, YYYY') : 'NOT_SET'}</Typography>
                  </Box>
              </Box>

              <Typography variant="subtitle2" className="section-title">RESOURCES & REWARDS</Typography>
              <List dense>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary="CO-TOKENS"
                    secondary={`${task.reward_tokens || 0} units`}
                    primaryTypographyProps={{ className: 'list-primary' }}
                    secondaryTypographyProps={{ className: 'list-secondary' }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary="VERIFICATION"
                    secondary={task.verification_model?.toUpperCase() || 'STANDARD'}
                    primaryTypographyProps={{ className: 'list-primary' }}
                    secondaryTypographyProps={{ className: 'list-secondary' }}
                  />
                </ListItem>
              </List>

              {/* Submission Review for Reviewers and Creators */}
              {(isReviewer || isCreator) && isSubmitted && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" className="section-title pink">SUBMISSION DATA</Typography>
                  <Paper className="content-paper submission">
                    <Typography variant="caption" className="sub-label">REFLECTION</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>{task.reflection || 'No reflection provided.'}</Typography>

                    <Typography variant="caption" className="sub-label">PROOF_LINKS</Typography>
                    {task.proof_of_work_links?.map((link, idx) => (
                      <Box key={idx} sx={{ mb: 0.5 }}>
                        <a href={link} target="_blank" rel="noopener noreferrer" className="proof-link">{link}</a>
                      </Box>
                    )) || <Typography variant="body2">No links provided.</Typography>}
                  </Paper>
                </Box>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      {/* Bottom Action Bar */}
      {!isEditing && (
        <Box className="sticky-actions">
          <Box display="flex" gap={1} width="100%">
            {(() => {
              const s = task.status.toLowerCase();

              // Project Manager Actions
              if (isCreator && s === 'submitted') {
                return (
                  <>
                    <Button fullWidth className="cyber-btn pm-approve" onClick={() => handlePMReview(true)}>PM_APPROVE</Button>
                    <Button fullWidth className="cyber-btn pm-reject" onClick={() => handlePMReview(false)}>PM_REJECT</Button>
                  </>
                );
              }

              // Reviewer Actions
              if (isReviewer && s === 'submitted') {
                return (
                  <>
                    <Button fullWidth className="cyber-btn approve" onClick={() => handleReview(true)}>APPROVE</Button>
                    <Button fullWidth className="cyber-btn reject" onClick={() => handleReview(false)}>REJECT</Button>
                    <Button fullWidth className="cyber-btn dispute" onClick={handleDispute}>DISPUTE</Button>
                  </>
                );
              }

              // Operator Actions
              if (isAssigned) {
                if (s === 'submitted') {
                  return (
                    <>
                      <Button fullWidth disabled className="cyber-btn pending">AWAITING_VERIFICATION</Button>
                      <Button fullWidth className="cyber-btn secondary" onClick={() => navigate(`/Visualizer/${projectId}`)}>VIEW_PROJECT</Button>
                    </>
                  );
                }
                if (isCompleted) {
                  return (
                    <>
                      <Button fullWidth disabled className="cyber-btn completed">MISSION_COMPLETED</Button>
                      <Button fullWidth className="cyber-btn secondary" onClick={() => navigate(`/Visualizer/${task.project_id}`)}>VIEW_PROJECT</Button>
                    </>
                  );
                }
                return (
                  <>
                    <Button fullWidth className="cyber-btn primary" onClick={() => setIsSubmissionModalOpen(true)}>SUBMIT_PROOF</Button>
                    <Button className="cyber-btn secondary" onClick={() => handleAction('drop')}>DROP</Button>
                    <Button className="cyber-btn secondary" onClick={() => navigate(`/Visualizer/${task.project_id}`)}>VIEW_PROJECT</Button>
                  </>
                );
              }

              // Available for Pickup
              if (!isCompleted && !isSubmitted && (s.includes('unassigned') || (!s.includes('assigned') && s !== 'completed'))) {
                return (
                  <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                    <Button
                      fullWidth
                      className="cyber-btn primary"
                      onClick={() => handleAction('accept')}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <CircularProgress size={24} /> : 'INITIALIZE_MISSION'}
                    </Button>
                    <Button
                      fullWidth
                      className="cyber-btn secondary"
                      onClick={() => navigate(`/Visualizer/${task.project_id}`)}
                    >
                      VIEW_PROJECT
                    </Button>
                  </Box>
                );
              }

              return (
                <Box display="flex" gap={1} width="100%">
                  <Button fullWidth disabled className="cyber-btn neutral">STATUS: {s.toUpperCase()}</Button>
                  <Button fullWidth className="cyber-btn secondary" onClick={() => navigate(`/Visualizer/${task.project_id}`)}>VIEW_PROJECT</Button>
                </Box>
              );
            })()}
          </Box>
        </Box>
      )}

      <SubmissionModal
        open={isSubmissionModalOpen}
        onClose={() => setIsSubmissionModalOpen(false)}
        onSubmit={handleSubmission}
        taskName={task.name}
      />

      <Snackbar
        open={feedback.open}
        autoHideDuration={6000}
        onClose={() => setFeedback({ ...feedback, open: false })}
      >
        <Alert severity={feedback.severity} variant="filled" sx={{ width: '100%' }}>
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box>
    </LocalizationProvider>
  );
};

export default MobileTaskDetail;
