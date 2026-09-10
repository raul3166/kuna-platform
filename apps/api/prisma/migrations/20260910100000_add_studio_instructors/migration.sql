CREATE TYPE "InstructorPaymentModel" AS ENUM ('FIXED_PER_CLASS', 'PER_STUDENT', 'HYBRID');
CREATE TABLE "Instructor" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "branchId" TEXT, "firstName" TEXT NOT NULL, "lastName" TEXT, "identification" TEXT NOT NULL,
  "phoneNumber" TEXT, "email" TEXT, "specialty" TEXT, "paymentModel" "InstructorPaymentModel" NOT NULL DEFAULT 'FIXED_PER_CLASS',
  "fixedClassRate" DECIMAL(12,2) NOT NULL DEFAULT 0, "perStudentRate" DECIMAL(12,2) NOT NULL DEFAULT 0, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Instructor_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StudioClassInstructorOverride" (
  "id" TEXT NOT NULL, "studioScheduleId" TEXT NOT NULL, "instructorId" TEXT NOT NULL, "classDate" TIMESTAMP(3) NOT NULL, "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudioClassInstructorOverride_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "StudioSchedule" ADD COLUMN "instructorId" TEXT;
CREATE UNIQUE INDEX "Instructor_organizationId_identification_key" ON "Instructor"("organizationId", "identification");
CREATE INDEX "Instructor_organizationId_idx" ON "Instructor"("organizationId");
CREATE INDEX "Instructor_branchId_idx" ON "Instructor"("branchId");
CREATE UNIQUE INDEX "StudioClassInstructorOverride_studioScheduleId_classDate_key" ON "StudioClassInstructorOverride"("studioScheduleId", "classDate");
CREATE INDEX "StudioClassInstructorOverride_instructorId_idx" ON "StudioClassInstructorOverride"("instructorId");
CREATE INDEX "StudioClassInstructorOverride_classDate_idx" ON "StudioClassInstructorOverride"("classDate");
CREATE INDEX "StudioSchedule_instructorId_idx" ON "StudioSchedule"("instructorId");
ALTER TABLE "Instructor" ADD CONSTRAINT "Instructor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Instructor" ADD CONSTRAINT "Instructor_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioSchedule" ADD CONSTRAINT "StudioSchedule_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudioClassInstructorOverride" ADD CONSTRAINT "StudioClassInstructorOverride_studioScheduleId_fkey" FOREIGN KEY ("studioScheduleId") REFERENCES "StudioSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioClassInstructorOverride" ADD CONSTRAINT "StudioClassInstructorOverride_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
