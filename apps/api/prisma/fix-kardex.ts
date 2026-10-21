import { PrismaClient, InventoryMovementType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Revisando productos sin movimiento inicial en Supabase...');
  const products = await prisma.product.findMany({
    include: {
      branchStocks: true,
      inventoryMovements: {
        where: { movementType: InventoryMovementType.INITIAL_STOCK },
      },
    },
  });

  for (const product of products) {
    if (product.inventoryMovements.length === 0) {
      const branchStock = product.branchStocks[0];
      const initialQty = 100; // 100 iniciales en seed
      const unitCost = Number(product.costPrice) || 0;
      const totalCost = initialQty * unitCost;

      console.log(`📦 Creando INITIAL_STOCK para [${product.sku}] ${product.name} con ${initialQty} unidades...`);
      await prisma.inventoryMovement.create({
        data: {
          organizationId: product.organizationId,
          productId: product.id,
          branchId: branchStock?.branchId ?? null,
          movementType: InventoryMovementType.INITIAL_STOCK,
          quantity: initialQty,
          unitCost: unitCost,
          totalCost: totalCost,
          reference: `APERTURA-${product.sku}`,
          notes: 'Inventario inicial de apertura de operaciones',
          createdAt: new Date('2026-10-01T08:00:00.000Z'), // Fecha anterior a las ventas
        },
      });
    }
  }

  console.log('✅ ¡Movimientos iniciales creados exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

