import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'
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
  path: '/pos',
  name: 'pos',
  component: () => import('../views/PosTerminalView.vue'),
  meta: { requiresAuth: true }
},
{
  path: '/sales',
  name: 'sales',
  component: () => import('../views/SalesLedgerView.vue'),
  meta: { requiresAuth: true }
},
{
  path: '/sale-returns',
  name: 'sale-returns',
  component: () => import('../views/SaleReturnsView.vue'),
  meta: { requiresAuth: true }
},
{
    path: '/executive-dashboard',
    name: 'executive-dashboard',
    component: () => import('../views/ExecutiveDashboardView.vue'),
    meta: { requiresAuth: true }
  },
  {
  path: '/sales-performance',
  name: 'sales-performance-report',
  component: () => import('../views/SalesPerformanceReportView.vue'),
  meta: { requiresAuth: true }
},
{
  path: '/rooms',
  name: 'restaurant-rooms',
  component: () => import('../views/RoomLayoutView.vue'),
  meta: { requiresAuth: true }
},
{
  path: '/restaurant-orders',
  name: 'restaurant-orders',
  component: () => import('../views/RestaurantOrderView.vue'),
    meta: { requiresAuth: true }
},
,
{
  path: '/kitchen',
  name: 'kitchen',
  component: () => import('../views/KitchenView.vue'),
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

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.path === '/login' && authStore.isAuthenticated) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
