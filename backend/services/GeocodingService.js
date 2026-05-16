import fetch from 'node-fetch';

class GeocodingService {
  constructor() {
    this.baseUrl = 'https://nominatim.openstreetmap.org';
    this.userAgent = 'Cerbanimo-Civic-Metabolism/1.0';
  }

  /**
   * Search for coordinates and address details by query string.
   */
  async search(query) {
    if (!query) return [];

    try {
      const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`;
      const response = await fetch(url, {
        headers: { 'User-Agent': this.userAgent }
      });

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.map(item => ({
        displayName: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        address: {
          city: item.address.city || item.address.town || item.address.village || item.address.suburb,
          state: item.address.state,
          country: item.address.country,
          region: item.address.region || item.address.county
        }
      }));
    } catch (err) {
      console.error('GeocodingService: Search failed', err);
      return [];
    }
  }

  /**
   * Get address details from coordinates.
   */
  async reverse(lat, lon) {
    try {
      const url = `${this.baseUrl}/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
      const response = await fetch(url, {
        headers: { 'User-Agent': this.userAgent }
      });

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.statusText}`);
      }

      const item = await response.json();
      return {
        displayName: item.display_name,
        address: {
          city: item.address.city || item.address.town || item.address.village || item.address.suburb,
          state: item.address.state,
          country: item.address.country,
          region: item.address.region || item.address.county
        }
      };
    } catch (err) {
      console.error('GeocodingService: Reverse geocoding failed', err);
      return null;
    }
  }
}

export default new GeocodingService();
