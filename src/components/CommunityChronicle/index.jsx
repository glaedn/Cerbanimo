import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import InfiniteScroll from 'react-infinite-scroll-component';
import { CircularProgress, TextField, Chip, Grid, Typography } from '@mui/material';
import FeaturedCarousel from './FeaturedCarousel.jsx';
import ChronicleCard from './ChronicleCard.jsx';
import { useAuth0 } from '@auth0/auth0-react';
import './CommunityChronicle.css';

const CommunityChronicle = ({ communityId }) => {
  const [chronicles, setChronicles] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 12;
  const { user, getAccessTokenSilently } = useAuth0();

  const fetchChronicles = useCallback(async (reset = false) => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/storyChronicles/community/${communityId}/chronicle-feed`,
        {
          headers: {
        Authorization: `Bearer ${token}`,
          },
        }
      );
      let data = response.data || [];

      // Optional filtering (client-side for now)
      if (searchTerm) {
        data = data.filter(entry =>
          entry.reflection.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (selectedTags.length > 0) {
        data = data.filter(entry =>
          selectedTags.every(tag => entry.tags.includes(tag))
        );
      }

      const paged = data.slice(reset ? 0 : page * pageSize, (page + 1) * pageSize);
      setChronicles(prev => reset ? paged : [...prev, ...paged]);
      setHasMore(paged.length === pageSize);
      if (reset) setPage(1); else setPage(prev => prev + 1);

      // Extract featured (e.g., those with most endorsements or random pick)
      if (reset) setFeatured(data.slice(0, 5)); // simplistic featured logic

    } catch (err) {
      console.error('Error fetching community chronicle feed:', err);
    }
  }, [communityId, searchTerm, selectedTags, page]);

  useEffect(() => {
    fetchChronicles(true);
  }, [searchTerm, selectedTags]);

  return (
    <div className="chronicle-container">
      <FeaturedCarousel items={featured} />

      <div className="chronicle-controls">
        <TextField
          label="Search Reflections"
          variant="outlined"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <div className="tag-filters">
          {['design', 'dev', 'research', 'strategy', 'testing'].map(tag => (
            <Chip
              key={tag}
              label={tag}
              onClick={() =>
                setSelectedTags(prev =>
                  prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                )
              }
              color={selectedTags.includes(tag) ? 'primary' : 'default'}
              variant="outlined"
              clickable
              style={{ margin: '4px' }}
            />
          ))}
        </div>
      </div>

      <InfiniteScroll
        dataLength={chronicles.length}
        next={() => fetchChronicles()}
        hasMore={hasMore}
        loader={<CircularProgress />}
        scrollThreshold={0.95}
      >
        <Grid container spacing={2}>
          {chronicles.map(entry => (
            <Grid item xs={12} sm={6} md={4} key={entry.id}>
              <ChronicleCard node={entry} />
            </Grid>
          ))}
        </Grid>
      </InfiniteScroll>
    </div>
  );
};

export default CommunityChronicle;
