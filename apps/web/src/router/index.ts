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
