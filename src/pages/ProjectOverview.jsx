import * as React from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, TextField, InputAdornment, List, ListItem, ListItemText, Pagination, Paper } from '@mui/material';
import { Search } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

const ProjectOverviewPage = () => {
    const isMobile = useIsMobile();
    const [projects, setProjects] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/projects`, {
                    params: {
                        search: searchTerm,
                        page: page,
                    }
                });
                setProjects(response.data.projects);
                setTotalPages(response.data.totalPages);
            } catch (error) {
                console.error('Failed to fetch projects:', error);
            }
        };
        fetchProjects();
    }, [searchTerm, page]);

    return (
        <Box className={`project-overview-container ${isMobile ? 'mobile-overview' : ''}`} sx={{ p: isMobile ? 2 : 4, pb: isMobile ? 12 : 4 }}>
            <Typography variant={isMobile ? "h5" : "h4"} className="project-title" sx={{ fontFamily: 'Orbitron', mb: 3, color: '#00f3ff' }}>
                {isMobile ? 'PROJECT_DATABANK' : 'Project Overview'}
            </Typography>

            <TextField
                fullWidth
                placeholder="Search Projects..."
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <Search size={20} color="#00f3ff" />
                        </InputAdornment>
                    ),
                    sx: { height: isMobile ? '56px' : '48px', color: '#fff', '& fieldset': { borderColor: 'rgba(0,243,255,0.2)' } }
                }}
                sx={{ mb: 4 }}
            />

            <Paper sx={{ bgcolor: 'rgba(10, 10, 46, 0.8)', border: '1px solid rgba(0, 243, 255, 0.2)', borderRadius: 2 }}>
                <List className="project-list" sx={{ p: 0 }}>
                    {projects.map((project) => (
                        <ListItem
                            key={project.id}
                            divider
                            component="a"
                            href={`/project/${project.id}`}
                            sx={{
                                textDecoration: 'none',
                                color: 'inherit',
                                p: isMobile ? 2 : 3,
                                minHeight: '64px',
                                borderColor: 'rgba(0, 243, 255, 0.1)',
                                '&:hover': { bgcolor: 'rgba(0, 243, 255, 0.05)' }
                            }}
                        >
                            <ListItemText
                                primary={project.name.toUpperCase()}
                                secondary={project.description}
                                primaryTypographyProps={{ sx: { color: '#00f3ff', fontFamily: 'Orbitron', fontSize: isMobile ? '0.9rem' : '1.1rem' } }}
                                secondaryTypographyProps={{ sx: { color: 'rgba(255,255,255,0.6)', mt: 0.5, fontSize: isMobile ? '0.75rem' : '0.875rem' } }}
                            />
                        </ListItem>
                    ))}
                </List>
            </Paper>

            <Box display="flex" justifyContent="center" mt={4}>
                <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(e, value) => setPage(value)}
                    className="pagination"
                    sx={{
                        '& .MuiPaginationItem-root': {
                            color: '#00f3ff',
                            borderColor: 'rgba(0, 243, 255, 0.3)',
                            minHeight: isMobile ? '44px' : '32px',
                            minWidth: isMobile ? '44px' : '32px'
                        }
                    }}
                />
            </Box>
        </Box>
    );
};

export default ProjectOverviewPage;
