-- AlterTable
ALTER TABLE "public"."Instructor" ADD COLUMN     "businessType" TEXT NOT NULL DEFAULT 'STUDIO';

-- CreateIndex
CREATE INDEX "Instructor_businessType_idx" ON "public"."Instructor"("businessType");
