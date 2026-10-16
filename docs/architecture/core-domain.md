# KUNA Core Domain

**Versión:** 1.0

**Estado:** Draft

**Última actualización:** 24/07/2026

---

# Objetivo

KUNA es una plataforma SaaS multiempresa y multimódulo.

El Core contiene únicamente las entidades comunes que pueden ser reutilizadas por cualquier módulo de negocio (Restaurantes, Hoteles, Veterinarias, Clínicas, Retail, etc.).

El objetivo es garantizar que el crecimiento de la plataforma no requiera rediseñar la arquitectura principal.

---

# Principios

- Multiempresa (Multi Tenant)
- Modular
- Escalable
- API First
- Seguridad desde el diseño
- Bajo acoplamiento
- Alta cohesión

---

# Arquitectura General

```
Organization
│
├── Branch
│
├── User
│
├── Role
│
├── Permission
│
├── UserRole
│
├── AuditLog
│
├── Setting
│
├── File
│
└── Notification
```

---

# Entidades

## Organization

Representa una empresa dentro de la plataforma.

Ejemplos:

- Restaurante
- Hotel
- Clínica
- Veterinaria
- Distribuidor

Responsabilidades:

- Configuración global
- Identidad de la empresa
- Aislamiento de datos

---

## Branch

Representa una sucursal física.

Ejemplos:

- Bogotá
- Medellín
- Cali

Cada organización puede tener múltiples sucursales.

---

## User

Representa un usuario autenticado.

Puede pertenecer a una organización.

Opcionalmente puede pertenecer a una sucursal.

---

## Role

Agrupa permisos.

Ejemplos:

- Administrador
- Gerente
- Cajero
- Mesero

---

## Permission

Permisos individuales.

Ejemplos:

- users.read
- users.create
- inventory.update
- reports.view

---

## UserRole

Relaciona usuarios con roles.

Permite que un usuario tenga múltiples roles.

---

## AuditLog

Registra acciones importantes realizadas por los usuarios.

Ejemplos:

- Inicio de sesión
- Eliminación de registros
- Cambio de precios

---

## Setting

Configuraciones dinámicas.

Ejemplos:

- Moneda
- Idioma
- Zona horaria
- Impuestos

---

## File

Gestión de archivos.

Ejemplos:

- Logos
- Facturas
- Imágenes
- PDFs

---

## Notification

Sistema centralizado de notificaciones.

Canales futuros:

- Email
- Push
- SMS
- WhatsApp

---

# Relaciones

Organization

1 ---- N Branch

1 ---- N User

Branch

1 ---- N User

User

N ---- N Role

Role

N ---- N Permission

---

# Reglas

- Ningún usuario existe sin organización.
- Las sucursales pertenecen a una organización.
- Los permisos nunca se asignan directamente al usuario.
- Los roles agrupan permisos.
- Todas las acciones importantes deben registrarse en AuditLog.

---

# Objetivos futuros

- Feature Flags
- Marketplace de módulos
- Multi idioma
- Multi moneda
- Multi zona horaria
- API pública
- Integraciones externas

---

# Arquitectura de Verticales de Negocio (Implementada)

KUNA estructura su dominio separando conceptualmente el **Core Empresarial Común** de los **Verticales de Negocio Especializados**:

```
Organization
    │
    ├── 1:N ── OrganizationVertical ── N:1 ── Vertical
    │                                             │
    │                                             ├── RETAIL
    │                                             ├── AUTOMOTIVE
    │                                             ├── RESTAURANT
    │                                             ├── SERVICES
    │                                             ├── HOTEL
    │                                             ├── GYM
    │                                             ├── STUDIO
    │                                             ├── PHARMACY
    │                                             └── Otras industrias...
    │
    ├── 1:N ── Branch (Multi-sucursal)
    │             │
    │             ├── BranchProductStock
    │             └── CashSession (Cajas y turnos)
    │
    ├── 1:N ── Customer (Clientes comunes a todos los verticales)
    ├── 1:N ── Product (Catálogo unificado de bienes y servicios)
    ├── 1:N ── Supplier (Proveedores de compras y repuestos)
    ├── 1:N ── PurchaseOrder (Cadena de suministro)
    ├── 1:N ── Sale (Ventas y facturación unificada)
    └── 1:N ── InventoryMovement (Kardex y balance único)
```

## Reglas de Integridad de Verticales

1. **Aislamiento Multi-Tenant Estricto:** Toda operación de negocio debe validar `organizationId` y, cuando aplique, `branchId`.
2. **Reutilización Obligatoria del Core:** Ningún vertical crea modelos duplicados de clientes, inventarios o ventas.
   - Un taller automotriz asocia `Vehicle` a `Customer`, y consume repuestos descontando `BranchProductStock` mediante `InventoryMovement`.
   - Un restaurante asocia las cuentas de mesa a `Sale` y descuenta ingredientes o platos de `Product`.
   - Un hotel asocia el huésped a `Customer` y liquida la reserva en `Sale`.
3. **Seguridad y Control de Acceso:** Los endpoints de verticales están protegidos por `@RequiresVertical('CODIGO')` a través de `VerticalGuard`. Si una organización no tiene contratado o activo el vertical, la solicitud es rechazada con `403 Forbidden`.
