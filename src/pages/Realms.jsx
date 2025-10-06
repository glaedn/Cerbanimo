import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import './Realms.css';

const Realms = () => {
  const { user, getAccessTokenSilently } = useAuth0();
  const [realms, setRealms] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const navigate = useNavigate();

  // Comprehensive case-insensitive search function
  const matchesSearch = (text, searchTerm) => {
    if (!searchTerm) return true;
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  };

  const fetchRealms = async () => {
    try {
      const token = await getAccessTokenSilently();

      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/realms`, {
        params: { search, page },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('Fetched Realms:', response.data);

      // Extract the realms array from the response data
      const realmsArray = response.data.realms || [];

      if (realmsArray.length === 0) {
        console.log('No realms data returned from API');
      }

      // Apply search filter if there's a search term
      const searchTerm = search.trim();
      const filteredRealms = searchTerm
        ? realmsArray.filter(realm => {
            // Check if search term matches name or description
            return matchesSearch(realm.name || '', searchTerm) ||
                   matchesSearch(realm.description || '', searchTerm);
          })
        : realmsArray;

      console.log('Filtered Realms:', filteredRealms);

      // Set the realms state
      setRealms(filteredRealms);
    } catch (error) {
      console.error('Failed to fetch realms:', error);
      // Initialize with empty array on error
      setRealms([]);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRealms();
    }
  }, [user, page, search]);

useEffect(() => {
    console.log('Current realms state:', realms);
}, [realms]);

return (
    <div className="realms-container">
        <h1 className="realm-page-title">Discover Realms</h1>

        <div className="search-bar-container">
            <input
                className="search-input"
                type="text"
                placeholder="Search Realms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
            <button
                className="add-realm-button"
                onClick={() => navigate('/form-new-realm')}
                title="Form New Realm"
            >
                +
            </button>
        </div>

        <div className="realm-list-wrapper">
            {realms.length > 0 ? (
                realms.map((realm) => (
                    <div key={realm.id} className="realm-card" style={{ border: '1px solid #ccc', margin: '10px 0', padding: '15px' }}>
                        <h2 className="realm-title">{realm.name}</h2>
                        <p className="realm-description">{realm.description}</p>
                        <div className="realm-tags">
                            {realm.interest_tags && realm.interest_tags.length > 0 ? (
                                realm.interest_tags.map((tag, index) => (
                                    <span key={index} className="tag-chip">{tag}</span>
                                ))
                            ) : (
                                <span className="no-tags">No tags</span>
                            )}
                        </div>
                        <div className="realm-stats">
                            <span className="member-count">
                                <i className="fas fa-users"></i> {Array.isArray(realm.members) ? realm.members.length : 0} members
                            </span>
                        </div>
                        <div className="realm-actions">
                                <button
                                  className="join-button"
                                  onClick={() => navigate(`/realm/${realm.id}`)}
                                >
                                  View Realm
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="no-realms-message" style={{ padding: '20px', textAlign: 'center' }}>
                            <p>No realms found. Try adjusting your search or form a new realm.</p>
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
    </div>
);
};

export default Realms;