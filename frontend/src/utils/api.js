import axios from 'axios';

// Note: no `withCredentials` — auth uses Bearer tokens + refresh token in the body,
// and credentials mode breaks CORS against the backend's wildcard `cors()` config.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Origin of the backend (without /api) — used to resolve relative upload URLs like /temp/x.jpg
export const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

export const resolveImageUrl = (url) => {
  if (!url) return url;
  return url.startsWith('/') ? `${API_ORIGIN}${url}` : url;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, try to refresh the access token once, then retry the original request.
let refreshing = null;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const refreshToken = localStorage.getItem('refreshToken');
    const isAuthCall = original?.url?.includes('/auth/');

    if (error.response?.status === 401 && refreshToken && !original._retried && !isAuthCall) {
      original._retried = true;
      try {
        refreshing = refreshing || axios.post(
          `${api.defaults.baseURL}/auth/refresh-token`,
          { token: refreshToken }
        );
        const res = await refreshing;
        refreshing = null;
        const newToken = res.data.data.accessToken;
        localStorage.setItem('accessToken', newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        refreshing = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
