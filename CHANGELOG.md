# Changelog

Todas las modificaciones importantes de KUNA Platform serán documentadas en este archivo.

El formato está basado en Keep a Changelog.
Versionado basado en Semantic Versioning.

---

## [0.2.0] - 2026-07-31

### Added

#### KNA-007 - Branches
- CRUD completo de sucursales.
- Validación de organización existente.
- Soft Delete.
- Swagger.
- Validaciones de negocio.

#### KNA-008 - Users
- CRUD completo de usuarios.
- Hash de contraseñas con bcrypt.
- Validación de email único.
- Validación Organization → Branch.
- Soft Delete.

#### KNA-009 - Authentication
- Login JWT.
- JwtStrategy.
- JwtAuthGuard.
- Passport JWT.
- Tokens Bearer.

#### KNA-010 - Roles
- CRUD completo de Roles.
- Validación de organización.
- Código único por organización.
- Soft Delete.

#### KNA-011 - Permissions
- CRUD completo de Permisos.
- Código único.
- Soft Delete.

#### KNA-012 - RolePermission
- Asignación de permisos a roles.
- Eliminación de permisos.
- Prevención de duplicados.
- Validaciones de existencia.

#### KNA-013 - UserRole
- Asignación de roles a usuarios.
- Eliminación de roles.
- Prevención de duplicados.
- Validaciones de existencia.

#### KNA-014 - Authorization
- Decorador @Permissions().
- PermissionsGuard.
- Autorización basada en Roles + Permisos.
- Protección de endpoints mediante permisos.
- Integración completa con JWT.

### Security

- Contraseñas almacenadas usando bcrypt.
- Endpoints protegidos mediante JWT.
- Control de acceso basado en permisos (RBAC).
