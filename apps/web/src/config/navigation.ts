export interface NavigationItem {
  label: string
  icon: string
  to: string
  requiredPermission?: string
}

export interface NavigationSection {
  key: string
  label: string
  isCore?: boolean
  requiredVertical?: string // Código del vertical requerido (ej: 'HOTEL', 'RESTAURANT', 'SERVICES')
  items: NavigationItem[]
}

/**
 * Configuración declarativa y modular de las secciones del menú lateral de KUNA.
 * Cada sección vertical se vincula a su código de vertical correspondiente,
 * de modo que solo las organizaciones con el vertical activado verán la sección.
 */
export const navigationSections: NavigationSection[] = [
  {
    key: 'core',
    label: 'Core',
    isCore: true,
    items: [
      { label: 'Bienvenida', icon: '👋', to: '/dashboard' },
      { label: 'Organizaciones', icon: '🏢', to: '/organizations' },
    ],
  },
  {
    key: 'comercial',
    label: 'Comercial (Retail)',
    requiredVertical: 'RETAIL',
    items: [
      { label: 'Panel de Tienda (Hub)', icon: '🏪', to: '/retail-dashboard' },
      { label: 'Terminal Punto de Venta (POS)', icon: '🎛️', to: '/pos' },
      { label: 'Historial de Ventas', icon: '📊', to: '/sales' },
      { label: 'Devoluciones de Clientes', icon: '↩️', to: '/sale-returns' },
      { label: 'Dashboard Ejecutivo', icon: '📈', to: '/executive-dashboard' },
      { label: 'Reporte de Rendimiento', icon: '📈', to: '/sales-performance' },
      { label: 'Reporte Fiscal', icon: '📈', to: '/fiscalSummary' },
      { label: 'Clientes (CRM)', icon: '👥', to: '/customers' },
    ],
  },
  {
    key: 'inventario',
    label: 'Inventario Core',
    isCore: true,
    items: [
      { label: 'Productos y Catálogos', icon: '📦', to: '/products' },
      { label: 'Panel Analítico Stock', icon: '📊', to: '/inventory-dashboard' },
      { label: 'Movimientos y Ajustes', icon: '🔄', to: '/inventory-movements' },
      { label: 'Transferencias', icon: '🚚', to: '/inventory-transfers' },
      { label: 'Consumo Interno', icon: '📉', to: '/internal-consumptions' },
      { label: 'Kardex / Historial', icon: '📋', to: '/kardex' },
    ],
  },
  {
    key: 'compras',
    label: 'Compras',
    isCore: true,
    items: [
      { label: 'Proveedores', icon: '🚚', to: '/suppliers' },
      { label: 'Órdenes de Compra', icon: '📑', to: '/purchase-orders' },
      { label: 'Recepción de Mercancía', icon: '📥', to: '/goods-receipts' },
      { label: 'Facturas de Proveedores', icon: '🧾', to: '/purchase-invoices' },
      { label: 'Devoluciones a Proveedores', icon: '↩️', to: '/purchase-returns' },
    ],
  },
  {
    key: 'restaurante',
    label: 'Restaurante',
    requiredVertical: 'RESTAURANT',
    items: [
      { label: 'Salones y Mesas', icon: '🍽️', to: '/rooms' },
      { label: 'Toma de Pedidos', icon: '📝', to: '/restaurant-orders' },
      { label: 'Monitor de Cocina', icon: '👨‍🍳', to: '/kitchen' },
    ],
  },
  {
    key: 'farmacia',
    label: 'Farmacia',
    requiredVertical: 'PHARMACY',
    items: [
      { label: 'Control de Lotes (FEFO)', icon: '🏷️', to: '/expiring-lots' },
      { label: 'Recetas Médicas', icon: '💊', to: '/prescriptions' },
    ],
  },
  {
    key: 'gimnasio',
    label: 'Gimnasio',
    requiredVertical: 'GYM',
    items: [
      { label: 'Planes de Membresía', icon: '🏋️', to: '/gym-membership-plans' },
      { label: 'Suscripciones', icon: '💳', to: '/gym-subscriptions' },
      { label: 'Control de Acceso (Check-in)', icon: '🚪', to: '/gym-checkin' },
      { label: 'Instructores / Entrenadores', icon: '🧑‍🏫', to: '/gym-instructors' },
    ],
  },
  {
    key: 'estudio',
    label: 'Estudio (Yoga / Pilates)',
    requiredVertical: 'STUDIO',
    items: [
      { label: 'Planes y Paquetes', icon: '🧘‍♀️', to: '/studio-plans' },
      { label: 'Suscripciones y Tiqueteras', icon: '🎟️', to: '/studio-subscriptions' },
      { label: 'Control de Asistencia', icon: '🚪', to: '/studio-checkin' },
      { label: 'Calendario Clases', icon: '🚪', to: '/studio-schedules' },
      { label: 'Reservas de Cupos', icon: '📌', to: '/studio-bookings' },
      { label: 'Instructores y Liquidación', icon: '👩‍🏫', to: '/studio-instructors' },
    ],
  },
  {
    key: 'servicios',
    label: 'Órdenes de Servicio',
    requiredVertical: 'SERVICES',
    items: [
      { label: 'Órdenes de Servicio', icon: '🛠️', to: '/service-orders' },
      { label: 'Catálogo de Servicios', icon: '📋', to: '/service-items' },
      { label: 'Técnicos / Personal', icon: '👷', to: '/service-workers' },
      { label: 'Liquidación de Comisiones', icon: '💰', to: '/service-commissions' },
      { label: 'Reportes de Servicio', icon: '📊', to: '/service-reports' },
    ],
  },
  {
    key: 'hotel',
    label: 'Recepción Hotel',
    requiredVertical: 'HOTEL',
    items: [
      { label: 'Dashboard', icon: '📊', to: '/hotel-dashboard' },
      { label: 'Habitaciones', icon: '🛏️', to: '/hotel-rooms' },
      { label: 'Reservas', icon: '🛎️', to: '/hotel-reservations' },
      { label: 'Reportes', icon: '📈', to: '/hotel-reports' },
    ],
  },
  {
    key: 'configuracion',
    label: 'Configuración',
    isCore: true,
    items: [
      { label: 'Impuestos y Fiscal', icon: '🏛️', to: '/taxes' },
      { label: 'Personal / Usuarios', icon: '👥', to: '/users' },
      { label: 'Roles y Permisos (RBAC)', icon: '🛡️', to: '/security-settings' },
    ],
  },
]

