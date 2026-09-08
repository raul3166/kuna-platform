-- CreateTable
CREATE TABLE "public"."GymMembershipPlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymMembershipPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GymSubscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "membershipPlanId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "paymentStatus" TEXT NOT NULL DEFAULT 'PAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GymAttendanceLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "checkInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "reason" VARCHAR(255),

    CONSTRAINT "GymAttendanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GymMembershipPlan_organizationId_idx" ON "public"."GymMembershipPlan"("organizationId");

-- CreateIndex
CREATE INDEX "GymMembershipPlan_branchId_idx" ON "public"."GymMembershipPlan"("branchId");

-- CreateIndex
CREATE INDEX "GymSubscription_organizationId_idx" ON "public"."GymSubscription"("organizationId");

-- CreateIndex
CREATE INDEX "GymSubscription_branchId_idx" ON "public"."GymSubscription"("branchId");

-- CreateIndex
CREATE INDEX "GymSubscription_customerId_idx" ON "public"."GymSubscription"("customerId");

-- CreateIndex
CREATE INDEX "GymSubscription_membershipPlanId_idx" ON "public"."GymSubscription"("membershipPlanId");

-- CreateIndex
CREATE INDEX "GymSubscription_endDate_idx" ON "public"."GymSubscription"("endDate");

-- CreateIndex
CREATE INDEX "GymAttendanceLog_organizationId_idx" ON "public"."GymAttendanceLog"("organizationId");

-- CreateIndex
CREATE INDEX "GymAttendanceLog_branchId_idx" ON "public"."GymAttendanceLog"("branchId");

-- CreateIndex
CREATE INDEX "GymAttendanceLog_customerId_idx" ON "public"."GymAttendanceLog"("customerId");

-- AddForeignKey
ALTER TABLE "public"."GymMembershipPlan" ADD CONSTRAINT "GymMembershipPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GymMembershipPlan" ADD CONSTRAINT "GymMembershipPlan_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GymSubscription" ADD CONSTRAINT "GymSubscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GymSubscription" ADD CONSTRAINT "GymSubscription_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GymSubscription" ADD CONSTRAINT "GymSubscription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GymSubscription" ADD CONSTRAINT "GymSubscription_membershipPlanId_fkey" FOREIGN KEY ("membershipPlanId") REFERENCES "public"."GymMembershipPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GymAttendanceLog" ADD CONSTRAINT "GymAttendanceLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GymAttendanceLog" ADD CONSTRAINT "GymAttendanceLog_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GymAttendanceLog" ADD CONSTRAINT "GymAttendanceLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
