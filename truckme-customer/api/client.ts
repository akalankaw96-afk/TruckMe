import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/Config';

const TOKEN_KEY = 'truckme_token';
const USER_KEY = 'truckme_user';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true',
  },
});

client.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch (e) {
    console.warn('Auth interceptor storage read error', e);
  }
  return config;
});

export const saveAuth = async (token: string, user: any) => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.warn('saveAuth error:', e);
  }
};

export const getStoredToken = async () => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (e) {
    return null;
  }
};

export const getStoredUser = async () => {
  try {
    const s = await AsyncStorage.getItem(USER_KEY);
    return s ? JSON.parse(s) : null;
  } catch (e) {
    return null;
  }
};

export const clearAuth = async () => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  } catch (e) {
    console.warn('clearAuth error:', e);
  }
};

export default client;
