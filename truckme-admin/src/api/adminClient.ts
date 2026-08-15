import axios from 'axios';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5084';
    }
    if (hostname.includes('192.168.')) {
      return `http://${hostname}:5084`;
    }
  }
  return 'https://attraction-will-orleans-dates.trycloudflare.com';
};

export const API_HOST = getApiBaseUrl();

const adminClient = axios.create({
  baseURL: `${API_HOST}/api/admin`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true',
  },
});

export default adminClient;
