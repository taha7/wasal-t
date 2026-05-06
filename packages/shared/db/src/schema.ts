import {
  doublePrecision,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['rider', 'driver']);

export const rideStatusEnum = pgEnum('ride_status', [
  'draft',
  'pending',
  'matched',
  'cancelled',
  'completed',
  'failed',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const riders = pgTable('riders', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  defaultPaymentMethod: varchar('default_payment_method', { length: 100 }),
});

export const drivers = pgTable('drivers', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  licenseNumber: varchar('license_number', { length: 100 }).notNull(),
  vehicleMake: varchar('vehicle_make', { length: 100 }).notNull(),
  vehiclePlate: varchar('vehicle_plate', { length: 20 }).notNull().unique(),
});

export const rides = pgTable('rides', {
  id: uuid('id').primaryKey().defaultRandom(),
  riderId: uuid('rider_id')
    .notNull()
    .references(() => users.id),
  driverId: uuid('driver_id').references(() => users.id),
  originLat: doublePrecision('origin_lat').notNull(),
  originLon: doublePrecision('origin_lon').notNull(),
  destLat: doublePrecision('dest_lat').notNull(),
  destLon: doublePrecision('dest_lon').notNull(),
  fare: doublePrecision('fare').notNull(),
  status: rideStatusEnum('status').notNull().default('draft'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
