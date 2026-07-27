# Branch Module

## Objetivo

Administrar las sucursales de una organización.

---

## Reglas de negocio

### Crear sucursal

- La organización debe existir.
- El código debe ser único dentro de la organización.
- La sucursal inicia activa.
- El nombre es obligatorio.

---

## Casos de uso

- Crear sucursal.
- Consultar sucursales.
- Actualizar sucursal.
- Desactivar sucursal.

---

## API

POST /branches

GET /branches

GET /branches/:id

PATCH /branches/:id

DELETE /branches/:id

---

## Pendientes

- Horario de atención.
- Gerente de sucursal.
- Coordenadas GPS.
- Zona de reparto.
