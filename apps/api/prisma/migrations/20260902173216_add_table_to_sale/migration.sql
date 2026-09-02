-- DropForeignKey
ALTER TABLE "public"."RestaurantTable" DROP CONSTRAINT "RestaurantTable_roomId_fkey";

-- AlterTable
ALTER TABLE "public"."RestaurantTable" ALTER COLUMN "capacity" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Sale" ADD COLUMN     "tableId" TEXT;

-- CreateIndex
CREATE INDEX "Sale_tableId_idx" ON "public"."Sale"("tableId");

-- AddForeignKey
ALTER TABLE "public"."Sale" ADD CONSTRAINT "Sale_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."RestaurantTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RestaurantTable" ADD CONSTRAINT "RestaurantTable_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
