CREATE TYPE "public"."ride_status" AS ENUM('draft', 'pending', 'matched', 'cancelled', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('rider', 'driver');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "drivers" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"license_number" varchar(100) NOT NULL,
	"vehicle_make" varchar(100) NOT NULL,
	"vehicle_plate" varchar(20) NOT NULL,
	CONSTRAINT "drivers_vehicle_plate_unique" UNIQUE("vehicle_plate")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "riders" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"default_payment_method" varchar(100)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rider_id" uuid NOT NULL,
	"driver_id" uuid,
	"origin_lat" double precision NOT NULL,
	"origin_lon" double precision NOT NULL,
	"dest_lat" double precision NOT NULL,
	"dest_lon" double precision NOT NULL,
	"fare" double precision NOT NULL,
	"status" "ride_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "riders" ADD CONSTRAINT "riders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rides" ADD CONSTRAINT "rides_rider_id_users_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rides" ADD CONSTRAINT "rides_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
