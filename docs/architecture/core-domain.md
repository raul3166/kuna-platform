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
