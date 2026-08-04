/*
  Warnings:

  - Changed the type of `movementType` on the `InventoryMovement` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."InventoryMovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "public"."InventoryMovement" DROP COLUMN "movementType",
ADD COLUMN     "movementType" "public"."InventoryMovementType" NOT NULL;

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "supplierId" TEXT;

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "public"."Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_supplierId_idx" ON "public"."Product"("supplierId");

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
