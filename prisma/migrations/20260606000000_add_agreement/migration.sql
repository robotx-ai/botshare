-- CreateTable
CREATE TABLE "Agreement" (
    "id" TEXT NOT NULL,
    "agreementNo" TEXT NOT NULL,
    "templateVersion" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "reservationId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalPrice" INTEGER NOT NULL,
    "tierId" TEXT NOT NULL,
    "robotCount" INTEGER NOT NULL,
    "partyCLegalName" TEXT NOT NULL,
    "partyCTaxId" TEXT,
    "partyCAddress" TEXT NOT NULL,
    "partyCContactName" TEXT NOT NULL,
    "partyCContactTitle" TEXT NOT NULL,
    "fieldSnapshot" JSONB NOT NULL,
    "signedName" TEXT NOT NULL,
    "signedTitle" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signedIp" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SIGNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agreement_agreementNo_key" ON "Agreement"("agreementNo");

-- CreateIndex
CREATE UNIQUE INDEX "Agreement_reservationId_key" ON "Agreement"("reservationId");

-- CreateIndex
CREATE INDEX "Agreement_userId_idx" ON "Agreement"("userId");

-- CreateIndex
CREATE INDEX "Agreement_listingId_idx" ON "Agreement"("listingId");

-- CreateIndex
CREATE INDEX "Agreement_reservationId_idx" ON "Agreement"("reservationId");

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
