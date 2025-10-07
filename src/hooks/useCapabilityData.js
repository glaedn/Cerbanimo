import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

const useCapabilityData = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [allCapabilities, setAllCapabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getToken = async () => {
    try {
      return await getAccessTokenSilently({
        audience: import.meta.env.VITE_BACKEND_URL, // Ensure this matches your Auth0 API audience
        scope: 'openid profile email', // Adjust scopes as needed
      });
    } catch (e) {
      console.error('Error getting access token in useCapabilityData', e);
      throw e;
    }
  };

  useEffect(() => {
    const fetchAllCapabilities = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        // Optionally set an error or specific state if user is not authenticated
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const token = await getToken();
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/capabilities/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        // Assuming response.data is the array of all capability objects
        // Each capability object might look like: { id, name, category, parent_capability_id, description, ... }
        setAllCapabilities(Array.isArray(response.data) ? response.data : []);
        
      } catch (err) {
        console.error('Error fetching all capabilities:', err.response?.data || err.message);
        setError(err.response?.data?.error || err.message || 'Failed to fetch all capabilities');
        setAllCapabilities([]); // Clear capabilities on error
      } finally {
        setLoading(false);
      }
    };

    fetchAllCapabilities();
  }, [isAuthenticated, getAccessTokenSilently]); // Dependencies

  return { allCapabilities, loading, error };
};

export default useCapabilityData;
