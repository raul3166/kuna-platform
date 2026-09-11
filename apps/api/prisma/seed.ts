import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la siembra de permisos comerciales en PostgreSQL...');

  await prisma.permission.createMany({
    data: [
      // --- MODULE: SALE-RETURNS ---
      { module: 'sale-returns', code: 'sale-returns.create', name: 'Create sale returns', description: 'Allows creating sale return headers' },
      { module: 'sale-returns', code: 'sale-returns.read', name: 'Read sale returns', description: 'Allows reading sale return history' },
      { module: 'sale-returns', code: 'sale-returns.update', name: 'Update sale return', description: 'Allows modifying draft sale returns' },
      { module: 'sale-returns', code: 'sale-returns.delete', name: 'Delete sale return', description: 'Allows deleting draft sale returns' },

      // --- MODULE: SALE-RETURN-ITEMS ---
      { module: 'sale-return-items', code: 'sale-return-items.create', name: 'Create sale return items', description: 'Allows adding items to draft returns' },
      { module: 'sale-return-items', code: 'sale-return-items.read', name: 'Read sale return items', description: 'Allows reading breakdown of returned items' },
      { module: 'sale-return-items', code: 'sale-return-items.update', name: 'Update sale return item', description: 'Allows modifying item quantity in draft' },
      { module: 'sale-return-items', code: 'sale-return-items.delete', name: 'Delete sale return item', description: 'Allows removing items from draft returns' },

      // --- MODULE: PAYMENTS ---
      { module: 'payments', code: 'payments.create', name: 'Create payments', description: 'Allows registering customer payments' },
      { module: 'payments', code: 'payments.read', name: 'Read payments', description: 'Allows auditing transaction logs and treasury' },
      { module: 'payments', code: 'payments.update', name: 'Update payment', description: 'Allows modifying pending treasury records' },
      { module: 'payments', code: 'payments.delete', name: 'Delete payment', description: 'Allows voiding or removing payment receipts' },

      // --- MODULE: BILLING-RESOLUTIONS ---
      { module: 'billing-resolutions', code: 'billing-resolutions.create', name: 'Create billing resolutions', description: 'Allows creating fiscal data' },
      { module: 'billing-resolutions', code: 'billing-resolutions.read', name: 'Read billing resolutions', description: 'Allows auditing fiscal logs' },
      { module: 'billing-resolutions', code: 'billing-resolutions.delete', name: 'Delete billing resolutions', description: 'Allows removing fiscal resolutions' },

      // --- MODULE: CASH-SESSIONS ---
      { module: 'cash-sessions', code: 'cash-sessions.create', name: 'Create cash sessions', description: 'Allows opening cash register turns' },
      { module: 'cash-sessions', code: 'cash-sessions.read', name: 'Read cash sessions', description: 'Allows auditing cash turn logs and arqueos' },
      { module: 'cash-sessions', code: 'cash-sessions.update', name: 'Update cash session', description: 'Allows closing and balancing cash sessions' },

      // --- MODULE: ANALYTICS ---
      { module: 'analytics', code: 'analytics.read', name: 'Read executive KPIs', description: 'Allows viewing executive dashboard metrics, revenue, profit margins, and sales KPIs' },

      // --- MODULE: RESTAURANT ---
      { module: 'restaurant', code: 'restaurant.read', name: 'Read restaurant layout and tables', description: 'Allows viewing room layouts, table statuses, and live map' },
      { module: 'restaurant', code: 'restaurant.create', name: 'Create rooms and tables', description: 'Allows creating and setting up room layouts and new tables' },
      { module: 'restaurant', code: 'restaurant.update', name: 'Update restaurant tables', description: 'Allows updating table details and changing table statuses' },

      // --- MODULE: TAXES ---
      { module: 'taxes', code: 'taxes.create', name: 'Create tax rules', description: 'Allows creating tax rules and withholding definitions' },
      { module: 'taxes', code: 'taxes.read', name: 'Read tax rules', description: 'Allows viewing tax configuration and tax rules' },
      { module: 'taxes', code: 'taxes.update', name: 'Update tax rules', description: 'Allows updating rates, percentages, and status of tax rules' },
      { module: 'taxes', code: 'taxes.delete', name: 'Delete tax rules', description: 'Allows removing or deactivating tax rules' },

      // --- MODULE: GOODS-RECEIPTS ---
      { module: 'goods-receipts', code: 'goods-receipts.create', name: 'Create goods receipt', description: 'Allows creating draft goods receipts' },
      { module: 'goods-receipts', code: 'goods-receipts.read', name: 'Read goods receipts', description: 'Allows reading goods receipts history' },
      { module: 'goods-receipts', code: 'goods-receipts.update', name: 'Update goods receipt', description: 'Allows modifying draft goods receipts' },
      { module: 'goods-receipts', code: 'goods-receipts.delete', name: 'Delete goods receipt', description: 'Allows removing draft goods receipts' },
      { module: 'goods-receipts', code: 'goods-receipts.process', name: 'Process goods receipt', description: 'Allows processing draft goods receipts to adjust stock and update purchase order status' },

      // --- MODULE: INVENTORY & LOTS ---
      { module: 'inventory', code: 'inventory.read', name: 'Read inventory', description: 'Allows viewing products and stock' },

      // --- MODULE: GYM ---
      { module: 'gym', code: 'gym.create', name: 'Create gym data', description: 'Allows creating membership plans, subscriptions, and checking in members' },
      { module: 'gym', code: 'gym.read', name: 'Read gym data', description: 'Allows viewing gym membership plans, active subscriptions, and attendance logs' },
      { module: 'gym', code: 'gym.update', name: 'Update gym data', description: 'Allows updating membership plans and subscription details' },
      { module: 'gym', code: 'gym.delete', name: 'Delete gym data', description: 'Allows removing membership plans and subscriptions' },

      // --- MODULE: STUDIO ---
      { module: 'studio', code: 'studio.create', name: 'Create studio data', description: 'Allows creating studio plans, subscriptions, and checking in members' },
      { module: 'studio', code: 'studio.read', name: 'Read studio data', description: 'Allows viewing studio plans, active subscriptions, and attendance logs' },
      { module: 'studio', code: 'studio.update', name: 'Update studio data', description: 'Allows updating studio plans and subscription statuses' },
      { module: 'studio', code: 'studio.delete', name: 'Delete studio data', description: 'Allows removing studio plans and cancelling subscriptions' },

      // --- MODULE: SERVICE-ORDERS ---
      { module: 'service-orders', code: 'service-orders.create', name: 'Create service orders', description: 'Allows creating service orders' },
      { module: 'service-orders', code: 'service-orders.read', name: 'Read service orders', description: 'Allows reading service orders history and details' },
      { module: 'service-orders', code: 'service-orders.update', name: 'Update service orders', description: 'Allows modifying service orders and changing statuses' },
      { module: 'service-orders', code: 'service-orders.delete', name: 'Delete service orders', description: 'Allows deleting pending service orders' },

      // --- MODULE: SERVICE-WORKERS ---
      { module: 'service-workers', code: 'service-workers.create', name: 'Create service workers', description: 'Allows creating service workers' },
      { module: 'service-workers', code: 'service-workers.read', name: 'Read service workers', description: 'Allows reading service workers' },
      { module: 'service-workers', code: 'service-workers.update', name: 'Update service workers', description: 'Allows modifying service workers' },
      { module: 'service-workers', code: 'service-workers.delete', name: 'Delete service workers', description: 'Allows soft deleting service workers' },

      // --- MODULE: SERVICE-ITEMS ---
      { module: 'service-items', code: 'service-items.create', name: 'Create service items', description: 'Allows creating service items' },
      { module: 'service-items', code: 'service-items.read', name: 'Read service items', description: 'Allows reading service items' },
      { module: 'service-items', code: 'service-items.update', name: 'Update service items', description: 'Allows modifying service items' },
      { module: 'service-items', code: 'service-items.delete', name: 'Delete service items', description: 'Allows soft deleting service items' },
    ],
    skipDuplicates: true,
  });

  console.log('✅ ¡Permisos comerciales e impuestos sembrados de forma exitosa!');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando el script de semillas:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
