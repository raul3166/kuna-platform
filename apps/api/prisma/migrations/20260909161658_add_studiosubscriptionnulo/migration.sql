-- DropForeignKey
ALTER TABLE "public"."StudioAttendanceLog" DROP CONSTRAINT "StudioAttendanceLog_studioSubscriptionId_fkey";

-- AlterTable
ALTER TABLE "public"."StudioAttendanceLog" ALTER COLUMN "studioSubscriptionId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."StudioAttendanceLog" ADD CONSTRAINT "StudioAttendanceLog_studioSubscriptionId_fkey" FOREIGN KEY ("studioSubscriptionId") REFERENCES "public"."StudioSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
