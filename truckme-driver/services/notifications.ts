import client from '../api/client';

/**
 * Registers an Expo / FCM Push Token with the TruckMe backend for a given driver.
 */
export async function registerDriverPushTokenWithBackend(driverUserId: string, token: string): Promise<boolean> {
  if (!driverUserId || !token) return false;
  try {
    await client.post('/api/auth/push-token', {
      userId: driverUserId,
      pushToken: token,
    });
    return true;
  } catch (error) {
    console.warn('Failed to register driver push token with backend:', error);
    return false;
  }
}
