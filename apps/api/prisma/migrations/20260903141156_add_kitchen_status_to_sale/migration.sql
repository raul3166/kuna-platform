-- CreateEnum
CREATE TYPE "public"."KitchenStatus" AS ENUM ('PENDING', 'IN_PREPARATION', 'READY', 'DELIVERED', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."Sale" ADD COLUMN     "kitchenStatus" "public"."KitchenStatus" DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Sale_kitchenStatus_idx" ON "public"."Sale"("kitchenStatus");
