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
