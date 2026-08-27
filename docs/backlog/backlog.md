# KUNA Product Backlog

> Última actualización: 2026-07-24

---

# Estado del Proyecto

| EPIC-01 | Core Platform | 🟢 Completado |
| EPIC-02 | Identity & Security | 🟢 Completado |
| EPIC-03 | Restaurant Operations | ⬜ Pendiente |
| EPIC-04 | Reservations | ⬜ Pendiente |
| EPIC-05 | Inventory | 🟡 En progreso |
| EPIC-06 | Billing | 🟡 En progreso |
| EPIC-07 | Analytics & Reports | ⬜ Pendiente |

---

# EPIC-01 - Core Platform

## Sprint 1

| ID | Historia | Estado |
|----|----------|--------|
| KNA-001 | Inicializar repositorio | ✅ |
| KNA-002 | Configurar NestJS | ✅ |
| KNA-003 | Configurar PostgreSQL | ✅ |
| KNA-004 | Integrar Prisma | ✅ |
| KNA-005 | CRUD Organizations | ✅ |
| KNA-006 | Arquitectura Base | ✅ |
---

## Sprint 2

| ID | Historia | Estado |
|----|----------|--------|
| KNA-007 | CRUD Branches | ✅ |
| KNA-008 | CRUD Users | ✅ |
| KNA-009 | Authentication | ✅ |
| KNA-010 | Roles | ✅ |
| KNA-011 | Permissions | ✅ |
| KNA-012 | RolePermission | ✅ |
| KNA-013 | UserRole | ✅ |
| KNA-014 | Authorization (PermissionsGuard) | ✅ |
---
Sprint 3

KNA-015 – Customers (Core)  | ✅ |
KNA-016 – Suppliers (Core)  | ✅ |
KNA-017 – Categories (Core) | ✅ |
KNA-018 – Products (Core) | ✅ |
KNA-019 – Inventory (Core) | ✅ |
--------------------
---
Sprint 4
Objetivo del Sprint 4

Construir el flujo completo de compras para que el inventario se alimente mediante órdenes de compra, desde la creación de la orden hasta la recepción, facturación y devolución, manteniendo control sobre estados, cantidades y relaciones entre documentos.

KNA	Funcionalidad	Estado
KNA-020	Purchase Order — Header	✅
KNA-021	Purchase Order — Items	✅
KNA-022	Receive Purchase Order	✅
KNA-023	Purchase Invoice — Header	✅
KNA-024	Purchase Invoice — Items	✅
KNA-025	Purchase Returns	✅
KNA-026	Purchase Order Workflow	✅


# KNA-007 - CRUD Branches

## Objetivo

Administrar las sucursales pertenecientes a una organización.

## Reglas de negocio

- La organización debe existir.
- El código de la sucursal debe ser único dentro de la organización.
- Una sucursal nace activa.
- No se eliminan registros físicamente.
- Las consultas devuelven únicamente sucursales activas por defecto.

## Criterios de aceptación

- Crear sucursal.
- Consultar sucursales.
- Consultar una sucursal por ID.
- Actualizar sucursal.
- Desactivar sucursal.
- Validar organización existente.
- Validar código único.

## Checklist técnico

- [x] Modelo Prisma
- [x] Migración
- [x] DTOs
- [x] Service (Create)
- [x] Controller (Create)
- [x] Pruebas Create
- [x] Service (FindAll)
- [x] Controller (FindAll)
- [x] Pruebas FindAll
- [x] Service (FindOne)
- [x] Controller (FindOne)
- [x] Pruebas FindOne
- [x] Service (Update)
- [x] Controller (Update)
- [x] Pruebas Update
- [x] Desactivación lógica (Soft Delete)
- [x] Swagger
- [x] Tests automatizados
- [x] Documentación final
- [x] Commit

---

# Próxima historia

## KNA-008 - CRUD Users

Objetivo de KNA-008

Al finalizar esta historia queremos tener:

✅ Modelo User en Prisma.
✅ Migración.
✅ DTOs.
✅ CRUD completo.
✅ Validaciones.
✅ Soft Delete.
✅ Swagger.
✅ Pruebas en Postman.


---

KNA-008
│
├── Crear módulo Users
├── Crear Controller
├── Crear Service
├── Crear DTOs
├── Implementar create()
├── Implementar findAll()
├── Implementar findOne()
├── Implementar update()
├── Implementar soft delete
├── Swagger
└── Tests

## KNA-009 - Authentication

### Objetivo

Implementar autenticación basada en JWT.

### Tareas

- [ ] Instalar dependencias
- [ ] Configurar módulo Auth
- [ ] Configurar JwtModule
- [ ] Configurar variables de entorno
- [ ] Integrar bcrypt
- [ ] Hashear contraseña en Users
- [ ] Login
- [ ] Generar JWT
- [ ] JwtStrategy
- [ ] JwtAuthGuard
- [ ] Proteger endpoints
- [ ] Swagger
- [ ] Tests
- [ ] Documentación
- [ ] Commit

KNA-010
Roles
Funcionalidad	Estado
Modelo Prisma	✅
Migración	✅
DTO	✅
Create	✅
FindAll	✅
FindOne	✅
Update	✅
Soft Delete	✅
JWT	✅
Swagger	✅
Validaciones	✅
Prisma	✅

KNA-011
Operación	Estado
✅ Create	✔
✅ Validación de código duplicado	✔
✅ FindAll (solo activos)	✔
✅ FindOne	✔
✅ Update	✔
✅ Validación de código duplicado en Update	✔
✅ Soft Delete	✔
✅ FindAll después del Delete	✔
# Decisiones tomadas

## 2026-07-24

- Se adopta NestJS como framework backend.
- Se adopta PostgreSQL como base de datos.
- Se adopta Prisma ORM v6.
- Se utiliza `cuid()` como identificador principal.
- La documentación funcional se organiza en `docs/domains`.
- El seguimiento del proyecto se realiza mediante historias KNA.
- Los servicios implementan primero las reglas de negocio y luego la persistencia.
- Se utilizará desactivación lógica (`isActive`) en lugar de eliminación física.


Sprint 5 — Inventory Operations

Objetivo:

Completar las operaciones fundamentales del inventario,
permitiendo ajustes, transferencias, valoración y trazabilidad
del stock, manteniendo InventoryMovement como fuente de verdad
para las operaciones de inventario.

Propongo estas historias:

ID	Historia	Prioridad
KNA-027	Stock Adjustments	✅
KNA-028	Inventory Transfers	✅
KNA-029	Inventory Costing	✅
KNA-030	Stock Balance & Valuation	✅
KNA-031	Inventory History / Kardex	✅
KNA-032	Inventory Validation & Integrity	✅


Sprint 6 — KUNA Web Foundation & Inventory UI

Objetivo:

Construir la primera interfaz web funcional de KUNA, conectada al backend existente, estableciendo la arquitectura frontend, autenticación, navegación, permisos y los primeros módulos operativos.

Y dividiría las KNA así:

ID	Historia	Prioridad
KNA-033	Frontend Foundation	🔴 Alta ✅ Completada, Axios, Vite, TypeScript y CORS listos.
KNA-034	Authentication UI	🔴 Alta ✅ Completada, Login con decodificación segura de JWT.
KNA-035	Application Layout & Navigation	🔴 Alta ✅ Completada, Sidebar unificado y Topbar corporativo.
KNA-036	RBAC Frontend Authorization	🔴 Alta ✅ Completada, Rutas protegidas y vinculadas a la sesión
KNA-037	Organizations & Branches UI	🔴 Alta ✅ Completada, Pestañas unificadas para sedes de la empresa
KNA-038	Products & Categories UI	🔴 Alta ✅ Completada, Catálogo comercial maestro activo. ✅ Completada,Métricas y KPI de valoración real.
KNA-039	Inventory Dashboard	🟠 Media ✅ Completada,Métricas y KPI de valoración real.
KNA-040	Inventory Movements UI	🟠 Media ✅ Completada,Bitácora de transacciones del Kardex unificado.
KNA-041	Inventory Adjustments UI	🟠 Media ✅ Completada,Formulario atómico de ajustes por conteo físico.
KNA-042	Inventory Transfers UI	🟠 Media ✅ Completada,Guías logísticas de traslados inter-sucursales.
KNA-043	Inventory Kardex UI	🟠 Media ✅ Completada,Auditoría y traza de consistencia por producto.


🎯 Historias de Usuario Propuestas (Sprint 7)IDHistoria de UsuarioPrioridadObjetivo Técnico
KNA-044Suppliers UI🔴 AltaCRUD de Proveedores consumiendo GET/POST/PATCH de /suppliers.
KNA-045Purchase Orders Master🔴 AltaTabla maestra de Órdenes de Compra con filtros por su estado (DRAFT, CONFIRMED).
KNA-046Purchase Order Creation🔴 AltaFormulario maestro-detalle con guardado dinámico de ítems a /purchase-orders.
KNA-047Goods Receipts UI🟠 MediaInterfaz para recibir físicamente las órdenes de compra (ingreso a /goods-receipts).
KNA-048Purchase Invoices UI🟠 MediaRegistro de facturas de proveedores vinculadas a las órdenes (/purchase-invoices).


📋 Historias de Usuario (Backlog del Sprint 8)
ID Historia de UsuarioPrioridad Objetivo Técnico en Vue 3 
KNA-049 Customers CRM UI🔴 AltaTabla maestra y alta de clientes consumiendo GET/POST de /customers.
KNA-050Users & Staff Directory🔴 AltaBitácora de colaboradores de la organización indexados por sucursal (/users).
KNA-051Matrix of Roles & Permissions🔴 AltaPanel con interruptores visuales para activar/desactivar códigos de permisos en un Rol (/roles).
KNA-052User-Role Assignment UI🔴 AltaAsistente dinámico para otorgar o remover cargos a un usuario en caliente (/user-roles).

Para el Sprint 9 — Sales Core & POS Engine (v0.9.0), 
entraremos en la fase más interactiva y crucial del ERP: el motor de ventas y salidas de inventario. 
El objetivo principal será crear la interfaz de facturación que descuente existencias automáticamente de tus sucursales y calcule márgenes comerciales utilizando los costos promedio que ya calcula tu backend.
📑 Backlog del Sprint 9: Sales Core & POS Engine
ID Historia de Usuario Prioridad Objetivo Técnico en la Web
KNA-054 POS Terminal / Sales Interface🔴 AltaDiseñar la grilla interactiva del Punto de Venta (POS): un carrito de compras dinámico donde el cajero selecciona productos, ajusta cantidades en caliente y ve el total acumulado.
KNA-055 Customer Checkout Link🔴 AltaPermitir asociar de forma ágil la orden de venta a un cliente de tu base de datos mediante un selector reactivo conectado al módulo de Customers.
KNA-056 Inventory Depletion Engine🔴 AltaConectar el botón de "Emitir Factura / Sellar Venta" con los endpoints transaccionales de ventas del backend para disparar la reducción de stock atómica por sucursal.
KNA-057 Sales Ledger & Invoicing History🟠 MediaCrear la bitácora general de facturas emitidas por la organización para auditar ingresos, devoluciones de clientes y estados de cobro.
