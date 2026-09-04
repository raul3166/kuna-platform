-- AlterTable
ALTER TABLE "public"."ProductCategory" ADD COLUMN     "trackStock" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "ProductCategory_organizationId_idx" ON "public"."ProductCategory"("organizationId");
