-- Destructive: wipe reservations + listings before applying NOT NULL constraints
DELETE FROM "Reservation";
DELETE FROM "Listing";

-- CreateEnum
CREATE TYPE "Metro" AS ENUM ('SF', 'LA', 'VEGAS', 'DALLAS', 'NYC', 'MIAMI');

-- AlterTable: add metro (nullable first to satisfy ALTER ordering), tighten existing cols
ALTER TABLE "Listing"
  ADD COLUMN "metro" "Metro",
  ALTER COLUMN "zipCode" SET NOT NULL,
  ALTER COLUMN "lat" SET NOT NULL,
  ALTER COLUMN "lng" SET NOT NULL;

-- Backfill is a no-op (table was wiped); set NOT NULL on metro
ALTER TABLE "Listing" ALTER COLUMN "metro" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Listing_metro_idx" ON "Listing"("metro");
CREATE INDEX "Listing_zipCode_idx" ON "Listing"("zipCode");
