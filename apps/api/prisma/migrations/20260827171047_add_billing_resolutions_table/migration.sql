-- CreateTable
CREATE TABLE "public"."BillingResolution" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "prefix" VARCHAR(15) NOT NULL,
    "resolutionNumber" VARCHAR(50) NOT NULL,
    "fromNumber" INTEGER NOT NULL,
    "toNumber" INTEGER NOT NULL,
    "currentNumber" INTEGER NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingResolution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingResolution_branchId_key" ON "public"."BillingResolution"("branchId");

-- CreateIndex
CREATE INDEX "BillingResolution_organizationId_idx" ON "public"."BillingResolution"("organizationId");

-- AddForeignKey
ALTER TABLE "public"."BillingResolution" ADD CONSTRAINT "BillingResolution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BillingResolution" ADD CONSTRAINT "BillingResolution_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
