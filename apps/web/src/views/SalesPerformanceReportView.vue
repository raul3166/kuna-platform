<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

interface Branch {
  id: string
  name: string
  code: string
}

interface BranchReportItem {
  branchId: string
  branchName: string
  branchCode: string
  subtotal: number
  discount: number
  tax: number
  totalSales: number
  transactionCount: number
}

interface ChannelReportItem {
  channel: string
  totalSales: number
  transactionCount: number
}

interface PaymentMethodReportItem {
  paymentMethod: string
  totalAmount: number
  count: number
}

interface PerformanceReportResponse {
  byBranch: BranchReportItem[]
  byChannel: ChannelReportItem[]
  byPaymentMethod: PaymentMethodReportItem[]
}

const isLoading = ref(true)
const errorMessage = ref('')
const reportData = ref<PerformanceReportResponse | null>(null)

// Filtros
const branches = ref<Branch[]>([])
const selectedBranchId = ref<string>('')
const startDate = ref('')
const endDate = ref('')

function formatCurrency(val: number): string {
  return (val || 0).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

async function fetchBranches() {
  try {
    const response = await api.get<Branch[]>('/branches')
    branches.value = response.data
  } catch (error) {
    console.error('Error al cargar sucursales:', error)
  }
}

// Interfaces para KNA-083
interface TopSellerItem {
  productId: string
  productName: string
  sku: string
  totalQuantity: number
  totalRevenue: number
  transactionCount: number
}

interface InventoryTurnoverData {
  totalUnitsSold: number
  totalCogs: number
  totalStockUnits: number
  totalInventoryValue: number
  turnoverRatio: number
}

// Estados reactivos
const topSellers = ref<TopSellerItem[]>([])
const turnoverData = ref<InventoryTurnoverData | null>(null)

// Actualiza la función fetchReport para incluir los nuevos endpoints
async function fetchReport() {
  if (!authStore.user?.organizationId) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    const params: Record<string, string> = {
      organizationId: authStore.user.organizationId,
    }

    const activeBranch = selectedBranchId.value || authStore.currentBranch?.id
    if (activeBranch) {
      params.branchId = activeBranch
    }

    if (startDate.value && startDate.value.trim() !== '') {
      params.startDate = startDate.value
    }
    if (endDate.value && endDate.value.trim() !== '') {
      params.endDate = endDate.value
    }

    // Peticiones en paralelo
    const [resPerformance, resTopSellers, resTurnover] = await Promise.all([
      api.get<PerformanceReportResponse>('/analytics/sales-performance', { params }),
      api.get<TopSellerItem[]>('/analytics/top-sellers', { params: { ...params, limit: '10' } }),
      api.get<InventoryTurnoverData>('/analytics/inventory-turnover', { params }),
    ])

    reportData.value = {
      byBranch: resPerformance.data?.byBranch ?? [],
      byChannel: resPerformance.data?.byChannel ?? [],
      byPaymentMethod: resPerformance.data?.byPaymentMethod ?? [],
    }
    topSellers.value = resTopSellers.data ?? []
    turnoverData.value = resTurnover.data ?? null
  } catch (error: any) {
    console.error(error)
    errorMessage.value = error.response?.data?.message || 'Error al cargar los reportes de rendimiento.'
  } finally {
    isLoading.value = false
  }
}

function exportToCSV() {
  if (!reportData.value) return

  let csvContent = 'data:text/csv;charset=utf-8,'
  csvContent += 'REPORTE DE VENTAS Y RENDIMIENTO\n\n'

  // Sección 1: Ventas por Sucursal
  csvContent += 'VENTAS POR SUCURSAL\n'
  csvContent += 'Codigo,Sucursal,Transacciones,Subtotal,Descuentos,Impuestos,Total Net\n'
  reportData.value.byBranch.forEach((b) => {
    csvContent += `"${b.branchCode}","${b.branchName}",${b.transactionCount},${b.subtotal},${b.discount},${b.tax},${b.totalSales}\n`
  })

  // Sección 2: Top Sellers
  csvContent += '\nTOP PRODUCTOS MAS VENDIDOS\n'
  csvContent += 'SKU,Producto,Cantidad Vendida,Transacciones,Ingreso Total\n'
  topSellers.value.forEach((ts) => {
    csvContent += `"${ts.sku}","${ts.productName}",${ts.totalQuantity},${ts.transactionCount},${ts.totalRevenue}\n`
  })

  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', `reporte_rendimiento_${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

onMounted(async () => {
  await fetchBranches()
  if (authStore.currentBranch?.id) {
    selectedBranchId.value = authStore.currentBranch.id
  }
  fetchReport()
})
</script>

<template>
  <AppLayout>
    <header class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-900">Reportes de Ventas y Rendimiento</h1>
        <p class="mt-1 text-sm text-slate-500">
          Análisis consolidado de ventas por sucursal, origen de transacción y medios de pago.
        </p>
      </div>

      <!-- BARRA DE FILTROS -->
      <div class="flex flex-wrap items-end gap-3 bg-white p-3 border border-slate-200 rounded-xl shadow-sm">
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Sucursal</label>
          <select
            v-model="selectedBranchId"
            @change="fetchReport"
            class="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white"
          >
            <option value="">🏢 Todas las Sedes (Consolidado)</option>
            <option v-for="branch in branches" :key="branch.id" :value="branch.id">
              📍 {{ branch.name }} ({{ branch.code }})
            </option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Desde</label>
          <input
            v-model="startDate"
            type="date"
            @change="fetchReport"
            class="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Hasta</label>
          <input
            v-model="endDate"
            type="date"
            @change="fetchReport"
            class="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          @click="fetchReport"
          class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Filtrar
        </button>
        <button
          @click="exportToCSV"
          :disabled="isLoading || !reportData"
          class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
        >
          📥 Exportar CSV
        </button>
      </div>
    </header>

    <!-- MENSAJE DE ERROR -->
    <div
      v-if="errorMessage"
      class="mb-6 bg-red-50 text-red-700 p-4 border border-red-200 rounded-xl text-sm flex items-center justify-between"
    >
      <span>⚠️ {{ errorMessage }}</span>
      <button @click="errorMessage = ''" class="text-red-500 hover:text-red-700 font-bold">✕</button>
    </div>

    <!-- CARGA -->
    <div
      v-if="isLoading"
      class="p-12 text-center text-sm font-medium text-slate-500 animate-pulse bg-white border border-slate-200 rounded-xl shadow-sm"
    >
      Generando reporte de rendimiento comercial...
    </div>

    <!-- CONTENIDO -->
    <div v-else-if="reportData" class="space-y-6">
      <!-- RENDIMIENTO POR SUCURSAL -->
      <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 class="text-base font-bold text-slate-900 mb-4">Ventas por Sucursal</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th class="py-3 px-4">Código</th>
                <th class="py-3 px-4">Sucursal</th>
                <th class="py-3 px-4 text-right">Tx</th>
                <th class="py-3 px-4 text-right">Subtotal</th>
                <th class="py-3 px-4 text-right">Descuentos</th>
                <th class="py-3 px-4 text-right">Impuestos</th>
                <th class="py-3 px-4 text-right">Total Net</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="b in reportData.byBranch" :key="b.branchId" class="hover:bg-slate-50">
                <td class="py-3 px-4 font-mono text-xs font-bold text-slate-500">{{ b.branchCode }}</td>
                <td class="py-3 px-4 font-semibold text-slate-800">{{ b.branchName }}</td>
                <td class="py-3 px-4 text-right font-medium">{{ b.transactionCount }}</td>
                <td class="py-3 px-4 text-right font-medium text-slate-700">{{ formatCurrency(b.subtotal) }}</td>
                <td class="py-3 px-4 text-right font-medium text-amber-600">-{{ formatCurrency(b.discount) }}</td>
                <td class="py-3 px-4 text-right font-medium text-slate-700">+{{ formatCurrency(b.tax) }}</td>
                <td class="py-3 px-4 text-right font-bold text-blue-600">{{ formatCurrency(b.totalSales) }}</td>
              </tr>
              <tr v-if="!reportData.byBranch.length">
                <td colspan="7" class="py-6 text-center text-slate-400">No hay ventas registradas para el período seleccionado.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- DESGLOSE POR CANAL Y MEDIOS DE PAGO -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- CANALES DE VENTA -->
        <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 class="text-base font-bold text-slate-900 mb-4">Ventas por Canal / Origen</h3>
          <div class="space-y-3">
            <div
              v-for="ch in reportData.byChannel"
              :key="ch.channel"
              class="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between"
            >
              <div>
                <span class="text-xs font-bold uppercase text-slate-500 tracking-wider">Canal: {{ ch.channel }}</span>
                <p class="text-xs text-slate-400 mt-0.5">{{ ch.transactionCount }} órdenes procesadas</p>
              </div>
              <span class="text-lg font-extrabold text-slate-900">{{ formatCurrency(ch.totalSales) }}</span>
            </div>
            <div v-if="!reportData.byChannel.length" class="text-sm text-slate-400 text-center py-4">
              Sin datos de canales.
            </div>
          </div>
        </div>

        <!-- MEDIOS DE PAGO -->
        <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 class="text-base font-bold text-slate-900 mb-4">Recaudo por Medio de Pago</h3>
          <div class="space-y-3">
            <div
              v-for="pm in reportData.byPaymentMethod"
              :key="pm.paymentMethod"
              class="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between"
            >
              <div>
                <span class="text-xs font-bold uppercase text-slate-500 tracking-wider">{{ pm.paymentMethod }}</span>
                <p class="text-xs text-slate-400 mt-0.5">{{ pm.count }} transacciones de recaudo</p>
              </div>
              <span class="text-lg font-extrabold text-emerald-600">{{ formatCurrency(pm.totalAmount) }}</span>
            </div>
            <div v-if="!reportData.byPaymentMethod.length" class="text-sm text-slate-400 text-center py-4">
              Sin pagos registrados.
            </div>
          </div>
        </div>
      </div>
      <!-- KNA-083: MÉTRICAS DE ROTACIÓN DE INVENTARIO -->
      <div v-if="turnoverData" class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p class="text-xs font-semibold text-slate-500 uppercase">Rotación de Inventario</p>
          <p class="text-2xl font-extrabold text-blue-600 mt-1">{{ turnoverData.turnoverRatio }}x</p>
          <p class="text-xs text-slate-400 mt-1">Ratio (COGS / Valor Inventario)</p>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p class="text-xs font-semibold text-slate-500 uppercase">Unidades Vendidas</p>
          <p class="text-2xl font-extrabold text-slate-800 mt-1">{{ turnoverData.totalUnitsSold }}</p>
          <p class="text-xs text-slate-400 mt-1">Costo Total: {{ formatCurrency(turnoverData.totalCogs) }}</p>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p class="text-xs font-semibold text-slate-500 uppercase">Stock Actual (Unidades)</p>
          <p class="text-2xl font-extrabold text-slate-800 mt-1">{{ turnoverData.totalStockUnits }}</p>
          <p class="text-xs text-slate-400 mt-1">Unidades registradas</p>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p class="text-xs font-semibold text-slate-500 uppercase">Valoración de Inventario</p>
          <p class="text-2xl font-extrabold text-emerald-600 mt-1">{{ formatCurrency(turnoverData.totalInventoryValue) }}</p>
          <p class="text-xs text-slate-400 mt-1">Valor a costo actual</p>
        </div>
      </div>

      <!-- KNA-083: TOP SELLERS TABLE -->
      <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 class="text-base font-bold text-slate-900 mb-4">Top 10 Productos Más Vendidos</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th class="py-3 px-4">SKU</th>
                <th class="py-3 px-4">Producto</th>
                <th class="py-3 px-4 text-right">Cant. Vendida</th>
                <th class="py-3 px-4 text-right">Transacciones</th>
                <th class="py-3 px-4 text-right">Ingreso Generado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="item in topSellers" :key="item.productId" class="hover:bg-slate-50">
                <td class="py-3 px-4 font-mono text-xs font-bold text-slate-500">{{ item.sku }}</td>
                <td class="py-3 px-4 font-semibold text-slate-800">{{ item.productName }}</td>
                <td class="py-3 px-4 text-right font-medium text-slate-700">{{ item.totalQuantity }}</td>
                <td class="py-3 px-4 text-right font-medium text-slate-600">{{ item.transactionCount }}</td>
                <td class="py-3 px-4 text-right font-bold text-emerald-600">{{ formatCurrency(item.totalRevenue) }}</td>
              </tr>
              <tr v-if="!topSellers.length">
                <td colspan="5" class="py-6 text-center text-slate-400">No hay registro de productos vendidos en el período.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
