# Sprint 2

| ID      | Historia                         | Estado |
| ------- | -------------------------------- | ------ |
| KNA-007 | CRUD Branches                    | ✅      |
| KNA-008 | CRUD Users                       | ✅      |
| KNA-009 | Authentication                   | ✅      |
| KNA-010 | Roles                            | ✅      |
| KNA-011 | Permissions                      | ✅      |
| KNA-012 | RolePermission                   | ✅      |
| KNA-013 | UserRole                         | ✅      |
| KNA-014 | Authorization (PermissionsGuard) | ✅      |

**Sprint 2 completado al 100%.**

# Sprint 3

| ID      | Historia                  | Estado |
| ------- | ------------------------- | ------ |
| KNA-015 | Customers (Core)          | ✅      |
| KNA-016 | Suppliers (Core)          | ✅      |
| KNA-017 | Product Categories (Core) | ✅      |
| KNA-018 | Products (Core)           | ✅      |
| KNA-019 | Inventory (Core)          | ✅      |

**Sprint 3 completado al 100%.**

# Sprint 4

## Objetivo del Sprint 4

Construir el flujo completo de compras para que el inventario se alimente mediante órdenes de compra, desde la creación de la orden hasta la recepción, facturación y devolución, manteniendo control sobre estados, cantidades y relaciones entre documentos.

| ID      | Historia                              | Estado |
| ------- | ------------------------------------- | ------ |
| KNA-020 | Purchase Order — Header               | ✅      |
| KNA-021 | Purchase Order — Items                | ✅      |
| KNA-022 | Receive Purchase Order                | ✅      |
| KNA-023 | Purchase Invoice — Header             | ✅      |
| KNA-024 | Purchase Invoice — Items              | ✅      |
| KNA-025 | Purchase Returns                      | ✅      |
| KNA-026 | Purchase Order Workflow               | ✅      |

**Sprint 4 completado al 100%.**


Sprint 5 — Inventory Operations

Objetivo:

Completar las operaciones fundamentales del inventario,
permitiendo ajustes, transferencias, valoración y trazabilidad
del stock, manteniendo InventoryMovement como fuente de verdad
para las operaciones de inventario.

ID	Historia	Prioridad
KNA-027	Stock Adjustments	✅
KNA-028	Inventory Transfers	✅
KNA-029	Inventory Costing	✅
KNA-030	Stock Balance & Valuation	✅
KNA-031	Inventory History / Kardex	✅
KNA-032	Inventory Validation & Integrity	✅

# Sprint 6 — KUNA Web Foundation & Inventory UI

Objetivo:
Construir la primera interfaz web funcional de KUNA, conectada al backend existente, estableciendo la arquitectura frontend, autenticación, navegación, permisos y los primeros módulos operativos.

| ID      | Historia                        | Estado |
| ------- | ------------------------------- | ------ |
| KNA-033 | Frontend Foundation             | ✅     |
| KNA-034 | Authentication UI               | ✅     |
| KNA-035 | Application Layout & Navigation | ✅     |
| KNA-036 | RBAC Frontend Authorization     | ✅     |
| KNA-037 | Organizations & Branches UI     | ✅     |
| KNA-038 | Products & Categories UI        | ✅     |
| KNA-039 | Inventory Dashboard             | ✅     |
| KNA-040 | Inventory Movements UI          | ✅     |
| KNA-041 | Inventory Adjustments UI        | ✅     |
| KNA-042 | Inventory Transfers UI          | ✅     |
| KNA-043 | Inventory Kardex UI             | ✅     |

**Sprint 6 completado al 100%.**

# Sprint 7 — Procurement & Supply Chain UI

Objetivo:
Construir el flujo completo de compras en la interfaz web de KUNA, permitiendo la administración de proveedores, el control de órdenes de compra, la recepción de mercancía, la facturación y las notas de devolución.

| ID      | Historia                  | Estado |
| ------- | ------------------------- | ------ |
| KNA-044 | Suppliers UI              | ✅      |
| KNA-045 | Purchase Orders Master    | ✅      |
| KNA-046 | Purchase Order Creation   | ✅      |
| KNA-047 | Goods Receipts UI         | ✅      |
| KNA-048 | Purchase Invoices UI      | ✅      |
| KNA-049 | Purchase Returns UI       | ✅      |

**Sprint 7 completado al 100%.**

# Sprint 8 — Access Control & CRM Core

| ID      | Historia                         | Estado |
| ------- | -------------------------------- | ------ |
| KNA-050 | Customers CRM UI                 | ✅      |
| KNA-051 | Users & Staff Directory          | ✅      |
| KNA-052 | Matrix of Roles & Permissions    | ✅      |
| KNA-053 | User-Role Assignment UI          | ✅      |

**Sprint 8 completado al 100%.**

# Sprint 9 — Sales Core & Inventory Integration (Backend Core)

Objetivo:
Desarrollar el motor transaccional de ventas en NestJS, permitiendo emitir facturas con cálculo automático de descuentos, controlar el flujo de estados de los comprobantes, impactar de forma atómica el stock de las sucursales mediante transacciones ACID de Prisma, gestionar devoluciones y resoluciones fiscales.

| ID      | Historia                              | Estado | Alcance |
| ------- | ------------------------------------- | :----: | ------- |
| KNA-053 | Sales Core / Sales Header             |   ✅   | Backend |
| KNA-054 | Sales Items                           |   ✅   | Backend |
| KNA-055 | Sales Calculation & Totals            |   ✅   | Backend |
| KNA-056 | Sales Workflow & Status               |   ✅   | Backend |
| KNA-057 | Sales → Inventory Integration         |   ✅   | Backend |
| KNA-058 | Sales Returns (Maestro-Detalle)       |   ✅   | Backend |
| KNA-059 | Payments & Treasury                   |   ✅   | Backend |
| KNA-060 | Billing / Invoice Data (Resoluciones) |   ✅   | Backend |
| KNA-061 | Sales Validation & Integrity          |   ✅   | Backend |
| KNA-062 | Sales History & Traceability          |   ✅   | Backend |

**Sprint 9 completado al 100% en el área de API/Backend.**

# Sprint 10 — Sales Core & POS Engine (Frontend UI)

| ID      | Historia                          | Estado | Alcance  |
| ------- | --------------------------------- | :----: | -------- |
| KNA-063 | POS Terminal / Sales Interface    |   ⏳   | Frontend |
| KNA-064 | Customer Checkout Link            |   ⏳   | Frontend |
| KNA-065 | Inventory Depletion UI Trigger    |   ⏳   | Frontend |
| KNA-066 | Sales Ledger & Invoicing History  |   ⏳   | Frontend |

