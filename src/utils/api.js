import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000', // Adjust to match your backend URL
});

// Add token to the Authorization header for all requests
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
