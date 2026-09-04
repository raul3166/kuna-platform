/*
  Warnings:

  - Added the required column `branchId` to the `PurchaseOrder` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."GoodsReceiptStatus" AS ENUM ('DRAFT', 'PROCESSED', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."GoodsReceipt" ADD COLUMN     "status" "public"."GoodsReceiptStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "public"."PurchaseOrder" ADD COLUMN     "branchId" TEXT;
UPDATE "PurchaseOrder" SET "branchId" = 'cmrzecq840001e7iwwpzi0ins' WHERE "branchId" IS NULL;
ALTER TABLE "PurchaseOrder" ALTER COLUMN "branchId" SET NOT NULL;
-- CreateIndex
CREATE INDEX "PurchaseOrder_branchId_idx" ON "public"."PurchaseOrder"("branchId");

-- AddForeignKey
ALTER TABLE "public"."PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
