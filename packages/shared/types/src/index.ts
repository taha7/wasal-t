export type Role = 'rider' | 'driver';

export type RideStatus = 'draft' | 'pending' | 'matched' | 'cancelled' | 'completed' | 'failed';

export type RideEventType = 'matched' | 'cancelled' | 'no_drivers' | 'failed';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;
}

export interface Rider {
  userId: string;
  displayName: string;
  defaultPaymentMethod: string | null;
}

export interface Driver {
  userId: string;
  licenseNumber: string;
  vehicleMake: string;
  vehiclePlate: string;
}

export interface Ride {
  id: string;
  riderId: string;
  driverId: string | null;
  originLat: number;
  originLon: number;
  destLat: number;
  destLon: number;
  fare: number;
  status: RideStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Fare {
  rideId: string;
  amount: number;
  currency: string;
}

export interface OfferEvent {
  rideId: string;
  riderId: string;
  originLat: number;
  originLon: number;
  destLat: number;
  destLon: number;
  fare: number;
}

export interface RideEvent {
  rideId: string;
  type: RideEventType;
  driverId?: string;
}
