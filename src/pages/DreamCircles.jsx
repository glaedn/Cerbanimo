import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import './DreamCircles.css';
import theme from '../styles/theme';

const DreamCircles = () => {
  const { user, getAccessTokenSilently } = useAuth0();
  const [dreamCircles, setDreamCircles] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedDreamCircle, setSelectedDreamCircle] = useState(null);
  const [dreamCircleProjects, setDreamCircleProjects] = useState([]);
  
  const navigate = useNavigate();
  
  const matchesSearch = (text, searchTerm) => {
    if (!searchTerm) return true;
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  };

  const fetchDreamCircles = async () => {
    try {
      const token = await getAccessTokenSilently();
  
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities`, {
        params: { search, page },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('Fetched Dream Circles:', response.data);
    
      const dreamCirclesArray = response.data.communities || [];
      
      if (dreamCirclesArray.length === 0) {
        console.log('No dream circle data returned from API');
      }
      
      const searchTerm = search.trim();
      const filteredDreamCircles = searchTerm
        ? dreamCirclesArray.filter(dreamCircle => {
            return matchesSearch(dreamCircle.name || '', searchTerm) ||
                   matchesSearch(dreamCircle.description || '', searchTerm);
          })
        : dreamCirclesArray;
        
      console.log('Filtered Dream Circles:', filteredDreamCircles);
      
      setDreamCircles(filteredDreamCircles);
    } catch (error) {
      console.error(`Failed to fetch ${theme.terminology.community_plural}:`, error);
      setDreamCircles([]);
    }
  };

  const fetchDreamCircleProjects = async (dreamCircleId) => {
    try {
      const token = await getAccessTokenSilently();
      
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities/${dreamCircleId}/projects`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    
      console.log(`Fetched ${theme.terminology.community} ${theme.terminology.project_plural}:`, response.data);
      setDreamCircleProjects(response.data);
    } catch (error) {
      console.error(`Failed to fetch ${theme.terminology.community} ${theme.terminology.project_plural}:`, error);
      if (error.response) {
        console.error('Server response:', error.response.data);
        console.error('Server status:', error.response.status);
      }
    }
  };

  const joinDreamCircle = async (dreamCircleId) => {
    try {
      const token = await getAccessTokenSilently();
      
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/communities/${dreamCircleId}/join`,
        { userId: user.sub }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchDreamCircles();
      
    } catch (error) {
      console.error(`Failed to join ${theme.terminology.community}:`, error);
      if (error.response) {
        console.error('Server response:', error.response.data);
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchDreamCircles();
    }
  }, [user, page, search]);

useEffect(() => {
    console.log('Current dream circles state:', dreamCircles);
}, [dreamCircles]);

return (
    <div className="communities-container">
        <h1 className="community-page-title">Discover {theme.terminology.community_plural}</h1>

        <div className="search-bar-container">
            <input
                className="search-input"
                type="text"
                placeholder={`Search ${theme.terminology.community_plural}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
            <button
                className="add-community-button"
                onClick={() => window.location.href = '/createdreamcircle'}
                title={`Create New ${theme.terminology.community}`}
            >
                +
            </button>
        </div>

        <div className="community-list-wrapper">
            {dreamCircles.length > 0 ? (
                dreamCircles.map((dreamCircle) => (
                    <div key={dreamCircle.id} className="community-card" style={{ border: '1px solid #ccc', margin: '10px 0', padding: '15px' }}>
                        <h2 className="community-title">{dreamCircle.name}</h2>
                        <p className="community-description">{dreamCircle.description}</p>
                        <div className="community-tags">
                            {dreamCircle.interest_tags && dreamCircle.interest_tags.length > 0 ? (
                                dreamCircle.interest_tags.map((tag, index) => (
                                    <span key={index} className="tag-chip">{tag}</span>
                                ))
                            ) : (
                                <span className="no-tags">No tags</span>
                            )}
                        </div>
                        <div className="community-stats">
                            <span className="member-count">
                                <i className="fas fa-users"></i> {Array.isArray(dreamCircle.members) ? dreamCircle.members.length : 0} dreamers
                            </span>
                        </div>
                        <div className="community-actions">
                                <button
                                  className="join-button"
                                  onClick={() => navigate(`/dream-circle/${dreamCircle.id}`)}
                                >
                                  View {theme.terminology.community}
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="no-communities-message" style={{ padding: '20px', textAlign: 'center' }}>
                            <p>No {theme.terminology.community_plural} found. Try adjusting your search or create a new {theme.terminology.community}.</p>
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

                      {selectedDreamCircle && (
                        <div className="community-popup-overlay">
                          <div className="community-popup">
                            <h2>{theme.terminology.project_plural} in {selectedDreamCircle.name}</h2>
                            <div className="community-projects-list">
                              {dreamCircleProjects.length > 0 ? dreamCircleProjects.map((project) => (
                                <div key={project.id} className="project-card">
                                  <h3>{project.name}</h3>
                                  <p>{project.description}</p>
                                  <button
                                    className="open-project-button"
                                    onClick={() => {
                                        navigate(`/visualizer/${project.id}`);
                                    }}
                                >
                                    Open {theme.terminology.project}
                                </button>
                            </div>
                        )) : <p>No {theme.terminology.project_plural} in this {theme.terminology.community} yet</p>}
                    </div>
                    <button
                        className="close-popup-button"
                        onClick={() => setSelectedDreamCircle(null)}
                    >
                        Close
                    </button>
                </div>
            </div>
        )}
    </div>
);
};

export default DreamCircles;