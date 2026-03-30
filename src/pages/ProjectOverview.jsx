import * as React from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, TextField, InputAdornment, List, ListItem, ListItemText, Pagination, LinearProgress, Chip } from '@mui/material';
import { Search } from 'lucide-react';

const ProjectOverviewPage = () => {
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
        <Box className="project-overview-container">
            <Typography variant="h4" className="project-title">Project Overview</Typography>

            <TextField
                placeholder="Search Projects"
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <Search />
                        </InputAdornment>
                    ),
                }}
                className="search-bar"
            />

            <List className="project-list">
                {projects.map((project) => (
                    <ListItem key={project.id} listItemButton component="a" href={`/project/${project.id}`} sx={{ display: 'block', mb: 2, border: '1px solid rgba(255,255,255,0.1)', p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <ListItemText primary={project.name} secondary={project.description} />
                            <Box sx={{ width: 150, ml: 2 }}>
                                <Typography variant="caption" color="textSecondary">HEALTH SCORE: {project.health_score || 0}%</Typography>
                                <LinearProgress
                                    variant="determinate"
                                    value={project.health_score || 0}
                                    color={project.health_score > 70 ? 'success' : project.health_score > 30 ? 'warning' : 'error'}
                                    sx={{ height: 8, borderRadius: 5 }}
                                />
                            </Box>
                        </Box>
                        <Box sx={{ mt: 1 }}>
                            {project.status === 'decaying' && (
                                <Chip label="DECAYING" size="small" color="error" sx={{ mr: 1 }} />
                            )}
                            {project.status === 'revived' && (
                                <Chip label="REVIVED" size="small" color="primary" sx={{ mr: 1 }} />
                            )}
                            <Chip label={`STATUS: ${project.status || 'ACTIVE'}`} size="small" variant="outlined" />
                        </Box>
                    </ListItem>
                ))}
            </List>

            <Pagination
                count={totalPages}
                page={page}
                onChange={(e, value) => setPage(value)}
                className="pagination"
            />
        </Box>
    );
};

export default ProjectOverviewPage;
