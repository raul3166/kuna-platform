/*
  Warnings:

  - A unique constraint covering the columns `[productId]` on the table `GymMembershipPlan` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."GymMembershipPlan" ADD COLUMN     "productId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "GymMembershipPlan_productId_key" ON "public"."GymMembershipPlan"("productId");

-- AddForeignKey
ALTER TABLE "public"."GymMembershipPlan" ADD CONSTRAINT "GymMembershipPlan_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
