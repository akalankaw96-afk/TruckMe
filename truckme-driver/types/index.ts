export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export interface Driver {
  id: string;
  userId: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  nicNumber: string;
  approvalStatus: string;
  isOnline: boolean;
  isAvailable: boolean;
  currentLatitude: number | null;
  currentLongitude: number | null;
  averageRating: number;
  totalTrips: number;
  totalEarnings: number;
}

export interface Vehicle {
  id: string;
  driverId: string;
  vehicleTypeId: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  capacityKg: number;
  approvalStatus: string;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  customerUserId: string;
  driverId: string | null;
  vehicleId: string | null;
  vehicleTypeId: string;
  pickupAddressId: string;
  scheduledPickupAt: string;
  status: string;
  paymentStatus: string;
  totalFare: number;
  driverEarnings: number;
  cargoType: string | null;
  cargoWeightKg: number | null;
  pickupAddressLine1?: string;
  pickupCity?: string;
}

export interface VehicleType {
  id: string;
  name: string;
  code: string;
}

export interface DriverUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  defaultVehicleId?: string;
}

export interface Job {
  id: string;
  bookingNumber: string;
  status: string;
  scheduledPickupAt: string;
  totalFare: number;
  driverEarnings: number;
  pickupAddressId: string;
  cargoType?: string;
  cargoDescription?: string;
  cargoWeightKg?: number;
  numberOfHelpers: number;
  customerUserId: string;
}

export interface DriverProfile {
  id: string;
  userId: string;
  licenseNumber: string;
  nicNumber: string;
  approvalStatus: string;
  isOnline: boolean;
  isAvailable: boolean;
  averageRating: number;
  totalTrips: number;
  totalEarnings: number;
}
