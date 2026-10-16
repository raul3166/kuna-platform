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
| KNA-063 | POS Terminal / Sales Interface    |   ✅   | Frontend |
| KNA-064 | Customer Checkout Link            |   ✅   | Frontend |
| KNA-065 | Inventory Depletion UI Trigger    |   ✅   | Frontend |
| KNA-066 | Sales Ledger & Invoicing History  |   ✅   | Frontend |

# Sprint 11 — Cash Control & POS Treasury (Turn Engine)

| ID      | Historia                          | Estado | Alcance  |
| ------- | --------------------------------- | :----: | -------- |
| KNA-067 | Cash Sessions Schema              |   ✅   | Backend  |
| KNA-068 | Cash Sessions API & Turn Engine   |   ✅   | Backend  |
| KNA-069 | POS Lock UI Integration           |   ✅   | Frontend |
| KNA-070 | Cash Close Out Widget & Audit     |   ✅   | Frontend |

**Sprint 11 completado al 100%. El sistema blinda la caja contra desfalcos y calcula descuadres.**

# Sprint 12 — Sales Returns & Credit Notes UI

| ID      | Historia                          | Estado | Alcance  |
| ------- | --------------------------------- | :----: | -------- |
| KNA-071 | Sales Returns Directory           |   ✅   | Frontend |
| KNA-072 | Credit Note Creation Wizard       |   ✅   | Frontend |
| KNA-073 | Return Items Selector & Validation|   ✅   | Frontend |
| KNA-074 | Reintegrate Stock Trigger (ACID)  |   ✅   | Frontend |

**Sprint 12 completado al 100%. Notas de crédito inteligentes con validación anti-fraude y control de saldos.**

# Sprint 13 — POS Receipt Thermal Printing

| ID      | Historia                          | Estado | Alcance  |
| ------- | --------------------------------- | :----: | -------- |
| KNA-075 | Thermal Print Template Layout     |   ✅   | Frontend |
| KNA-076 | POS Success Printing Modal        |   ✅   | Frontend |
| KNA-077 | Native Browser Print Driver Trigger|   ✅   | Frontend |
| KNA-078 | Ledger Historical Re-Print Trigger|   ✅   | Frontend |

**Sprint 13 completado al 100%. Tirilla térmica legal de 80mm acoplada al hardware POS de forma nativa.**

# Sprint 14 — Customers & CRM Module (Frontend UI)

| ID      | Historia                          | Estado | Alcance  |
| ------- | --------------------------------- | :----: | -------- |
| KNA-079 | Customers Directory Grid          |   ✅   | Frontend |
| KNA-080 | Customer Creation & Upsert Form   |   ✅   | Frontend |

# Sprint 16 — Restaurant Module & Table Management (Módulo Vertical)

Objetivo: Desarrollar el primer módulo de industria de KUNA para operaciones gastronómicas, integrado nativamente con el motor de POS, inventarios y caja.

| ID | Historia | Estado | Alcance |
| --- | --- | :---: | --- |
| KNA-085 | Room & Table Layout Engine (Salones y Mesas) | ✅ | Frontend/Backend |
| KNA-086 | Order Taking & Waiter Interface (Comandero) | ✅ | Frontend/Backend |
| KNA-087 | Kitchen Display System — KDS (Pantalla de Cocina) | ✅ | Frontend/Backend |
| KNA-088 | Table Checkout & POS Session Integration | ✅ | Frontend/Backend |

**Sprint 16 completado al 100%.**

---

# Sprint 17 — Accounting, Tax Localization & CxC / CxP Core

Objetivo: Cerrar el ciclo financiero mediante reglas fiscales locales (Latam) y control de cuentas pendientes comerciales y operativas.

| ID | Historia | Estado | Alcance |
| --- | --- | :---: | --- |
| KNA-089 | Latam Tax Engine & Rules (IVA, INC, Retenciones) | ✅ | Frontend/Backend |
| KNA-090 | Sales & Purchase Auxiliary Ledger (Libros Fiscales) | ✅ | Frontend/Backend |
| KNA-091 | Accounts Receivable — CxC (Crédito a Clientes CRM) | ⏳ | Frontend/Backend |
| KNA-092 | Accounts Payable — CxP (Obligaciones con Proveedores) | ⏳ | Frontend/Backend |

**Sprint 17 completado en su núcleo fiscal y libros auxiliares.**

---

# Sprint 18 — Technical Services & Work Orders (Módulo Vertical SERVICES)

Objetivo: Gestionar órdenes de servicio técnico, asignación de tareas, operarios mecánicos/técnicos y consumo de repuestos con liquidación de comisiones.

| ID | Historia | Estado | Alcance |
| --- | --- | :---: | --- |
| KNA-093 | Service Orders Core & Status Engine (Borrador, En Progreso, Completado) | ✅ | Backend/Frontend |
| KNA-094 | Service Tasks & Labor Breakdown | ✅ | Backend/Frontend |
| KNA-095 | Service Order Materials & Inventory Depletion | ✅ | Backend/Frontend |
| KNA-096 | Service Technicians Directory & Commissions Ledger | ✅ | Backend/Frontend |
| KNA-097 | Service Profitability & Execution Time Reports | ✅ | Backend/Frontend |

**Sprint 18 completado al 100%.**

---

# Sprint 19 — Hospitality & Wellness Verticals (HOTEL, GYM, STUDIO)

Objetivo: Habilitar motores específicos para hospedaje hotelero, gestión de gimnasios convencionales y boutique fitness studios (Yoga/Pilates/Barre).

| ID | Historia | Estado | Alcance |
| --- | --- | :---: | --- |
| KNA-098 | Hotel Rooms & Layout Management (Tarifas y Estatus de Limpieza) | ✅ | Backend/Frontend |
| KNA-099 | Hotel Reservations & Guest Check-In/Check-Out Engine | ✅ | Backend/Frontend |
| KNA-100 | Gym Membership Plans & Time-Based Subscriptions | ✅ | Backend/Frontend |
| KNA-101 | Gym Frontdesk Access Control & Attendance Verification | ✅ | Backend/Frontend |
| KNA-102 | Studio Credit Plans & Class Schedules (Aforos y Horarios) | ✅ | Backend/Frontend |
| KNA-103 | Studio Class Booking & Client Attendance Check-In | ✅ | Backend/Frontend |

**Sprint 19 completado al 100%.**

---

# Sprint 20 — Healthcare & Pharmacy Compliance (Módulo Vertical PHARMACY)

Objetivo: Control riguroso de inventario farmacéutico, trazabilidad de lotes, alertas preventivas de caducidad y cumplimiento sanitario.

| ID | Historia | Estado | Alcance |
| --- | --- | :---: | --- |
| KNA-104 | Pharmaceutical Metadata & Sanitary Registration (Invima/FDA) | ✅ | Backend/Frontend |
| KNA-105 | Product Lots & Batch Tracking Architecture | ✅ | Backend/Frontend |
| KNA-106 | Expiration Date Semaphores & Early Alert Dashboard (30/60/90 días) | ✅ | Backend/Frontend |
| KNA-107 | Medical Prescriptions Ledger & Customer Link | ✅ | Backend/Frontend |

**Sprint 20 completado al 100%.**

---

# Sprint 21 — Multi-Vertical SaaS Platform Architecture (Fase 0)

Objetivo: Transformar KUNA en una arquitectura desacoplada donde una organización puede activar uno o múltiples verticales sobre un Core Empresarial Común sin duplicar modelos ni controladores.

| ID | Historia | Estado | Alcance |
| --- | --- | :---: | --- |
| KNA-108 | Master Verticals Catalog Model & Seed (14 Verticales de Industria) | ✅ | Backend |
| KNA-109 | OrganizationVertical Pivot Table with Custom JSON Settings | ✅ | Backend |
| KNA-110 | Backend Security Guards (`@RequiresVertical()` & `VerticalGuard`) | ✅ | Backend |
| KNA-111 | Reactive Verticals Store in Pinia & Dynamic Sidebar Navigation Filter | ✅ | Frontend |
| KNA-112 | Tenant Verticals Management Tab & JSON Config Modal in Organizations UI | ✅ | Frontend |

**Sprint 21 (Fase 0) completado al 100%.**

---

# Sprint 22 — Retail Industry Vertical (Fase 1)

Objetivo: Dotar a KUNA de capacidades avanzadas para tiendas y comercio minorista, métricas de rotación de productos y gestión multi-código de barras.

| ID | Historia | Estado | Alcance |
| --- | --- | :---: | --- |
| KNA-113 | Retail Controller & Service (`/retail/dashboard`, `/retail/config`) | ✅ | Backend |
| KNA-114 | Retail Dashboard View with Stock-Out & Margin Alerts | ✅ | Frontend |
| KNA-115 | Transparent Tenant Header Injection (`x-organization-id`, `x-branch-id`) | ✅ | Frontend/Backend |
| KNA-116 | Quick POS Access & Minimum Margin Enforcement | ✅ | Frontend/Backend |

**Sprint 22 (Fase 1) completado al 100%.**

---

# Sprint 23 — Automotive & Motorcycle Workshop Vertical (Fase 2)

Objetivo: Módulo especializado para talleres mecánicos de carros y motos, gestión de vehículos, recepción técnica con checklist físico y control visual de patio/bahías.

| ID | Historia | Estado | Alcance |
| --- | --- | :---: | --- |
| KNA-117 | Vehicle & VehicleCheckIn Relational Prisma Models | ✅ | Backend |
| KNA-118 | Fleet & Patient Clinical Service History Directory (`VehiclesView.vue`) | ✅ | Frontend/Backend |
| KNA-119 | Interactive Technical Reception Sheet with Fuel & Damage Mapping | ✅ | Frontend/Backend |
| KNA-120 | Workshop Yard & Workbays Kanban Board (`AutomotiveDashboardView.vue`) | ✅ | Frontend/Backend |
| KNA-121 | Anti-Double Inventory Deduction Engine between Work Orders and POS | ✅ | Backend |
| KNA-122 | Strict TypeScript Build Sanitization (`vue-tsc` & `nest build` exit 0) | ✅ | Fullstack |

**Sprint 23 (Fase 2) completado al 100%.**

---

---

# Sprint 24 — Beauty / Salón / Barbería / Spa (Fase 3)

Objetivo: Agenda de citas con profesionales, horarios y fórmulas de cliente, reutilizando `Customer`, `ServiceWorker`, `ServiceItem`, `ServiceOrder` y el POS.

| ID | Historia | Estado | Alcance |
| --- | --- | :---: | --- |
| KNA-123 | Horarios y ausencias de profesionales (`BeautyWorkerSchedule`, `BeautyTimeOff`) | ✅ | Backend/Frontend |
| KNA-124 | Citas y motor de disponibilidad (`Appointment`, `/beauty/availability`) | ✅ | Backend/Frontend |
| KNA-125 | Servicios de belleza y comisiones vía `ServiceItem` / `ServiceOrderTask` | ✅ | Backend/Frontend |
| KNA-126 | Historial del cliente y fórmulas (`BeautyClientNote`) | ✅ | Backend/Frontend |
| KNA-127 | Cobro integrado: cita → Orden de Servicio → POS (`Sale`, `CashSession`) | ✅ | Backend/Frontend |

**Sprint 24 (Fase 3) completado al 100%.**
---

# Sprint 25 — Veterinary & Pet Shop Vertical (Fase 4)

Objetivo: Gestión integral de clínicas veterinarias, peluquería canina/felina (grooming) y Pet Shop, reutilizando `Customer`, `ServiceWorker`, `ServiceItem`, `Product`, `ServiceOrder` y el POS.

| ID | Historia | Estado | Alcance |
| --- | --- | :---: | --- |
| KNA-128 | Modelos Clínicos y Sanitarios (`Pet`, `VetMedicalRecord`, `PetVaccination`) | ✅ | Backend |
| KNA-129 | Directorio de Mascotas y Expediente Clínico Integral (`PetsView.vue`) | ✅ | Backend/Frontend |
| KNA-130 | Consultorio Médico, Constantes Fisiológicas, Recetas y Grooming (`VeterinaryConsultationsView.vue`) | ✅ | Backend/Frontend |
| KNA-131 | Carnet de Vacunación, Desparasitación y Alertas de Refuerzos Próximos | ✅ | Backend/Frontend |
| KNA-132 | Integración Clínica → Orden de Servicio → Descarga de Medicamentos y Cobro POS | ✅ | Backend/Frontend |

**Sprint 25 (Fase 4) completado al 100%.**

---

# Próximos Sprints / Roadmap de Verticales

| Sprint | Vertical | Alcance Previsto | Estado |
| --- | --- | --- | :---: |
| **Sprint 24 (Fase 3)** | **BEAUTY / Salón / Barbería / Spa** | Agenda de citas (`Appointment`), horarios de estilistas, liquidación de comisiones y catálogo de servicios de belleza | ✅ Completado |
| **Sprint 25 (Fase 4)** | **VETERINARY / Veterinaria & Pet Shop** | Expediente clínico de mascotas, recordatorios de vacunación y control de insumos médicos | ✅ Completado |
| **Sprint 26 (Fase 5)** | **LAUNDRY / Lavandería** | Ticket de prendas, peso/kilos, fases de lavado, secado, planchado y entrega | 📋 Planificado |
| **Sprint 27 (Fase 6)** | **BAKERY / Panadería & Pastelería** | Recetas de producción, ingredientes, mermas de horneado y lotes de producto fresco | 📋 Planificado |
| **Sprint 28 (Fase 7)** | **ACADEMY / Centro Educativo** | Matrículas, cursos, grupos, asistencia de estudiantes y cobro de colegiaturas | 📋 Planificado |
| **Sprint 29 (Fase 8)** | **REAL ESTATE / Inmobiliaria** | Propiedades, contratos de arrendamiento, cánones de arrendamiento y propietarios | 📋 Planificado |


