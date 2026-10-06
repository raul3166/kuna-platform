<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

interface DashboardData {
  today: {
    totalSales: number
    transactions: number
    averageTicket: number
    paymentsBreakdown: Record<string, number>
  }
  activeCashSession: {
    id: string
    status: string
    openingDate: string
    openingBalance: number
    cashier: string
    branchName: string
  } | null
  topSellingToday: Array<{
    id: string
    name: string
    sku: string
    quantity: number
    totalRevenue: number
  }>
  lowStockAlerts: Array<{
    productId: string
    name: string
    sku: string
    barcode?: string
    salePrice: number
    currentStock: number
    branchName: string
  }>
}

interface RetailConfig {
  subtype: string
  enableBarcodeScanner: boolean
  allowNegativeStock: boolean
  requireCustomerOnCheckout: boolean
  defaultPaymentMethod: string
  receiptFooterNote: string
}

const data = ref<DashboardData | null>(null)
const config = ref<RetailConfig>({
  subtype: 'GENERAL',
  enableBarcodeScanner: true,
  allowNegativeStock: false,
  requireCustomerOnCheckout: false,
  defaultPaymentMethod: 'CASH',
  receiptFooterNote: '¡Gracias por su compra! Conserve su factura para garantías.',
})

const isLoading = ref(true)
const errorMessage = ref('')
const isConfigModalOpen = ref(false)
const isSavingConfig = ref(false)

const subtypeLabels: Record<string, { label: string; icon: string }> = {
  GENERAL: { label: 'Tienda de Conveniencia / Minimarket', icon: '🏪' },
  BOUTIQUE: { label: 'Boutique / Moda y Ropa', icon: '👗' },
  HARDWARE: { label: 'Ferretería y Materiales', icon: '🔨' },
  STATIONERY: { label: 'Papelería y Librería', icon: '📚' },
  ELECTRONICS: { label: 'Tecnología y Electrónica', icon: '📱' },
  SPARE_PARTS: { label: 'Repuestos y Accesorios', icon: '⚙️' },
  PET_SHOP: { label: 'Pet Shop y Alimentos', icon: '🐾' },
}

const currentSubtypeInfo = computed(() => {
  return subtypeLabels[config.value.subtype] || { label: 'Comercio Minorista', icon: '🛍️' }
})

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

async function loadRetailData() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const orgId = authStore.currentOrganization?.id
    const branchId = authStore.currentBranch?.id
    const [dashRes, cfgRes] = await Promise.all([
      api.get<DashboardData>('/retail/dashboard', { params: { organizationId: orgId, branchId } }),
      api.get<{ config: RetailConfig }>('/retail/config', { params: { organizationId: orgId } }),
    ])

    data.value = dashRes.data
    if (cfgRes.data?.config) {
      config.value = { ...config.value, ...cfgRes.data.config }
    }
  } catch (error: any) {
    console.error(error)
    errorMessage.value = error.response?.data?.message || 'Error al conectar con el vertical Retail.'
  } finally {
    isLoading.value = false
  }
}

async function saveConfig() {
  isSavingConfig.value = true
  try {
    const orgId = authStore.currentOrganization?.id
    await api.patch('/retail/config', config.value, { params: { organizationId: orgId } })
    isConfigModalOpen.value = false
    await loadRetailData()
  } catch (error: any) {
    alert(error.response?.data?.message || 'Error al guardar la configuración.')
  } finally {
    isSavingConfig.value = false
  }
}

onMounted(() => {
  loadRetailData()
})
</script>

<template>
  <AppLayout>
    <!-- Encabezado con información del giro y botón de configuración -->
    <header class="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span class="text-2xl">{{ currentSubtypeInfo.icon }}</span>
          <h1 class="text-3xl font-bold tracking-tight text-slate-900">
            Hub de Mostrador & Retail
          </h1>
          <span class="rounded-full bg-blue-100 px-3 py-0.5 text-xs font-semibold text-blue-700">
            {{ currentSubtypeInfo.label }}
          </span>
        </div>
        <p class="mt-1 text-sm text-slate-500">
          Control operativo del punto de venta, arqueo de caja de turno y alertas de reposición inmediata.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button
          type="button"
          @click="isConfigModalOpen = true"
          class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <span>⚙️</span>
          <span>Ajustes de Tienda</span>
        </button>

        <router-link
          to="/pos"
          class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-500 transition-colors"
        >
          <span>🎛️</span>
          <span>Abrir POS Mostrador</span>
        </router-link>
      </div>
    </header>

    <!-- Estado de Carga / Error -->
    <div v-if="isLoading" class="flex h-56 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="text-center">
        <div class="inline-block animate-spin text-2xl mb-2">⏳</div>
        <p class="text-sm font-medium text-slate-500">Sincronizando caja y ventas del día...</p>
      </div>
    </div>

    <div v-else-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-6">
      {{ errorMessage }}
    </div>

    <!-- Contenido Principal -->
    <div v-else-if="data" class="space-y-6">
      <!-- 1. BANNER DE ESTADO DE CAJA REGISTRADORA -->
      <div
        class="rounded-2xl border p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all"
        :class="[
          data.activeCashSession
            ? 'border-emerald-200 bg-emerald-50/50'
            : 'border-amber-200 bg-amber-50/50'
        ]"
      >
        <div class="flex items-center gap-3.5">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
            :class="data.activeCashSession ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
          >
            {{ data.activeCashSession ? '🟢' : '⚠️' }}
          </div>
          <div>
            <h3 class="font-bold text-slate-900 text-base">
              {{ data.activeCashSession ? 'Caja Registradora Abierta' : 'Caja Registradora Cerrada en esta Sucursal' }}
            </h3>
            <p class="text-xs text-slate-600">
              <span v-if="data.activeCashSession">
                Cajero: <strong class="text-slate-800">{{ data.activeCashSession.cashier }}</strong> &bull; Saldo base: <strong>{{ formatCurrency(data.activeCashSession.openingBalance) }}</strong> en {{ data.activeCashSession.branchName }}.
              </span>
              <span v-else>
                No hay un turno de caja abierto en esta sucursal. Abre un turno para iniciar ventas en el POS.
              </span>
            </p>
          </div>
        </div>

        <div>
          <router-link
            to="/pos"
            class="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors shadow-sm"
            :class="[
              data.activeCashSession
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-amber-600 text-white hover:bg-amber-700'
            ]"
          >
            <span>{{ data.activeCashSession ? 'Ir al POS de Turno' : 'Abrir Turno de Caja' }}</span>
            <span>&rarr;</span>
          </router-link>
        </div>
      </div>

      <!-- 2. TARJETAS DE KPIS DEL DÍA -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Ventas Hoy -->
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
            <span>Ventas del Día</span>
            <span class="text-lg">💵</span>
          </div>
          <p class="mt-2 text-2xl font-black text-slate-900 tracking-tight">
            {{ formatCurrency(data.today.totalSales) }}
          </p>
          <p class="mt-1 text-xs text-slate-500">
            Monto bruto facturado hoy en mostrador
          </p>
        </div>

        <!-- Transacciones -->
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
            <span>Transacciones Hoy</span>
            <span class="text-lg">🧾</span>
          </div>
          <p class="mt-2 text-2xl font-black text-slate-900 tracking-tight">
            {{ data.today.transactions }}
          </p>
          <p class="mt-1 text-xs text-slate-500">
            Clientes atendidos y cobrados en caja
          </p>
        </div>

        <!-- Ticket Promedio -->
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
            <span>Ticket Promedio</span>
            <span class="text-lg">🏷️</span>
          </div>
          <p class="mt-2 text-2xl font-black text-slate-900 tracking-tight">
            {{ formatCurrency(data.today.averageTicket) }}
          </p>
          <p class="mt-1 text-xs text-slate-500">
            Valor promedio por cada venta realizada
          </p>
        </div>

        <!-- Desglose Efectivo vs Tarjetas -->
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
            <span>Cobros Efectivo / Tarjeta</span>
            <span class="text-lg">💳</span>
          </div>
          <div class="mt-2 text-xs space-y-1">
            <div class="flex justify-between">
              <span class="text-slate-500">Efectivo:</span>
              <span class="font-bold text-slate-800">{{ formatCurrency(data.today.paymentsBreakdown.CASH || 0) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Tarjeta / Transfer:</span>
              <span class="font-bold text-slate-800">
                {{ formatCurrency((data.today.paymentsBreakdown.CREDIT_CARD || 0) + (data.today.paymentsBreakdown.DEBIT_CARD || 0) + (data.today.paymentsBreakdown.TRANSFER || 0)) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. ACCESOS RÁPIDOS A MÓDULOS DE RETAIL -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <router-link
          to="/pos"
          class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-400 hover:shadow-md transition-all group"
        >
          <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-xl text-blue-600 group-hover:scale-110 transition-transform">
            🎛️
          </span>
          <div>
            <h4 class="text-sm font-bold text-slate-800">Terminal POS</h4>
            <p class="text-[11px] text-slate-400">Venta rápida en caja</p>
          </div>
        </router-link>

        <router-link
          to="/sales"
          class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-400 hover:shadow-md transition-all group"
        >
          <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-xl text-emerald-600 group-hover:scale-110 transition-transform">
            📊
          </span>
          <div>
            <h4 class="text-sm font-bold text-slate-800">Historial Ventas</h4>
            <p class="text-[11px] text-slate-400">Tirillas y facturas</p>
          </div>
        </router-link>

        <router-link
          to="/sale-returns"
          class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-400 hover:shadow-md transition-all group"
        >
          <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-xl text-rose-600 group-hover:scale-110 transition-transform">
            ↩️
          </span>
          <div>
            <h4 class="text-sm font-bold text-slate-800">Devoluciones</h4>
            <p class="text-[11px] text-slate-400">Reembolsos & garantías</p>
          </div>
        </router-link>

        <router-link
          to="/sales-performance"
          class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-400 hover:shadow-md transition-all group"
        >
          <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-xl text-purple-600 group-hover:scale-110 transition-transform">
            📈
          </span>
          <div>
            <h4 class="text-sm font-bold text-slate-800">Rendimiento</h4>
            <p class="text-[11px] text-slate-400">Reportes de ventas</p>
          </div>
        </router-link>
      </div>

      <!-- 4. DOS COLUMNAS: TOP PRODUCTOS HOY + ALERTAS DE STOCK BAJO -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Top 5 Más Vendidos Hoy -->
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="font-bold text-base text-slate-900">🌟 Top Más Vendidos Hoy</h3>
              <p class="text-xs text-slate-500">Productos con mayor rotación en mostrador hoy</p>
            </div>
            <router-link to="/products" class="text-xs font-semibold text-blue-600 hover:text-blue-500">
              Ver Catálogo &rarr;
            </router-link>
          </div>

          <div v-if="data.topSellingToday.length === 0" class="p-8 text-center text-slate-400 text-xs">
            Aún no se registran ventas de productos hoy en este turno.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="(item, idx) in data.topSellingToday"
              :key="item.id"
              class="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
            >
              <div class="flex items-center gap-3">
                <span class="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700">
                  #{{ idx + 1 }}
                </span>
                <div>
                  <h4 class="font-bold text-sm text-slate-800">{{ item.name }}</h4>
                  <span class="font-mono text-xs text-slate-400">{{ item.sku }}</span>
                </div>
              </div>

              <div class="text-right">
                <span class="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                  {{ item.quantity }} uds
                </span>
                <p class="text-xs font-semibold text-slate-600 mt-0.5">
                  {{ formatCurrency(item.totalRevenue) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Alertas de Stock Bajo -->
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="font-bold text-base text-slate-900">⚠️ Alertas de Reposición en Mostrador</h3>
              <p class="text-xs text-slate-500">Existencias con 5 o menos unidades en sucursal</p>
            </div>
            <router-link to="/inventory-transfers" class="text-xs font-semibold text-blue-600 hover:text-blue-500">
              Transferir Stock &rarr;
            </router-link>
          </div>

          <div v-if="data.lowStockAlerts.length === 0" class="p-8 text-center text-emerald-600 text-xs font-medium">
            ✅ ¡Excelente! No hay productos con existencias críticas en esta sucursal.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="item in data.lowStockAlerts"
              :key="item.productId"
              class="flex items-center justify-between p-3 rounded-xl border border-amber-100 bg-amber-50/40"
            >
              <div>
                <h4 class="font-bold text-sm text-slate-900">{{ item.name }}</h4>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="font-mono text-[11px] text-slate-500">{{ item.sku }}</span>
                  <span class="text-xs font-semibold text-slate-600">{{ formatCurrency(item.salePrice) }}</span>
                </div>
              </div>

              <div class="text-right">
                <span
                  class="inline-block rounded-full px-2.5 py-0.5 text-xs font-black"
                  :class="item.currentStock <= 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'"
                >
                  {{ item.currentStock <= 0 ? 'Agotado (0)' : `${item.currentStock} disponibles` }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL DE CONFIGURACIÓN DE TIENDA RETAIL -->
    <div
      v-if="isConfigModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
    >
      <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 class="text-lg font-bold text-slate-900">Configuración del Vertical Retail</h2>
          <button @click="isConfigModalOpen = false" class="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <form @submit.prevent="saveConfig" class="space-y-4 text-sm">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              Giro / Subtipo de Tienda
            </label>
            <select
              v-model="config.subtype"
              class="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-500 focus:outline-none"
            >
              <option value="GENERAL">🏪 Tienda General / Minimarket</option>
              <option value="BOUTIQUE">👗 Boutique / Moda & Calzado</option>
              <option value="HARDWARE">🔨 Ferretería & Materiales</option>
              <option value="STATIONERY">📚 Papelería & Librería</option>
              <option value="ELECTRONICS">📱 Tecnología & Electrónica</option>
              <option value="SPARE_PARTS">⚙️ Repuestos & Autopartes</option>
              <option value="PET_SHOP">🐾 Pet Shop & Mascotas</option>
            </select>
            <p class="text-[11px] text-slate-500 mt-1">
              Permite a KUNA adaptar la experiencia de punto de venta según la naturaleza de tu comercio.
            </p>
          </div>

          <div class="space-y-2 pt-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="config.enableBarcodeScanner"
                type="checkbox"
                class="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span class="text-xs font-medium text-slate-700">Habilitar lector de código de barras continuo</span>
            </label>

            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="config.requireCustomerOnCheckout"
                type="checkbox"
                class="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span class="text-xs font-medium text-slate-700">Exigir selección de cliente antes de cobrar venta</span>
            </label>

            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="config.allowNegativeStock"
                type="checkbox"
                class="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span class="text-xs font-medium text-slate-700">Permitir ventas con stock en negativo</span>
            </label>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              Nota o mensaje de pie de recibo/tirilla
            </label>
            <textarea
              v-model="config.receiptFooterNote"
              rows="2"
              class="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-blue-500 focus:outline-none"
              placeholder="Ej: ¡Gracias por su compra! Conserve este recibo para garantías."
            ></textarea>
          </div>

          <div class="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              @click="isConfigModalOpen = false"
              class="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isSavingConfig"
              class="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {{ isSavingConfig ? 'Guardando...' : 'Guardar Configuración' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>

