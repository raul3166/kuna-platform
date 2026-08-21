import { Module } from '@nestjs/common';
import { PrismaModule } from './core/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { BranchesModule } from './modules/branches/branches.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { UserRolesModule } from './modules/user-roles/user-roles.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { ProductsModule } from './modules/products/products.module';
import { ProductCategoriesModule } from './modules/product-categories/product-categories.module';
import { InventoryMovementsModule } from './modules/inventory-movements/inventory-movements.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { PurchaseOrderItemsModule } from './modules/purchase-order-items/purchase-order-items.module';
import { GoodsReceiptsModule } from './modules/goods-receipts/goods-receipts.module';
import { GoodsReceiptItemsModule } from './modules/goods-receipt-items/goods-receipt-items.module';
import { PurchaseInvoicesModule } from './modules/purchase-invoices/purchase-invoices.module';
import { PurchaseInvoiceItemsModule } from './modules/purchase-invoice-items/purchase-invoice-items.module';
import { PurchaseReturnsModule } from './modules/purchase-returns/purchase-returns.module';
import { PurchaseReturnItemsModule } from './modules/purchase-return-items/purchase-return-items.module';
import { InventoryTransfersModule } from './modules/inventory-transfers/inventory-transfers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    OrganizationsModule,
    BranchesModule,
    UsersModule,
    AuthModule,
    RolesModule,
    PermissionsModule,
    UserRolesModule,
    CustomersModule,
    SuppliersModule,
    ProductsModule,
    ProductCategoriesModule,
    InventoryMovementsModule,
    PurchaseOrdersModule,
    PurchaseOrderItemsModule,
    GoodsReceiptsModule,
    GoodsReceiptItemsModule,
    PurchaseInvoicesModule,
    PurchaseInvoiceItemsModule,
    PurchaseReturnsModule,
    PurchaseReturnItemsModule,
    InventoryTransfersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
