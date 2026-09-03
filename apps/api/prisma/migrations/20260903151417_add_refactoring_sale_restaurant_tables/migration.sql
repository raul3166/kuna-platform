/*
  Warnings:

  - You are about to drop the column `currentSaleId` on the `RestaurantTable` table. All the data in the column will be lost.
  - You are about to drop the column `kitchenStatus` on the `Sale` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Sale_kitchenStatus_idx";

-- AlterTable
ALTER TABLE "public"."RestaurantTable" DROP COLUMN "currentSaleId",
ADD COLUMN     "currentOrderId" TEXT;

-- AlterTable
ALTER TABLE "public"."Sale" DROP COLUMN "kitchenStatus";

-- CreateTable
CREATE TABLE "public"."RestaurantOrder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "status" "public"."KitchenStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "saleId" TEXT,

    CONSTRAINT "RestaurantOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RestaurantOrderItem" (
    "id" TEXT NOT NULL,
    "restaurantOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "notes" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantOrder_saleId_key" ON "public"."RestaurantOrder"("saleId");

-- CreateIndex
CREATE INDEX "RestaurantOrder_organizationId_idx" ON "public"."RestaurantOrder"("organizationId");

-- CreateIndex
CREATE INDEX "RestaurantOrder_branchId_idx" ON "public"."RestaurantOrder"("branchId");

-- CreateIndex
CREATE INDEX "RestaurantOrder_tableId_idx" ON "public"."RestaurantOrder"("tableId");

-- CreateIndex
CREATE INDEX "RestaurantOrder_status_idx" ON "public"."RestaurantOrder"("status");

-- CreateIndex
CREATE INDEX "RestaurantOrderItem_restaurantOrderId_idx" ON "public"."RestaurantOrderItem"("restaurantOrderId");

-- CreateIndex
CREATE INDEX "RestaurantOrderItem_productId_idx" ON "public"."RestaurantOrderItem"("productId");

-- CreateIndex
CREATE INDEX "RestaurantTable_currentOrderId_idx" ON "public"."RestaurantTable"("currentOrderId");

-- AddForeignKey
ALTER TABLE "public"."RestaurantTable" ADD CONSTRAINT "RestaurantTable_currentOrderId_fkey" FOREIGN KEY ("currentOrderId") REFERENCES "public"."RestaurantOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RestaurantOrder" ADD CONSTRAINT "RestaurantOrder_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "public"."Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RestaurantOrder" ADD CONSTRAINT "RestaurantOrder_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."RestaurantTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RestaurantOrderItem" ADD CONSTRAINT "RestaurantOrderItem_restaurantOrderId_fkey" FOREIGN KEY ("restaurantOrderId") REFERENCES "public"."RestaurantOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RestaurantOrderItem" ADD CONSTRAINT "RestaurantOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
