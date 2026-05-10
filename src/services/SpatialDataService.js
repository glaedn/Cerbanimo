import axios from 'axios';

const API_BASE = import.meta.env.VITE_BACKEND_URL;

class SpatialDataService {
  async getTacticalOverlay() {
    try {
      const res = await axios.get(`${API_BASE}/spatial-ops/tactical-overlay`);
      return res.data;
    } catch (err) {
      console.error('Error fetching tactical overlay:', err);
      return { crisis: { enabled: false }, missions: [], urgentNeeds: [] };
    }
  }

  async getNearbyCapabilities(lat, lon, radius = 5000) {
    try {
      const res = await axios.get(`${API_BASE}/spatial-ops/nearby-capabilities`, {
        params: { lat, lon, radius }
      });
      return res.data;
    } catch (err) {
      console.error('Error fetching nearby capabilities:', err);
      return [];
    }
  }

  async getRegionalHealth(regionId) {
    try {
      const res = await axios.get(`${API_BASE}/spatial-ops/regional-health/${regionId}`);
      return res.data;
    } catch (err) {
      console.error('Error fetching regional health:', err);
      return null;
    }
  }

  async getActiveRoutes() {
      // Assuming a generic endpoint for all active routes for now, or filtered by user
      try {
          const res = await axios.get(`${API_BASE}/spatial-ops/active-routes`);
          return res.data;
      } catch (err) {
          console.error('Error fetching active routes:', err);
          return [];
      }
  }
}

export default new SpatialDataService();
