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

interface RevenueReportResponse {
  totalOrders: number
  totalRevenue: number
  ordersByStatus: Record<string, number>
  data: Array<any>
}

interface MaterialReportItem {
  id: string
  quantity: number
  unitCost: number
  totalCost: number
  createdAt: string
  product: {
    name: string
    sku: string
  }
  branch?: {
    name: string
  }
}

const activeTab = ref<'revenue' | 'materials'>('revenue')
const isLoading = ref(true)
const errorMessage = ref('')

const branches = ref<Branch[]>([])
const selectedBranchId = ref<string>('')
const startDate = ref('')
const endDate = ref('')

const revenueData = ref<RevenueReportResponse | null>(null)
const materialsData = ref<MaterialReportItem[]>([])

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

async function fetchReportData() {
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

    if (startDate.value) params.startDate = startDate.value
    if (endDate.value) params.endDate = endDate.value

    if (activeTab.value === 'revenue') {
      const response = await api.get<RevenueReportResponse>('/service-reports/revenue', { params })
      revenueData.value = response.data
    } else {
      const response = await api.get<MaterialReportItem[]>('/service-reports/material-consumption', { params })
      materialsData.value = response.data
    }
  } catch (error: any) {
    console.error(error)
    errorMessage.value = error.response?.data?.message || 'Error al cargar los reportes de servicio.'
  } finally {
    isLoading.value = false
  }
}

function switchTab(tab: 'revenue' | 'materials') {
  activeTab.value = tab
  fetchReportData()
}

onMounted(async () => {
  await fetchBranches()
  if (authStore.currentBranch?.id) {
    selectedBranchId.value = authStore.currentBranch.id
  }
  fetchReportData()
})
</script>

<template>
  <AppLayout>
    <header class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-900">Reportes de Órdenes de Servicio</h1>
        <p class="mt-1 text-sm text-slate-500">
          Auditoría de ingresos financieros, estado de órdenes y consumo de inventario en talleres.
        </p>
      </div>

      <!-- FILTROS DE SUCURSAL Y FECHA -->
      <div class="flex flex-wrap items-end gap-3 bg-white p-3 border border-slate-200 rounded-xl shadow-sm">
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Sucursal</label>
          <select
            v-model="selectedBranchId"
            @change="fetchReportData"
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
            @change="fetchReportData"
            class="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Hasta</label>
          <input
            v-model="endDate"
            type="date"
            @change="fetchReportData"
            class="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          @click="fetchReportData"
          class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Filtrar
        </button>
      </div>
    </header>

    <!-- TABS DE NAVEGACIÓN -->
    <div class="flex border-b border-slate-200 mb-6">
      <button
        @click="switchTab('revenue')"
        class="pb-3 px-4 text-sm font-semibold border-b-2 transition-colors"
        :class="activeTab === 'revenue' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'"
      >
        📈 Ingresos y Rendimiento de Órdenes
      </button>
      <button
        @click="switchTab('materials')"
        class="pb-3 px-4 text-sm font-semibold border-b-2 transition-colors"
        :class="activeTab === 'materials' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'"
      >
        📦 Auditoría de Materiales Consumidos
      </button>
    </div>

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
      Cargando datos del reporte...
    </div>

    <!-- VISTA 1: INGRESOS -->
    <div v-else-if="activeTab === 'revenue' && revenueData" class="space-y-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
          <span class="text-xs font-semibold uppercase text-slate-400 tracking-wider">Órdenes Totales</span>
          <div class="mt-2 text-2xl font-extrabold text-slate-900">
            {{ revenueData.totalOrders }}
          </div>
        </div>
        <div class="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
          <span class="text-xs font-semibold uppercase text-slate-400 tracking-wider">Ingresos Totales (Servicios/Órdenes)</span>
          <div class="mt-2 text-2xl font-extrabold text-emerald-600">
            {{ formatCurrency(revenueData.totalRevenue) }}
          </div>
        </div>
      </div>

      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div class="p-4 bg-slate-50 border-b border-slate-200 font-bold text-sm text-slate-700">
          Listado de Órdenes en el Periodo
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                <th class="p-3">Nº Orden</th>
                <th class="p-3">Activo / Equipo</th>
                <th class="p-3">Estado</th>
                <th class="p-3 text-right">Mano de Obra</th>
                <th class="p-3 text-right">Materiales</th>
                <th class="p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 text-slate-700">
              <tr v-for="order in revenueData.data" :key="order.id" class="hover:bg-slate-50">
                <td class="p-3 font-semibold">{{ order.orderNumber }}</td>
                <td class="p-3">{{ order.assetName }}</td>
                <td class="p-3"><span class="px-2 py-0.5 bg-slate-100 rounded text-slate-800 font-medium">{{ order.status }}</span></td>
                <td class="p-3 text-right">{{ formatCurrency(order.laborTotal) }}</td>
                <td class="p-3 text-right">{{ formatCurrency(order.materialsTotal) }}</td>
                <td class="p-3 text-right font-bold text-slate-900">{{ formatCurrency(order.total) }}</td>
              </tr>
              <tr v-if="!revenueData.data.length">
                <td colspan="6" class="p-6 text-center text-slate-400">No se encontraron órdenes registradas.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- VISTA 2: MATERIALES -->
    <div v-else-if="activeTab === 'materials'" class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div class="p-4 bg-slate-50 border-b border-slate-200 font-bold text-sm text-slate-700">
        Auditoría de Insumos / Repuestos Utilizados en Órdenes de Servicio
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <th class="p-3">Fecha</th>
              <th class="p-3">Producto / Repuesto</th>
              <th class="p-3">SKU</th>
              <th class="p-3">Sucursal</th>
              <th class="p-3 text-center">Cantidad</th>
              <th class="p-3 text-right">Costo Unitario</th>
              <th class="p-3 text-right">Costo Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 text-slate-700">
            <tr v-for="item in materialsData" :key="item.id" class="hover:bg-slate-50">
              <td class="p-3">{{ new Date(item.createdAt).toLocaleString() }}</td>
              <td class="p-3 font-semibold text-slate-900">{{ item.product?.name }}</td>
              <td class="p-3 text-slate-500">{{ item.product?.sku }}</td>
              <td class="p-3">{{ item.branch?.name || 'N/A' }}</td>
              <td class="p-3 text-center">{{ item.quantity }}</td>
              <td class="p-3 text-right">{{ formatCurrency(item.unitCost || 0) }}</td>
              <td class="p-3 text-right font-bold text-slate-900">{{ formatCurrency(item.totalCost || 0) }}</td>
            </tr>
            <tr v-if="!materialsData.length">
              <td colspan="7" class="p-6 text-center text-slate-400">No hay consumos de materiales registrados para este periodo.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AppLayout>
</template>
