-- CreateEnum
CREATE TYPE "public"."StudioPlanType" AS ENUM ('CLASS_PACK', 'UNLIMITED');

-- CreateTable
CREATE TABLE "public"."StudioPlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "type" "public"."StudioPlanType" NOT NULL DEFAULT 'CLASS_PACK',
    "totalClasses" INTEGER,
    "maxDailyCheckIns" INTEGER DEFAULT 2,
    "isNewStudentOnly" BOOLEAN NOT NULL DEFAULT false,
    "badge" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudioSubscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "studioPlanId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalClasses" INTEGER,
    "remainingClasses" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudioAttendanceLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "studioSubscriptionId" TEXT NOT NULL,
    "checkInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "reason" VARCHAR(255),

    CONSTRAINT "StudioAttendanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudioPlan_productId_key" ON "public"."StudioPlan"("productId");

-- CreateIndex
CREATE INDEX "StudioPlan_organizationId_idx" ON "public"."StudioPlan"("organizationId");

-- CreateIndex
CREATE INDEX "StudioPlan_branchId_idx" ON "public"."StudioPlan"("branchId");

-- CreateIndex
CREATE INDEX "StudioSubscription_organizationId_idx" ON "public"."StudioSubscription"("organizationId");

-- CreateIndex
CREATE INDEX "StudioSubscription_branchId_idx" ON "public"."StudioSubscription"("branchId");

-- CreateIndex
CREATE INDEX "StudioSubscription_customerId_idx" ON "public"."StudioSubscription"("customerId");

-- CreateIndex
CREATE INDEX "StudioSubscription_studioPlanId_idx" ON "public"."StudioSubscription"("studioPlanId");

-- CreateIndex
CREATE INDEX "StudioAttendanceLog_organizationId_idx" ON "public"."StudioAttendanceLog"("organizationId");

-- CreateIndex
CREATE INDEX "StudioAttendanceLog_branchId_idx" ON "public"."StudioAttendanceLog"("branchId");

-- CreateIndex
CREATE INDEX "StudioAttendanceLog_customerId_idx" ON "public"."StudioAttendanceLog"("customerId");

-- CreateIndex
CREATE INDEX "StudioAttendanceLog_studioSubscriptionId_idx" ON "public"."StudioAttendanceLog"("studioSubscriptionId");

-- AddForeignKey
ALTER TABLE "public"."StudioPlan" ADD CONSTRAINT "StudioPlan_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudioPlan" ADD CONSTRAINT "StudioPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudioPlan" ADD CONSTRAINT "StudioPlan_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudioSubscription" ADD CONSTRAINT "StudioSubscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudioSubscription" ADD CONSTRAINT "StudioSubscription_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudioSubscription" ADD CONSTRAINT "StudioSubscription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudioSubscription" ADD CONSTRAINT "StudioSubscription_studioPlanId_fkey" FOREIGN KEY ("studioPlanId") REFERENCES "public"."StudioPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudioAttendanceLog" ADD CONSTRAINT "StudioAttendanceLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudioAttendanceLog" ADD CONSTRAINT "StudioAttendanceLog_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudioAttendanceLog" ADD CONSTRAINT "StudioAttendanceLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudioAttendanceLog" ADD CONSTRAINT "StudioAttendanceLog_studioSubscriptionId_fkey" FOREIGN KEY ("studioSubscriptionId") REFERENCES "public"."StudioSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
