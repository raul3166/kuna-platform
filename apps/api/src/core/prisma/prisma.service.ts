import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { tenantContext } from '../tenant/tenant.context';

const TENANT_DELEGATES = [
  'branch',
  'user',
  'role',
  'customer',
  'supplier',
  'product',
  'productCategory',
  'inventoryMovement',
  'purchaseOrder',
  'goodsReceipt',
  'purchaseInvoice',
  'purchaseReturn',
  'inventoryTransfer',
  'sale',
  'saleReturn',
  'payment',
  'billingResolution',
  'cashSession',
  'room',
  'taxRule',
  'gymMembershipPlan',
  'gymSubscription',
  'gymAttendanceLog',
  'gymSchedule',
  'studioPlan',
  'studioSubscription',
  'studioAttendanceLog',
  'studioSchedule',
  'instructor',
  'serviceWorker',
  'serviceItem',
  'serviceOrder',
  'hotelReservation',
  'hotelRoom',
  'internalConsumption',
  'organizationVertical',
  'vehicle',
  'vehicleCheckIn',
  'appointment',
  'appointmentItem',
  'beautyClientNote',
  'beautyWorkerSchedule',
  'beautyTimeOff',
  'pet',
  'vetMedicalRecord',
  'petVaccination',
  'laundryTicket',
  'bakeryRecipe',
  'bakeryProductionOrder',
  'academyCourse',
  'academyCohort',
  'academyEnrollment',
  'academyAttendance',
  'realEstateProperty',
  'realEstateLease',
  'realEstateRentCharge',
] as const;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super();
    this.registerTenantIsolation();
  }

  private registerTenantIsolation() {
    const readMethods = ['findMany', 'count', 'aggregate', 'groupBy'] as const;

    for (const delegateName of TENANT_DELEGATES) {
      const delegate = (this as any)[delegateName];
      if (!delegate) continue;

      for (const method of readMethods) {
        if (typeof delegate[method] === 'function') {
          const original = delegate[method].bind(delegate);
          delegate[method] = (args?: any) => {
            const orgId = tenantContext.getStore()?.organizationId;
            if (orgId) {
              const nextArgs = args ? { ...args } : {};
              nextArgs.where = nextArgs.where ? { ...nextArgs.where } : {};
              if (nextArgs.where.organizationId === undefined) {
                nextArgs.where.organizationId = orgId;
              }
              return original(nextArgs);
            }
            return original(args);
          };
        }
      }
    }
  }

  async onModuleInit() {
    await this.$connect();
  }
}
