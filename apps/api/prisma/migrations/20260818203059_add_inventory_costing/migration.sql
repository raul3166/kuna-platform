-- AlterTable
ALTER TABLE "public"."BranchProductStock" ADD COLUMN     "averageCost" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."InventoryMovement" ADD COLUMN     "totalCost" DECIMAL(14,2);
