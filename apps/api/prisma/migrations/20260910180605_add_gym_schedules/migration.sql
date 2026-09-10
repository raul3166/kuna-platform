-- CreateTable
CREATE TABLE "public"."GymSchedule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "instructorId" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GymShiftInstructor" (
    "id" TEXT NOT NULL,
    "gymScheduleId" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "shiftDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymShiftInstructor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GymSchedule_organizationId_idx" ON "public"."GymSchedule"("organizationId");

-- CreateIndex
CREATE INDEX "GymSchedule_branchId_idx" ON "public"."GymSchedule"("branchId");

-- CreateIndex
CREATE INDEX "GymSchedule_dayOfWeek_idx" ON "public"."GymSchedule"("dayOfWeek");

-- CreateIndex
CREATE INDEX "GymSchedule_instructorId_idx" ON "public"."GymSchedule"("instructorId");

-- CreateIndex
CREATE INDEX "GymShiftInstructor_instructorId_idx" ON "public"."GymShiftInstructor"("instructorId");

-- CreateIndex
CREATE INDEX "GymShiftInstructor_shiftDate_idx" ON "public"."GymShiftInstructor"("shiftDate");

-- CreateIndex
CREATE UNIQUE INDEX "GymShiftInstructor_gymScheduleId_shiftDate_key" ON "public"."GymShiftInstructor"("gymScheduleId", "shiftDate");

-- AddForeignKey
ALTER TABLE "public"."GymSchedule" ADD CONSTRAINT "GymSchedule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GymSchedule" ADD CONSTRAINT "GymSchedule_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GymSchedule" ADD CONSTRAINT "GymSchedule_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "public"."Instructor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GymShiftInstructor" ADD CONSTRAINT "GymShiftInstructor_gymScheduleId_fkey" FOREIGN KEY ("gymScheduleId") REFERENCES "public"."GymSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GymShiftInstructor" ADD CONSTRAINT "GymShiftInstructor_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "public"."Instructor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
