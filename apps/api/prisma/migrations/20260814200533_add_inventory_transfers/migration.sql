-- AlterTable
ALTER TABLE "public"."InventoryMovement" ADD COLUMN     "branchId" TEXT;

-- CreateTable
CREATE TABLE "public"."BranchProductStock" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "stock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchProductStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryTransfer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sourceBranchId" TEXT NOT NULL,
    "destinationBranchId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "reference" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BranchProductStock_branchId_idx" ON "public"."BranchProductStock"("branchId");

-- CreateIndex
CREATE INDEX "BranchProductStock_productId_idx" ON "public"."BranchProductStock"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "BranchProductStock_branchId_productId_key" ON "public"."BranchProductStock"("branchId", "productId");

-- CreateIndex
CREATE INDEX "InventoryTransfer_organizationId_idx" ON "public"."InventoryTransfer"("organizationId");

-- CreateIndex
CREATE INDEX "InventoryTransfer_productId_idx" ON "public"."InventoryTransfer"("productId");

-- CreateIndex
CREATE INDEX "InventoryTransfer_sourceBranchId_idx" ON "public"."InventoryTransfer"("sourceBranchId");

-- CreateIndex
CREATE INDEX "InventoryTransfer_destinationBranchId_idx" ON "public"."InventoryTransfer"("destinationBranchId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransfer_organizationId_reference_key" ON "public"."InventoryTransfer"("organizationId", "reference");

-- CreateIndex
CREATE INDEX "InventoryMovement_branchId_idx" ON "public"."InventoryMovement"("branchId");

-- AddForeignKey
ALTER TABLE "public"."InventoryMovement" ADD CONSTRAINT "InventoryMovement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchProductStock" ADD CONSTRAINT "BranchProductStock_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchProductStock" ADD CONSTRAINT "BranchProductStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_sourceBranchId_fkey" FOREIGN KEY ("sourceBranchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_destinationBranchId_fkey" FOREIGN KEY ("destinationBranchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
