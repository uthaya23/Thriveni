import axios from 'axios';

const BACKEND_URL = 'https://cufflink-creme-equipment.ngrok-free.dev';
const api = axios.create({ baseURL: `${BACKEND_URL}/api` });

api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('trc-user') || 'null');
  if (user?.token) config.headers.Authorization = `Bearer ${user.token}`;
  return config;
});

api.interceptors.response.use(
  res => {
    // If response follows standardized ApiResponse structure and is successful, unwrap it
    if (res.data && res.data.success === true && res.data.data !== undefined) {
      return { ...res, data: res.data.data };
    }
    return res;
  },
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('trc-user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const getImageUrl = (url) => {
  if (!url) return '';
  let targetUrl = url;
  if (Array.isArray(url)) {
    targetUrl = url[0] || '';
  } else if (typeof url === 'object') {
    targetUrl = url.url || url.path || '';
  }
  if (typeof targetUrl !== 'string') return '';
  const normalized = targetUrl.trim();
  if (/^(https?:|data:|blob:)/i.test(normalized)) return normalized;
  return `${BACKEND_URL}${normalized}`;
};

export default api;
