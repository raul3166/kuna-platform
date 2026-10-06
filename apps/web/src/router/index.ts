import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useVerticalsStore } from '../stores/verticals'
import NotFoundView from '../views/NotFoundView.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'home',
    redirect: () => {
      const authStore = useAuthStore()
      return authStore.isAuthenticated ? '/dashboard' : '/login'
    }
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    // 1. Tu panel de bienvenida original
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/organizations',
    name: 'organizations',
    component: () => import('../views/OrganizationsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/products',
    name: 'products',
    component: () => import('../views/ProductsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    // 2. El nuevo panel analítico de inventarios
    path: '/inventory-dashboard',
    name: 'inventory-dashboard',
    component: () => import('../views/InventoryDashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/inventory-movements',
    name: 'inventory-movements',
    component: () => import('../views/InventoryMovementsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/inventory-adjustments',
    name: 'inventory-adjustments',
    component: () => import('../views/InventoryMovementsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/inventory-transfers',
    name: 'inventory-transfers',
    component: () => import('../views/InventoryTransfersView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/kardex',
    name: 'kardex',
    component: () => import('../views/KardexView.vue'),
    meta: { requiresAuth: true }
  },
  {
  path: '/suppliers',
  name: 'suppliers',
  component: () => import('../views/SuppliersView.vue'),
  meta: { requiresAuth: true }
},
{
  path: '/purchase-orders',
  name: 'purchase-orders',
  component: () => import('../views/PurchaseOrdersView.vue'), // La crearemos en la siguiente historia
  meta: { requiresAuth: true }
},
{
  path: '/goods-receipts',
  name: 'goods-receipts',
  component: () => import('../views/GoodsReceiptsView.vue'),
  meta: { requiresAuth: true }
},
{
  path: '/purchase-invoices',
  name: 'purchase-invoices',
  component: () => import('../views/PurchaseInvoicesView.vue'),
  meta: { requiresAuth: true }
},
{
  path: '/purchase-returns',
  name: 'purchase-returns',
  component: () => import('../views/PurchaseReturnsView.vue'),
  meta: { requiresAuth: true }
},
{
  path: '/customers',
  name: 'customers',
  component: () => import('../views/CustomersView.vue'),
  meta: { requiresAuth: true }
},
{
  path: '/users',
  name: 'users',
  component: () => import('../views/UsersView.vue'),
  meta: { requiresAuth: true }
},
{
  path: '/security-settings',
  name: 'security-settings',
  component: () => import('../views/SecuritySettingsView.vue'),
  meta: { requiresAuth: true }
},
{
  path: '/retail-dashboard',
  name: 'retail-dashboard',
  component: () => import('../views/RetailDashboardView.vue'),
  meta: { requiresAuth: true, requiredVertical: 'RETAIL' }
},
{
  path: '/pos',
  name: 'pos',
  component: () => import('../views/PosTerminalView.vue'),
  meta: { requiresAuth: true, requiredVertical: 'RETAIL' }
},
{
  path: '/sales',
  name: 'sales',
  component: () => import('../views/SalesLedgerView.vue'),
  meta: { requiresAuth: true, requiredVertical: 'RETAIL' }
},
{
  path: '/sale-returns',
  name: 'sale-returns',
  component: () => import('../views/SaleReturnsView.vue'),
  meta: { requiresAuth: true, requiredVertical: 'RETAIL' }
},
{
  path: '/executive-dashboard',
  name: 'executive-dashboard',
  component: () => import('../views/ExecutiveDashboardView.vue'),
  meta: { requiresAuth: true, requiredVertical: 'RETAIL' }
},
{
  path: '/sales-performance',
  name: 'sales-performance-report',
  component: () => import('../views/SalesPerformanceReportView.vue'),
  meta: { requiresAuth: true, requiredVertical: 'RETAIL' }
},
{
  path: '/rooms',
  name: 'restaurant-rooms',
  component: () => import('../views/RoomLayoutView.vue'),
  meta: { requiresAuth: true, requiredVertical: 'RESTAURANT' }
},
{
  path: '/restaurant-orders',
  name: 'restaurant-orders',
  component: () => import('../views/RestaurantOrderView.vue'),
  meta: { requiresAuth: true, requiredVertical: 'RESTAURANT' }
},
{
  path: '/kitchen',
  name: 'kitchen',
  component: () => import('../views/KitchenView.vue'),
  meta: { requiresAuth: true, requiredVertical: 'RESTAURANT' }
},
{
      path: '/taxes',
      name: 'taxes',
      component: () => import('../views/TaxesView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/fiscalSummary',
      name: 'fiscalSummary',
      component: () => import('../views/FiscalSummaryView.vue'),
      meta: { requiresAuth: true, requiredVertical: 'RETAIL' }
    },
    {
    path: '/expiring-lots',
    name: 'expiring-lots',
    component: () => import('../views/ExpiringLotsView.vue'),
    meta: { requiresAuth: true, requiredVertical: 'PHARMACY' }
  },
  /*{
    path: '/prescriptions',
    name: 'prescriptions',
    component: () => import('../views/PrescriptionsView.vue'),
    meta: { requiresAuth: true }
  },*/
  {
  path: '/gym-membership-plans',
  name: 'gym-membership-plans',
  component: () => import('../views/GymMembershipPlansView.vue'),
  meta: { requiresAuth: true, requiredVertical: 'GYM' }
},
{
  path: '/gym-subscriptions',
  name: 'gym-subscriptions',
  component: () => import('../views/GymSubscriptionsView.vue'),
  meta: { requiresAuth: true, requiredVertical: 'GYM' }
},
{
  path: '/gym-checkin',
  name: 'gym-checkin',
  component: () => import('../views/GymCheckInView.vue'),
  meta: { requiresAuth: true, requiredVertical: 'GYM' }
},
{
  path: '/gym-instructors',
  name: 'gym-instructors',
  component: () => import('../views/GymInstructorsView.vue'),
  meta: { requiresAuth: true, requiredVertical: 'GYM' }
},
{
  path: '/studio-plans',
  name: 'studio-plans',
  component: () => import('../views/StudioPlansView.vue'),
  meta: { requiresAuth: true, requiredVertical: 'STUDIO' }
},
{
  path: '/studio-subscriptions',
  name: 'studio-subscriptions',
  component: () => import('../views/StudioSubscriptionsView.vue'),
  meta: { requiresAuth: true, requiredVertical: 'STUDIO' }
},
{
  path: '/studio-checkin',
  name: 'studio-checkin',
  component: () => import('../views/StudioCheckInView.vue'),
  meta: { requiresAuth: true, requiredVertical: 'STUDIO' }
},
{
  path: '/studio-schedules',
  name: 'studio-schedules',
  component: () => import('../views/StudioSchedulesView.vue'),
  meta: { requiresAuth: true, requiredVertical: 'STUDIO' }
},
{
  path: '/studio-bookings',
  name: 'studio-bookings',
  component: () => import('../views/StudioBookingsView.vue'),
  meta: { requiresAuth: true, requiredVertical: 'STUDIO' }
},
{
  path: '/studio-instructors',
  name: 'studio-instructors',
  component: () => import('../views/StudioInstructorsView.vue'),
  meta: { requiresAuth: true, requiredVertical: 'STUDIO' }
},
{
    path: '/service-orders',
    name: 'service-orders',
    component: () => import('../views/ServiceOrdersView.vue'),
    meta: { requiresAuth: true, requiredVertical: 'SERVICES' }
  },
  {
    path: '/service-items',
    name: 'service-items',
    component: () => import('../views/ServiceItemsView.vue'),
    meta: { requiresAuth: true, requiredVertical: 'SERVICES' }
  },
  {
    path: '/service-workers',
    name: 'service-workers',
    component: () => import('../views/ServiceWorkersView.vue'),
    meta: { requiresAuth: true, requiredVertical: 'SERVICES' }
  },
  {
    path: '/service-commissions',
    name: 'service-commissions',
    component: () => import('../views/ServiceCommissionsView.vue'),
    meta: { requiresAuth: true, requiredVertical: 'SERVICES' }
  },
  {
    path: '/service-reports',
    name: 'service-reports',
    component: () => import('../views/ServiceReportsView.vue'),
    meta: { requiresAuth: true, requiredVertical: 'SERVICES' }
  },
{
  path: '/hotel-dashboard',
  name: 'hotel-dashboard',
  component: () => import('../views/HotelDashboardView.vue'),
  meta: { requiresAuth: true, requiredVertical: 'HOTEL' }
},
{
  path: '/hotel-rooms',
  name: 'hotel-rooms',
  component: () => import('../views/HotelRoomsView.vue'),
  meta: { requiresAuth: true, requiredVertical: 'HOTEL' }
},
{
  path: '/hotel-reservations',
  name: 'hotel-reservations',
  component: () => import('../views/HotelReservationsView.vue'),
  meta: { requiresAuth: true, requiredVertical: 'HOTEL' }
},
{
  path: '/hotel-reports',
  name: 'hotel-reports',
  component: () => import('../views/HotelReportsView.vue'),
  meta: { requiresAuth: true, requiredVertical: 'HOTEL' }
},
{
    path: '/internal-consumptions',
    name: 'internal-consumptions',
    component: () => import('../views/InternalConsumptionsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  const verticalsStore = useVerticalsStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next('/login')
  }

  if (to.path === '/login' && authStore.isAuthenticated) {
    return next('/dashboard')
  }

  // Validación de Verticales de Negocio
  const requiredVertical = to.meta.requiredVertical as string | undefined
  if (requiredVertical && authStore.currentOrganization?.id) {
    // Si aún no están cargados los verticales de la organización, cargarlos
    if (verticalsStore.activeVerticalCodes.length === 0) {
      await verticalsStore.loadOrganizationVerticals(authStore.currentOrganization.id)
    }

    if (!verticalsStore.hasVertical(requiredVertical)) {
      console.warn(
        `[KUNA Multi-Tenant] Acceso denegado: El vertical '${requiredVertical}' no está activado para la organización ${authStore.currentOrganization.name}.`
      )
      return next('/dashboard')
    }
  }

  next()
})

export default router
