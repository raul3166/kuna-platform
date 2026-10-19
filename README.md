## 🚀 Estado del proyecto

Actualmente KUNA cuenta con un Core funcional que incluye:

* Gestión de organizaciones
* Gestión de sucursales
* Gestión de usuarios
* Gestión de roles
* Gestión de permisos
* Autenticación JWT
* Autorización basada en Roles y Permisos (RBAC)

### Inventory Core

KUNA cuenta con un Inventory Core funcional que incluye:

* Productos
* Categorías de productos
* Proveedores
* Movimientos de inventario
* Control automático de stock
* Kardex por producto
* Ajustes de inventario
* Transferencias entre sucursales
* Control de inventario por sucursal
* Valoración del inventario
* Costo promedio
* Balance y valoración del stock
* Validaciones de integridad del inventario
* Trazabilidad de movimientos

### Purchase & Inventory Operations

El Sprint 4 incorporó el flujo completo de compras:

* Órdenes de compra
* Ítems de órdenes de compra
* Confirmación de órdenes
* Recepción de mercancía
* Actualización automática de inventario
* Facturación de compras
* Devoluciones a proveedores
* Control de estados y cantidades
* Trazabilidad entre documentos de compra e inventario

El Sprint 5 completó las operaciones fundamentales de inventario:

* Ajustes de inventario
* Transferencias entre sucursales
* Valoración mediante costo promedio
* Balance de stock por sucursal
* Valoración del inventario
* Kardex e historial de movimientos
* Validaciones de stock e integridad
* InventoryMovement como fuente de verdad para las operaciones de inventario

La infraestructura base se encuentra terminada y KUNA continúa evolucionando mediante módulos de negocio independientes.

## 🚀 Estado del proyecto

KUNA cuenta con un núcleo comercial, logístico y de fidelización completamente operativo:

* **Core & Security:** Autenticación JWT, RBAC multi-inquilino, permisos por rol y asignación dinámica.
* **Supply Chain & Inventory:** Registro de compras, recepción de mercancía, devoluciones a proveedores, Kardex analítico en tiempo real y valoración de stock por costo promedio.
* **POS & Commercial Engine:** Punto de venta de alta disponibilidad, aperturas y cierres de caja con arqueo, emisión de comprobantes, devoluciones con notas de crédito e impresión térmica nativa de 80mm.
* **CRM & Accounts:** Directorio unificado de clientes con motor de actualización atómica (Upsert), soporte para personas naturales y empresas, y segmentación por sucursal/organización.

## 📦 Versión actual

v1.1.0-rc1

## 📋 Sprints completados

✅ Sprint 1 a Sprint 8 (Base Core, Inventarios y Seguridad)
✅ Sprint 9 (Sales Backend Engine)
✅ Sprint 10 (POS Frontend Interface)
✅ Sprint 11 (Cash Control & POS Treasury)
✅ Sprint 12 (Sales Returns & Credit Notes UI)
✅ Sprint 13 (POS Receipt Thermal Printing)
✅ Sprint 14 (Customers & CRM Module UI)

## Current Module

Próximo Bloque de Desarrollo
## 📦 Versión actual

## 📦 Versión actual

v1.0.0-rc4

## 📋 Sprints completados

✅ Sprint 1 a Sprint 8 (Base Core, Inventarios y Seguridad)
✅ Sprint 9 (Sales Backend Engine)
✅ Sprint 10 (POS Frontend Interface)
✅ Sprint 11 (Cash Control & POS Treasury)
✅ Sprint 12 (Sales Returns & Credit Notes UI)
✅ Sprint 13 (POS Receipt Thermal Printing)

## Current Version

v1.0.0-rc4

## Completed Sprints

✅ Sprints 1 to 8 (Core Base, Inventory & Security)
✅ Sprint 9 (Sales Backend Engine)
✅ Sprint 10 (POS Frontend Interface)
✅ Sprint 11 (Cash Control & POS Treasury)
✅ Sprint 12 (Sales Returns & Credit Notes UI)
✅ Sprint 13 (POS Receipt Thermal Printing)

## Current Module

Customers & CRM Module (Frontend UI Transition)


v0.9.0-backend

## 📋 Sprints completados

✅ Sprint 1
✅ Sprint 2
✅ Sprint 3
✅ Sprint 4
✅ Sprint 5
✅ Sprint 6
✅ Sprint 7
✅ Sprint 8
✅ Sprint 9 (Backend Engine)

## Current Version

v0.9.0-backend

## Completed Sprints

✅ Sprint 1
✅ Sprint 2
✅ Sprint 3
✅ Sprint 4
✅ Sprint 5
✅ Sprint 6
✅ Sprint 7
✅ Sprint 8
✅ Sprint 9 (Backend Engine)

## Current Module

Sales Core & POS Engine (Frontend UI Transition)

### Web Foundation & Inventory UI

El Sprint 6 incorporó la primera interfaz web completa de la plataforma KUNA:

* Arquitectura Frontend moderna basada en Vue 3, Vite y TypeScript en Monorrepo (pnpm).
* Interfaz de Autenticación JWT integrada con interceptores globales de Axios.
* Contenedor de aplicación (AppLayout) responsivo con Sidebar segmentado dinámicamente.
* Vistas transaccionales multi-pestaña para catálogos de Organizaciones y Sucursales.
* Catálogo maestro comercial para control de Productos y Categorías.
* Panel Analítico de Inventario conectado de forma directa a la API de balance y valoración.
* Bitácora unificada de Operaciones de Stock e historial del Kardex.
* Formulario interactivo para aplicar Ajustes Manuales de stock por conteo físico.
* Interfaz logística de Transferencias inter-sucursales conectada a DTOs nativos de NestJS.
* Módulo analítico de Kardex de producto con auditoría de consistencia de saldo.

## 📦 Versión actual

v0.6.0

## 📋 Sprints completados

✅ Sprint 1
✅ Sprint 2
✅ Sprint 3
✅ Sprint 4
✅ Sprint 5
✅ Sprint 6

## Current Version

v0.6.0

## Completed Sprints

✅ Sprint 1
✅ Sprint 2
✅ Sprint 3
✅ Sprint 4
✅ Sprint 5
✅ Sprint 6

## Current Module

Web Foundation & Inventory UI

## 📦 Versión actual

v0.7.0

## 📋 Sprints completados

✅ Sprint 1
✅ Sprint 2
✅ Sprint 3
✅ Sprint 4
✅ Sprint 5
✅ Sprint 6
✅ Sprint 7

## Current Version

v0.7.0

## Completed Sprints

✅ Sprint 1
✅ Sprint 2
✅ Sprint 3
✅ Sprint 4
✅ Sprint 5
✅ Sprint 6
✅ Sprint 7

## Current Module

Access Control & CRM Core

# KUNA Platform

> Plataforma modular de gestión empresarial para pequeñas y medianas empresas.

## 📖 Descripción

KUNA Platform es una solución moderna diseñada para administrar diferentes tipos de negocios desde una única plataforma.

Su arquitectura modular permite activar únicamente los componentes que cada empresa necesita, compartiendo un núcleo común de autenticación, usuarios, empresas, sucursales, clientes, inventario, reportes y configuración.

El proyecto está pensado para crecer de forma sostenible, facilitando la incorporación de nuevos módulos sin modificar la arquitectura principal.

---

## 🎯 Objetivos

- Arquitectura modular.
- Multiempresa.
- Multisucursal.
- Multipaís.
- Multimoneda.
- API First.
- Escalable.
- Segura.
- Fácil de mantener.

---

## 🏗️ Tecnologías

### Frontend

- Vue 3
- TypeScript
- Vite
- Pinia
- Tailwind CSS

### Backend

- Node.js
- Express
- TypeScript
- Prisma ORM

### Base de datos

- PostgreSQL

### Infraestructura

- Docker
- GitHub
- GitHub Actions (más adelante)

---

## 📦 Módulos previstos

- Core
- Restaurant
- Hotel
- Pharmacy
- Clinic
- Veterinary
- Retail
- CRM
- Inventory
- Accounting

---

## 🚀 Estado del proyecto

Actualmente el proyecto se encuentra en fase de arquitectura e infraestructura.

Versión prevista:

v0.1.0

---

## 📄 Licencia

Privada.
Todos los derechos reservados.

---

## 👨‍💻 Proyecto

Desarrollado como una plataforma modular orientada a empresas de Latinoamérica, con visión de expansión internacional.

## 🚀 Estado del proyecto

KUNA cuenta con un núcleo comercial, logístico, gastronómico y de fidelización completamente operativo:

* **Core & Security:** Autenticación JWT, RBAC multi-inquilino, permisos por rol y asignación dinámica.
* **Supply Chain & Inventory:** Registro de compras, recepción de mercancía, devoluciones a proveedores, Kardex analítico en tiempo real y valoración de stock por costo promedio.
* **POS & Commercial Engine:** Punto de venta de alta disponibilidad, aperturas y cierres de caja con arqueo, emisión de comprobantes, devoluciones con notas de crédito e impresión térmica nativa de 80mm.
* **Restaurant & Gastronomic Module (KDS):** Gestión de salones y mesas, comanderas para meseros, monitor de cocina KDS con semáforos de tiempo y facturación directa con liberación automática de mesas.
* **CRM & Accounts:** Directorio unificado de clientes con motor de actualización atómica (Upsert), soporte para personas naturales y empresas, y segmentación por sucursal/organización.

## 📦 Versión actual

v1.2.0-rc1

## 📋 Sprints completados

✅ Sprint 1 a Sprint 8 (Base Core, Inventarios y Seguridad)
✅ Sprint 9 (Sales Backend Engine)
✅ Sprint 10 (POS Frontend Interface)
✅ Sprint 11 (Cash Control & POS Treasury)
✅ Sprint 12 (Sales Returns & Credit Notes UI)
✅ Sprint 13 (POS Receipt Thermal Printing)
✅ Sprint 14 (Customers & CRM Module UI)
✅ Sprint 16 (Restaurant Module & Table Management / KDS)

## 🎯 Próximo Módulo (Current Module)

Sprint 17 — Accounting, Tax Localization & CxC / CxP Core

---

## 🚀 Estado del proyecto (Actualización v2.0.0-rc1)

KUNA ha evolucionado hacia una **Arquitectura de Verticales de Negocio sobre un Core Empresarial Común**. Una organización puede activar uno o múltiples tipos de industria compartiendo un núcleo unificado sin duplicar modelos ni datos:

* **Core & Multi-Tenancy:** Organizaciones, sucursales, usuarios, roles, permisos granulares (RBAC) y aislamiento estricto multi-inquilino (`organizationId` y `branchId`).
* **Comercial & POS:** Clientes unificados (`Customer`), catálogo de productos (`Product`), punto de venta (POS), sesiones de caja y arqueo (`CashSession`), facturación (`Sale`), notas de crédito (`SaleReturn`) e impresión térmica legal de 80mm.
* **Inventario Core:** Stock por sucursal, movimientos atómicos (`InventoryMovement`), ajustes manuales, transferencias inter-sucursales, Kardex analítico y consumos internos.
* **Compras & Cadena de Suministro:** Directorio de proveedores (`Supplier`), órdenes de compra (`PurchaseOrder`), actas de recibo de mercancía (`GoodsReceipt`), facturas de compras y devoluciones.
* **Analítica & BI:** Tablero gerencial ejecutivo (`ExecutiveDashboard`), reportes de rendimiento comercial, libros fiscales y parametrización de impuestos Latam (`Taxes`).
* **Verticales de Negocio Activables:**
  - 🛒 **Retail / Tienda (`RETAIL`):** Dashboard de rotación, alertas de stock mínimo, gestión de márgenes y ventas rápidas.
  - 🚗 **Taller Automotriz y Motos (`AUTOMOTIVE`):** Hoja de vida de vehículos (`Vehicle`), recepción técnica con checklist físico e inventario (`VehicleCheckIn`), tablero Kanban de patio y bahías, y **motor anti-doble descuento de stock** coordinado con facturación.
  - 🍽️ **Restaurante (`RESTAURANT`):** Salones y mesas interactivas, comandero móvil para meseros, monitor de cocina KDS con semáforos y cobro con liberación de mesa.
  - 🛠️ **Servicios Técnicos (`SERVICES`):** Órdenes de servicio técnico (`ServiceOrder`), tareas, insumos/repuestos, técnicos asignados y liquidación de comisiones.
  - 🏨 **Hotel / Hospedaje (`HOTEL`):** Catálogo de habitaciones, reservaciones por calendario, check-in/check-out y tarifas.
  - 🏋️ **Gimnasio (`GYM`):** Planes de membresía, suscripciones con control de vigencia, control de acceso/torniquete en recepción e instructores.
  - 🧘 **Studio Yoga / Pilates / Barre (`STUDIO`):** Planes por créditos de clases, programación de horarios, aforos, reserva de cupos y asistencia.
  - 💊 **Farmacia (`PHARMACY`):** Trazabilidad de lotes (`ProductLot`), control de registro sanitario Invima/FDA, recetas médicas y semáforo preventivo de vencimientos a 30, 60 y 90 días.

## 📦 Versión actual

**v2.0.0-rc1**

## 📋 Sprints completados

* ✅ **Sprint 1 a 8:** Base Core, Autenticación JWT, RBAC, Catálogos, Inventario Core y Compras.
* ✅ **Sprint 9 a 14:** Motor de Ventas Backend, POS Frontend, Control de Caja, Devoluciones, Impresión Térmica y CRM Clientes.
* ✅ **Sprint 16:** Vertical Restaurante & Mesas / KDS.
* ✅ **Sprint 17:** Resumen Fiscal, Libros Auxiliares e Impuestos Latam.
* ✅ **Sprint 18:** Vertical Servicios Técnicos, Órdenes de Trabajo y Comisiones.
* ✅ **Sprint 19:** Verticales de Hospitalidad y Bienestar (Hotel, Gimnasio y Boutique Studio).
* ✅ **Sprint 20:** Vertical Farmacia, Lotes y Bitácora Preventiva de Vencimientos.
* ✅ **Sprint 21 (Fase 0):** Arquitectura Base de Verticales Multi-Tenant (`Vertical`, `OrganizationVertical`, `VerticalGuard`, navegación dinámica por tenant y configuración JSON).
* ✅ **Sprint 22 (Fase 1):** Vertical Retail (Controlador, métricas de tienda, dashboard y resolución de headers multi-inquilino).
* ✅ **Sprint 23 (Fase 2):** Vertical Automotive / Taller (Vehículos, recepción técnica, tablero Kanban de bahías, motor anti-doble descuento de inventario y saneamiento de compilación TypeScript).

## 🎯 Próximo Bloque de Desarrollo

* **Sprint 24 (Fase 3):** Vertical BEAUTY / Salón de Belleza, Barbería y Spa (Agenda de citas `Appointment`, turnos de estilistas y servicios cosméticos).

---

## 🏛️ Arquitectura de Verticales de Negocio

KUNA sigue el principio de **Core Empresarial Común + Verticales Especializados**:

```
KUNA PLATFORM
│
├── 🏢 CORE (Compartido)
│   ├── Organizations & Branches (Multi-Tenant)
│   ├── Users, Roles & Permissions (RBAC)
│   └── Configuración Global
│
├── 💼 COMERCIAL (Compartido)
│   ├── Customers (Clientes naturales y empresas)
│   ├── Products & Categories
│   ├── Sales & Point of Sale (POS)
│   ├── Payments & Treasury (CashSessions)
│   └── Invoicing & Credit Notes
│
├── 📦 INVENTARIO CORE (Compartido)
│   ├── Stock por Sucursal
│   ├── InventoryMovements (Fuente única de verdad)
│   ├── Adjustments & Transfers
│   ├── Kardex analítico
│   └── Consumos Internos
│
├── 🚚 COMPRAS & CADENA DE SUMINISTRO (Compartido)
│   ├── Suppliers
│   ├── Purchase Orders & Items
│   ├── Goods Receipts (Ingresos físicos)
│   └── Purchase Invoices & Returns
│
└── 🧩 VERTICALES ACTIVABLES (Por Organización)
    ├── RETAIL (Comercio minorista y tiendas)
    ├── AUTOMOTIVE (Talleres mecánicos y motos)
    ├── RESTAURANT (Gastronomía, salones y KDS)
    ├── SERVICES (Mantenimiento y servicios técnicos)
    ├── HOTEL (Habitaciones y reservaciones)
    ├── GYM (Membresías y control de acceso)
    ├── STUDIO (Clases, aforos y reservas)
    ├── PHARMACY (Lotes, recetas y vencimientos)
    └── Futuras: BEAUTY, VETERINARY, LAUNDRY, BAKERY, ACADEMY, REAL ESTATE
```

### Regla Fundamental de Arquitectura

**NO duplicar funcionalidad existente.**
- Un taller **no** crea otro inventario ni otro catálogo de clientes: reutiliza `Product`, `Customer`, `Sale`, `InventoryMovement` y `Supplier`.
- Un gimnasio o barbería **no** crea otro sistema de cobro: reutiliza `Customer`, `CashSession`, `Sale` y `Payment`.
- Las entidades del vertical (`Vehicle`, `VehicleCheckIn`, `HotelRoom`, `GymSubscription`, etc.) extienden y referencian las tablas maestras del Core.

---

## Sprint 24 (Fase 3) — Estado: Completado

La Fase 3 (BEAUTY / Salón / Barbería / Spa) fue implementada en la versión **v2.1.0-rc1**. Detalle en la sección "Sprint 24" de `ROADMAP.md`.

### Próximo bloque

* **Sprint 25 (Fase 4):** Vertical VETERINARY / Veterinaria y Pet Shop.

---

## Sprint 25 (Fase 4) — Estado: Completado

La Fase 4 (VETERINARY / Clínica Veterinaria, Grooming & Pet Shop) fue implementada en la versión **v2.2.0-rc1**, incorporando directorio de mascotas (`Pet`), expediente clínico con constantes fisiológicas y fórmulas (`VetMedicalRecord`), carnet sanitario de vacunación/desparasitación con alertas de refuerzos (`PetVaccination`) e integración nativa con `ServiceOrder` y el POS.

### Próximo bloque

* **Sprint 26 (Fase 5):** Vertical LAUNDRY / Lavandería y Tintorería.

---

## Sprint 26 (Fase 5) — Estado: Completado

La Fase 5 (LAUNDRY / Lavandería, Planchado & Tintorería) fue implementada en la versión **v2.3.0-rc1**, incorporando recepción híbrida por peso (kg) y por prenda (`LaundryTicket`, `LaundryTicketItem`), tablero Kanban de planta en 5 etapas (`RECEIVED` → `WASHING` → `DRYING` → `IRONING` → `READY`), control de percheros/estantes (`rackLocation`) e integración directa con `ServiceOrder` y cobro en POS.

### Próximo bloque

* **Sprint 27 (Fase 6):** Vertical BAKERY / Panadería y Pastelería.

---

## Sprint 27 (Fase 6) — Estado: Completado

La Fase 6 (BAKERY / Panadería, Pastelería & Repostería) fue implementada en la versión **v2.4.0-rc1**, incorporando recetario y fórmulas técnicas (`BakeryRecipe`, `BakeryRecipeIngredient`), órdenes y tandas de horneado en 6 etapas (`BakeryProductionOrder`), registro de mermas, descuento automático de materias primas (`InventoryMovement` `SERVICE_CONSUMPTION`), ingreso automático de producto horneado a vitrina y generación de lotes frescos con vencimiento FEFO (`ProductLot`).

### Próximo bloque

* **Sprint 28 (Fase 7):** Vertical ACADEMY / Academia y Centro Educativo.

---

## Sprint 28 (Fase 7) — Estado: Completado

La Fase 7 (ACADEMY / Academia, Instituto & Centro Educativo) fue implementada en la versión **v2.5.0-rc1**, incorporando catálogo de cursos y programas (`AcademyCourse`), cohortes y horarios con asignación docente (`AcademyCohort`), matrículas de estudiantes con becas y kits de estudio (`AcademyEnrollment`), planilla de asistencia y calificación por sesión (`AcademyAttendance`) e integración directa con `ServiceOrder` y cobro en POS.

### Próximo bloque

* **Sprint 29 (Fase 8):** Vertical REAL ESTATE / Inmobiliaria y Administración de Propiedades.

---

## Sprint 29 (Fase 8) — Estado: Completado (14/14 Verticales Operativas)

La Fase 8 (REAL_ESTATE / Inmobiliaria & Administración de Propiedades) fue implementada en la versión **v2.6.0-rc1**, incorporando captación de inmuebles (`RealEstateProperty`), contratos de arrendamiento (`RealEstateLease`), facturación de cánones mensuales con cálculo automático de comisión de agencia y neto a dispersar al propietario (`RealEstateRentCharge`), e integración directa con `ServiceOrder` y el POS. Con este hito quedan completadas las **14 verticales de negocio** sobre el Core Empresarial Común de KUNA.