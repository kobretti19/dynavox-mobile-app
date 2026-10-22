import axios from 'axios';
import Constants from 'expo-constants';
import { secureDelete, secureGet, secureSet } from '../utils/storage';

// Same backend as the web app (dynservice.dynavox.ch). Override with
// EXPO_PUBLIC_API_URL for local testing, e.g. http://192.168.1.10:3001/api.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl || 'https://dynservice.dynavox.ch/api';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

// The token is kept in memory so every request (and the plain download URLs
// that need it as ?token=) can read it synchronously; SecureStore is the
// persistent copy.
let currentToken = null;
let onUnauthorized = () => {};

export const getToken = () => currentToken;

export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

export const saveSession = async (token, user) => {
  currentToken = token;
  await secureSet(TOKEN_KEY, token);
  await secureSet(USER_KEY, JSON.stringify(user));
};

export const saveUser = (user) => secureSet(USER_KEY, JSON.stringify(user));

export const loadSession = async () => {
  const token = await secureGet(TOKEN_KEY);
  const userRaw = await secureGet(USER_KEY);
  if (!token || !userRaw) return null;
  try {
    currentToken = token;
    return { token, user: JSON.parse(userRaw) };
  } catch {
    return null;
  }
};

export const clearSession = async () => {
  currentToken = null;
  await secureDelete(TOKEN_KEY);
  await secureDelete(USER_KEY);
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  if (currentToken) config.headers.Authorization = `Bearer ${currentToken}`;
  return config;
});

// /auth/login and /auth/change-password return 401 for a wrong password
// while the session itself is fine -- don't log out for those.
const EXPECTED_401_PATHS = ['/auth/login', '/auth/change-password'];

api.interceptors.response.use(
  (response) => {
    // Sliding session: the backend reissues the token once it is a day old.
    const refreshed = response.headers['x-refreshed-token'];
    if (refreshed && currentToken) {
      currentToken = refreshed;
      secureSet(TOKEN_KEY, refreshed).catch(() => {});
    }
    return response;
  },
  (error) => {
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !EXPECTED_401_PATHS.some((p) => url.includes(p))) {
      onUnauthorized();
    }
    return Promise.reject(error);
  },
);

export const errorMessage = (err) => err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Error';

export default api;
