# KUNA Product Backlog

> Última actualización: 2026-10-15

---

# Estado del Proyecto

| EPIC | Módulo / Dominio | Estado |
| --- | --- | :---: |
| EPIC-01 | Core Platform (Organizations, Branches, Users, RBAC) | 🟢 Completado |
| EPIC-02 | Identity, Security & Auth | 🟢 Completado |
| EPIC-03 | Restaurant Operations & KDS | 🟢 Completado |
| EPIC-04 | Reservations & Hospitality (Hotel, Studio, Gym) | 🟢 Completado |
| EPIC-05 | Inventory Core, Kardex, Transfers & Consumptions | 🟢 Completado |
| EPIC-06 | Commercial, Sales, POS & Cash Sessions | 🟢 Completado |
| EPIC-07 | Analytics, BI & Executive Reports | 🟢 Completado |
| EPIC-08 | Multi-Vertical SaaS Architecture & Vertical Catalog | 🟢 Completado |
| EPIC-09 | Retail Industry Vertical | 🟢 Completado |
| EPIC-10 | Automotive & Motorcycle Workshop Vertical | 🟢 Completado |
| EPIC-11 | Beauty, Wellness & Salon Vertical | 🟡 En planificación |

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
KNA-050 Users & Staff Directory🔴 AltaBitácora de colaboradores de la organización indexados por sucursal (/users).
KNA-051 Matrix of Roles & Permissions🔴 AltaPanel con interruptores visuales para activar/desactivar códigos de permisos en un Rol (/roles).
KNA-052 User-Role Assignment UI🔴 AltaAsistente dinámico para otorgar o remover cargos a un usuario en caliente (/user-roles).

Propuesta para las KNA del Sprint 9 Backend

Yo las reorganizaría así:

ID	Historia	Prioridad
KNA-053	Sales Core / Sales Header	🔴 Alta
KNA-054	Sales Items	🔴 Alta
KNA-055	Sales Calculation & Totals	🔴 Alta
KNA-056	Sales Workflow & Status	🔴 Alta
KNA-057	Sales → Inventory Integration	🔴 Alta
KNA-058	Sales Returns	🟠 Media
KNA-059	Payments	🟠 Media
KNA-060	Billing / Invoice Data	🟠 Media
KNA-061	Sales Validation & Integrity	🟠 Media
KNA-062	Sales History & Traceability	🟠 Media

📑 Backlog Corregido del Sprint 10: Sales Core & POS Engine (Frontend UI)IDHistoria de UsuarioPrioridadObjetivo Técnico en la WebKNA-063POS Terminal / Sales Interface🔴 AltaDiseñar la grilla interactiva del Punto de Venta (POS): un carrito de compras dinámico donde el cajero busca productos por SKU/Nombre, ajusta cantidades en caliente y ve subtotales acumulados con descuentos de línea.KNA-064Customer Checkout Link🔴 AltaPermitir asociar de forma ágil la orden de venta activa a un cliente de tu base de datos mediante un selector reactivo conectado a tu API de Customers.KNA-065Payment Assistant & POS Checkout🔴 AltaDiseñar el modal transaccional para seleccionar el método de pago (CASH, CREDIT_CARD, TRANSFER), validar que cubra el monto neto y disparar la llamada HTTP para avanzar la cabecera a CONFIRMED impactando el stock.KNA-066Sales Ledger & Invoicing History🟠 MediaCrear la bitácora general de facturas emitidas por la organización para auditar ingresos históricos, mermas, devoluciones de clientes y estados de cobro.

í tienes el desglose exacto de las Historias de Usuario (KNA) corregidas, ordenadas y secuenciales para que las dejes documentadas e indexadas de inmediato en tus archivos de seguimiento ../../docs/backlog/backlog.md y ROADMAP.md:📑 Backlog Oficial del Sprint 11: Cash Control & POS Treasury (v1.0.0-rc2)IDHistoria de UsuarioPrioridadAlcanceObjetivo Técnico en KUNAKNA-067Cash Sessions Schema🔴 AltaBackendDiseñar el modelo relacional CashSession en Prisma con enums (OPEN, CLOSED) y campos de alta precisión monetaria (Decimal) para auditoría de bóveda.KNA-068Cash Sessions API & Turn Engine🔴 AltaBackendDesarrollar los endpoints granulares de apertura y el algoritmo de Arqueo de Caja automático, cruzando transacciones de payments contra la base inicial.KNA-069POS Lock UI Integration🔴 AltaFrontendImplementar el candado de seguridad color ámbar en Vue 3 para congelar el POS si no hay un turno abierto, inyectando la carga síncrona del catálogo de insumos en caliente.KNA-070Cash Close Out Widget & Audit🔴 AltaFrontendDiseñar el botón de Arqueo y Cierre de Caja en la grilla activa del POS, abriendo un modal interactivo donde el cajero reporta el dinero en físico y el sistema calcula descuadres (Faltante / Sobrante) en tiempo real.

Backlog Oficial del Sprint 12: Sales Returns UI (v1.0.0-rc3)IDHistoria de UsuarioPrioridadAlcanceObjetivo Técnico en la WebKNA-071Sales Returns Directory🔴 AltaFrontendDiseñar la vista general /sale-returns para listar el historial de notas de crédito emitidas por la organización, detallando sucursal, folio y estado (DRAFT, COMPLETED).KNA-072Credit Note Creation Wizard🔴 AltaFrontendDesarrollar el formulario interactivo para dar de alta una devolución, asociándola obligatoriamente a una factura original (saleId) y seleccionando el motivo del reingreso.KNA-073Return Items Selector & Validation🔴 AltaFrontendConstruir la grilla maestro-detalle para añadir los productos a devolver, controlando reactivamente en la interfaz que las cantidades no superen lo vendido originalmente.KNA-074Reintegrate Stock Trigger (ACID)🔴 AltaFrontendConectar el botón de "Procesar y Reingresar Mercancía" con el endpoint /complete del backend para ejecutar el incremento atómico de stock por sucursal y la traza en el Kardex.

Sprint 13
IDHistoria de UsuarioPrioridadAlcanceObjetivo Técnico en KUNAKNA-075Thermal Print Template Layout🔴 AltaFrontendDiseñar el componente estructurado CSS tipo tirilla (80mm o 58mm) con el logo de KUNA, cabecera de la sucursal, datos de la resolución legal, desglose de ítems, totales financieros y sección de cambio.KNA-076POS Success Printing Modal🔴 AltaFrontendDesarrollar una ventana emergente o modal de éxito al finalizar la venta en handleFinalizeSale, permitiendo al cajero disparar el comando nativo de impresión con un clic.KNA-077Native Browser Print Driver Trigger🟠 MediaFrontendImplementar las directivas @media print en Tailwind / CSS para ocultar el menú lateral, la barra de navegación y los botones, asegurando que la impresora térmica reciba únicamente el cuerpo del recibo limpio.KNA-078Ledger Historical Re-Print Trigger🟠 MediaFrontendAñadir un botón de acción en la bitácora contable de la ruta /sales para permitir re-imprimir cualquier factura histórica emitida en el pasado.

# Sprint 14 — Customers & CRM Module (Frontend UI)

| ID      | Historia                          | Estado | Alcance  |
| ------- | --------------------------------- | :----: | -------- |
| KNA-079 | Customers Directory Grid          |   ✅   | Frontend |
| KNA-080 | Customer Creation & Upsert Form   |   ✅   | Frontend |

**Sprint 14 completado al 100%.**

# Sprint 15 — Sales Analytics, Reports & Executive Dashboard

Objetivo: Proveer visibilidad estratégica sobre las operaciones comerciales, hábitos de compra y movimiento de stock consolidado por sucursal.

| ID | Historia | Estado | Alcance |
| --- | --- | :---: | --- |
| KNA-081 | Executive KPI Dashboard (Ventas, Ticket Promedio, Margen Bruto) | ✅ | Frontend/Backend |
| KNA-082 | Sales & Performance Reports (Por Sucursal, Canal y Medio de Pago) | ✅ | Frontend/Backend |
| KNA-083 | Top Sellers & Inventory Turnover Analytics | ✅ | Frontend/Backend |
| KNA-084 | Executive Data Export Engine (Formatos CSV / Excel / PDF) | ✅ | Frontend/Backend |

**Sprint 15 completado al 100%.**

# Sprint 16 — Restaurant Module & Table Management (Módulo Vertical)

Objetivo: Desarrollar el primer módulo de industria de KUNA para operaciones gastronómicas, integrado nativamente con el motor de POS, inventarios y caja.

| ID | Historia | Estado | Alcance |
| --- | --- | :---: | --- |
| KNA-085 | Room & Table Layout Engine (Salones y Mesas) | ✅ | Frontend/Backend |
| KNA-086 | Order Taking & Waiter Interface (Comandero) | ✅ | Frontend/Backend |
| KNA-087 | Kitchen Display System — KDS (Pantalla de Cocina) | ✅ | Frontend/Backend |
| KNA-088 | Table Checkout & POS Session Integration | ✅ | Frontend/Backend |

**Sprint 16 completado al 100%.**

# Sprint 17 — Accounting, Tax Localization & CxC / CxP Core

Objetivo: Cerrar el ciclo financiero mediante reglas fiscales locales (Latam) y control de cuentas pendientes comerciales y operativas.

| ID | Historia | Estado | Alcance |
| --- | --- | :---: | --- |
| KNA-089 | Latam Tax Engine & Rules (IVA, INC, Retenciones) | ✅ | Frontend/Backend |
| KNA-090 | Sales & Purchase Auxiliary Ledger (Libros Fiscales) | ✅ | Frontend/Backend |
| KNA-091 | Accounts Receivable — CxC (Crédito a Clientes CRM) | ⏳ | Frontend/Backend |
| KNA-092 | Accounts Payable — CxP (Obligaciones con Proveedores) | ⏳ | Frontend/Backend |

---

# Sprint de Gimnasio & Boutique Studios

- **Diseño del Esquema de Base de Datos (Prisma):** Modelos `MembershipPlan`, `Member`/`Customer`, `Subscription`, `AttendanceLog`, `StudioPlan`, `StudioSchedule` y `StudioBooking`.
- **Desarrollo del Backend en NestJS:** Módulos, controladores y servicios para gestionar planes de membresía, inscripción de socios y validación de accesos vigentes.
- **Implementación de Lógica de Cobro y Validación:** Regla de negocio para verificar si una suscripción está activa al momento del ingreso y manejar estados de pago.
- **Diseño del Frontend (Vistas en Vue):** Vistas `GymMembershipPlansView`, `GymSubscriptionsView`, `GymCheckInView`, `StudioPlansView`, `StudioSchedulesView`, `StudioBookingsView` y `StudioCheckInView`.
- **Configuración de Permisos y Semillas:** Códigos de permisos correspondientes al módulo en el script de semillas de Prisma.

---

# Sprint 18 — Technical Services & Work Orders (Módulo Vertical SERVICES)

Objetivo: Gestionar órdenes de servicio técnico, asignación de tareas, operarios y consumo de repuestos.

| ID | Historia | Estado | Alcance |
| --- | --- | :---: | --- |
| KNA-093 | Service Orders Core & Status Engine | ✅ | Backend/Frontend |
| KNA-094 | Service Tasks & Labor Breakdown | ✅ | Backend/Frontend |
| KNA-095 | Service Order Materials & Inventory Depletion | ✅ | Backend/Frontend |
| KNA-096 | Service Technicians Directory & Commissions Ledger | ✅ | Backend/Frontend |
| KNA-097 | Service Profitability & Execution Time Reports | ✅ | Backend/Frontend |

---

# Sprint 19 — Hospitality & Wellness Verticals (HOTEL, GYM, STUDIO)

Objetivo: Habilitar motores específicos para hospedaje hotelero, gestión de gimnasios y boutique studios.

| ID | Historia | Estado | Alcance |
| --- | --- | :---: | --- |
| KNA-098 | Hotel Rooms & Layout Management | ✅ | Backend/Frontend |
| KNA-099 | Hotel Reservations & Guest Check-In/Check-Out | ✅ | Backend/Frontend |
| KNA-100 | Gym Membership Plans & Subscriptions | ✅ | Backend/Frontend |
| KNA-101 | Gym Frontdesk Access Control | ✅ | Backend/Frontend |
| KNA-102 | Studio Credit Plans & Class Schedules | ✅ | Backend/Frontend |
| KNA-103 | Studio Class Booking & Attendance | ✅ | Backend/Frontend |

---

# Sprint 20 — Healthcare & Pharmacy Compliance (Módulo Vertical PHARMACY)

Objetivo: Control de inventario farmacéutico, trazabilidad de lotes, alertas preventivas y recetas.

| ID | Historia | Estado | Alcance |
| --- | --- | :---: | --- |
| KNA-104 | Pharmaceutical Metadata & Sanitary Registration | ✅ | Backend/Frontend |
| KNA-105 | Product Lots & Batch Tracking Architecture | ✅ | Backend/Frontend |
| KNA-106 | Expiration Date Semaphores & Early Alert Dashboard | ✅ | Backend/Frontend |
| KNA-107 | Medical Prescriptions Ledger & Customer Link | ✅ | Backend/Frontend |

---

# Sprint 21 — Multi-Vertical SaaS Platform Architecture (Fase 0)

Objetivo: Arquitectura de verticales desacoplados sobre el Core Empresarial Común.

| ID | Historia | Estado | Alcance |
| --- | --- | :---: | --- |
| KNA-108 | Master Verticals Catalog Model & Seed (14 Verticales) | ✅ | Backend |
| KNA-109 | OrganizationVertical Pivot Table with Custom JSON Settings | ✅ | Backend |
| KNA-110 | Backend Security Guards (`@RequiresVertical()` & `VerticalGuard`) | ✅ | Backend |
| KNA-111 | Reactive Verticals Store in Pinia & Dynamic Sidebar Navigation Filter | ✅ | Frontend |
| KNA-112 | Tenant Verticals Management Tab & Config Modal in Organizations UI | ✅ | Frontend |

---

# Sprint 22 — Retail Industry Vertical (Fase 1)

Objetivo: Capacidades para tiendas y retail, dashboard de márgenes y ventas rápidas.

| ID | Historia | Estado | Alcance |
| --- | --- | :---: | --- |
| KNA-113 | Retail Controller & Service (`/retail/dashboard`, `/retail/config`) | ✅ | Backend |
| KNA-114 | Retail Dashboard View with Stock-Out & Margin Alerts | ✅ | Frontend |
| KNA-115 | Transparent Tenant Header Injection (`x-organization-id`, `x-branch-id`) | ✅ | Frontend/Backend |
| KNA-116 | Quick POS Access & Minimum Margin Enforcement | ✅ | Frontend/Backend |

---

# Sprint 23 — Automotive & Motorcycle Workshop Vertical (Fase 2)

Objetivo: Módulo especializado para talleres automotrices y motos.

| ID | Historia | Estado | Alcance |
| --- | --- | :---: | --- |
| KNA-117 | Vehicle & VehicleCheckIn Relational Prisma Models | ✅ | Backend |
| KNA-118 | Fleet & Patient Clinical Service History Directory (`VehiclesView.vue`) | ✅ | Frontend/Backend |
| KNA-119 | Interactive Technical Reception Sheet with Fuel & Damage Mapping | ✅ | Frontend/Backend |
| KNA-120 | Workshop Yard & Workbays Kanban Board (`AutomotiveDashboardView.vue`) | ✅ | Frontend/Backend |
| KNA-121 | Anti-Double Inventory Deduction Engine between Work Orders and POS | ✅ | Backend |
| KNA-122 | Strict TypeScript Build Sanitization (`vue-tsc` & `nest build` exit 0) | ✅ | Fullstack |

---

# Sprint 24 (Fase 3) — Beauty & Salon Vertical (En Planificación)

| ID | Historia | Estado | Alcance |
| --- | --- | :---: | --- |
| KNA-123 | Stylist & Staff Availability Calendar (`StylistSchedule`) | 📋 Planificado | Backend/Frontend |
| KNA-124 | Appointments & Booking Grid (`Appointment`) | 📋 Planificado | Backend/Frontend |
| KNA-125 | Beauty Service Catalog & Professional Commissions | 📋 Planificado | Backend/Frontend |
| KNA-126 | Customer Beauty History & Formula Notes | 📋 Planificado | Backend/Frontend |
| KNA-127 | POS Checkout Integration with Reusable `Sale` & `CashSession` | 📋 Planificado | Backend/Frontend |



