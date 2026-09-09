-- CreateEnum
CREATE TYPE "public"."BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'ATTENDED');

-- CreateTable
CREATE TABLE "public"."StudioBooking" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "studioScheduleId" TEXT NOT NULL,
    "bookingDate" TIMESTAMP(3) NOT NULL,
    "status" "public"."BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudioBooking_studioScheduleId_customerId_bookingDate_key" ON "public"."StudioBooking"("studioScheduleId", "customerId", "bookingDate");

-- AddForeignKey
ALTER TABLE "public"."StudioBooking" ADD CONSTRAINT "StudioBooking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudioBooking" ADD CONSTRAINT "StudioBooking_studioScheduleId_fkey" FOREIGN KEY ("studioScheduleId") REFERENCES "public"."StudioSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
