# Changelog

All notable changes to the KUNA Platform project will be documented in this file.

The format is based on Keep a Changelog.
This project follows Semantic Versioning.

---

## [Unreleased]

### Added

#### KNA-007 - CRUD Branches

- Implemented complete CRUD for branches.
- Added validation for organization existence.
- Added validation to prevent duplicate branch codes.
- Implemented soft delete using `isActive`.
- Added Swagger documentation.
- Protected endpoints with JWT authentication.

#### KNA-008 - CRUD Users

- Implemented complete CRUD for users.
- Added password hashing using bcrypt.
- Added validation for organization and branch.
- Added validation to ensure the branch belongs to the organization.
- Added unique email validation.
- Implemented soft delete using `isActive`.
- Protected endpoints with JWT authentication.
- Added Swagger documentation.

#### KNA-009 - Authentication

- Implemented JWT authentication.
- Added login endpoint.
- Added password verification using bcrypt.
- Added JwtStrategy.
- Added JwtAuthGuard.
- Added CurrentUser decorator.
- Protected authenticated endpoints.
- Configured Swagger Bearer authentication.

#### KNA-010 - Roles

- Implemented complete CRUD for roles.
- Added validation for organization existence.
- Added unique role code validation per organization.
- Implemented soft delete using `isActive`.
- Protected endpoints with JWT authentication.
- Added Swagger documentation.

#### KNA-011 - Permissions

- Implemented complete CRUD for permissions.
- Added unique permission code validation.
- Implemented soft delete using `isActive`.
- Protected endpoints with JWT authentication.
- Added Swagger documentation.

#### KNA-012 - RolePermission

- Added role-permission assignment.
- Added endpoint to assign one or more permissions to a role.
- Added endpoint to retrieve permissions assigned to a role.
- Added endpoint to remove permissions from a role.
- Added validation for existing roles.
- Added validation for existing permissions.
- Prevented duplicate role-permission assignments.
- Protected endpoints with JWT authentication.
- Added Swagger documentation.

### Security

- JWT authentication enabled across protected modules.
- Passwords stored using bcrypt hashing.
- Role-permission assignments protected against duplicates.
- Soft delete implemented for business entities.

### Database

- Added Role model.
- Added Permission model.
- Added RolePermission model.
- Added UserRole model.
- Added indexes and unique constraints for RBAC.

## [KNA-013] - User Roles

### Added
- CRUD for UserRole assignments.
- Assign one or multiple roles to a user.
- Retrieve roles assigned to a user.
- Remove role assignments.
- Duplicate assignment prevention.
- JWT protection for all endpoints.
- Swagger documentation.
- User and role validation.
