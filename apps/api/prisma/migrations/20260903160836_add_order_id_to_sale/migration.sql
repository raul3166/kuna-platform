/*
  Warnings:

  - A unique constraint covering the columns `[orderId]` on the table `Sale` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Sale" ADD COLUMN     "orderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Sale_orderId_key" ON "public"."Sale"("orderId");
