import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : '/api';

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
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
