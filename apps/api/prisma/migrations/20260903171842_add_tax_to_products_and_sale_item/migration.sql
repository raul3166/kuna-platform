-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "taxRuleId" TEXT;

-- AlterTable
ALTER TABLE "public"."SaleItem" ADD COLUMN     "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Product_taxRuleId_idx" ON "public"."Product"("taxRuleId");

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_taxRuleId_fkey" FOREIGN KEY ("taxRuleId") REFERENCES "public"."TaxRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
