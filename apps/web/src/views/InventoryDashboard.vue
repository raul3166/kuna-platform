<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'

// Interfaces 1:1 con tu JSON real de Swagger
interface BranchStock {
  branchId: string
  branchName: string
  branchCode: string
  stock: number
  averageCost: number
  inventoryValue: number
}

interface ProductStock {
  productId: string
  sku: string
  name: string
  totalStock: number
  totalInventoryValue: number
  branches: BranchStock[]
}

interface DashboardSummary {
  totalProducts: number
  totalStock: number
  totalInventoryValue: number
}

// Estados del componente
const productsStock = ref<ProductStock[]>([])
const summary = ref<DashboardSummary | null>(null)
const isLoading = ref(true)
const errorMessage = ref('')

async function fetchDashboardMetrics() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const response = await api.get('/inventory-movements/stock/balance')

    // Mapeo directo y seguro de tu estructura real
    if (response.data) {
      productsStock.value = response.data.products || []
      summary.value = response.data.summary || null
    }
  } catch (error: any) {
    console.error(error)
    errorMessage.value = 'No fue posible sincronizar las métricas del panel analítico.'
  } finally {
    isLoading.value = false
  }
}

// Controles computados anti-fractura vinculados a los DTOs de tu API
const outOfStockCount = computed(() => {
  if (!productsStock.value) return 0
  return productsStock.value.filter(p => p.totalStock <= 0).length
})

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 1
  }).format(value)
}

onMounted(() => { fetchDashboardMetrics() })
</script>
<template>
  <AppLayout>
    <header class="mb-8">
      <h1 class="text-3xl font-bold tracking-tight text-slate-900">Dashboard de Inventario</h1>
      <p class="mt-1 text-sm text-slate-500">Métricas clave de balance de stock y valoración financiera de KUNA.</p>
    </header>

    <!-- Indicador de Carga Animado -->
    <div v-if="isLoading" class="grid gap-6 sm:grid-cols-3 mb-8">
      <div v-for="i in 3" :key="i" class="h-28 rounded-xl border border-slate-200 bg-white p-6 animate-pulse"></div>
    </div>

    <!-- Alerta de Error -->
    <div v-else-if="errorMessage" class="mb-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      ⚠️ {{ errorMessage }}
    </div>

    <!-- KPIs CONECTADOS A TU METODOLOGÍA DEL BACKEND -->
    <div v-else class="grid gap-6 sm:grid-cols-3 mb-8">
      <article class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <span class="text-sm font-semibold text-slate-400 uppercase tracking-wider">Valoración Total</span>
        <h2 class="mt-2 text-3xl font-black text-slate-900">
          {{ formatCurrency(summary?.totalInventoryValue || 0) }}
        </h2>
      </article>

      <article class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <span class="text-sm font-semibold text-slate-400 uppercase tracking-wider">Unidades Totales</span>
        <h2 class="mt-2 text-3xl font-black text-blue-600">
          {{ (summary?.totalStock || 0).toLocaleString('es-CO') }} <span class="text-sm font-medium text-slate-400">Uds</span>
        </h2>
      </article>

      <article class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <span class="text-sm font-semibold text-slate-400 uppercase tracking-wider">Quiebres de Stock</span>
        <h2 :class="[outOfStockCount > 0 ? 'text-rose-600' : 'text-green-600', 'mt-2 text-3xl font-black']">
          {{ outOfStockCount }} <span class="text-sm font-medium text-slate-400">Prod</span>
        </h2>
      </article>
    </div>

    <!-- TABLA LOGÍSTICA CON APERTURA DE SUCURSALES (ANIDADA) -->
    <section v-if="!isLoading && !errorMessage" class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div class="border-b border-slate-200 px-6 py-4 bg-slate-50/50">
        <h3 class="text-lg font-bold text-slate-900">Resumen de Existencias por Sucursal</h3>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th class="px-6 py-3">Artículo / SKU</th>
              <th class="px-6 py-3">Distribución por Sucursal</th>
              <th class="px-6 py-3 text-right">Existencia Sede</th>
              <th class="px-6 py-3 text-right">Costo Promedio</th>
              <th class="px-6 py-3 text-right">Valoración Sede</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <!-- Iteramos sobre los productos principales -->
            <template v-for="prod in productsStock" :key="prod.productId">
              <!-- Si el producto no tiene sucursales asignadas todavía -->
              <tr v-if="prod.branches.length === 0" class="bg-white">
                <td class="px-6 py-4">
                  <div class="font-semibold text-slate-900">{{ prod.name }}</div>
                  <div class="text-xs font-mono text-slate-400">SKU: {{ prod.sku }}</div>
                </td>
                <td colspan="4" class="px-6 py-4 text-slate-400 italic text-xs">Sin stock asignado a sucursales.</td>
              </tr>

              <!-- Iteramos dinámicamente las sucursales del producto -->
              <tr v-for="(brn, index) in prod.branches" :key="brn.branchId" class="hover:bg-slate-50/40 transition-colors">
                <!-- Columna de datos de producto (unificada visualmente en la primera fila) -->
                <td class="px-6 py-4">
                  <div v-if="index === 0">
                    <div class="font-bold text-slate-900">{{ prod.name }}</div>
                    <div class="text-xs font-mono text-blue-600 font-semibold mt-0.5">SKU: {{ prod.sku }}</div>
                    <div class="text-[10px] text-slate-400 mt-1 bg-slate-100 px-1.5 py-0.5 rounded inline-block font-medium">Total: {{ prod.totalStock }} uds</div>
                  </div>
                  <div v-else class="text-slate-300 text-xs font-mono select-none">↳ cont.</div>
                </td>

                <!-- Sucursal -->
                <td class="px-6 py-4 text-slate-700 whitespace-nowrap">
                  <span class="font-semibold bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-xs font-mono mr-2">{{ brn.branchCode }}</span>
                  <span class="font-medium text-xs">{{ brn.branchName }}</span>
                </td>

                <!-- Existencia por Sede -->
                <td class="px-6 py-4 text-right font-mono font-bold text-slate-800">
                  {{ brn.stock.toLocaleString('es-CO') }}
                </td>

                <!-- Costo Promedio -->
                <td class="px-6 py-4 text-right font-mono text-slate-500 text-xs">
                  {{ formatCurrency(brn.averageCost) }}
                </td>

                <!-- Valoración por Sede -->
                <td class="px-6 py-4 text-right font-mono font-bold text-slate-950">
                  {{ formatCurrency(brn.inventoryValue) }}
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>
  </AppLayout>
</template>
