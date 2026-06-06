import axios from 'axios';
import { useAuth } from '../store/auth';

const baseURL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : '/api';

const api = axios.create({ baseURL });

function getAuthToken() {
  return localStorage.getItem('token') || useAuth.getState().token || null;
}

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg = err.response?.data?.error || err.message || 'Request failed';
    err.displayMessage = msg;
    return Promise.reject(err);
  },
);

export default api;
