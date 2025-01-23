import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000', // Ensure this matches your backend server
});

export default api;
