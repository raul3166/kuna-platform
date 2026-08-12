# Changelog

Todas las modificaciones importantes de KUNA Platform serán documentadas en este archivo.

El formato está basado en Keep a Changelog.
Versionado basado en Semantic Versioning.

---
## [0.4.0] - 2026-08-12

### Added

#### KNA-007 - Branches
- CRUD completo de sucursales.
- Validación de organización existente.
- Soft Delete.
- Swagger.
- Validaciones de negocio.

#### KNA-008 - Users
- CRUD completo de usuarios.
- Hash de contraseñas con bcrypt.
- Validación de email único.
- Validación Organization → Branch.
- Soft Delete.

#### KNA-009 - Authentication
- Login JWT.
- JwtStrategy.
- JwtAuthGuard.
- Passport JWT.
- Tokens Bearer.

#### KNA-010 - Roles
- CRUD completo de Roles.
- Validación de organización.
- Código único por organización.
- Soft Delete.

#### KNA-011 - Permissions
- CRUD completo de Permisos.
- Código único.
- Soft Delete.

#### KNA-012 - RolePermission
- Asignación de permisos a roles.
- Eliminación de permisos.
- Prevención de duplicados.
- Validaciones de existencia.

#### KNA-013 - UserRole
- Asignación de roles a usuarios.
- Eliminación de roles.
- Prevención de duplicados.
- Validaciones de existencia.

#### KNA-014 - Authorization
- Decorador @Permissions().
- PermissionsGuard.
- Autorización basada en Roles + Permisos.
- Protección de endpoints mediante permisos.
- Integración completa con JWT.

### Security

- Contraseñas almacenadas usando bcrypt.
- Endpoints protegidos mediante JWT.
- Control de acceso basado en permisos (RBAC).

---

## [0.3.0] - 2026-08-04

### Added

#### KNA-015 - Customers (Core)
- CRUD completo de clientes.
- Validación de organización.
- Soft Delete.
- Swagger.
- Validaciones de negocio.

#### KNA-016 - Suppliers (Core)
- CRUD completo de proveedores.
- Validación de organización.
- Validación de identificación única por organización.
- Soft Delete.
- Swagger.

#### KNA-017 - Product Categories (Core)
- CRUD completo de categorías de productos.
- Validación de organización.
- Nombre único por organización.
- Soft Delete.

#### KNA-018 - Products (Core)
- CRUD completo de productos.
- SKU único por organización.
- Relación con categorías.
- Relación con proveedores.
- Control de estado activo.
- Swagger.

#### KNA-019 - Inventory (Core)
- Modelo InventoryMovement.
- Control automático de stock.
- Movimientos:
  - INITIAL_STOCK
  - PURCHASE
  - SALE
  - PURCHASE_RETURN
  - SALE_RETURN
  - ADJUSTMENT
  - TRANSFER_IN
  - TRANSFER_OUT
- Validaciones de inventario.
- Transacciones mediante Prisma.
- Kardex por producto.
- Balance acumulado.
- Resumen de inventario.
- Swagger.

### Changed

- Los productos ahora administran stock automáticamente mediante InventoryMovement.
- Se centralizó toda la lógica del inventario en un único servicio.

#### KNA-020 - Purchase Orders

- CRUD de órdenes de compra.
- Numeración única por organización.
- Validación de proveedor existente.
- Estados DRAFT y CANCELLED.
- Solo órdenes DRAFT pueden modificarse.
- Solo órdenes DRAFT pueden cancelarse.
- Integración con Swagger.
- Protección mediante JWT.
- Control de acceso RBAC.

## [0.4.0] - 2026-08-12

### Added

#### KNA-020 - Purchase Order — Header

- CRUD de órdenes de compra.
- Numeración única por organización.
- Validación de proveedor existente.
- Estados de órdenes de compra.
- Control de modificación y cancelación según estado.
- Integración con Swagger.
- Protección mediante JWT.
- Control de acceso RBAC.

#### KNA-021 - Purchase Order — Items

- CRUD de ítems de órdenes de compra.
- Validación de producto existente.
- Validación de orden de compra existente.
- Restricción de modificación de ítems a órdenes DRAFT.
- Cálculo automático de subtotal.
- Recalculo automático de subtotal, impuestos y total de la orden.

#### KNA-022 - Receive Purchase Order

- Creación de Goods Receipts.
- Recepción de ítems de órdenes de compra.
- Validación de cantidades recibidas.
- Control de recepción parcial y completa.
- Actualización automática del stock.
- Registro de movimientos de inventario tipo PURCHASE.
- Actualización automática del estado de la orden de compra.
- Integración transaccional mediante Prisma.

#### KNA-023 - Purchase Invoice — Header

- CRUD de encabezados de facturas de compra.
- Relación con proveedores.
- Relación con órdenes de compra.
- Validaciones de documentos.
- Control de estados de factura.
- Protección mediante JWT y RBAC.

#### KNA-024 - Purchase Invoice — Items

- CRUD de ítems de facturas de compra.
- Relación con productos.
- Relación con facturas de compra.
- Cálculo de subtotales.
- Validaciones de cantidades y valores.

#### KNA-025 - Purchase Returns

- Creación de devoluciones a proveedores.
- Gestión de ítems de devolución.
- Actualización de stock.
- Registro de movimientos PURCHASE_RETURN.
- Relación con documentos de compra.
- Validaciones de cantidades devueltas.
- Integración transaccional mediante Prisma.

#### KNA-026 - Purchase Order Workflow

- Flujo de estados de órdenes de compra.
- DRAFT → CONFIRMED.
- CONFIRMED → PARTIALLY_RECEIVED.
- CONFIRMED → RECEIVED.
- Validación de órdenes antes de confirmar.
- Una orden no puede confirmarse sin ítems.
- Validación de cantidades recibidas contra cantidades ordenadas.
- Actualización automática del estado según recepción.
- Integración entre Purchase Orders, Goods Receipts e Inventory.
- Actualización transaccional del stock.
- Trazabilidad mediante InventoryMovement.

### Changed

- El Inventory Core ahora se integra directamente con el flujo de compras.
- Las recepciones de mercancía generan movimientos de inventario automáticamente.
- El stock de productos se actualiza mediante transacciones Prisma.
- Las órdenes de compra mantienen control sobre cantidades ordenadas y recibidas.
