ALTER TABLE "StudioClassInstructorOverride" RENAME TO "StudioClassInstructor";

ALTER TABLE "StudioClassInstructor"
  RENAME CONSTRAINT "StudioClassInstructorOverride_pkey" TO "StudioClassInstructor_pkey";
ALTER TABLE "StudioClassInstructor"
  RENAME CONSTRAINT "StudioClassInstructorOverride_studioScheduleId_fkey" TO "StudioClassInstructor_studioScheduleId_fkey";
ALTER TABLE "StudioClassInstructor"
  RENAME CONSTRAINT "StudioClassInstructorOverride_instructorId_fkey" TO "StudioClassInstructor_instructorId_fkey";

ALTER INDEX "StudioClassInstructorOverride_studioScheduleId_classDate_key"
  RENAME TO "StudioClassInstructor_studioScheduleId_classDate_key";
ALTER INDEX "StudioClassInstructorOverride_instructorId_idx"
  RENAME TO "StudioClassInstructor_instructorId_idx";
ALTER INDEX "StudioClassInstructorOverride_classDate_idx"
  RENAME TO "StudioClassInstructor_classDate_idx";
