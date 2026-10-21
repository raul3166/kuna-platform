export interface NavigationItem {
  label: string
  icon: string
  to: string
  requiredPermission?: string | string[]
}

export interface NavigationSection {
  key: string
  label: string
  isCore?: boolean
  requiredVertical?: string // Código del vertical requerido (ej: 'HOTEL', 'RESTAURANT', 'SERVICES')
  requiredPermission?: string | string[]
  items: NavigationItem[]
}

/**
 * Configuración declarativa y modular de las secciones del menú lateral de KUNA.
 * Cada sección vertical se vincula a su código de vertical correspondiente y a los
 * permisos RBAC requeridos para visualizar cada módulo o vista operativa.
 */
export const navigationSections: NavigationSection[] = [
  {
    key: 'core',
    label: 'Core',
    isCore: true,
    items: [
      { label: 'Bienvenida', icon: '👋', to: '/dashboard' },
      { label: 'Organizaciones', icon: '🏢', to: '/organizations', requiredPermission: 'organizations.read' },
    ],
  },
  {
    key: 'comercial',
    label: 'Comercial (Retail)',
    requiredVertical: 'RETAIL',
    requiredPermission: ['cash-sessions.create', 'sales.read', 'sale-returns.read', 'analytics.read'],
    items: [
      { label: 'Panel de Tienda (Hub)', icon: '🏪', to: '/retail-dashboard', requiredPermission: ['cash-sessions.create', 'analytics.read'] },
      { label: 'Terminal Punto de Venta (POS)', icon: '🎛️', to: '/pos', requiredPermission: ['cash-sessions.create', 'sales.create'] },
      { label: 'Historial de Ventas', icon: '📊', to: '/sales', requiredPermission: 'sales.read' },
      { label: 'Devoluciones de Clientes', icon: '↩️', to: '/sale-returns', requiredPermission: 'sale-returns.read' },
      { label: 'Dashboard Ejecutivo', icon: '📈', to: '/executive-dashboard', requiredPermission: 'analytics.read' },
      { label: 'Reporte de Rendimiento', icon: '📈', to: '/sales-performance', requiredPermission: 'analytics.read' },
      { label: 'Reporte Fiscal', icon: '📈', to: '/fiscalSummary', requiredPermission: 'analytics.read' },
      { label: 'Clientes (CRM)', icon: '👥', to: '/customers', requiredPermission: 'customers.update' },
    ],
  },
  {
    key: 'inventario',
    label: 'Inventario Core',
    isCore: true,
    requiredPermission: ['products.create', 'inventory.create', 'inventory-movements.create', 'inventory-movements.adjustment', 'internal-consumptions.read'],
    items: [
      { label: 'Productos y Catálogos', icon: '📦', to: '/products', requiredPermission: ['products.create', 'products.update', 'inventory.create'] },
      { label: 'Panel Analítico Stock', icon: '📊', to: '/inventory-dashboard', requiredPermission: ['inventory.create', 'inventory-movements.create', 'inventory-movements.adjustment'] },
      { label: 'Movimientos y Ajustes', icon: '🔄', to: '/inventory-movements', requiredPermission: ['inventory-movements.create', 'inventory-movements.adjustment'] },
      { label: 'Transferencias', icon: '🚚', to: '/inventory-transfers', requiredPermission: ['inventory-transfers.create', 'inventory-transfers.read', 'inventory-movements.create'] },
      { label: 'Consumo Interno', icon: '📉', to: '/internal-consumptions', requiredPermission: ['internal-consumptions.read', 'internal-consumptions.create'] },
      { label: 'Kardex / Historial', icon: '📋', to: '/kardex', requiredPermission: ['inventory-movements.adjustment', 'inventory.create'] },
    ],
  },
  {
    key: 'compras',
    label: 'Compras',
    isCore: true,
    requiredPermission: ['suppliers.read', 'purchase-orders.read', 'goods-receipts.read', 'purchase-invoices.read', 'purchase-returns.read'],
    items: [
      { label: 'Proveedores', icon: '🚚', to: '/suppliers', requiredPermission: 'suppliers.read' },
      { label: 'Órdenes de Compra', icon: '📑', to: '/purchase-orders', requiredPermission: 'purchase-orders.read' },
      { label: 'Recepción de Mercancía', icon: '📥', to: '/goods-receipts', requiredPermission: 'goods-receipts.read' },
      { label: 'Facturas de Proveedores', icon: '🧾', to: '/purchase-invoices', requiredPermission: 'purchase-invoices.read' },
      { label: 'Devoluciones a Proveedores', icon: '↩️', to: '/purchase-returns', requiredPermission: 'purchase-returns.read' },
    ],
  },
  {
    key: 'restaurante',
    label: 'Restaurante',
    requiredVertical: 'RESTAURANT',
    requiredPermission: 'restaurant.read',
    items: [
      { label: 'Salones y Mesas', icon: '🍽️', to: '/rooms', requiredPermission: ['sales.create', 'restaurant.create'] },
      { label: 'Toma de Pedidos', icon: '📝', to: '/restaurant-orders', requiredPermission: ['sales.create', 'restaurant.create'] },
      { label: 'Monitor de Cocina', icon: '👨‍🍳', to: '/kitchen', requiredPermission: 'restaurant.read' },
    ],
  },
  {
    key: 'farmacia',
    label: 'Farmacia',
    requiredVertical: 'PHARMACY',
    requiredPermission: ['products.create', 'inventory-movements.adjustment'],
    items: [
      { label: 'Control de Lotes (FEFO)', icon: '🏷️', to: '/expiring-lots', requiredPermission: ['products.create', 'inventory-movements.adjustment'] },
      { label: 'Recetas Médicas', icon: '💊', to: '/prescriptions', requiredPermission: ['products.create', 'inventory-movements.adjustment'] },
    ],
  },
  {
    key: 'gimnasio',
    label: 'Gimnasio',
    requiredVertical: 'GYM',
    requiredPermission: 'gym.read',
    items: [
      { label: 'Planes de Membresía', icon: '🏋️', to: '/gym-membership-plans', requiredPermission: 'gym.create' },
      { label: 'Suscripciones', icon: '💳', to: '/gym-subscriptions', requiredPermission: 'gym.create' },
      { label: 'Control de Acceso (Check-in)', icon: '🚪', to: '/gym-checkin', requiredPermission: 'gym.read' },
      { label: 'Instructores / Entrenadores', icon: '🧑‍🏫', to: '/gym-instructors', requiredPermission: 'gym.read' },
    ],
  },
  {
    key: 'estudio',
    label: 'Estudio (Yoga / Pilates)',
    requiredVertical: 'STUDIO',
    requiredPermission: 'studio.read',
    items: [
      { label: 'Planes y Paquetes', icon: '🧘‍♀️', to: '/studio-plans', requiredPermission: 'studio.create' },
      { label: 'Suscripciones y Tiqueteras', icon: '🎟️', to: '/studio-subscriptions', requiredPermission: 'studio.create' },
      { label: 'Control de Asistencia', icon: '🚪', to: '/studio-checkin', requiredPermission: 'studio.read' },
      { label: 'Calendario Clases', icon: '🚪', to: '/studio-schedules', requiredPermission: 'studio.read' },
      { label: 'Reservas de Cupos', icon: '📌', to: '/studio-bookings', requiredPermission: 'studio.read' },
      { label: 'Instructores y Liquidación', icon: '👩‍🏫', to: '/studio-instructors', requiredPermission: 'studio.read' },
    ],
  },
  {
    key: 'servicios',
    label: 'Órdenes de Servicio',
    requiredVertical: 'SERVICES',
    requiredPermission: 'service-orders.read',
    items: [
      { label: 'Órdenes de Servicio', icon: '🛠️', to: '/service-orders', requiredPermission: 'service-orders.read' },
      { label: 'Catálogo de Servicios', icon: '📋', to: '/service-items', requiredPermission: 'service-items.read' },
      { label: 'Técnicos / Personal', icon: '👷', to: '/service-workers', requiredPermission: 'service-workers.read' },
      { label: 'Liquidación de Comisiones', icon: '💰', to: '/service-commissions', requiredPermission: 'service-orders.read' },
      { label: 'Reportes de Servicio', icon: '📊', to: '/service-reports', requiredPermission: 'service-orders.read' },
    ],
  },
  {
    key: 'automotive',
    label: 'Taller Automotriz',
    requiredVertical: 'AUTOMOTIVE',
    requiredPermission: 'automotive.read',
    items: [
      { label: 'Patio & Bahías (Hub)', icon: '🏎️', to: '/automotive-dashboard', requiredPermission: 'automotive.read' },
      { label: 'Recepción (Check-In)', icon: '📝', to: '/automotive-checkin', requiredPermission: 'automotive.create' },
      { label: 'Flota / Vehículos', icon: '🚗', to: '/vehicles', requiredPermission: 'automotive.read' },
    ],
  },
  {
    key: 'beauty',
    label: 'Belleza / Salón / Spa',
    requiredVertical: 'BEAUTY',
    requiredPermission: 'beauty.read',
    items: [
      { label: 'Agenda de Citas', icon: '💇', to: '/beauty-agenda', requiredPermission: 'beauty.read' },
      { label: 'Equipo y Horarios', icon: '👥', to: '/beauty-staff', requiredPermission: 'beauty.read' },
      { label: 'Clientes y Fórmulas', icon: '📒', to: '/beauty-clients', requiredPermission: 'beauty.read' },
      { label: 'Catálogo de Servicios', icon: '📋', to: '/service-items', requiredPermission: 'beauty.create' },
      { label: 'Liquidación de Comisiones', icon: '💰', to: '/service-commissions', requiredPermission: 'beauty.create' },
    ],
  },
  {
    key: 'veterinary',
    label: 'Veterinaria & Pet Shop',
    requiredVertical: 'VETERINARY',
    requiredPermission: 'veterinary.read',
    items: [
      { label: 'Centro Clínico (Hub)', icon: '🐾', to: '/veterinary-dashboard', requiredPermission: 'veterinary.read' },
      { label: 'Mascotas / Pacientes', icon: '🐶', to: '/veterinary-pets', requiredPermission: 'veterinary.read' },
      { label: 'Consultorio & Vacunas', icon: '🩺', to: '/veterinary-consultations', requiredPermission: 'veterinary.create' },
      { label: 'Catálogo de Servicios', icon: '📋', to: '/service-items', requiredPermission: 'veterinary.create' },
      { label: 'Liquidación de Comisiones', icon: '💰', to: '/service-commissions', requiredPermission: 'veterinary.create' },
    ],
  },
  {
    key: 'laundry',
    label: 'Lavandería & Tintorería',
    requiredVertical: 'LAUNDRY',
    requiredPermission: 'laundry.read',
    items: [
      { label: 'Planta & Percheros (Hub)', icon: '🧺', to: '/laundry-dashboard', requiredPermission: 'laundry.read' },
      { label: 'Recepción & Tickets', icon: '👕', to: '/laundry-intake', requiredPermission: 'laundry.create' },
      { label: 'Catálogo de Tarifas', icon: '📋', to: '/service-items', requiredPermission: 'laundry.create' },
      { label: 'Liquidación de Comisiones', icon: '💰', to: '/service-commissions', requiredPermission: 'laundry.create' },
    ],
  },
  {
    key: 'bakery',
    label: 'Panadería & Pastelería',
    requiredVertical: 'BAKERY',
    requiredPermission: 'bakery.read',
    items: [
      { label: 'Hornos & Vitrina (Hub)', icon: '🥐', to: '/bakery-dashboard', requiredPermission: 'bakery.read' },
      { label: 'Recetario & Costeo', icon: '🥖', to: '/bakery-recipes', requiredPermission: 'bakery.create' },
      { label: 'Lotes y Frescura (FEFO)', icon: '🏷️', to: '/expiring-lots', requiredPermission: 'bakery.read' },
      { label: 'Maestros Panaderos', icon: '👨‍🍳', to: '/service-workers', requiredPermission: 'bakery.create' },
    ],
  },
  {
    key: 'academy',
    label: 'Academia & Educación',
    requiredVertical: 'ACADEMY',
    requiredPermission: 'academy.read',
    items: [
      { label: 'Campus & Asistencia (Hub)', icon: '🎓', to: '/academy-dashboard', requiredPermission: 'academy.read' },
      { label: 'Cursos, Grupos & Matrículas', icon: '📚', to: '/academy-programs', requiredPermission: 'academy.create' },
      { label: 'Cuerpo Docente', icon: '👩‍🏫', to: '/service-workers', requiredPermission: 'academy.create' },
      { label: 'Liquidación Docentes', icon: '💰', to: '/service-commissions', requiredPermission: 'academy.create' },
    ],
  },
  {
    key: 'real-estate',
    label: 'Inmobiliaria & Propiedades',
    requiredVertical: 'REAL_ESTATE',
    requiredPermission: 'real-estate.read',
    items: [
      { label: 'Portafolio & Giros (Hub)', icon: '🏢', to: '/real-estate-dashboard', requiredPermission: 'real-estate.read' },
      { label: 'Inmuebles, Contratos & Cánones', icon: '🔑', to: '/real-estate-leases', requiredPermission: 'real-estate.read' },
      { label: 'Asesores Inmobiliarios', icon: '👔', to: '/service-workers', requiredPermission: 'real-estate.update' },
      { label: 'Comisiones de Agencia', icon: '💰', to: '/service-commissions', requiredPermission: 'real-estate.update' },
    ],
  },
  {
    key: 'hotel',
    label: 'Recepción Hotel',
    requiredVertical: 'HOTEL',
    requiredPermission: 'hotel.read',
    items: [
      { label: 'Dashboard', icon: '📊', to: '/hotel-dashboard', requiredPermission: 'hotel.read' },
      { label: 'Habitaciones', icon: '🛏️', to: '/hotel-rooms', requiredPermission: 'hotel.read' },
      { label: 'Reservas', icon: '🛎️', to: '/hotel-reservations', requiredPermission: 'hotel.create' },
      { label: 'Reportes', icon: '📈', to: '/hotel-reports', requiredPermission: 'hotel.create' },
    ],
  },
  {
    key: 'configuracion',
    label: 'Configuración',
    isCore: true,
    requiredPermission: ['taxes.update', 'users.read', 'organizations.update'],
    items: [
      { label: 'Impuestos y Fiscal', icon: '🏛️', to: '/taxes', requiredPermission: 'taxes.update' },
      { label: 'Personal / Usuarios', icon: '👥', to: '/users', requiredPermission: 'users.read' },
      { label: 'Roles y Permisos (RBAC)', icon: '🛡️', to: '/security-settings', requiredPermission: 'organizations.update' },
    ],
  },
]

