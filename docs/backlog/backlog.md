# KUNA Product Backlog

> Última actualización: 2026-07-24

---

# Estado del Proyecto

| Epic | Nombre | Estado |
|------|--------|--------|
| EPIC-01 | Core Platform | 🟡 En progreso |
| EPIC-02 | Identity & Security | ⬜ Pendiente |
| EPIC-03 | Restaurant Operations | ⬜ Pendiente |
| EPIC-04 | Reservations | ⬜ Pendiente |
| EPIC-05 | Inventory | ⬜ Pendiente |
| EPIC-06 | Billing | ⬜ Pendiente |
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
| KNA-008 | CRUD Users | ⬜ Pendiente |
| KNA-009 | Authentication | ⬜ Pendiente |
| KNA-010 | Roles | ⬜ Pendiente |
| KNA-011 | Permissions | ⬜ Pendiente |

---

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

Pendiente de iniciar una vez finalice KNA-007.

---

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
