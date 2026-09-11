-- CreateEnum
CREATE TYPE "public"."ServiceOrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'BILLED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "public"."InventoryMovementType" ADD VALUE 'SERVICE_CONSUMPTION';

-- AlterTable
ALTER TABLE "public"."InventoryMovement" ADD COLUMN     "serviceOrderId" TEXT;

-- CreateTable
CREATE TABLE "public"."ServiceWorker" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "identification" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "email" TEXT,
    "specialty" TEXT,
    "commissionPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "fixedSalary" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceWorker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ServiceItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 60,
    "basePrice" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ServiceOrder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "assignedWorkerId" TEXT,
    "assetName" TEXT NOT NULL,
    "assetIdentifier" TEXT,
    "initialNotes" TEXT,
    "diagnosis" TEXT,
    "resolutionNotes" TEXT,
    "status" "public"."ServiceOrderStatus" NOT NULL DEFAULT 'PENDING',
    "laborTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "materialsTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ServiceOrderTask" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "serviceItemId" TEXT,
    "description" TEXT NOT NULL,
    "assignedWorkerId" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOrderTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ServiceOrderMaterial" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "isBilled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOrderMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SaleServiceItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "serviceItemId" TEXT,
    "serviceOrderTaskId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleServiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceWorker_organizationId_idx" ON "public"."ServiceWorker"("organizationId");

-- CreateIndex
CREATE INDEX "ServiceWorker_branchId_idx" ON "public"."ServiceWorker"("branchId");

-- CreateIndex
CREATE INDEX "ServiceWorker_isActive_idx" ON "public"."ServiceWorker"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceWorker_organizationId_identification_key" ON "public"."ServiceWorker"("organizationId", "identification");

-- CreateIndex
CREATE INDEX "ServiceItem_organizationId_idx" ON "public"."ServiceItem"("organizationId");

-- CreateIndex
CREATE INDEX "ServiceItem_isActive_idx" ON "public"."ServiceItem"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceItem_organizationId_name_key" ON "public"."ServiceItem"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOrder_saleId_key" ON "public"."ServiceOrder"("saleId");

-- CreateIndex
CREATE INDEX "ServiceOrder_organizationId_idx" ON "public"."ServiceOrder"("organizationId");

-- CreateIndex
CREATE INDEX "ServiceOrder_branchId_idx" ON "public"."ServiceOrder"("branchId");

-- CreateIndex
CREATE INDEX "ServiceOrder_customerId_idx" ON "public"."ServiceOrder"("customerId");

-- CreateIndex
CREATE INDEX "ServiceOrder_assignedWorkerId_idx" ON "public"."ServiceOrder"("assignedWorkerId");

-- CreateIndex
CREATE INDEX "ServiceOrder_status_idx" ON "public"."ServiceOrder"("status");

-- CreateIndex
CREATE INDEX "ServiceOrder_createdAt_idx" ON "public"."ServiceOrder"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOrder_organizationId_orderNumber_key" ON "public"."ServiceOrder"("organizationId", "orderNumber");

-- CreateIndex
CREATE INDEX "ServiceOrderTask_serviceOrderId_idx" ON "public"."ServiceOrderTask"("serviceOrderId");

-- CreateIndex
CREATE INDEX "ServiceOrderTask_serviceItemId_idx" ON "public"."ServiceOrderTask"("serviceItemId");

-- CreateIndex
CREATE INDEX "ServiceOrderTask_assignedWorkerId_idx" ON "public"."ServiceOrderTask"("assignedWorkerId");

-- CreateIndex
CREATE INDEX "ServiceOrderMaterial_serviceOrderId_idx" ON "public"."ServiceOrderMaterial"("serviceOrderId");

-- CreateIndex
CREATE INDEX "ServiceOrderMaterial_productId_idx" ON "public"."ServiceOrderMaterial"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleServiceItem_serviceOrderTaskId_key" ON "public"."SaleServiceItem"("serviceOrderTaskId");

-- CreateIndex
CREATE INDEX "SaleServiceItem_saleId_idx" ON "public"."SaleServiceItem"("saleId");

-- CreateIndex
CREATE INDEX "SaleServiceItem_serviceItemId_idx" ON "public"."SaleServiceItem"("serviceItemId");

-- CreateIndex
CREATE INDEX "SaleServiceItem_serviceOrderTaskId_idx" ON "public"."SaleServiceItem"("serviceOrderTaskId");

-- CreateIndex
CREATE INDEX "InventoryMovement_serviceOrderId_idx" ON "public"."InventoryMovement"("serviceOrderId");

-- AddForeignKey
ALTER TABLE "public"."InventoryMovement" ADD CONSTRAINT "InventoryMovement_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "public"."ServiceOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceWorker" ADD CONSTRAINT "ServiceWorker_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceWorker" ADD CONSTRAINT "ServiceWorker_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceItem" ADD CONSTRAINT "ServiceItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceOrder" ADD CONSTRAINT "ServiceOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceOrder" ADD CONSTRAINT "ServiceOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceOrder" ADD CONSTRAINT "ServiceOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceOrder" ADD CONSTRAINT "ServiceOrder_assignedWorkerId_fkey" FOREIGN KEY ("assignedWorkerId") REFERENCES "public"."ServiceWorker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceOrder" ADD CONSTRAINT "ServiceOrder_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "public"."Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceOrderTask" ADD CONSTRAINT "ServiceOrderTask_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "public"."ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceOrderTask" ADD CONSTRAINT "ServiceOrderTask_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "public"."ServiceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceOrderTask" ADD CONSTRAINT "ServiceOrderTask_assignedWorkerId_fkey" FOREIGN KEY ("assignedWorkerId") REFERENCES "public"."ServiceWorker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceOrderMaterial" ADD CONSTRAINT "ServiceOrderMaterial_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "public"."ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceOrderMaterial" ADD CONSTRAINT "ServiceOrderMaterial_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SaleServiceItem" ADD CONSTRAINT "SaleServiceItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "public"."Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SaleServiceItem" ADD CONSTRAINT "SaleServiceItem_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "public"."ServiceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SaleServiceItem" ADD CONSTRAINT "SaleServiceItem_serviceOrderTaskId_fkey" FOREIGN KEY ("serviceOrderTaskId") REFERENCES "public"."ServiceOrderTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
