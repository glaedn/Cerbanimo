import * as React from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, TextField, InputAdornment, List, ListItem, ListItemText, Pagination } from '@mui/material';
import { Search } from 'lucide-react';

const ProjectOverviewPage = () => {
    const [projects, setProjects] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await axios.get(`http://localhost:4000/projects`, {
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
                    <ListItem key={project.id} listItemButton component="a" href={`/project/${project.id}`}>
                        <ListItemText primary={project.name} secondary={project.description} />
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
