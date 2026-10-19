# Releases

## v0.1.0

* Core Platform
* Organizations
* Branches

---

## v0.2.0

* Authentication
* RBAC
* Roles
* Permissions

---

## v0.3.0

* Customers
* Suppliers
* Product Categories
* Products
* Inventory Core

---

## v0.4.0

* Purchase Orders
* Purchase Order Items
* Purchase Order Workflow
* Goods Receipts
* Purchase Invoices
* Purchase Invoice Items
* Purchase Returns
* Inventory integration
* Automatic stock updates
* Purchase inventory movements

---

## v0.5.0

* Stock Adjustments
* Inventory Transfers
* Inventory Costing
* Stock Balance & Valuation
* Inventory History / Kardex
* Inventory Validation & Integrity
* Branch-level inventory control
* Inventory movements as the source of truth

## v0.6.0

* Web Foundation Architecture
* JWT Login & Auto Token Interceptors
* Multi-Tenant Application Layout & Sidebar Navigation
* Corporate & Branch UI Catalogs
* Analytical Stock Dashboard & Real-Time Valuation 
* Inventory Movements Auditor & Physical Adjustments Form
* Inter-Branch Logistical Transfers UI
* Individual Product Analytical Kardex View

## v0.7.0

* Transactional Suppliers Directory with Latam tax selectors
* Purchase Orders Workflow Board (`DRAFT`, `CONFIRMED`, `CANCELLED`)
* Master-Detail Step-by-Step Purchasing Assistant
* Physical Goods Receipts Stock-In Verification Module
* Accounts Payable Purchase Invoices Ledger with Due-Date semaphores
* Supply Chain Reverse Logistics Purchase Returns UI

## v0.8.0

* Customer Relationship Management (CRM) Core View
* Organizational Personnel Audit Directory mapped by Branch
* Reactive Security Control Grid with nested database mapper
* On-the-fly User-Role Assignment Panel utilizing granular DTO overrides

## v0.9.0-backend

* Core Commercial Engine for Sales Headers and granular SaleItems in NestJS.
* High-precision mathematical triggers supporting line-item discounts.
* ACID Multi-Tenant transaction controllers preventing negative branch stocks.
* Semantic InventoryMovement ledger using dedicated 'SALE' and 'CUSTOMER_RETURN' enums.
* Standalone Sales Returns and Independent Payments modules.
* BillingResolution state engine for automated and secure legal invoice sequencing.
* Unit-tested permissions infrastructure mapped to the PostgreSQL database.
## v1.0.0-rc4 (Release Candidate 4)

* Complete Point of Sale (POS) infrastructure uncoupling database state from hot memory.
* Multi-tenant Cash Session manager with automatic cash sales variance accounting.
* Advanced Sale Returns manager enforcing historical purchase caps to block double-refund fraud.
* Embedded 80mm thermal receipt generator using native browser print pipeline overrides.
* Interactive post-sale checkout success workflows and real-time ledger re-printing drivers.

## v1.1.0-rc1

* Full Customers CRM UI Module (KNA-079 & KNA-080).
* Reactive Customer Directory DataGrid with active status filters and contact channels.
* Dynamic Customer Upsert Wizard with structural DTO payload parsing.
* Tax Identification Type selectors tailored for Latam localization (CEDULA, NIT, PASAPORTE, RUT).
* Logical deletion and soft-deactivation trigger integrated with core CRM service.

## v1.2.0-rc1

* **Room & Table Layout Engine:** Mapa de salones e interactividad de mesas en vivo (`AVAILABLE`, `OCCUPIED`).
* **Order Taking & Waiter Interface:** Sistema de comandero conectado a mesas activas con historial por sesión.
* **Kitchen Display System (KDS):** Monitor de cocina en tiempo real con control de tiempos de espera, alertas de demora y visualización de notas de preparación por ítem.
* **Table Checkout & POS Integration:** Integración fluida entre facturación POS, consumo de inventario atómico (ACID), cobro y liberación automática de mesa.

---

## v1.3.0-rc1

* **Executive Analytics & KPI Dashboard:** Tablero gerencial con ingresos brutos, margen comercial, ticket promedio y comparativas de desempeño.
* **Multi-Branch Sales Performance Ledger:** Auditoría analítica de ventas por canal, sucursal física y métodos de pago.
* **Fiscal Summary & Latam Taxes:** Motor de parametrización de impuestos (`IVA`, `INC`, `Retenciones`) y resumen fiscal de operaciones.

---

## v1.4.0-rc1

* **Technical Services & Work Orders:** Módulo de órdenes de servicio técnico (`ServiceOrder`), estados de avance, cotización y ejecución.
* **Tasks & Material Consumption:** Detalle granular de tareas técnicas (`ServiceOrderTask`) e insumos/repuestos descontados del inventario (`ServiceOrderMaterial`).
* **Technician Management & Commissions:** Directorio de operarios técnicos (`ServiceWorker`), asignación de órdenes y liquidación de comisiones por mano de obra.
* **Service Profitability Reports:** Informes de rentabilidad y tiempos de servicio técnico.

---

## v1.5.0-rc1

* **Hotel & Hospitality Engine:** Gestión de habitaciones (`HotelRoom`), reservaciones (`HotelReservation`), tarifas por temporada, registro de huéspedes y control de estatus de limpieza.
* **Gym & Fitness Center Engine:** Catálogo de planes de membresía (`GymMembershipPlan`), suscripciones con fecha de corte (`GymSubscription`), control de acceso/torniquete con validación en caliente (`GymAttendance`), y directorio de entrenadores (`Instructor`).
* **Boutique Studio Engine (Yoga, Pilates, Barre):** Paquetes de clases por créditos (`StudioPlan`), suscripciones activas (`StudioSubscription`), programación de sesiones y aforos (`StudioSchedule`), grilla de reservas (`StudioBooking`) y registro de asistencia.

---

## v1.6.0-rc1

* **Pharmaceutical & Healthcare Compliance:** Extensión de productos farmacéuticos (`ProductPharma`), registro sanitario Invima/FDA y recetas médicas (`MedicalPrescription`).
* **Product Lots & Expiration Engine:** Trazabilidad de lotes (`ProductLot`) con semáforos preventivos de vencimiento (30, 60, 90 días) para evitar pérdidas por caducidad.

---

## v2.0.0-rc1

* **Multi-Vertical SaaS Architecture (Fase 0):**
  * Catálogo maestro de 14 verticales de negocio con metadatos y esquemas de configuración JSON.
  * Modelo pivote `OrganizationVertical` para activación/desactivación granular de verticales por empresa inquilina.
  * Guarda de seguridad en backend `@RequiresVertical()` y `VerticalGuard` bloqueando accesos no autorizados a rutas de verticales inactivos.
  * Store de Pinia reactivo `useVerticalsStore` para filtrado en caliente del menú lateral (Sidebar) según el tenant activo.
  * Pestaña de administración "Verticales de Negocio" en el catálogo de Organizaciones.
* **Retail Industry Vertical (Fase 1):**
  * Módulo `/retail` con métricas operativas de comercio minorista y rotación de stock.
  * Vista `RetailDashboardView.vue` con alertas de stock mínimo, desglose de margen de rentabilidad y acceso a ventas rápidas.
  * Inyección automática multi-tenant de headers (`x-organization-id`, `x-branch-id`) en Axios y resolución inteligente en NestJS.
* **Automotive & Motorcycle Workshop Vertical (Fase 2):**
  * Modelos relacionales `Vehicle` y `VehicleCheckIn` vinculados a `ServiceOrder`.
  * Catálogo y hoja de vida clínica de vehículos (`VehiclesView.vue`) con historial de servicios y kilometraje.
  * Hoja de recepción técnica interactiva (`AutomotiveCheckInView.vue`) con selector visual de combustible, checklist de inventario y registro de daños/golpes preexistentes.
  * Tablero Kanban de Patio y Bahías (`AutomotiveDashboardView.vue`) para gestión de flujo de trabajo en taller.
  * **Motor Anti-Doble Descuento de Stock:** Sincronización ACID entre consumo técnico de repuestos y facturación POS, evitando duplicar las salidas de inventario.
* **Codebase Health & Compilation Guarantee:** Tipado TypeScript estricto verificado con `vue-tsc -b`, `vite build` y `nest build` con código de salida 0.

---

## v2.1.0-rc1

* **Beauty / Salon / Barbershop / Spa Vertical (Fase 3):**
  * Appointment engine (`Appointment`, `AppointmentItem`) with status workflow: scheduled, confirmed, in service, completed, cancelled, no-show.
  * Availability engine validating weekly work schedule, time-off and overlapping appointments; free-slot lookup by total service duration.
  * Per-professional weekly schedules and time-off management.
  * Customer beauty history (visits, spend, no-shows) and technical notes / color formulas.
  * Core reuse: `ServiceWorker` as stylists, `ServiceItem` as service catalog, `Customer`, and `ServiceOrder` for execution, commissions and POS billing.
  * New views: Agenda (`/beauty-agenda`), Team & Schedules (`/beauty-staff`), Clients & Formulas (`/beauty-clients`).
  * Per-organization agenda configuration (slot length, working hours, overlap policy).

---

## v2.2.0-rc1

* **Veterinary & Pet Shop Vertical (Fase 4):**
  * Relational models `Pet`, `VetMedicalRecord`, and `PetVaccination` with species (`CANINE`, `FELINE`, `AVIAN`, `RODENT`, `REPTILE`, `EQUINE`, `BOVINE`, `OTHER`) and visit types (`CONSULTATION`, `EMERGENCY`, `VACCINATION`, `DEWORMING`, `SURGERY`, `GROOMING`, `CHECKUP`, `HOSPITALIZATION`).
  * Complete clinical history with physiological constants (weight, temperature, heart rate, respiratory rate), automatic pet weight update, diagnosis, treatment, and medical prescriptions.
  * Sanitary vaccination & deworming card (`PetVaccination`) with batch tracking, optional direct stock deduction (`SERVICE_CONSUMPTION`), and upcoming booster alerts.
  * Strict Core reuse: `Customer` (pet owners/tutors), `ServiceWorker` (veterinarians/groomers), `ServiceItem` (clinical & grooming services), `Product` (medicines, vaccines, pet food), `ServiceOrder` (clinical attention & supplies), and POS (`/pos?serviceOrderId=...`).
  * New views: Veterinary Clinical Hub (`/veterinary-dashboard`), Patients & Clinical Dossier (`/veterinary-pets`), and Consultation, Grooming & Vaccination Console (`/veterinary-consultations`).

---

## v2.3.0-rc1

* **Laundry & Dry Cleaning Vertical (Fase 5):**
  * Relational models `LaundryTicket` and `LaundryTicketItem` supporting pricing by weight (`BY_WEIGHT`), per garment (`BY_GARMENT`), or hybrid (`MIXED`), with Express surcharge calculation and rack/hanger location tracking (`rackLocation`).
  * 5-stage plant Kanban workflow (`RECEIVED` → `WASHING` → `DRYING` → `IRONING` → `READY` → `DELIVERED`) synchronized with `ServiceOrder` so supplies (detergent, garment bags, hangers) are deducted once upon completion and billed via POS (`/pos?serviceOrderId=...`).
  * New views: Laundry Plant & Rack Kanban Hub (`/laundry-dashboard`) and Garment Intake, Weighing & Ticket Directory (`/laundry-intake`).

---

## v2.4.0-rc1

* **Bakery & Pastry Production Vertical (Fase 6):**
  * Relational models `BakeryRecipe`, `BakeryRecipeIngredient`, and `BakeryProductionOrder` with automatic batch and unit cost calculation (`estimatedBatchCost`, `estimatedUnitCost`).
  * 6-stage oven & production Kanban (`PLANNED` → `MIXING` → `FERMENTING` → `BAKING` → `COOLING_DECORATING` → `COMPLETED`) with waste tracking (`wasteQuantity`, `wasteReason`).
  * Atomic ACID transaction on batch completion: deducts raw ingredients (`Product`, `BranchProductStock`, `InventoryMovement` as `SERVICE_CONSUMPTION`), increments finished bakery product stock (`ADJUSTMENT`), and creates a fresh `ProductLot` with shelf-life expiration (`shelfLifeDays`) for FEFO rotation.
  * New views: Oven & Fresh Showcase Kanban Hub (`/bakery-dashboard`) and Technical Recipe Book, Costing & Batch Launcher (`/bakery-recipes`).

---

## v2.5.0-rc1

* **Academy & Education Center Vertical (Fase 7):**
  * Relational models `AcademyCourse`, `AcademyCohort`, `AcademyEnrollment`, and `AcademyAttendance` supporting courses, classroom/virtual cohorts, scholarships (`scholarshipPct`), attendance tracking (`attendancePct`), and session grading (`gradeScore`, `finalGrade`).
  * Strict Core reuse: `Customer` (students), `ServiceWorker` (teachers/professors), `Product` (study kits, books, uniforms), and `ServiceOrder` for POS tuition/monthly billing (`/pos?serviceOrderId=...`) and teacher commissions.
  * New views: Academic Campus & Attendance Sheet Hub (`/academy-dashboard`) and Academic Offer, Cohorts & Enrollment Console (`/academy-programs`).

---

## v2.6.0-rc1

* **Real Estate & Property Management Vertical (Fase 8 — 14/14 Verticals Complete):**
  * Relational models `RealEstateProperty`, `RealEstateLease`, and `RealEstateRentCharge` supporting property intake, lease contracts, monthly rent + HOA/admin fee billing, automatic agency commission calculation (`agencyCommissionAmount`), and owner net disbursement tracking (`ownerNetAmount`, `isOwnerDisbursed`).
  * Strict Core reuse: `Customer` (property owners & tenants), `ServiceWorker` (real estate agents/advisors), and `ServiceOrder` for POS rent collection (`/pos?serviceOrderId=...`).
  * New views: Property Portfolio, Occupancy Kanban & Owner Disbursements Hub (`/real-estate-dashboard`) and Properties, Lease Contracts & Monthly Rent Billing Console (`/real-estate-leases`).