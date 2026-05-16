import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Grid, Container, Paper, Tab, Tabs, Stack, CircularProgress } from '@mui/material';
import CivicIdentityConstellation from '../components/Identity/CivicIdentityConstellation';
import MentorshipLineage from '../components/Identity/MentorshipLineage';
import ImpactRippleMap from '../components/Identity/ImpactRippleMap';
import NarrativePlayback from '../components/Identity/NarrativePlayback';
import CivicMemoryArchive from '../components/Identity/CivicMemoryArchive';
import ChronicleTimeline from '../components/ChronicleTimeline';
import { useIsMobile } from '../hooks/useIsMobile';
import { useNarrativeStore } from '../store/useNarrativeStore';
import { useUserProfile } from '../hooks/useUserProfile';

const NarrativeIdentityHub = () => {
  const { userId: paramId } = useParams();
  const { profile } = useUserProfile();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = React.useState(0);

  const userId = paramId || profile?.id;

  const {
    fetchNarrativeData,
    storyGraph,
    mentorshipLineage,
    impactChains,
    chronicleArcs,
    institutionalMemory,
    playbackEvents,
    loading
  } = useNarrativeStore();

  useEffect(() => {
    if (userId) {
      fetchNarrativeData(userId);
    }
  }, [userId, fetchNarrativeData]);

  if (loading && !chronicleArcs.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#0A0A2E' }}>
        <CircularProgress sx={{ color: '#00f3ff' }} />
      </Box>
    );
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#0A0A2E',
      color: '#fff',
      pt: isMobile ? 10 : 4,
      pb: 10,
      background: 'radial-gradient(circle at 50% 50%, #1a1a4a 0%, #0a0a2e 100%)'
    }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 6, textAlign: 'center' }}>
          <Typography variant="h3" sx={{ fontFamily: 'Orbitron', color: '#00f3ff', textShadow: '0 0 20px #00f3ff', mb: 1 }}>
            NARRATIVE_IDENTITY_HUB
          </Typography>
          <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.6)', letterSpacing: 4 }}>
            TRANSFORMING_CONTRIBUTION_INTO_CIVIC_MYTHOLOGY
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {/* Left Column: Visualizations */}
          <Grid item xs={12} lg={7}>
            <Paper sx={{ bgcolor: 'rgba(0,0,0,0.4)', p: 3, border: '1px solid rgba(0, 243, 255, 0.2)', height: '100%' }}>
              <Tabs
                value={activeTab}
                onChange={(_, val) => setActiveTab(val)}
                sx={{
                  mb: 3,
                  '& .MuiTab-root': { color: 'rgba(255,255,255,0.5)', fontFamily: 'Orbitron' },
                  '& .Mui-selected': { color: '#00f3ff !important' },
                  '& .MuiTabs-indicator': { bgcolor: '#00f3ff' }
                }}
              >
                <Tab label="CONSTELLATION" />
                <Tab label="LINEAGE" />
                <Tab label="PROPAGATION" />
              </Tabs>

              <Box sx={{ height: '500px', display: activeTab === 0 ? 'block' : 'none' }}>
                <CivicIdentityConstellation data={storyGraph} width={700} height={500} />
              </Box>

              <Box sx={{ display: activeTab === 1 ? 'block' : 'none' }}>
                <MentorshipLineage data={mentorshipLineage} />
              </Box>

              <Box sx={{ display: activeTab === 2 ? 'block' : 'none' }}>
                <ImpactRippleMap data={impactChains} />
              </Box>
            </Paper>
          </Grid>

          {/* Right Column: Narrative Arcs & Archive */}
          <Grid item xs={12} lg={5}>
            <Stack spacing={4}>
              <NarrativePlayback events={playbackEvents} />
              <CivicMemoryArchive data={institutionalMemory} />
            </Stack>
          </Grid>

          {/* Bottom Row: Layered Chronicle */}
          <Grid item xs={12}>
            <Paper sx={{ bgcolor: 'rgba(0,0,0,0.4)', p: 4, border: '1px solid rgba(0, 243, 255, 0.2)' }}>
               {chronicleArcs.map(arc => (
                 <Box key={arc.id} sx={{ mb: 6 }}>
                    <Typography variant="h6" sx={{ color: '#ff5ca2', fontFamily: 'Orbitron', mb: 2 }}>
                      {arc.label} [{arc.type}]
                    </Typography>
                    <ChronicleTimeline stories={arc.stories} />
                 </Box>
               ))}
               {chronicleArcs.length === 0 && (
                 <Typography sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', py: 4 }}>
                   NO_NARRATIVE_ARCS_DETECTED
                 </Typography>
               )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default NarrativeIdentityHub;
