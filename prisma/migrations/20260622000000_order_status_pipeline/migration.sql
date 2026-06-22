-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'RETURN_INITIATED', 'RETURN_RECEIVED', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN "status" "OrderStatus" NOT NULL DEFAULT 'PLACED';

-- CreateTable
CREATE TABLE "ReservationEvent" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "actorId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReservationEvent_reservationId_idx" ON "ReservationEvent"("reservationId");

-- AddForeignKey
ALTER TABLE "ReservationEvent" ADD CONSTRAINT "ReservationEvent_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill one seed PLACED event per existing reservation so every order has a timeline.
INSERT INTO "ReservationEvent" ("id", "reservationId", "status", "actorId", "createdAt")
SELECT 'seed_' || r."id", r."id", 'PLACED', r."userId", r."createdAt"
FROM "Reservation" r
WHERE NOT EXISTS (
  SELECT 1 FROM "ReservationEvent" e WHERE e."reservationId" = r."id"
);
