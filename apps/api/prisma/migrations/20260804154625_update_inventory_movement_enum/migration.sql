/*
  Warnings:

  - The values [IN,OUT] on the enum `InventoryMovementType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."InventoryMovementType_new" AS ENUM ('INITIAL_STOCK', 'PURCHASE', 'SALE', 'PURCHASE_RETURN', 'SALE_RETURN', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT');
ALTER TABLE "public"."InventoryMovement" ALTER COLUMN "movementType" TYPE "public"."InventoryMovementType_new" USING ("movementType"::text::"public"."InventoryMovementType_new");
ALTER TYPE "public"."InventoryMovementType" RENAME TO "InventoryMovementType_old";
ALTER TYPE "public"."InventoryMovementType_new" RENAME TO "InventoryMovementType";
DROP TYPE "public"."InventoryMovementType_old";
COMMIT;
