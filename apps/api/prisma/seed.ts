import { PrismaClient } from '@prisma/client';

// 1. Instanciamos el cliente real de Prisma para KUNA
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la siembra de permisos comerciales en PostgreSQL...');

  // 2. Inyección colectiva de los nuevos privilegios del Sprint 9
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
      // Añadir al arreglo data: [ ... ] de tu prisma/seed.ts
      { module: 'billing-resolutions', code: 'billing-resolutions.create', name: 'Create billing resolutions', description: 'Allows creating fiscal data' },
      { module: 'billing-resolutions', code: 'billing-resolutions.read', name: 'Read billing resolutions', description: 'Allows auditing fiscal logs' },
      { module: 'billing-resolutions', code: 'billing-resolutions.delete', name: 'Delete billing resolutions', description: 'Allows removing fiscal resolutions' },
      // Añadir al bloque data: [ ... ] dentro de tu prisma/seed.ts
{ module: 'cash-sessions', code: 'cash-sessions.create', name: 'Create cash sessions', description: 'Allows opening cash register turns' },
{ module: 'cash-sessions', code: 'cash-sessions.read', name: 'Read cash sessions', description: 'Allows auditing cash turn logs and arqueos' },
{ module: 'cash-sessions', code: 'cash-sessions.update', name: 'Update cash session', description: 'Allows closing and balancing cash sessions' },

{ module: 'analytics', code: 'analytics.read', name: 'Read executive KPIs', description: 'Allows viewing executive dashboard metrics, revenue, profit margins, and sales KPIs'},
{
    module: 'restaurant',
    code: 'restaurant.read',
    name: 'Read restaurant layout and tables',
    description: 'Allows viewing room layouts, table statuses, and live map',
  },
  {
    module: 'restaurant',
    code: 'restaurant.create',
    name: 'Create rooms and tables',
    description: 'Allows creating and setting up room layouts and new tables',
  },
  {
    module: 'restaurant',
    code: 'restaurant.update',
    name: 'Update restaurant tables',
    description: 'Allows updating table details and changing table statuses',
  },
    ],
    skipDuplicates: true,
  });

  console.log('✅ ¡Permisos comerciales sembrados de forma exitosa!');
}

// 3. Ejecución segura controlando la apertura y cierre de conexiones a la DB
main()
  .catch((e) => {
    console.error('❌ Error ejecutando el script de semillas:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Desconectamos el cliente de forma limpia al finalizar
    await prisma.$disconnect();
  });
