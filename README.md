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

## 📦 Arquitectura

### Core

- Authentication
- Organizations
- Branches
- Users
- Roles
- Permissions
- Configuration
- Notifications
- Audit
- Reports

### Business Modules

- Restaurant
- Hotel
- Pharmacy
- Clinic
- Veterinary
- Retail
- CRM
- Inventory
- Accounting

La plataforma permite desarrollar nuevos módulos reutilizando el Core sin modificar su arquitectura.

---

## 🚀 Estado del proyecto

Actualmente KUNA cuenta con un Core funcional que incluye:

- Gestión de organizaciones
- Gestión de sucursales
- Gestión de usuarios
- Gestión de roles
- Gestión de permisos
- Autenticación JWT
- Autorización basada en Roles y Permisos (RBAC)

La infraestructura base se encuentra terminada y el desarrollo continúa con la implementación de módulos de negocio.

Versión actual:

v0.2.0

---

## 📄 Licencia

Privada.
Todos los derechos reservados.

---

## 👨‍💻 Proyecto

Desarrollado como una plataforma modular orientada a empresas de Latinoamérica, con visión de expansión internacional.
