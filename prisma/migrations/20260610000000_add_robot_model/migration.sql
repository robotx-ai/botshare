-- CreateTable: curated robot catalog providers pick from when listing
CREATE TABLE "RobotModel" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT NOT NULL,
    "msrp" INTEGER,
    "serviceCategory" TEXT NOT NULL,
    "capabilityTag" TEXT NOT NULL,
    "imageUrl" TEXT,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RobotModel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RobotModel_slug_key" ON "RobotModel"("slug");

-- CreateIndex
CREATE INDEX "RobotModel_brand_idx" ON "RobotModel"("brand");

-- CreateIndex
CREATE INDEX "RobotModel_serviceCategory_idx" ON "RobotModel"("serviceCategory");

-- CreateIndex
CREATE INDEX "RobotModel_model_idx" ON "RobotModel"("model");
