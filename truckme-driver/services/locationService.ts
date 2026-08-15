import { Linking } from 'react-native';
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

// Sri Lankan city coordinate dictionary for resolving pickup & dropoff coordinates from address strings
const CITY_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  colombo: { latitude: 6.9271, longitude: 79.8612 },
  kandy: { latitude: 7.2906, longitude: 80.6337 },
  galle: { latitude: 6.0535, longitude: 80.2210 },
  negombo: { latitude: 7.2083, longitude: 79.8358 },
  gampaha: { latitude: 7.0840, longitude: 79.9925 },
  kurunegala: { latitude: 7.4863, longitude: 80.3647 },
  malabe: { latitude: 6.9040, longitude: 79.9600 },
  maharagama: { latitude: 6.8480, longitude: 79.9265 },
  ratnapura: { latitude: 6.6828, longitude: 80.3992 },
  anuradhapura: { latitude: 8.3114, longitude: 80.4037 },
  jaffna: { latitude: 9.6615, longitude: 80.0255 },
  trincomalee: { latitude: 8.5874, longitude: 81.2152 },
  matara: { latitude: 5.9549, longitude: 80.5550 },
  bambalapitiya: { latitude: 6.8920, longitude: 79.8550 },
  kiribathgoda: { latitude: 7.0011, longitude: 79.9220 },
  kadawatha: { latitude: 7.0017, longitude: 79.9530 },
  pettah: { latitude: 6.9320, longitude: 79.8550 },
  maradana: { latitude: 6.9210, longitude: 79.8650 },
  borella: { latitude: 6.9050, longitude: 79.8720 },
};

/**
 * Resolves latitude and longitude coordinates from address text string.
 */
export function resolveAddressCoordinates(
  addressText: string,
  fallbackLat = 6.9271,
  fallbackLng = 79.8612
): LocationCoords {
  if (!addressText) return { latitude: fallbackLat, longitude: fallbackLng };
  const lower = addressText.toLowerCase();
  for (const [city, coords] of Object.entries(CITY_COORDINATES)) {
    if (lower.includes(city)) {
      return coords;
    }
  }
  return { latitude: fallbackLat, longitude: fallbackLng };
}

/**
 * Launches external turn-by-turn navigation (Google Maps / Apple Maps) for driver.
 */
export function openExternalNavigation(latitude: number, longitude: number, label: string) {
  const encodedLabel = encodeURIComponent(label || 'Pickup Location');
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  const appleMapsUrl = `maps://maps.apple.com/?daddr=${latitude},${longitude}&q=${encodedLabel}`;

  if (typeof window !== 'undefined') {
    window.open(googleMapsUrl, '_blank');
  } else {
    Linking.openURL(googleMapsUrl).catch(() => {
      Linking.openURL(appleMapsUrl).catch(() => {});
    });
  }
}

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
