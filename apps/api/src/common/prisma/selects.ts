// apps/api/src/common/prisma/selects.ts

export const userSelect = {
  id: true,
  organizationId: true,
  branchId: true,
  firstName: true,
  lastName: true,
  email: true,
  phoneNumber: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const userWithPasswordSelect = {
  id: true,
  email: true,
  passwordHash: true,
  isActive: true,
} as const;
