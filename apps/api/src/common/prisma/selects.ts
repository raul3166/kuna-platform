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

export const customerSelect = {
  id: true,
  organizationId: true,
  firstName: true,
  lastName: true,
  companyName: true,
  identificationType: true,
  identificationNumber: true,
  email: true,
  phoneNumber: true,
  address: true,
  city: true,
  state: true,
  country: true,
  notes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const productSelect = {
  id: true,
  organizationId: true,
  sku: true,
  name: true,
  description: true,
  barcode: true,
  salePrice: true,
  costPrice: true,
  stock: true,
  isActive: true,
  categoryId: true,
  category: {
    select: {
      id: true,
      name: true,
      description: true,
    },
  },
  taxRuleId: true,
  taxRule: {
    select: {
      id: true,
      name: true,
      code: true,
      type: true,
      percentage: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} as const;

export const purchaseOrderSelect = {
  id: true,
  organizationId: true,
  branchId: true,
  supplierId: true,
  number: true,
  status: true,
  orderDate: true,
  expectedDate: true,
  notes: true,
  subtotal: true,
  tax: true,
  total: true,
  createdAt: true,
  updatedAt: true,

  supplier: {
    select: {
      id: true,
      companyName: true,
    },
  },
} as const;

export const purchaseOrderItemSelect = {
  id: true,
  purchaseOrderId: true,
  productId: true,
  quantity: true,
  unitCost: true,
  subtotal: true,
  notes: true,
  createdAt: true,
  updatedAt: true,

  product: {
    select: {
      id: true,
      sku: true,
      name: true,
    },
  },
} as const;

export const goodsReceiptSelect = {
  id: true,

  organizationId: true,
  purchaseOrderId: true,

  number: true,
  status: true,
  receivedDate: true,

  receivedById: true,

  notes: true,

  createdAt: true,
  updatedAt: true,

  purchaseOrder: {
    select: {
      id: true,
      number: true,
    },
  },

  receivedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
} as const;

export const productSummarySelect = {
  id: true,
  sku: true,
  name: true,
} as const;

export const purchaseInvoiceSelect = {
  id: true,

  organizationId: true,
  supplierId: true,

  purchaseOrderId: true,
  goodsReceiptId: true,

  number: true,
  invoiceNumber: true,

  invoiceDate: true,
  dueDate: true,

  status: true,

  subtotal: true,
  tax: true,
  total: true,

  notes: true,

  createdAt: true,
  updatedAt: true,

  supplier: {
    select: {
      id: true,
      companyName: true,
    },
  },
} as const;

export const purchaseInvoiceItemSelect = {
  id: true,

  purchaseInvoiceId: true,
  productId: true,

  quantity: true,
  unitCost: true,
  taxRate: true,

  subtotal: true,
  total: true,

  createdAt: true,
  updatedAt: true,

  product: {
    select: {
      id: true,
      sku: true,
      name: true,
    },
  },

  purchaseInvoice: {
    select: {
      id: true,
      number: true,
      invoiceNumber: true,
    },
  },
} as const;

export const userWithPasswordSelect = {
  id: true,
  email: true,
  passwordHash: true,
  isActive: true,
} as const;
