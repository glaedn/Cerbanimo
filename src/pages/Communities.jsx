import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import './Communities.css';

const Communities = () => {
  const { user, getAccessTokenSilently } = useAuth0();
  const [communities, setCommunities] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [communityProjects, setCommunityProjects] = useState([]);
  
  const navigate = useNavigate();
  
  // Comprehensive case-insensitive search function
  const matchesSearch = (text, searchTerm) => {
    if (!searchTerm) return true;
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  };

  const fetchCommunities = async () => {
    try {
      const token = await getAccessTokenSilently();
  
      const response = await axios.get('http://localhost:4000/communities', {
        params: { search, page },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('Fetched Communities:', response.data);
    
      // Extract the communities array from the response data
      const communitiesArray = response.data.communities || [];
      
      if (communitiesArray.length === 0) {
        console.log('No communities data returned from API');
      }
      
      // Apply search filter if there's a search term
      const searchTerm = search.trim();
      const filteredCommunities = searchTerm 
        ? communitiesArray.filter(community => {
            // Check if search term matches name or description
            return matchesSearch(community.name || '', searchTerm) || 
                   matchesSearch(community.description || '', searchTerm);
          })
        : communitiesArray;
        
      console.log('Filtered Communities:', filteredCommunities);
      
      // Set the communities state
      setCommunities(filteredCommunities);
    } catch (error) {
      console.error('Failed to fetch communities:', error);
      // Initialize with empty array on error
      setCommunities([]);
    }
  };

  const fetchCommunityProjects = async (communityId) => {
    try {
      const token = await getAccessTokenSilently();
      
      const response = await axios.get(`http://localhost:4000/communities/${communityId}/projects`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    
      console.log('Fetched Community Projects:', response.data);
      setCommunityProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch community projects:', error);
      if (error.response) {
        console.error('Server response:', error.response.data);
        console.error('Server status:', error.response.status);
      }
    }
  };

  const joinCommunity = async (communityId) => {
    try {
      const token = await getAccessTokenSilently();
      
      await axios.post(`http://localhost:4000/communities/${communityId}/join`, 
        { userId: user.sub }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh communities to update member count
      fetchCommunities();
      
    } catch (error) {
      console.error('Failed to join community:', error);
      if (error.response) {
        console.error('Server response:', error.response.data);
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchCommunities();
    }
  }, [user, page, search]);

useEffect(() => {
    console.log('Current communities state:', communities);
}, [communities]);

return (
    <div className="communities-container">
        <h1 className="community-page-title">Discover Communities</h1>

        <div className="search-bar-container">
            <input
                className="search-input"
                type="text"
                placeholder="Search Communities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
            <button
                className="add-community-button"
                onClick={() => window.location.href = '/communitycreation'}
                title="Create New Community"
            >
                +
            </button>
        </div>

        <div className="community-list-wrapper">
            {communities.length > 0 ? (
                communities.map((community) => (
                    <div key={community.id} className="community-card" style={{ border: '1px solid #ccc', margin: '10px 0', padding: '15px' }}>
                        <h2 className="community-title">{community.name}</h2>
                        <p className="community-description">{community.description}</p>
                        <div className="community-tags">
                            {community.interest_tags && community.interest_tags.length > 0 ? (
                                community.interest_tags.map((tag, index) => (
                                    <span key={index} className="tag-chip">{tag}</span>
                                ))
                            ) : (
                                <span className="no-tags">No tags</span>
                            )}
                        </div>
                        <div className="community-stats">
                            <span className="member-count">
                                <i className="fas fa-users"></i> {Array.isArray(community.members) ? community.members.length : 0} members
                            </span>
                        </div>
                        <div className="community-actions">
                            <button
                                className="view-projects-button"
                                onClick={() => {
                                    setSelectedCommunity(community);
                                    fetchCommunityProjects(community.id);
                                  }}
                                >
                                  View Projects
                                </button>
                                <button
                                  className="join-button"
                                  onClick={() => navigate(`/communityhub/${community.id}`)}
                                >
                                  View Community
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="no-communities-message" style={{ padding: '20px', textAlign: 'center' }}>
                            <p>No communities found. Try adjusting your search or create a new community.</p>
                          </div>
                        )}
                      </div>

                      <div className="pagination-container">
                        <button
                          className="pagination-button"
                          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                          disabled={page === 1}
                        >
                          Previous
                        </button>
                        <span className="page-text">Page {page}</span>
                        <button
                          className="pagination-button"
                          onClick={() => setPage((prev) => prev + 1)}
                        >
                          Next
                        </button>
                      </div>

                      {selectedCommunity && (
                        <div className="community-popup-overlay">
                          <div className="community-popup">
                            <h2>Projects in {selectedCommunity.name}</h2>
                            <div className="community-projects-list">
                              {communityProjects.length > 0 ? communityProjects.map((project) => (
                                <div key={project.id} className="project-card">
                                  <h3>{project.name}</h3>
                                  <p>{project.description}</p>
                                  <button
                                    className="open-project-button"
                                    onClick={() => {
                                        navigate(`/visualizer/${project.id}`);
                                    }}
                                >
                                    Open Project
                                </button>
                            </div>
                        )) : <p>No projects in this community yet</p>}
                    </div>
                    <button
                        className="close-popup-button"
                        onClick={() => setSelectedCommunity(null)}
                    >
                        Close
                    </button>
                </div>
            </div>
        )}
    </div>
);
};

export default Communities;