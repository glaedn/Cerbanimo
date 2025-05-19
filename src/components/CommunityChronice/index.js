import React, { useState, useEffect } from 'react';
import FeaturedCarousel from './FeaturedCarousel';
import SearchBar from './SearchBar';
import TagFilters from './TagFilters';
import ChronicleGrid from './ChronicleGrid';

const CommunityChronicle = ({ fetchChronicles, fetchFeatured, availableTags }) => {
  const [chronicles, setChronicles] = useState([]);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    fetchFeatured().then(setFeatured);
  }, []);

  useEffect(() => {
    setPage(0);
    setChronicles([]);
    setHasMore(true);
  }, [search, tag]);

  const loadMore = () => {
    fetchChronicles({ search, tag, page }).then(newItems => {
      setChronicles(prev => [...prev, ...newItems]);
      setHasMore(newItems.length > 0);
      setPage(prev => prev + 1);
    });
  };

  return (
    <div>
      <FeaturedCarousel featured={featured} />
      <SearchBar search={search} setSearch={setSearch} />
      <TagFilters tags={availableTags} selected={tag} setSelected={setTag} />
      <ChronicleGrid items={chronicles} loadMore={loadMore} hasMore={hasMore} />
    </div>
  );
};

export default CommunityChronicle;
