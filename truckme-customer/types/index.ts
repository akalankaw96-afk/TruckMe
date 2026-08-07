export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export interface Address {
  id: string;
  label: string;
  addressLine1: string;
  city: string;
  district: string;
  province: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  contactName?: string;
  contactPhone?: string;
  isDefault: boolean;
}

export interface VehicleType {
  id: string;
  name: string;
  code: string;
  category: string;
  description?: string;
  basePrice: number;
  pricePerKm: number;
  minCapacityKg: number;
  maxCapacityKg: number;
}
