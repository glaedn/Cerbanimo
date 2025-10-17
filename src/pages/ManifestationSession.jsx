import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, Typography, Paper, List, ListItem, ListItemText } from '@mui/material';
import ForceGraph2D from 'react-force-graph-2d';
import './ManifestationSession.css';

const ManifestationSession = () => {
    const { sessionId } = useParams();
    const { getAccessTokenSilently } = useAuth0();
    const [session, setSession] = useState(null);
    const [timer, setTimer] = useState(1800); // 30 minutes in seconds
    const [summary, setSummary] = useState('');
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [intentionText, setIntentionText] = useState('');
    const containerRef = useRef();
    const { user } = useAuth0();

    const [selectedNode, setSelectedNode] = useState(null);

    const handleNodeClick = (node) => {
        if (node.type === 'intention' && node.userId !== user.sub) {
            setSelectedNode(node);
        } else {
            setSelectedNode(null);
        }
    };

    const handleResonate = async () => {
        if (!selectedNode) return;

        try {
            const token = await getAccessTokenSilently();
            await axios.post(
                `${import.meta.env.VITE_BACKEND_URL}/manifestation-sessions/${sessionId}/resonance`,
                {
                    from_user_id: user.sub,
                    to_user_id: selectedNode.userId,
                    intention_id: selectedNode.id,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Optimistically update graph
            const newLink = {
                source: user.sub,
                target: selectedNode.userId,
            };
            setGraphData(prevData => ({
                ...prevData,
                links: [...prevData.links, newLink],
            }));

            setSelectedNode(null);
        } catch (error) {
            console.error('Error recording resonance:', error);
        }
    };

    const handleIntentionSubmit = async (e) => {
        e.preventDefault();
        if (!intentionText.trim()) return;

        try {
            const token = await getAccessTokenSilently();
            const response = await axios.post(
                `${import.meta.env.VITE_BACKEND_URL}/manifestation-sessions/${sessionId}/events`,
                {
                    type: 'intention_submission',
                    payload: { text: intentionText },
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Optimistically update graph
            const newNode = {
                id: response.data.id, // Assuming backend returns the new event with an id
                name: intentionText,
                type: 'intention',
                userId: user.sub,
            };
            setGraphData(prevData => ({
                ...prevData,
                nodes: [...prevData.nodes, newNode],
            }));

            setIntentionText('');
        } catch (error) {
            console.error('Error submitting intention:', error);
        }
    };

    const transformDataForGraph = (sessionData) => {
        if (!sessionData) return { nodes: [], links: [] };

        const userNodes = sessionData.participants?.map(p => ({
            id: p.user_id,
            name: p.username || 'Anonymous',
            type: 'user'
        })) || [];

        const intentionNodes = sessionData.events
            ?.filter(e => e.type === 'intention_submission')
            .map(e => ({
                id: e.id,
                name: e.payload.text,
                type: 'intention',
                userId: e.user_id
            })) || [];

        const nodes = [...userNodes, ...intentionNodes];

        const links = sessionData.resonance_events?.map(r => ({
            source: r.from_user_id,
            target: r.to_user_id,
        })) || [];

        return { nodes, links };
    };

    useEffect(() => {
        const fetchSession = async () => {
            if (sessionId) {
                try {
                    const token = await getAccessTokenSilently();
                    const response = await axios.get(
                        `${import.meta.env.VITE_BACKEND_URL}/manifestation-sessions/${sessionId}`, {
                            headers: { Authorization: `Bearer ${token}` },
                        }
                    );
                    setSession(response.data);
                    const transformedData = transformDataForGraph(response.data);
                    setGraphData(transformedData);
                } catch (error) {
                    console.error('Error fetching session:', error);
                }
            }
        };

        fetchSession();
    }, [sessionId, getAccessTokenSilently]);

    useEffect(() => {
        if (containerRef.current) {
            setDimensions({
                width: containerRef.current.offsetWidth,
                height: containerRef.current.offsetHeight,
            });
        }
    }, []);

    useEffect(() => {
        if (session && session.status === 'active' && timer > 0) {
            const interval = setInterval(() => {
                setTimer(prevTimer => prevTimer - 1);
            }, 1000);
            return () => clearInterval(interval);
        } else if (timer === 0) {
            handleEndSession();
        }
    }, [session, timer]);

  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  const handleEndSession = async () => {
    if (!session) return;
    setIsSummaryLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/manifestation-sessions/${session.id}/end`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSummary(response.data.manifestation_summary);
      setSession(prev => ({ ...prev, status: 'completed' }));
    } catch (error) {
      console.error('Error ending session:', error);
    } finally {
        setIsSummaryLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  if (!session) {
    return <div>Loading session...</div>;
  }

    return (
        <Box className="manifestation-session-container" sx={{ padding: 3 }}>
            <Paper elevation={3} sx={{ padding: 2, marginBottom: 2 }}>
                <Typography variant="h4" gutterBottom>🌠 {session.title || 'Group Manifestation'} 🌠</Typography>
                <Typography variant="body1" gutterBottom>{session.description}</Typography>
                <Box className="session-stats" sx={{ display: 'flex', justifyContent: 'space-around', marginBottom: 2 }}>
                    <Typography>Timer: {formatTime(timer)}</Typography>
                    <Typography>Participants: {session.participants?.length || 0}</Typography>
                    <Typography>Active Resonances: {session.resonance_events?.length || 0}</Typography>
                </Box>
            </Paper>

            <Box ref={containerRef} className="live-constellation" sx={{
                height: '500px',
                border: '1px solid #ccc',
                marginBottom: 2,
                position: 'relative',
            }}>
                <ForceGraph2D
                    graphData={graphData}
                    width={dimensions.width}
                    height={dimensions.height}
                    nodeLabel="name"
                    nodeCanvasObject={(node, ctx, globalScale) => {
                        const label = node.name;
                        const fontSize = 12 / globalScale;
                        ctx.font = `${fontSize}px Sans-Serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = node.type === 'user' ? 'blue' : 'green';
                        ctx.fillText(label, node.x, node.y + 10);
                    }}
                    linkDirectionalParticles={2}
                    linkDirectionalParticleWidth={2}
                    onNodeClick={handleNodeClick}
                />
            </Box>

            <Paper elevation={3} sx={{ padding: 2, marginBottom: 2, display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div>
                    <Typography variant="h6">Submit Your Intention</Typography>
                    <form onSubmit={handleIntentionSubmit}>
                        <input
                            type="text"
                            value={intentionText}
                            onChange={(e) => setIntentionText(e.target.value)}
                            placeholder="Declare your intention..."
                            style={{ width: '300px', padding: '8px', marginRight: '10px' }}
                        />
                        <button type="submit">[ SUBMIT ]</button>
                    </form>
                </div>
                {selectedNode && (
                    <div>
                        <Typography variant="h6">Resonate with Intention</Typography>
                        <Typography>Selected: "{selectedNode.name}"</Typography>
                        <button onClick={handleResonate}>[ RESONATE ]</button>
                    </div>
                )}
            </Paper>

            <Paper elevation={3} sx={{ padding: 2, marginBottom: 2 }}>
                <Typography variant="h6">Participants</Typography>
                <List>
                    {/* Placeholder for participant list */}
                </List>
            </Paper>

            {isSummaryLoading && <Typography>Generating summary...</Typography>}
            {summary && !isSummaryLoading && (
                <Paper elevation={3} sx={{ padding: 2, marginTop: 2 }}>
                    <Typography variant="h5">Manifestation Summary</Typography>
                    <Typography>{summary}</Typography>
                </Paper>
            )}
             <div className="session-controls">
                <button onClick={handleEndSession} disabled={session.status === 'completed'}>
                    [ END SESSION ]
                </button>
            </div>
        </Box>
    );
};

export default ManifestationSession;