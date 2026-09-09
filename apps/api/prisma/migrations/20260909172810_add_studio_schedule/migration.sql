-- AlterTable
ALTER TABLE "public"."StudioAttendanceLog" ADD COLUMN     "studioScheduleId" TEXT;

-- CreateTable
CREATE TABLE "public"."StudioSchedule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "className" TEXT NOT NULL,
    "instructorName" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 15,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioSchedule_organizationId_idx" ON "public"."StudioSchedule"("organizationId");

-- CreateIndex
CREATE INDEX "StudioSchedule_branchId_idx" ON "public"."StudioSchedule"("branchId");

-- CreateIndex
CREATE INDEX "StudioSchedule_dayOfWeek_idx" ON "public"."StudioSchedule"("dayOfWeek");

-- CreateIndex
CREATE INDEX "StudioAttendanceLog_studioScheduleId_idx" ON "public"."StudioAttendanceLog"("studioScheduleId");

-- AddForeignKey
ALTER TABLE "public"."StudioAttendanceLog" ADD CONSTRAINT "StudioAttendanceLog_studioScheduleId_fkey" FOREIGN KEY ("studioScheduleId") REFERENCES "public"."StudioSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudioSchedule" ADD CONSTRAINT "StudioSchedule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudioSchedule" ADD CONSTRAINT "StudioSchedule_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
