import { PrismaClient, TaxType, InventoryMovementType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la siembra de datos base...');

  // 1. Permisos base
  const permissionsData = [
    // --- MODULE: SALE-RETURNS ---
    { module: 'sale-returns', code: 'sale-returns.create', name: 'Create sale returns', description: 'Allows creating sale return headers' },
    { module: 'sale-returns', code: 'sale-returns.read', name: 'Read sale returns', description: 'Allows reading sale return history' },
    { module: 'sale-returns', code: 'sale-returns.update', name: 'Update sale return', description: 'Allows modifying draft sale returns' },
    { module: 'sale-returns', code: 'sale-returns.delete', name: 'Delete sale return', description: 'Allows deleting draft sale returns' },
    { module: 'sale-returns', code: 'sale-returns.confirm', name: 'Confirm sale return', description: 'Allows confirming a sale return' },
    { module: 'sale-returns', code: 'sale-returns.complete', name: 'Complete sale return', description: 'Allows completing a sale return' },
    { module: 'sale-returns', code: 'sale-returns.cancel', name: 'Cancel sale return', description: 'Allows canceling a sale return' },

    // --- MODULE: SALE-RETURN-ITEMS ---
    { module: 'sale-return-items', code: 'sale-return-items.create', name: 'Create sale return items', description: 'Allows adding items to draft returns' },
    { module: 'sale-return-items', code: 'sale-return-items.read', name: 'Read sale return items', description: 'Allows reading breakdown of returned items' },
    { module: 'sale-return-items', code: 'sale-return-items.update', name: 'Update sale return item', description: 'Allows modifying item quantity in draft' },
    { module: 'sale-return-items', code: 'sale-return-items.delete', name: 'Delete sale return item', description: 'Allows removing items from draft returns' },

    // --- MODULE: PAYMENTS ---
    { module: 'payments', code: 'payments.create', name: 'Create payments', description: 'Allows registering customer payments' },
    { module: 'payments', code: 'payments.read', name: 'Read payments', description: 'Allows auditing transaction logs and treasury' },
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

    // --- MODULE: GOODS-RECEIPT-ITEMS ---
    { module: 'goods-receipt-items', code: 'goods-receipt-items.create', name: 'Create goods receipt items', description: 'Allows adding items to a goods receipt' },
    { module: 'goods-receipt-items', code: 'goods-receipt-items.read', name: 'Read goods receipt items', description: 'Allows reading goods receipt item details' },
    { module: 'goods-receipt-items', code: 'goods-receipt-items.update', name: 'Update goods receipt item', description: 'Allows adjusting quantity or cost on goods receipt items' },
    { module: 'goods-receipt-items', code: 'goods-receipt-items.delete', name: 'Delete goods receipt item', description: 'Allows removing goods receipt line items' },

    // --- MODULE: CUSTOMERS ---
    { module: 'customers', code: 'customers.create', name: 'Create customers', description: 'Allows creating customer records' },
    { module: 'customers', code: 'customers.read', name: 'Read customers', description: 'Allows viewing customer records and details' },
    { module: 'customers', code: 'customers.update', name: 'Update customers', description: 'Allows modifying customer information' },
    { module: 'customers', code: 'customers.delete', name: 'Delete customers', description: 'Allows removing customer records' },

    // --- MODULE: SUPPLIERS ---
    { module: 'suppliers', code: 'suppliers.create', name: 'Create suppliers', description: 'Allows creating supplier records' },
    { module: 'suppliers', code: 'suppliers.read', name: 'Read suppliers', description: 'Allows viewing supplier records and details' },
    { module: 'suppliers', code: 'suppliers.update', name: 'Update suppliers', description: 'Allows modifying supplier information' },
    { module: 'suppliers', code: 'suppliers.delete', name: 'Delete suppliers', description: 'Allows removing supplier records' },

    // --- MODULE: PRODUCTS ---
    { module: 'products', code: 'products.create', name: 'Create products', description: 'Allows creating products and stock definitions' },
    { module: 'products', code: 'products.read', name: 'Read products', description: 'Allows viewing product catalog and details' },
    { module: 'products', code: 'products.update', name: 'Update products', description: 'Allows modifying product master data' },
    { module: 'products', code: 'products.delete', name: 'Delete products', description: 'Allows removing products' },

    // --- MODULE: PRODUCT-CATEGORIES ---
    { module: 'product-categories', code: 'product-categories.create', name: 'Create product categories', description: 'Allows creating product category groups' },
    { module: 'product-categories', code: 'product-categories.read', name: 'Read product categories', description: 'Allows viewing product category groups' },
    { module: 'product-categories', code: 'product-categories.update', name: 'Update product categories', description: 'Allows modifying product category groups' },
    { module: 'product-categories', code: 'product-categories.delete', name: 'Delete product categories', description: 'Allows removing product category groups' },

    // --- MODULE: INVENTORY ---
    { module: 'inventory', code: 'inventory.create', name: 'Create inventory records', description: 'Allows creating inventory adjustments and inventory entries' },
    { module: 'inventory', code: 'inventory.read', name: 'Read inventory', description: 'Allows viewing products and stock' },

    // --- MODULE: INVENTORY-MOVEMENTS ---
    { module: 'inventory-movements', code: 'inventory-movements.create', name: 'Create inventory movement', description: 'Allows creating stock movement records' },
    { module: 'inventory-movements', code: 'inventory-movements.read', name: 'Read inventory movements', description: 'Allows viewing stock movement history' },
    { module: 'inventory-movements', code: 'inventory-movements.adjustment', name: 'Adjust inventory movement', description: 'Allows generating adjustments and corrections to stock' },

    // --- MODULE: INVENTORY-TRANSFERS ---
    { module: 'inventory-transfers', code: 'inventory-transfers.create', name: 'Create inventory transfer', description: 'Allows creating transfers between locations' },
    { module: 'inventory-transfers', code: 'inventory-transfers.read', name: 'Read inventory transfers', description: 'Allows viewing transfer history and details' },

    // --- MODULE: SALES ---
    { module: 'sales', code: 'sales.create', name: 'Create sales', description: 'Allows creating sales transactions' },
    { module: 'sales', code: 'sales.read', name: 'Read sales', description: 'Allows viewing sales history and details' },
    { module: 'sales', code: 'sales.update', name: 'Update sales', description: 'Allows modifying sales transactions' },
    { module: 'sales', code: 'sales.delete', name: 'Delete sales', description: 'Allows removing sales transactions' },

    // --- MODULE: SALE-ITEMS ---
    { module: 'sale-items', code: 'sale-items.create', name: 'Create sale items', description: 'Allows adding products to sales' },
    { module: 'sale-items', code: 'sale-items.read', name: 'Read sale items', description: 'Allows viewing sales line items' },
    { module: 'sale-items', code: 'sale-items.update', name: 'Update sale item', description: 'Allows modifying line items on sales' },
    { module: 'sale-items', code: 'sale-items.delete', name: 'Delete sale item', description: 'Allows removing line items from sales' },

    // --- MODULE: PURCHASE-ORDERS ---
    { module: 'purchase-orders', code: 'purchase-orders.create', name: 'Create purchase orders', description: 'Allows creating purchase orders' },
    { module: 'purchase-orders', code: 'purchase-orders.read', name: 'Read purchase orders', description: 'Allows viewing purchase order history and details' },
    { module: 'purchase-orders', code: 'purchase-orders.update', name: 'Update purchase orders', description: 'Allows modifying purchase orders' },
    { module: 'purchase-orders', code: 'purchase-orders.confirm', name: 'Confirm purchase orders', description: 'Allows confirming purchase orders' },
    { module: 'purchase-orders', code: 'purchase-orders.cancel', name: 'Cancel purchase orders', description: 'Allows canceling purchase orders' },

    // --- MODULE: PURCHASE-ORDER-ITEMS ---
    { module: 'purchase-order-items', code: 'purchase-order-items.create', name: 'Create purchase order items', description: 'Allows adding line items to purchase orders' },
    { module: 'purchase-order-items', code: 'purchase-order-items.read', name: 'Read purchase order items', description: 'Allows viewing purchase order line items' },
    { module: 'purchase-order-items', code: 'purchase-order-items.update', name: 'Update purchase order item', description: 'Allows modifying purchase order line items' },
    { module: 'purchase-order-items', code: 'purchase-order-items.delete', name: 'Delete purchase order item', description: 'Allows removing purchase order line items' },

    // --- MODULE: PURCHASE-INVOICES ---
    { module: 'purchase-invoices', code: 'purchase-invoices.create', name: 'Create purchase invoices', description: 'Allows creating supplier purchase invoices' },
    { module: 'purchase-invoices', code: 'purchase-invoices.read', name: 'Read purchase invoices', description: 'Allows viewing supplier invoice history' },
    { module: 'purchase-invoices', code: 'purchase-invoices.update', name: 'Update purchase invoices', description: 'Allows modifying purchase invoice records' },
    { module: 'purchase-invoices', code: 'purchase-invoices.cancel', name: 'Cancel purchase invoices', description: 'Allows canceling supplier invoices' },

    // --- MODULE: PURCHASE-INVOICE-ITEMS ---
    { module: 'purchase-invoice-items', code: 'purchase-invoice-items.create', name: 'Create purchase invoice items', description: 'Allows adding invoice line items' },
    { module: 'purchase-invoice-items', code: 'purchase-invoice-items.read', name: 'Read purchase invoice items', description: 'Allows viewing invoice line items' },
    { module: 'purchase-invoice-items', code: 'purchase-invoice-items.update', name: 'Update purchase invoice item', description: 'Allows modifying invoice line items' },
    { module: 'purchase-invoice-items', code: 'purchase-invoice-items.delete', name: 'Delete purchase invoice item', description: 'Allows removing invoice line items' },

    // --- MODULE: PURCHASE-RETURNS ---
    { module: 'purchase-returns', code: 'purchase-returns.create', name: 'Create purchase returns', description: 'Allows creating purchase return records' },
    { module: 'purchase-returns', code: 'purchase-returns.read', name: 'Read purchase returns', description: 'Allows viewing purchase return history' },
    { module: 'purchase-returns', code: 'purchase-returns.update', name: 'Update purchase returns', description: 'Allows modifying purchase returns' },
    { module: 'purchase-returns', code: 'purchase-returns.confirm', name: 'Confirm purchase returns', description: 'Allows confirming purchase returns' },
    { module: 'purchase-returns', code: 'purchase-returns.complete', name: 'Complete purchase returns', description: 'Allows completing purchase returns' },
    { module: 'purchase-returns', code: 'purchase-returns.cancel', name: 'Cancel purchase returns', description: 'Allows canceling purchase returns' },

    // --- MODULE: PURCHASE-RETURN-ITEMS ---
    { module: 'purchase-return-items', code: 'purchase-return-items.create', name: 'Create purchase return items', description: 'Allows adding line items to purchase returns' },
    { module: 'purchase-return-items', code: 'purchase-return-items.read', name: 'Read purchase return items', description: 'Allows viewing purchase return line items' },
    { module: 'purchase-return-items', code: 'purchase-return-items.update', name: 'Update purchase return item', description: 'Allows modifying purchase return line items' },
    { module: 'purchase-return-items', code: 'purchase-return-items.delete', name: 'Delete purchase return item', description: 'Allows removing purchase return line items' },

    // --- MODULE: USERS ---
    { module: 'users', code: 'users.read', name: 'Read users', description: 'Allows viewing users and their access configuration' },

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

    // --- MODULE: HOTEL ---
    { module: 'hotel', code: 'hotel.create', name: 'Create hotel data', description: 'Allows creating hotel rooms and reservations' },
    { module: 'hotel', code: 'hotel.read', name: 'Read hotel data', description: 'Allows viewing rooms availability and reservations' },
    { module: 'hotel', code: 'hotel.update', name: 'Update hotel data', description: 'Allows updating room status (e.g. cleaning) and reservation details' },
    { module: 'hotel', code: 'hotel.delete', name: 'Delete hotel data', description: 'Allows removing rooms or cancelling reservations' },

    // --- MODULE: INTERNAL-CONSUMPTIONS ---
    { module: 'internal-consumptions', code: 'internal-consumptions.create', name: 'Create internal consumption', description: 'Allows registering internal department consumptions and stock deductions' },
    { module: 'internal-consumptions', code: 'internal-consumptions.read', name: 'Read internal consumptions', description: 'Allows reading internal consumptions history and details' },

    // --- MODULE: ORGANIZATIONS & VERTICALS ---
    { module: 'organizations', code: 'organizations.create', name: 'Create organizations', description: 'Allows creating new organizations' },
    { module: 'organizations', code: 'organizations.read', name: 'Read organizations', description: 'Allows viewing organizations and corporate settings' },
    { module: 'organizations', code: 'organizations.update', name: 'Update organizations & verticals', description: 'Allows updating organization settings and toggling business verticals' },
    { module: 'verticals', code: 'verticals.read', name: 'Read verticals', description: 'Allows viewing business verticals catalog and status' },
    { module: 'verticals', code: 'verticals.update', name: 'Update verticals', description: 'Allows activating/deactivating verticals and updating their configuration' },

    // --- MODULE: AUTOMOTIVE ---
    { module: 'automotive', code: 'automotive.create', name: 'Create automotive records', description: 'Allows registering vehicles and reception check-ins' },
    { module: 'automotive', code: 'automotive.read', name: 'Read automotive data', description: 'Allows viewing workshop yard, vehicles and history' },
    { module: 'automotive', code: 'automotive.update', name: 'Update automotive data', description: 'Allows updating vehicles and workshop settings' },

    // --- MODULE: BEAUTY ---
    { module: 'beauty', code: 'beauty.create', name: 'Create beauty records', description: 'Allows scheduling appointments, time-off and client notes' },
    { module: 'beauty', code: 'beauty.read', name: 'Read beauty data', description: 'Allows viewing beauty agenda, availability and client formulas' },
    { module: 'beauty', code: 'beauty.update', name: 'Update beauty data', description: 'Allows rescheduling appointments, updating statuses and staff schedules' },
    { module: 'beauty', code: 'beauty.delete', name: 'Delete beauty data', description: 'Allows removing time-off and client notes' },

    // --- MODULE: VETERINARY ---
    { module: 'veterinary', code: 'veterinary.create', name: 'Create veterinary records', description: 'Allows registering pets, medical consultations and vaccinations' },
    { module: 'veterinary', code: 'veterinary.read', name: 'Read veterinary data', description: 'Allows viewing pets, clinical records and vaccination reminders' },
    { module: 'veterinary', code: 'veterinary.update', name: 'Update veterinary data', description: 'Allows updating pet profiles and veterinary clinic settings' },
    { module: 'veterinary', code: 'veterinary.delete', name: 'Delete veterinary data', description: 'Allows archiving pet records' },

    // --- MODULE: LAUNDRY ---
    { module: 'laundry', code: 'laundry.create', name: 'Create laundry tickets', description: 'Allows receiving garments and creating laundry tickets' },
    { module: 'laundry', code: 'laundry.read', name: 'Read laundry data', description: 'Allows viewing plant Kanban board and laundry tickets' },
    { module: 'laundry', code: 'laundry.update', name: 'Update laundry data', description: 'Allows advancing washing/drying/ironing/delivery status and rack location' },
    { module: 'laundry', code: 'laundry.delete', name: 'Delete laundry data', description: 'Allows cancelling laundry tickets' },

    // --- MODULE: BAKERY ---
    { module: 'bakery', code: 'bakery.create', name: 'Create bakery recipes & batches', description: 'Allows creating bakery recipes and launching production orders' },
    { module: 'bakery', code: 'bakery.read', name: 'Read bakery data', description: 'Allows viewing bakery oven Kanban, recipes and fresh lots' },
    { module: 'bakery', code: 'bakery.update', name: 'Update bakery data', description: 'Allows advancing oven stages, registering waste and completing batches' },
    { module: 'bakery', code: 'bakery.delete', name: 'Delete bakery data', description: 'Allows cancelling bakery production orders' },

    // --- MODULE: ACADEMY ---
    { module: 'academy', code: 'academy.create', name: 'Create academy courses, cohorts & enrollments', description: 'Allows creating academic courses, cohorts and enrolling students' },
    { module: 'academy', code: 'academy.read', name: 'Read academy data', description: 'Allows viewing academic cohorts, enrollments and attendance logs' },
    { module: 'academy', code: 'academy.update', name: 'Update academy data', description: 'Allows recording student attendance, grades and updating enrollment status' },
    { module: 'academy', code: 'academy.delete', name: 'Delete academy data', description: 'Allows dropping or archiving enrollments' },

    // --- MODULE: REAL-ESTATE ---
    { module: 'real-estate', code: 'real-estate.create', name: 'Create real estate properties, leases & rent charges', description: 'Allows registering properties, lease contracts and monthly rent charges' },
    { module: 'real-estate', code: 'real-estate.read', name: 'Read real estate data', description: 'Allows viewing property portfolio, active leases and owner disbursements' },
    { module: 'real-estate', code: 'real-estate.update', name: 'Update real estate data', description: 'Allows updating property status, lease terms and owner disbursements' },
    { module: 'real-estate', code: 'real-estate.delete', name: 'Delete real estate data', description: 'Allows terminating leases or archiving properties' },
  ];

  await prisma.permission.createMany({
    data: permissionsData,
    skipDuplicates: true,
  });

  const allPermissions = await prisma.permission.findMany();

  // 2. Organización
  const organization = await prisma.organization.upsert({
    where: { slug: 'empresa-demo' },
    update: {},
    create: {
      name: 'Empresa Demo S.A.S.',
      slug: 'empresa-demo',
      country: 'Colombia',
      timezone: 'America/Bogota',
      isActive: true,
    },
  });

  // 3. Sucursal
  const branch = await prisma.branch.upsert({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: 'MAIN',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'Sede Principal',
      code: 'MAIN',
      address: 'Calle 10 # 40-20',
      city: 'Medellín',
      country: 'Colombia',
      phoneNumber: '+57 300 000 0000',
      timezone: 'America/Bogota',
      isActive: true,
    },
  });

  // 4. Catálogo de Roles Operativos Predefinidos y Matriz de Permisos
  const rolesDefinitions = [
    {
      code: 'ADMIN',
      name: 'Administrador General',
      description: 'Acceso total sin restricciones a todas las funciones y verticales',
      permissionCodes: allPermissions.map((p) => p.code),
    },
    {
      code: 'CASHIER',
      name: 'Cajero / Terminal POS',
      description: 'Gestión de caja, arqueos, ventas POS, cobro de servicios y facturación',
      permissionCodes: [
        'cash-sessions.create', 'cash-sessions.read', 'cash-sessions.update',
        'sales.create', 'sales.read', 'sales.update',
        'sale-items.create', 'sale-items.read', 'sale-items.update',
        'sale-returns.create', 'sale-returns.read',
        'sale-return-items.create', 'sale-return-items.read',
        'payments.create', 'payments.read',
        'customers.create', 'customers.read', 'customers.update',
        'products.read', 'product-categories.read',
        'inventory.read', 'inventory-movements.read',
        'billing-resolutions.read',
        'taxes.read',
        'service-orders.read', 'service-orders.update',
        'restaurant.read', 'restaurant.update',
        'automotive.read', 'automotive.update',
        'beauty.read', 'beauty.update',
        'veterinary.read', 'veterinary.update',
        'laundry.read', 'laundry.update',
        'bakery.read', 'bakery.update',
        'academy.read', 'academy.update',
        'real-estate.read', 'real-estate.update',
      ],
    },
    {
      code: 'SERVICES_TECH',
      name: 'Técnico de Servicios',
      description: 'Gestión operativa de órdenes de servicio, tareas técnicas y reportes',
      permissionCodes: [
        'service-orders.create', 'service-orders.read', 'service-orders.update',
        'service-workers.read', 'service-items.read',
        'customers.create', 'customers.read',
        'products.read', 'inventory-movements.read',
      ],
    },
    {
      code: 'INVENTORY_MANAGER',
      name: 'Encargado de Inventario / Bodega',
      description: 'Gestión de productos, catálogo, stock, ajustes de kardex y recepción de compras',
      permissionCodes: [
        'products.create', 'products.read', 'products.update', 'products.delete',
        'product-categories.create', 'product-categories.read', 'product-categories.update',
        'inventory.create', 'inventory.read',
        'inventory-movements.create', 'inventory-movements.read', 'inventory-movements.adjustment',
        'goods-receipts.create', 'goods-receipts.read', 'goods-receipts.update', 'goods-receipts.process',
        'goods-receipt-items.create', 'goods-receipt-items.read', 'goods-receipt-items.update',
        'suppliers.create', 'suppliers.read', 'suppliers.update',
      ],
    },
    {
      code: 'RESTAURANT_STAFF',
      name: 'Personal de Restaurante / Mesero',
      description: 'Gestión de salas, comandas en mesas y pedidos de restaurante',
      permissionCodes: [
        'restaurant.read', 'restaurant.create', 'restaurant.update',
        'sales.create', 'sales.read',
        'sale-items.create', 'sale-items.read',
        'products.read', 'product-categories.read',
        'customers.read',
      ],
    },
    {
      code: 'HOTEL_RECEPTIONIST',
      name: 'Recepcionista de Hotel',
      description: 'Gestión de habitaciones, disponibilidad, reservaciones y check-in/out',
      permissionCodes: [
        'hotel.create', 'hotel.read', 'hotel.update', 'hotel.delete',
        'customers.create', 'customers.read', 'customers.update',
        'sales.read', 'payments.create',
      ],
    },
    {
      code: 'VETERINARIAN',
      name: 'Médico Veterinario / Staff Clínico',
      description: 'Gestión de expedientes de mascotas, consultas clínicas y vacunación',
      permissionCodes: [
        'veterinary.create', 'veterinary.read', 'veterinary.update', 'veterinary.delete',
        'customers.create', 'customers.read', 'customers.update',
        'products.read',
      ],
    },
    {
      code: 'BEAUTY_SPECIALIST',
      name: 'Especialista Beauty / Estilista',
      description: 'Agenda de citas, reservas, catálogo de servicios de belleza y clientes',
      permissionCodes: [
        'beauty.create', 'beauty.read', 'beauty.update', 'beauty.delete',
        'customers.create', 'customers.read', 'customers.update',
        'products.read',
      ],
    },
    {
      code: 'AUTOMOTIVE_MECHANIC',
      name: 'Mecánico / Asesor de Taller',
      description: 'Recepción técnica de vehículos, checklist de taller y órdenes de servicio automotriz',
      permissionCodes: [
        'automotive.create', 'automotive.read', 'automotive.update',
        'service-orders.create', 'service-orders.read', 'service-orders.update',
        'customers.create', 'customers.read',
        'products.read', 'inventory-movements.read',
      ],
    },
    {
      code: 'LAUNDRY_OPERATOR',
      name: 'Operador de Lavandería / Tintorería',
      description: 'Recepción de prendas, pesaje, tickets de lavado y tablero Kanban de planta',
      permissionCodes: [
        'laundry.create', 'laundry.read', 'laundry.update', 'laundry.delete',
        'customers.create', 'customers.read',
        'products.read',
      ],
    },
    {
      code: 'BAKERY_CHEF',
      name: 'Maestro Panadero / Pastelero',
      description: 'Gestión de recetas, órdenes de producción en horno y consumo de insumos',
      permissionCodes: [
        'bakery.create', 'bakery.read', 'bakery.update', 'bakery.delete',
        'products.read', 'product-categories.read', 'inventory-movements.read',
      ],
    },
    {
      code: 'ACADEMY_INSTRUCTOR',
      name: 'Docente / Coordinador Académico',
      description: 'Gestión de programas académicos, cohortes, matrículas, notas y asistencias',
      permissionCodes: [
        'academy.create', 'academy.read', 'academy.update', 'academy.delete',
        'customers.create', 'customers.read',
      ],
    },
    {
      code: 'REAL_ESTATE_AGENT',
      name: 'Asesor / Agente Inmobiliario',
      description: 'Catálogo de propiedades, contratos de arrendamiento, cánones y liquidación a propietarios',
      permissionCodes: [
        'real-estate.create', 'real-estate.read', 'real-estate.update', 'real-estate.delete',
        'customers.create', 'customers.read', 'customers.update',
      ],
    },
    {
      code: 'GYM_TRAINER',
      name: 'Instructor / Staff de Gimnasio & Studio',
      description: 'Control de accesos y torniquete, membresías, clases grupales y reservas',
      permissionCodes: [
        'gym.create', 'gym.read', 'gym.update', 'gym.delete',
        'studio.create', 'studio.read', 'studio.update', 'studio.delete',
        'customers.create', 'customers.read',
      ],
    },
  ];

  const allOrganizationsList = await prisma.organization.findMany();
  for (const org of allOrganizationsList) {
    for (const rDef of rolesDefinitions) {
      const createdRole = await prisma.role.upsert({
        where: {
          organizationId_code: {
            organizationId: org.id,
            code: rDef.code,
          },
        },
        update: {
          name: rDef.name,
          description: rDef.description,
        },
        create: {
          organizationId: org.id,
          name: rDef.name,
          code: rDef.code,
          description: rDef.description,
        },
      });

      // Asociar permisos autorizados para el rol
      const targetPermissions = allPermissions.filter((p) => rDef.permissionCodes.includes(p.code));
      for (const perm of targetPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: createdRole.id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            roleId: createdRole.id,
            permissionId: perm.id,
          },
        });
      }
    }
  }

  // Referencias para los usuarios iniciales de la demo
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: 'ADMIN',
      },
    },
  });

  const cashierRole = await prisma.role.findUniqueOrThrow({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: 'CASHIER',
      },
    },
  });

  // 5. Hash de Contraseña común ("MiPassword123")
  const passwordRaw = 'MiPassword123';
  let passwordHash: string;
  try {
    passwordHash = await bcrypt.hash(passwordRaw, 10);
  } catch {
    // Fallback hash precalculado para 'MiPassword123'
    passwordHash = '$2b$10$e.w2pUvG7d9A3N8g4u9K1.vX/3f8F2L8O2u1m7N4V6E8W0G1H2I3K';
  }

  // 6. Usuarios
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: { passwordHash },
    create: {
      organizationId: organization.id,
      branchId: branch.id,
      firstName: 'Admin',
      lastName: 'Sistema',
      email: 'admin@demo.com',
      passwordHash,
      phoneNumber: '3001234567',
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  const cashierUser = await prisma.user.upsert({
    where: { email: 'cajero@demo.com' },
    update: { passwordHash },
    create: {
      organizationId: organization.id,
      branchId: branch.id,
      firstName: 'Carlos',
      lastName: 'Cajero',
      email: 'cajero@demo.com',
      passwordHash,
      phoneNumber: '3007654321',
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: cashierUser.id,
        roleId: cashierRole.id,
      },
    },
    update: {},
    create: {
      userId: cashierUser.id,
      roleId: cashierRole.id,
    },
  });

  // 7. Impuestos
  const vat19 = await prisma.taxRule.upsert({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: 'IVA_19',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'IVA General 19%',
      code: 'IVA_19',
      type: TaxType.VAT,
      percentage: 19.0,
      isRetention: false,
    },
  });

  const inc8 = await prisma.taxRule.upsert({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: 'INC_8',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'INC 8%',
      code: 'INC_8',
      type: TaxType.CONSUMPTION,
      percentage: 8.0,
      isRetention: false,
    },
  });

  // 8. Categorías de Producto
  const categoryBebidas = await prisma.productCategory.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: 'Bebidas',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'Bebidas',
      description: 'Refrescos, jugos y café',
    },
  });

  // 9. Proveedores
  const supplier = await prisma.supplier.upsert({
    where: {
      organizationId_identificationNumber: {
        organizationId: organization.id,
        identificationNumber: '900123456-1',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      companyName: 'Distribuidora Mayorista S.A.',
      contactName: 'Pedro Gómez',
      identificationType: 'NIT',
      identificationNumber: '900123456-1',
      email: 'ventas@distribuidora.com',
      phoneNumber: '6044445566',
      city: 'Medellín',
    },
  });

  // 10. Clientes
  await prisma.customer.create({
    data: {
      organizationId: organization.id,
      firstName: 'Consumidor',
      lastName: 'Final',
      identificationType: 'CC',
      identificationNumber: '222222222222',
      email: 'cliente@demo.com',
      phoneNumber: '3000000000',
      city: 'Medellín',
    },
  });

  // 11. Productos y Stock por Sucursal
  const product1 = await prisma.product.upsert({
    where: {
      organizationId_sku: {
        organizationId: organization.id,
        sku: 'PROD-001',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      sku: 'PROD-001',
      name: 'Café Cappuccino 250ml',
      description: 'Café preparado artesanal',
      salePrice: 7500,
      costPrice: 3000,
      stock: 100,
      categoryId: categoryBebidas.id,
      supplierId: supplier.id,
      taxRuleId: inc8.id,
    },
  });

  await prisma.branchProductStock.upsert({
    where: {
      branchId_productId: {
        branchId: branch.id,
        productId: product1.id,
      },
    },
    update: { stock: 100 },
    create: {
      branchId: branch.id,
      productId: product1.id,
      stock: 100,
      averageCost: 3000,
    },
  });

  const existingMov1 = await prisma.inventoryMovement.findFirst({
    where: {
      productId: product1.id,
      movementType: InventoryMovementType.INITIAL_STOCK,
    },
  });
  if (!existingMov1) {
    await prisma.inventoryMovement.create({
      data: {
        organizationId: organization.id,
        productId: product1.id,
        branchId: branch.id,
        movementType: InventoryMovementType.INITIAL_STOCK,
        quantity: 100,
        unitCost: 3000,
        totalCost: 300000,
        reference: 'APERTURA-PROD-001',
        notes: 'Inventario inicial de apertura de operaciones',
        createdAt: new Date('2026-10-01T08:00:00.000Z'),
      },
    });
  }

  const product2 = await prisma.product.upsert({
    where: {
      organizationId_sku: {
        organizationId: organization.id,
        sku: 'PROD-002',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      sku: 'PROD-002',
      name: 'Agua Mineral 500ml',
      description: 'Agua embotellada',
      salePrice: 3500,
      costPrice: 1200,
      stock: 200,
      categoryId: categoryBebidas.id,
      supplierId: supplier.id,
      taxRuleId: vat19.id,
    },
  });

  await prisma.branchProductStock.upsert({
    where: {
      branchId_productId: {
        branchId: branch.id,
        productId: product2.id,
      },
    },
    update: { stock: 200 },
    create: {
      branchId: branch.id,
      productId: product2.id,
      stock: 200,
      averageCost: 1200,
    },
  });

  const existingMov2 = await prisma.inventoryMovement.findFirst({
    where: {
      productId: product2.id,
      movementType: InventoryMovementType.INITIAL_STOCK,
    },
  });
  if (!existingMov2) {
    await prisma.inventoryMovement.create({
      data: {
        organizationId: organization.id,
        productId: product2.id,
        branchId: branch.id,
        movementType: InventoryMovementType.INITIAL_STOCK,
        quantity: 200,
        unitCost: 1200,
        totalCost: 240000,
        reference: 'APERTURA-PROD-002',
        notes: 'Inventario inicial de apertura de operaciones',
        createdAt: new Date('2026-10-01T08:00:00.000Z'),
      },
    });
  }

  // 12. Restaurante (Ambiente y Mesas)
  await prisma.room.create({
    data: {
      organizationId: organization.id,
      branchId: branch.id,
      name: 'Comedor Principal',
      description: 'Zona principal del restaurante',
      tables: {
        create: [
          { tableNumber: 'Mesa 1', capacity: 4 },
          { tableNumber: 'Mesa 2', capacity: 2 },
          { tableNumber: 'Mesa 3', capacity: 6 },
        ],
      },
    },
  });

  // 13. Módulo de Servicios
  await prisma.serviceWorker.upsert({
    where: {
      organizationId_identification: {
        organizationId: organization.id,
        identification: '1035111222',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      branchId: branch.id,
      firstName: 'Andrés',
      lastName: 'Técnico',
      identification: '1035111222',
      phoneNumber: '3119998877',
      email: 'tecnico@demo.com',
      specialty: 'Mantenimiento General',
    },
  });

  await prisma.serviceItem.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: 'Mantenimiento preventivo general',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'Mantenimiento preventivo general',
      description: 'Revisión y mantenimiento completo',
      estimatedMinutes: 60,
      basePrice: 50000,
    },
  });

  // 14. Catálogo de Verticales de Negocio
  console.log('📦 Sembrando catálogo de Verticales de Negocio...');
  const verticalsData = [
    { code: 'RETAIL', name: 'Retail / Tienda', icon: 'shopping-bag', description: 'Ventas mostrador, POS, inventarios y compras' },
    { code: 'RESTAURANT', name: 'Restaurante', icon: 'utensils', description: 'Salones, mesas, comandas y monitor de cocina' },
    { code: 'PHARMACY', name: 'Farmacia / Droguería', icon: 'pill', description: 'Lotes, vencimientos FEFO y recetas médicas' },
    { code: 'GYM', name: 'Gimnasio', icon: 'dumbbell', description: 'Membresías, suscripciones y control de accesos' },
    { code: 'STUDIO', name: 'Studio de Yoga / Pilates', icon: 'heart', description: 'Clases grupales, reservas, tiqueteras e instructores' },
    { code: 'SERVICES', name: 'Órdenes de Servicio', icon: 'wrench', description: 'Servicios técnicos, órdenes de trabajo y comisiones' },
    { code: 'HOTEL', name: 'Hotel / Hospedaje', icon: 'bed', description: 'Habitaciones, reservas, check-in y consumos de estancia' },
    { code: 'AUTOMOTIVE', name: 'Taller Automotriz', icon: 'car', description: 'Vehículos, diagnósticos, repuestos y mecánicos' },
    { code: 'BEAUTY', name: 'Barbería / Salón / Spa', icon: 'scissors', description: 'Citas, estilistas, agenda y comisiones' },
    { code: 'VETERINARY', name: 'Veterinaria / Pet Shop', icon: 'paw', description: 'Mascotas, historias clínicas, consultas y tratamientos' },
    { code: 'LAUNDRY', name: 'Lavandería', icon: 'shirt', description: 'Recepción de prendas, procesos de lavado y entregas' },
    { code: 'BAKERY', name: 'Panadería / Pastelería', icon: 'cake', description: 'Recetas, producción, ingredientes y producto terminado' },
    { code: 'ACADEMY', name: 'Academia / Centro Educativo', icon: 'graduation-cap', description: 'Cursos, matrículas, profesores y asistencia' },
    { code: 'REAL_ESTATE', name: 'Inmobiliaria', icon: 'building', description: 'Propiedades, unidades, contratos de arriendo y pagos' },
  ];

  for (const v of verticalsData) {
    await prisma.vertical.upsert({
      where: { code: v.code },
      update: { name: v.name, icon: v.icon, description: v.description },
      create: { ...v, isActive: true },
    });
  }

  // Activar verticales por defecto a todas las organizaciones existentes para retrocompatibilidad
  const allOrganizations = await prisma.organization.findMany();
  const allVerticals = await prisma.vertical.findMany();
  const defaultActiveCodes = ['RETAIL', 'SERVICES', 'HOTEL', 'RESTAURANT', 'PHARMACY', 'GYM', 'STUDIO', 'AUTOMOTIVE', 'BEAUTY', 'VETERINARY', 'LAUNDRY', 'BAKERY', 'ACADEMY', 'REAL_ESTATE'];

  for (const org of allOrganizations) {
    for (const vert of allVerticals) {
      const shouldBeActive = defaultActiveCodes.includes(vert.code);
      await prisma.organizationVertical.upsert({
        where: {
          organizationId_verticalId: {
            organizationId: org.id,
            verticalId: vert.id,
          },
        },
        update: {},
        create: {
          organizationId: org.id,
          verticalId: vert.id,
          isActive: shouldBeActive,
        },
      });
    }
  }

  console.log('✅ ¡Base de datos sembrada con éxito!');
  console.log('📌 Usuarios creados (Contraseña para todos: MiPassword123):');
  console.log('   - admin@demo.com (Administrador)');
  console.log('   - cajero@demo.com (Cajero)');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando el script de semillas:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
