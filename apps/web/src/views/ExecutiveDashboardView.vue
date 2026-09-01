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

interface DashboardKpisResponse {
  kpis: {
    totalRevenue: number
    netRevenue: number
    totalTransactions: number
    averageTicket: number
    totalCost: number
    grossProfit: number
    grossMarginPercentage: number
    totalReturnsAmount: number
    totalReturnsCount: number
  }
  paymentBreakdown: Array<{
    method: string
    total: number
  }>
}

const isLoading = ref(true)
const errorMessage = ref('')
const kpisData = ref<DashboardKpisResponse | null>(null)

// Filtros
const branches = ref<Branch[]>([])
const selectedBranchId = ref<string>('') // Vacío = Todas las sedes
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

async function fetchDashboardKPIs() {
  if (!authStore.user?.organizationId) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    const params: Record<string, string> = {
      organizationId: authStore.user.organizationId,
    }

    // Si hay una sede seleccionada explícitamente en el filtro (o en el store como fallback)
    const activeBranch = selectedBranchId.value || authStore.currentBranch?.id
    if (activeBranch) {
      params.branchId = activeBranch
    }

    if (startDate.value) params.startDate = startDate.value
    if (endDate.value) params.endDate = endDate.value

    const response = await api.get<DashboardKpisResponse>('/analytics/dashboard-kpis', { params })
    kpisData.value = response.data
  } catch (error: any) {
    console.error(error)
    errorMessage.value = error.response?.data?.message || 'Error al cargar las métricas del Dashboard Ejecutivo.'
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await fetchBranches()
  // Inicializar el filtro con la sucursal activa actual si existe
  if (authStore.currentBranch?.id) {
    selectedBranchId.value = authStore.currentBranch.id
  }
  fetchDashboardKPIs()
})
</script>

<template>
  <AppLayout>
    <header class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-900">Dashboard Ejecutivo (KPIs)</h1>
        <p class="mt-1 text-sm text-slate-500">
          Métricas consolidadas de ventas, márgenes comerciales y desempeño financiero.
        </p>
      </div>

      <!-- FILTROS DE SUCURSAL Y FECHA -->
      <div class="flex flex-wrap items-end gap-3 bg-white p-3 border border-slate-200 rounded-xl shadow-sm">
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Sucursal</label>
          <select
            v-model="selectedBranchId"
            @change="fetchDashboardKPIs"
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
            @change="fetchDashboardKPIs"
            class="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Hasta</label>
          <input
            v-model="endDate"
            type="date"
            @change="fetchDashboardKPIs"
            class="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          @click="fetchDashboardKPIs"
          class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Filtrar
        </button>
      </div>
    </header>

    <!-- FEEDBACK DE ERROR -->
    <div
      v-if="errorMessage"
      class="mb-6 bg-red-50 text-red-700 p-4 border border-red-200 rounded-xl text-sm flex items-center justify-between"
    >
      <span>⚠️ {{ errorMessage }}</span>
      <button @click="errorMessage = ''" class="text-red-500 hover:text-red-700 font-bold">✕</button>
    </div>

    <!-- ESTADO DE CARGA -->
    <div
      v-if="isLoading"
      class="p-12 text-center text-sm font-medium text-slate-500 animate-pulse bg-white border border-slate-200 rounded-xl shadow-sm"
    >
      Calculando métricas y agregaciones ejecutivas...
    </div>

    <!-- CONTENIDO PRINCIPAL -->
    <div v-else-if="kpisData" class="space-y-6">
      <!-- TARJETAS DE KPIS PRINCIPALES -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex flex-col justify-between">
          <span class="text-xs font-semibold uppercase text-slate-400 tracking-wider">Ventas Brutas</span>
          <div class="mt-2 flex items-baseline justify-between">
            <span class="text-2xl font-extrabold text-slate-900">
              {{ formatCurrency(kpisData.kpis.totalRevenue) }}
            </span>
          </div>
          <span class="text-xs text-slate-500 mt-2 font-medium">
            {{ kpisData.kpis.totalTransactions }} Transacciones
          </span>
        </div>

        <div class="bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex flex-col justify-between">
          <span class="text-xs font-semibold uppercase text-slate-400 tracking-wider">Ticket Promedio</span>
          <div class="mt-2">
            <span class="text-2xl font-extrabold text-blue-600">
              {{ formatCurrency(kpisData.kpis.averageTicket) }}
            </span>
          </div>
          <span class="text-xs text-slate-500 mt-2">Por venta realizada</span>
        </div>

        <div class="bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex flex-col justify-between">
          <span class="text-xs font-semibold uppercase text-slate-400 tracking-wider">Utilidad Bruta</span>
          <div class="mt-2 flex items-baseline justify-between">
            <span class="text-2xl font-extrabold text-emerald-600">
              {{ formatCurrency(kpisData.kpis.grossProfit) }}
            </span>
            <span class="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              {{ kpisData.kpis.grossMarginPercentage }}%
            </span>
          </div>
          <span class="text-xs text-slate-500 mt-2">Margen comercial</span>
        </div>

        <div class="bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex flex-col justify-between">
          <span class="text-xs font-semibold uppercase text-slate-400 tracking-wider">Devoluciones</span>
          <div class="mt-2 flex items-baseline justify-between">
            <span class="text-2xl font-extrabold text-rose-600">
              {{ formatCurrency(kpisData.kpis.totalReturnsAmount) }}
            </span>
          </div>
          <span class="text-xs text-slate-500 mt-2 font-medium">
            {{ kpisData.kpis.totalReturnsCount }} Nota(s) de Crédito
          </span>
        </div>
      </div>

      <!-- INGRESOS NETOS Y COSTOS -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-3">
          <h3 class="text-sm font-bold uppercase text-slate-500 tracking-wider">Resumen Neto de Ingresos</h3>
          <div class="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
            <span class="text-slate-600">Ventas Totales Brutas:</span>
            <span class="font-semibold text-slate-800">{{ formatCurrency(kpisData.kpis.totalRevenue) }}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
            <span class="text-slate-600">Menos Devoluciones:</span>
            <span class="font-semibold text-rose-600">- {{ formatCurrency(kpisData.kpis.totalReturnsAmount) }}</span>
          </div>
          <div class="flex justify-between items-center pt-2 text-base font-bold">
            <span class="text-slate-900">Ingreso Neto Operativo:</span>
            <span class="text-emerald-600">{{ formatCurrency(kpisData.kpis.netRevenue) }}</span>
          </div>
        </div>

        <div class="bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-3">
          <h3 class="text-sm font-bold uppercase text-slate-500 tracking-wider">Costo de Ventas</h3>
          <div class="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
            <span class="text-slate-600">Costo Directo de Mercancía:</span>
            <span class="font-semibold text-slate-800">{{ formatCurrency(kpisData.kpis.totalCost) }}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
            <span class="text-slate-600">Ganancia Bruta Retenida:</span>
            <span class="font-semibold text-emerald-600">{{ formatCurrency(kpisData.kpis.grossProfit) }}</span>
          </div>
          <div class="flex justify-between items-center pt-2 text-base font-bold">
            <span class="text-slate-900">Porcentaje de Rendimiento:</span>
            <span class="text-blue-600">{{ kpisData.kpis.grossMarginPercentage }}%</span>
          </div>
        </div>
      </div>

      <!-- DESGLOSE POR MEDIO DE PAGO -->
      <div v-if="kpisData.paymentBreakdown.length" class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 class="text-base font-bold text-slate-900 mb-4">Ventas por Medio de Pago</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div
            v-for="item in kpisData.paymentBreakdown"
            :key="item.method"
            class="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between"
          >
            <span class="text-xs font-semibold text-slate-500 uppercase">{{ item.method }}</span>
            <span class="text-lg font-bold text-slate-900 mt-1">{{ formatCurrency(item.total) }}</span>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
