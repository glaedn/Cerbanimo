// src/utils/api.js

/**
 * Fetches data from the API.
 * Handles token attachment and basic JSON parsing/error handling.
 * @param {string} url - The API endpoint URL.
 * @param {object} options - Optional fetch options (e.g., method, body).
 * @returns {Promise<any>} - The JSON response from the API.
 * @throws {Error} - If the API response is not ok.
 */
export const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem('token'); // Or however your auth token is stored

  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorBody;
      try {
        errorBody = await response.json(); // Try to parse error body as JSON
      } catch (e) {
        errorBody = await response.text(); // Fallback to text if not JSON
      }

      const errorMessage = typeof errorBody === 'object' && errorBody.error
        ? errorBody.error
        : (typeof errorBody === 'string' && errorBody.length > 0 ? errorBody : response.statusText);

      console.error(`API Error (${response.status}): ${errorMessage} for URL: ${url}`);
      throw new Error(`API Error (${response.status}): ${errorMessage}`);
    }

    // Handle 204 No Content response
    if (response.status === 204) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Network or API call error:', error.message);
    // Re-throw the error so it can be caught by the calling component
    // This might already be an Error object from the !response.ok check or a network error
    throw error;
  }
};

export default apiFetch;
