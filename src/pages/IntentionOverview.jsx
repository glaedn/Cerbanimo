import * as React from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, TextField, InputAdornment, List, ListItem, ListItemText, Pagination } from '@mui/material';
import { Search } from 'lucide-react';

const IntentionOverviewPage = () => {
    const [intentions, setIntentions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        const fetchIntentions = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/intentions`, {
                    params: {
                        search: searchTerm,
                        page: page,
                    }
                });
                setIntentions(response.data.intentions);
                setTotalPages(response.data.totalPages);
            } catch (error) {
                console.error('Failed to fetch intentions:', error);
            }
        };
        fetchIntentions();
    }, [searchTerm, page]);

    return (
        <Box className="intention-overview-container">
            <Typography variant="h4" className="intention-title">Intention Overview</Typography>

            <TextField
                placeholder="Search Intentions"
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

            <List className="intention-list">
                {intentions.map((intention) => (
                    <ListItem key={intention.id} listItemButton component="a" href={`/intention/${intention.id}`}>
                        <ListItemText primary={intention.name} secondary={intention.description} />
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

export default IntentionOverviewPage;