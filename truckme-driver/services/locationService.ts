import client from '../api/client';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
}

let simulatedIndex = 0;

// Waypoints simulating vehicle driving route across Colombo for demonstration & testing
const SIMULATED_DRIVING_WAYPOINTS: LocationCoords[] = [
  { latitude: 6.9271, longitude: 79.8612 }, // Colombo Fort
  { latitude: 6.9320, longitude: 79.8550 }, // Pettah Market
  { latitude: 6.9147, longitude: 79.8540 }, // Galle Face Green
  { latitude: 6.8970, longitude: 79.8555 }, // Kollupitiya Junction
  { latitude: 6.8850, longitude: 79.8580 }, // Bambalapitiya
  { latitude: 6.8720, longitude: 79.8610 }, // Wellawatte
  { latitude: 6.8880, longitude: 79.8780 }, // Narahenpita / Kirulapone
  { latitude: 6.9050, longitude: 79.8720 }, // Borella Junction
  { latitude: 6.9210, longitude: 79.8650 }, // Maradana Station
  { latitude: 6.9271, longitude: 79.8612 }, // Return to Fort
];

/**
 * Gets real-time device GPS coordinates.
 * Tries Browser HTML5 Geolocation API first, falls back to Colombo default if unavailable.
 */
export async function getCurrentDeviceLocation(): Promise<LocationCoords> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.geolocation) {
      window.navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            heading: pos.coords.heading || 0,
            speed: pos.coords.speed || 0,
          });
        },
        (_err) => {
          // Geolocation permission denied or unavailable -> return Colombo default
          resolve({ latitude: 6.9271, longitude: 79.8612 });
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
      );
    } else {
      resolve({ latitude: 6.9271, longitude: 79.8612 });
    }
  });
}

/**
 * Starts a live GPS tracker interval while the driver is Online.
 * Transmits live location coordinates to backend `PATCH /api/drivers/{driverId}/location` every 10 seconds.
 */
export function startDriverLocationWatcher(
  driverId: string,
  onLocationUpdate: (coords: LocationCoords) => void,
  isSimulatingDrive: boolean = false,
  intervalMs: number = 10000
): () => void {
  let timerId: any = null;

  const pushLocation = async () => {
    try {
      let coords: LocationCoords;

      if (isSimulatingDrive) {
        simulatedIndex = (simulatedIndex + 1) % SIMULATED_DRIVING_WAYPOINTS.length;
        coords = SIMULATED_DRIVING_WAYPOINTS[simulatedIndex];
      } else {
        coords = await getCurrentDeviceLocation();
      }

      // Send live location update to backend API
      await client.patch(`/api/drivers/${driverId}/location`, {
        latitude: coords.latitude,
        longitude: coords.longitude,
        isOnline: true,
        isAvailable: true,
      });

      onLocationUpdate(coords);
    } catch (err) {
      console.warn('[LocationWatcher] Error pushing location update:', err);
    }
  };

  // Immediate first push
  pushLocation();

  // Set up periodic tracking interval
  timerId = setInterval(pushLocation, intervalMs);

  // Return teardown function to stop tracking when driver goes Offline
  return () => {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  };
}
