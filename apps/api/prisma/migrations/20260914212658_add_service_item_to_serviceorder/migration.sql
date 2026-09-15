-- AlterTable
ALTER TABLE "public"."ServiceOrder" ADD COLUMN     "serviceItemId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."ServiceOrder" ADD CONSTRAINT "ServiceOrder_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "public"."ServiceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
