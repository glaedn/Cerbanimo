import axios from 'axios';

const API_BASE = import.meta.env.VITE_BACKEND_URL;

class SpatialDataService {
  async getTacticalOverlay(token = null) {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API_BASE}/spatial-ops/tactical-overlay`, { headers });
      return res.data;
    } catch (err) {
      console.error('Error fetching tactical overlay:', err);
      return { crisis: { enabled: false }, missions: [], urgentNeeds: [] };
    }
  }

  async getNearbyCapabilities(lat, lon, radius = 5000, token = null) {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API_BASE}/spatial-ops/nearby-capabilities`, {
        params: { lat, lon, radius },
        headers
      });
      return res.data;
    } catch (err) {
      console.error('Error fetching nearby capabilities:', err);
      return [];
    }
  }

  async getRegionalHealth(regionId, token = null) {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API_BASE}/spatial-ops/regional-health/${regionId}`, { headers });
      return res.data;
    } catch (err) {
      console.error('Error fetching regional health:', err);
      return null;
    }
  }

  async getActiveRoutes(token = null) {
      try {
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          const res = await axios.get(`${API_BASE}/spatial-ops/active-routes`, { headers });
          return res.data;
      } catch (err) {
          console.error('Error fetching active routes:', err);
          return [];
      }
  }
}

export default new SpatialDataService();
