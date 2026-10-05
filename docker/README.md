# Guía de Docker para KUNA

Esta guía explica cómo ejecutar la plataforma KUNA completa utilizando Docker y Docker Compose.

---

## Requisitos Previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y en ejecución.
- Git instalado.

---

## Inicio Rápido (Quickstart)

### 1. Clonar el proyecto y preparar variables de entorno
```bash
git clone <url-del-repositorio>
cd KUNA
cp .env.example .env
```

*(En Windows PowerShell: `Copy-Item .env.example .env`)*

### 2. Iniciar todos los servicios
```bash
docker compose up -d
```
o usando el script de npm/pnpm:
```bash
pnpm docker:up
```

> **Nota:** La primera vez, Docker descargará las imágenes base y construirá los contenedores de la API y Web. Esto tomará un par de minutos.

### 3. Verificar servicios activos
| Servicio | URL / Puerto | Descripción |
| :--- | :--- | :--- |
| **Frontend Web** | [http://localhost:5173](http://localhost:5173) | Interfaz Vue 3 + Tailwind (con Hot Reload) |
| **API NestJS** | [http://localhost:3000](http://localhost:3000) | Backend NestJS (con Hot Reload) |
| **Documentación Swagger** | [http://localhost:3000/api](http://localhost:3000/api) | Swagger UI interactivo |
| **Base de Datos PostgreSQL** | `localhost:5433` (o `db:5432` entre contenedores) | Postgres 16 con volumen persistente |

---

## Comandos Útiles

### Ver logs en tiempo real
```bash
docker compose logs -f
# O ver solo los logs de la API:
docker compose logs -f api
```

### Detener los contenedores
```bash
docker compose down
```

### Reconstruir tras instalar nuevos paquetes en package.json
```bash
docker compose up --build -d
```

### Ejecutar migraciones o seed manualmente
```bash
# Ejecutar migraciones:
docker compose exec api pnpm --filter api exec prisma migrate deploy

# Cargar datos de prueba (Seed):
docker compose exec api pnpm --filter api exec prisma db seed
```

---

## Modo Híbrido (Opcional)

Si prefieres ejecutar la API o el Frontend directamente en tu sistema operativo con `pnpm`, pero deseas tener PostgreSQL en un contenedor sin tener que instalar Postgres en Windows:

```bash
docker compose up db -d
```
Luego ajustas tu `apps/api/.env` para apuntar a `DATABASE_URL="postgresql://postgres:Kuna2026!@localhost:5433/kuna"` y ejecutas:
```bash
pnpm dev:api
pnpm dev:web
```

