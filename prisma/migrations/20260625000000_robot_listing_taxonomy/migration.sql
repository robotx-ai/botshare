-- AlterTable
ALTER TABLE "RobotModel"
  ADD COLUMN "priceHourly" INTEGER,
  ADD COLUMN "priceDaily" INTEGER,
  ADD COLUMN "priceMonthly" INTEGER,
  ADD COLUMN "useCase" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "listable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Listing"
  ADD COLUMN "sku" TEXT,
  ADD COLUMN "skuImageSrc" TEXT;
