-- CreateEnum
CREATE TYPE "public"."PlanAccessType" AS ENUM ('LIMITED_DAILY', 'UNLIMITED');

-- AlterTable
ALTER TABLE "public"."GymMembershipPlan" ADD COLUMN     "accessType" "public"."PlanAccessType" NOT NULL DEFAULT 'UNLIMITED';
