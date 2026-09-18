/*
  Warnings:

  - A unique constraint covering the columns `[saleId]` on the table `HotelReservation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."HotelReservation" ADD COLUMN     "nightlyRate" DECIMAL(12,2),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "saleId" TEXT,
ADD COLUMN     "totalAmount" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "public"."InventoryMovement" ADD COLUMN     "internalConsumptionId" TEXT;

-- CreateTable
CREATE TABLE "public"."HotelRoomCharge" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HotelRoomCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InternalConsumption" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "department" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HotelRoomCharge_reservationId_idx" ON "public"."HotelRoomCharge"("reservationId");

-- CreateIndex
CREATE INDEX "HotelRoomCharge_organizationId_idx" ON "public"."HotelRoomCharge"("organizationId");

-- CreateIndex
CREATE INDEX "InternalConsumption_organizationId_idx" ON "public"."InternalConsumption"("organizationId");

-- CreateIndex
CREATE INDEX "InternalConsumption_branchId_idx" ON "public"."InternalConsumption"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "InternalConsumption_organizationId_code_key" ON "public"."InternalConsumption"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "HotelReservation_saleId_key" ON "public"."HotelReservation"("saleId");

-- AddForeignKey
ALTER TABLE "public"."InventoryMovement" ADD CONSTRAINT "InventoryMovement_internalConsumptionId_fkey" FOREIGN KEY ("internalConsumptionId") REFERENCES "public"."InternalConsumption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HotelReservation" ADD CONSTRAINT "HotelReservation_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "public"."Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HotelRoomCharge" ADD CONSTRAINT "HotelRoomCharge_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "public"."HotelReservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HotelRoomCharge" ADD CONSTRAINT "HotelRoomCharge_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InternalConsumption" ADD CONSTRAINT "InternalConsumption_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InternalConsumption" ADD CONSTRAINT "InternalConsumption_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InternalConsumption" ADD CONSTRAINT "InternalConsumption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
