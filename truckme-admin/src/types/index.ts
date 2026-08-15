export interface DashboardStats {
  totalBookings: number;
  completedDeliveries: number;
  activeDeliveries: number;
  totalRevenue: number;
  platformCommission: number;
  totalDrivers: number;
  totalCustomers: number;
  onlineDrivers: number;
  pendingApprovals: number;
  timestamp: string;
}

export interface LiveFleetDriver {
  id: string;
  driverName: string;
  phone: string;
  licenseNumber: string;
  vehiclePlateNumber: string;
  vehicleType: string;
  latitude: number;
  longitude: number;
  isOnline: boolean;
  isApproved: boolean;
  status: string;
  ratingAverage: number;
  totalEarnings: number;
  lastLocationUpdate?: string;
}

export interface CustomerUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  totalTrips: number;
  totalSpent: number;
  isActive: boolean;
  createdAt: string;
}

export interface DriverPartner {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  licenseNumber: string;
  vehiclePlateNumber: string;
  vehicleType: string;
  isOnline: boolean;
  isApproved: boolean;
  status: string;
  ratingAverage: number;
  totalCompletedJobs: number;
  totalEarnings: number;
  createdAt: string;
}

export interface KycApplicant {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  licenseNumber: string;
  licenseImageUrl: string;
  vehiclePlateNumber: string;
  vehicleType: string;
  createdAt: string;
  isApproved: boolean;
}

export interface BookingRecord {
  id: string;
  bookingNumber: string;
  pickupAddress: string;
  customerName: string;
  customerPhone: string;
  driverName: string;
  driverPhone: string;
  vehiclePlate: string;
  cargoType?: string;
  cargoDescription?: string;
  cargoWeightKg?: number;
  baseFare: number;
  distanceFare: number;
  addOnFare: number;
  totalFare: number;
  driverPayout: number;
  commission: number;
  status: string;
  createdAt: string;
  completedAt?: string;
}

export interface PayoutRequest {
  id: string;
  driverId: string;
  driverName: string;
  referenceNumber: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  branchName: string;
  status: string;
  requestedAt: string;
}

export interface VehicleTypeOption {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string;
  basePrice: number;
  pricePerKm: number;
  minCapacityKg: number;
  maxCapacityKg: number;
}
