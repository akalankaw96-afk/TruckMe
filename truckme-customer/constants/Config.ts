import Constants from 'expo-constants';

// Set to null to use fast, 100% reliable local network API (http://192.168.8.122:5084)
// Or set to an active public tunnel URL if testing remotely outside local Wi-Fi
const CUSTOM_PUBLIC_API_URL: string | null = 'https://equal-series-ethics-lance.trycloudflare.com';

const getApiBaseUrl = () => {
  if (CUSTOM_PUBLIC_API_URL) {
    return CUSTOM_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const hostname = window.location.hostname;
    return `http://${hostname}:5084`;
  }

  const hostUri = Constants.expoConfig?.hostUri || (Constants.manifest as any)?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:5084`;
    }
  }
  return 'http://192.168.8.122:5084';
};

export const API_BASE_URL = getApiBaseUrl();
