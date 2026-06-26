-- Link a listing to the catalog robot it was created from (nullable; manual listings = null)
ALTER TABLE "Listing" ADD COLUMN "robotModelId" TEXT;

-- CreateIndex
CREATE INDEX "Listing_robotModelId_idx" ON "Listing"("robotModelId");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_robotModelId_fkey" FOREIGN KEY ("robotModelId") REFERENCES "RobotModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
