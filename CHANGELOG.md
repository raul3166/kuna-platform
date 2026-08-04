# Changelog

Todas las modificaciones importantes de KUNA Platform serán documentadas en este archivo.

El formato está basado en Keep a Changelog.
Versionado basado en Semantic Versioning.

---
## [0.2.0] - 2026-07-31

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
