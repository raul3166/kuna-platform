-- CreateEnum
CREATE TYPE "public"."EmploymentType" AS ENUM ('SALARIED', 'COMMISSION');

-- AlterTable
ALTER TABLE "public"."ServiceWorker" ADD COLUMN     "employmentType" "public"."EmploymentType" NOT NULL DEFAULT 'SALARIED';
