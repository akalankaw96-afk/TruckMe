import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/Config';

const TOKEN_KEY = 'truckme_driver_token';
const USER_KEY = 'truckme_driver_user';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true',
  },
});

export async function saveAuth(token: string, user: any) {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.warn('saveAuth error:', e);
  }
}

export async function getStoredToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

export async function getStoredUser() {
  try {
    const u = await AsyncStorage.getItem(USER_KEY);
    return u ? JSON.parse(u) : null;
  } catch (e) {
    return null;
  }
}

export async function clearAuth() {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  } catch (e) {
    console.warn('clearAuth error:', e);
  }
}

client.interceptors.request.use(async (config) => {
  try {
    const token = await getStoredToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch (e) {
    console.warn('Auth header error:', e);
  }
  return config;
});

export default client;
