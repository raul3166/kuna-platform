-- CreateEnum
CREATE TYPE "public"."TaxType" AS ENUM ('VAT', 'CONSUMPTION', 'WITHHOLDING');

-- CreateTable
CREATE TABLE "public"."TaxRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "public"."TaxType" NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "isRetention" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaxRule_organizationId_idx" ON "public"."TaxRule"("organizationId");

-- CreateIndex
CREATE INDEX "TaxRule_type_idx" ON "public"."TaxRule"("type");

-- CreateIndex
CREATE UNIQUE INDEX "TaxRule_organizationId_code_key" ON "public"."TaxRule"("organizationId", "code");

-- AddForeignKey
ALTER TABLE "public"."TaxRule" ADD CONSTRAINT "TaxRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
