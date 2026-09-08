-- CreateTable
CREATE TABLE "public"."ProductPharma" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "activeIngredient" TEXT,
    "laboratory" TEXT,
    "invimaCode" TEXT,
    "requiresPrescription" BOOLEAN NOT NULL DEFAULT false,
    "concentration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPharma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductLot" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "stock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductLot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductPharma_productId_key" ON "public"."ProductPharma"("productId");

-- CreateIndex
CREATE INDEX "ProductLot_productId_idx" ON "public"."ProductLot"("productId");

-- CreateIndex
CREATE INDEX "ProductLot_branchId_idx" ON "public"."ProductLot"("branchId");

-- CreateIndex
CREATE INDEX "ProductLot_expirationDate_idx" ON "public"."ProductLot"("expirationDate");

-- CreateIndex
CREATE UNIQUE INDEX "ProductLot_productId_branchId_lotNumber_key" ON "public"."ProductLot"("productId", "branchId", "lotNumber");

-- AddForeignKey
ALTER TABLE "public"."ProductPharma" ADD CONSTRAINT "ProductPharma_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductLot" ADD CONSTRAINT "ProductLot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductLot" ADD CONSTRAINT "ProductLot_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
