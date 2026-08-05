-- AlterTable
ALTER TABLE "public"."GoodsReceipt" ADD COLUMN     "receivedById" TEXT;

-- CreateIndex
CREATE INDEX "GoodsReceipt_receivedById_idx" ON "public"."GoodsReceipt"("receivedById");

-- AddForeignKey
ALTER TABLE "public"."GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
