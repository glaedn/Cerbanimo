import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Avatar, List, ListItem, ListItemAvatar, ListItemText, Divider, Paper } from '@mui/material';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

const NeedComments = ({ needId }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { getAccessTokenSilently } = useAuth0();

    useEffect(() => {
        const fetchComments = async () => {
            try {
                const token = await getAccessTokenSilently();
                const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/need-comments/${needId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setComments(response.data);
            } catch (error) {
                console.error('Failed to fetch comments:', error);
            }
        };

        if (needId) {
            fetchComments();
        }
    }, [needId, getAccessTokenSilently]);

    const handlePostComment = async () => {
        if (!newComment.trim()) return;
        setIsLoading(true);

        try {
            const token = await getAccessTokenSilently();
            const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/need-comments`, {
                need_id: needId,
                content: newComment
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setComments([...comments, response.data]);
            setNewComment('');
        } catch (error) {
            console.error('Failed to post comment:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ color: '#00F3FF', mb: 2, fontFamily: 'Orbitron' }}>
                Coordination Thread
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'rgba(10, 10, 46, 0.4)', border: '1px solid rgba(0, 243, 255, 0.2)' }}>
                <List sx={{ maxHeight: '300px', overflowY: 'auto', mb: 2 }}>
                    {comments.map((comment, index) => (
                        <React.Fragment key={comment.id}>
                            <ListItem alignItems="flex-start">
                                <ListItemAvatar>
                                    <Avatar
                                        src={`${import.meta.env.VITE_BACKEND_URL}${comment.profile_picture}`}
                                        alt={comment.username}
                                    />
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Typography sx={{ color: '#FF5CA2', fontWeight: 'bold' }}>
                                            {comment.username}
                                        </Typography>
                                    }
                                    secondary={
                                        <Typography sx={{ color: 'white' }}>
                                            {comment.content}
                                        </Typography>
                                    }
                                />
                            </ListItem>
                            {index < comments.length - 1 && <Divider variant="inset" component="li" sx={{ bgcolor: 'rgba(0, 243, 255, 0.1)' }} />}
                        </React.Fragment>
                    ))}
                    {comments.length === 0 && (
                        <Typography sx={{ color: 'gray', textAlign: 'center', py: 2 }}>
                            No messages yet. Start the coordination!
                        </Typography>
                    )}
                </List>
                <Box display="flex" gap={1}>
                    <TextField
                        fullWidth
                        size="small"
                        variant="outlined"
                        placeholder="Type a message..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handlePostComment()}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                color: 'white',
                                '& fieldset': { borderColor: 'rgba(0, 243, 255, 0.5)' },
                                '&:hover fieldset': { borderColor: '#00F3FF' },
                            }
                        }}
                    />
                    <Button
                        variant="contained"
                        onClick={handlePostComment}
                        disabled={isLoading || !newComment.trim()}
                        sx={{ bgcolor: '#00F3FF', color: 'black', fontWeight: 'bold' }}
                    >
                        SEND
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
};

export default NeedComments;
