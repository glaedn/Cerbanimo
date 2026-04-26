import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider
} from '@mui/material';
import { toast } from 'react-hot-toast';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { getAccessTokenSilently } = useAuth0();
  const [stats, setStats] = useState(null);
  const [userActivity, setUserActivity] = useState([]);
  const [taskDistribution, setTaskDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  const fetchData = async () => {
    try {
      const token = await getAccessTokenSilently();
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const [statsRes, activityRes, distributionRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/admin/stats`, config),
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/admin/user-activity`, config),
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/admin/task-distribution`, config)
      ]);

      setStats(statsRes.data);
      setUserActivity(activityRes.data);
      setTaskDistribution(distributionRes.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const runAction = async (endpoint, actionName) => {
    setActionLoading(prev => ({ ...prev, [actionName]: true }));
    try {
      const token = await getAccessTokenSilently();
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/admin/${endpoint}`, {}, config);
      toast.success(response.data.message || `${actionName} completed`);
      if (endpoint === 'run-interest-validation') {
        fetchData();
      }
    } catch (error) {
      console.error(`Error running ${actionName}:`, error);
      toast.error(`Failed to run ${actionName}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionName]: false }));
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh" bgcolor="#0a0a0b">
        <CircularProgress sx={{ color: '#00F3FF' }} />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" className="admin-dashboard-container">
      <Typography variant="h3" className="admin-title" gutterBottom>
        DBOWNER_DASHBOARD
      </Typography>
      <Divider sx={{ mb: 4, borderColor: '#00F3FF', opacity: 0.3 }} />

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: 'TOTAL_USERS', value: stats?.totalUsers },
          { label: 'TOTAL_PROJECTS', value: stats?.totalProjects },
          { label: 'TOTAL_TASKS', value: stats?.totalTasks },
          { label: 'TOTAL_SKILLS', value: stats?.totalSkills },
          { label: 'TOTAL_INTERESTS', value: stats?.totalInterests },
        ].map((stat, i) => (
          <Grid item xs={12} sm={6} md={2.4} key={i}>
            <Paper className="stat-card">
              <Typography variant="overline" color="rgba(255,255,255,0.6)">{stat.label}</Typography>
              <Typography variant="h4" color="#00F3FF">{stat.value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={4}>
        {/* Reports Section */}
        <Grid item xs={12} md={8}>
          <Paper className="admin-section-paper">
            <Typography variant="h5" className="section-title">USER_REGISTRATION_ACTIVITY (LAST 30 DAYS)</Typography>
            <Box className="chart-placeholder">
               {/* Simple Bar Representation */}
               <Box display="flex" alignItems="flex-end" height="200px" gap={1}>
                  {userActivity.map((day, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        width: '100%',
                        height: `${Math.min((day.count / (Math.max(...userActivity.map(d=>d.count)) || 1)) * 100, 100)}%`,
                        bgcolor: '#00F3FF',
                        opacity: 0.7,
                        '&:hover': { opacity: 1 }
                      }}
                      title={`${day.date}: ${day.count}`}
                    />
                  ))}
               </Box>
               <Box display="flex" justifyContent="space-between" mt={1}>
                  <Typography variant="caption">{userActivity[0]?.date ? new Date(userActivity[0].date).toLocaleDateString() : ''}</Typography>
                  <Typography variant="caption">{userActivity[userActivity.length-1]?.date ? new Date(userActivity[userActivity.length-1].date).toLocaleDateString() : ''}</Typography>
               </Box>
            </Box>
          </Paper>

          <Paper className="admin-section-paper" sx={{ mt: 4 }}>
            <Typography variant="h5" className="section-title">TASK_STATUS_DISTRIBUTION</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: '#00F3FF' }}>STATUS</TableCell>
                    <TableCell sx={{ color: '#00F3FF' }} align="right">COUNT</TableCell>
                    <TableCell sx={{ color: '#00F3FF' }} align="right">PERCENTAGE</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {taskDistribution.map((row) => {
                    const percentage = ((row.count / stats.totalTasks) * 100).toFixed(1);
                    return (
                      <TableRow key={row.status}>
                        <TableCell sx={{ color: '#fff' }}>{row.status.toUpperCase()}</TableCell>
                        <TableCell sx={{ color: '#fff' }} align="right">{row.count}</TableCell>
                        <TableCell sx={{ color: '#fff' }} align="right">{percentage}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Actions Section */}
        <Grid item xs={12} md={4}>
          <Paper className="admin-section-paper">
            <Typography variant="h5" className="section-title">SYSTEM_MAINTENANCE</Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <AdminActionButton
                label="VALIDATE_INTERESTS"
                onClick={() => runAction('run-interest-validation', 'VALIDATE_INTERESTS')}
                loading={actionLoading['VALIDATE_INTERESTS']}
              />
              <AdminActionButton
                label="RESET_SPENT_POINTS"
                onClick={() => runAction('run-task-reset', 'RESET_SPENT_POINTS')}
                loading={actionLoading['RESET_SPENT_POINTS']}
              />
              <AdminActionButton
                label="SYNC_GUILD_MEMBERSHIPS"
                onClick={() => runAction('run-guild-sync', 'SYNC_GUILD_MEMBERSHIPS')}
                loading={actionLoading['SYNC_GUILD_MEMBERSHIPS']}
              />
              <AdminActionButton
                label="ENRICH_SKILLS_&_HIERARCHY"
                onClick={() => runAction('run-skill-enrichment', 'ENRICH_SKILLS_&_HIERARCHY')}
                loading={actionLoading['ENRICH_SKILLS_&_HIERARCHY']}
              />
              <AdminActionButton
                label="UPDATE_REWARD_ADJUSTMENTS"
                onClick={() => runAction('run-reward-adjustment', 'UPDATE_REWARD_ADJUSTMENTS')}
                loading={actionLoading['UPDATE_REWARD_ADJUSTMENTS']}
              />
              <AdminActionButton
                label="RECALCULATE_INTELLIGENCE"
                onClick={() => runAction('run-intelligence-scoring', 'RECALCULATE_INTELLIGENCE')}
                loading={actionLoading['RECALCULATE_INTELLIGENCE']}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

const AdminActionButton = ({ label, onClick, loading }) => (
  <Button
    variant="outlined"
    fullWidth
    onClick={onClick}
    disabled={loading}
    className="admin-action-btn"
    sx={{
      borderColor: '#00F3FF',
      color: '#00F3FF',
      fontFamily: 'Orbitron',
      '&:hover': {
        borderColor: '#00F3FF',
        bgcolor: 'rgba(0, 243, 255, 0.1)',
        boxShadow: '0 0 10px rgba(0, 243, 255, 0.4)'
      }
    }}
  >
    {loading ? <CircularProgress size={24} sx={{ color: '#00F3FF' }} /> : label}
  </Button>
);

export default AdminDashboard;
