-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('AVAILABLE', 'CLAIMED');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "claimedAt" TIMESTAMP(3),
ADD COLUMN     "isIndividualOwned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "operatorId" TEXT,
ADD COLUMN     "status" "ListingStatus";

-- CreateIndex
CREATE INDEX "Listing_operatorId_idx" ON "Listing"("operatorId");

-- CreateIndex
CREATE INDEX "Listing_isIndividualOwned_status_idx" ON "Listing"("isIndividualOwned", "status");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

