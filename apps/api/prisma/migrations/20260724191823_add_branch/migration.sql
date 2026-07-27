/*
  Warnings:

  - You are about to drop the column `phone` on the `Branch` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Branch` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Organization` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Branch" DROP COLUMN "phone",
DROP COLUMN "status",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "phoneNumber" TEXT;

-- AlterTable
ALTER TABLE "public"."Organization" DROP COLUMN "status",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
