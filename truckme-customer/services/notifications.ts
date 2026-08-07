import client from '../api/client';

/**
 * Registers an Expo / FCM Push Token with the TruckMe backend for a given user.
 */
export async function registerPushTokenWithBackend(userId: string, token: string): Promise<boolean> {
  if (!userId || !token) return false;
  try {
    await client.post('/api/auth/push-token', {
      userId,
      pushToken: token,
    });
    return true;
  } catch (error) {
    console.warn('Failed to register push token with backend:', error);
    return false;
  }
}
