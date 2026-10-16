<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

interface YardOrder {
  id: string
  orderNumber: string
  status: string
  assetName: string
  assetIdentifier?: string
  laborTotal: number
  materialsTotal: number
  total: number
  createdAt: string
  customer?: {
    id: string
    firstName: string
    lastName: string
    phoneNumber?: string
  }
  assignedWorker?: {
    id: string
    firstName: string
    lastName: string
    specialty?: string
  }
  vehicle?: {
    id: string
    licensePlate: string
    brand: string
    model: string
    year?: number
    mileage?: number
    vehicleType: string
  }
  vehicleCheckIn?: {
    id: string
    mileage: number
    fuelLevel: string
  }
  tasks?: any[]
  materials?: any[]
}

interface DashboardData {
  kpis: {
    totalActiveVehicles: number
    totalLaborInProgress: number
    totalPartsInProgress: number
    totalRegisteredVehicles: number
    waitingPartsCount: number
    readyCount: number
  }
  yardColumns: {
    RECEIVED: YardOrder[]
    IN_PROGRESS: YardOrder[]
    WAITING_PARTS: YardOrder[]
    COMPLETED: YardOrder[]
    BILLED: YardOrder[]
  }
  recentCheckIns: any[]
}

interface WorkshopConfig {
  baysCount: number
  defaultInventoryChecklist: string[]
  receptionTerms: string
  enableCustomerNotifications: boolean
}

const data = ref<DashboardData | null>(null)
const config = ref<WorkshopConfig>({
  baysCount: 4,
  defaultInventoryChecklist: [],
  receptionTerms: '',
  enableCustomerNotifications: true,
})

const isLoading = ref(true)
const errorMessage = ref('')
const isConfigModalOpen = ref(false)
const isSavingConfig = ref(false)
const selectedOrder = ref<YardOrder | null>(null)
const isDetailModalOpen = ref(false)

function formatCurrency(amount: number | string | undefined): string {
  if (amount === undefined || amount === null) return '$0'
  const val = Number(amount)
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-CO', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function loadDashboardData() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const orgId = authStore.currentOrganization?.id
    const branchId = authStore.currentBranch?.id
    const [dashRes, cfgRes] = await Promise.all([
      api.get<DashboardData>('/automotive/dashboard', {
        params: { organizationId: orgId, branchId },
      }),
      api.get<{ config: WorkshopConfig }>('/automotive/config', {
        params: { organizationId: orgId },
      }),
    ])

    data.value = dashRes.data
    if (cfgRes.data?.config) {
      config.value = { ...config.value, ...cfgRes.data.config }
    }
  } catch (error: any) {
    console.error('Error al cargar datos de taller:', error)
    errorMessage.value =
      error.response?.data?.message || 'Error al conectar con el módulo de taller automotriz.'
  } finally {
    isLoading.value = false
  }
}

async function updateOrderStatus(orderId: string, action: string) {
  try {
    const orgId = authStore.currentOrganization?.id
    await api.patch(`/service-orders/${orderId}/${action}`, {}, {
      params: { organizationId: orgId },
    })
    await loadDashboardData()
    if (selectedOrder.value?.id === orderId) {
      isDetailModalOpen.value = false
    }
  } catch (error: any) {
    alert(error.response?.data?.message || 'Error al actualizar el estado del vehículo en taller.')
  }
}

function goToPos(orderId: string) {
  router.push({ path: '/pos', query: { serviceOrderId: orderId } })
}

function viewOrderDetail(order: YardOrder) {
  selectedOrder.value = order
  isDetailModalOpen.value = true
}

async function saveConfig() {
  isSavingConfig.value = true
  try {
    const orgId = authStore.currentOrganization?.id
    await api.patch('/automotive/config', config.value, {
      params: { organizationId: orgId },
    })
    isConfigModalOpen.value = false
    await loadDashboardData()
  } catch (error: any) {
    alert(error.response?.data?.message || 'Error al guardar la configuración.')
  } finally {
    isSavingConfig.value = false
  }
}

onMounted(() => {
  loadDashboardData()
})
</script>

<template>
  <AppLayout>
    <!-- Encabezado de Patio de Taller -->
    <header class="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span class="text-3xl">🏎️</span>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Taller Automotriz y Motos</h1>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Patio & Bahías
          </span>
        </div>
        <p class="text-xs text-slate-500 mt-1">
          Control de vehículos en servicio, diagnósticos, repuestos y entregas en tiempo real.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <router-link
          to="/automotive-checkin"
          class="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <span>➕</span>
          <span>Recepción Técnica (Check-in)</span>
        </router-link>

        <router-link
          to="/vehicles"
          class="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-all cursor-pointer"
        >
          <span>🚗</span>
          <span>Flota / Vehículos</span>
        </router-link>

        <button
          @click="isConfigModalOpen = true"
          class="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-all cursor-pointer"
        >
          <span>⚙️</span>
          <span>Ajustes Bahías</span>
        </button>
      </div>
    </header>

    <!-- Alertas de Error -->
    <div v-if="errorMessage" class="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-center justify-between">
      <span>⚠️ {{ errorMessage }}</span>
      <button @click="loadDashboardData" class="text-xs font-bold underline cursor-pointer">Reintentar</button>
    </div>

    <!-- Indicador de Carga -->
    <div v-if="isLoading" class="p-12 text-center text-sm font-medium text-slate-500 bg-white border border-slate-200 rounded-2xl animate-pulse">
      Cargando tablero operativo de taller y bahías de servicio...
    </div>

    <div v-else-if="data" class="space-y-6">
      <!-- Tarjetas de KPIs Operativos -->
      <section class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">En Taller Ahora</p>
          <div class="mt-1 flex items-baseline justify-between">
            <span class="text-2xl font-black text-slate-900">{{ data.kpis.totalActiveVehicles }}</span>
            <span class="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">
              {{ config.baysCount }} bahías
            </span>
          </div>
        </div>

        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Falta Repuesto</p>
          <div class="mt-1 flex items-baseline justify-between">
            <span class="text-2xl font-black text-purple-700">{{ data.kpis.waitingPartsCount }}</span>
            <span class="text-xs text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded">En pausa</span>
          </div>
        </div>

        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Listo Entrega</p>
          <div class="mt-1 flex items-baseline justify-between">
            <span class="text-2xl font-black text-emerald-700">{{ data.kpis.readyCount }}</span>
            <span class="text-xs text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Finalizado</span>
          </div>
        </div>

        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Mano de Obra</p>
          <div class="mt-1">
            <span class="text-lg font-black text-slate-900">{{ formatCurrency(data.kpis.totalLaborInProgress) }}</span>
          </div>
        </div>

        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Repuestos Taller</p>
          <div class="mt-1">
            <span class="text-lg font-black text-slate-900">{{ formatCurrency(data.kpis.totalPartsInProgress) }}</span>
          </div>
        </div>

        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Flota Clientes</p>
          <div class="mt-1 flex items-baseline justify-between">
            <span class="text-2xl font-black text-slate-800">{{ data.kpis.totalRegisteredVehicles }}</span>
            <span class="text-xs text-slate-500 font-bold">Autos/Motos</span>
          </div>
        </div>
      </section>

      <!-- Tablero Kanban de Patio / Taller -->
      <section>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <span>🛠️</span>
            <span>Tablero de Vehículos por Estado en Taller</span>
          </h2>
          <button @click="loadDashboardData" class="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1">
            <span>🔄</span> Actualizar patio
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 items-start">
          <!-- Columna 1: Recepcionados (PENDING) -->
          <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col min-h-[420px]">
            <div class="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200">
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span class="text-xs font-black text-slate-800 uppercase tracking-wider">1. En Patio</span>
              </div>
              <span class="text-xs font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                {{ data.yardColumns.RECEIVED.length }}
              </span>
            </div>

            <div class="space-y-2.5 flex-1 overflow-y-auto max-h-[600px]">
              <div
                v-for="order in data.yardColumns.RECEIVED"
                :key="order.id"
                class="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                @click="viewOrderDetail(order)"
              >
                <!-- Placa estilo matrícula vehicular -->
                <div class="flex items-center justify-between mb-1.5">
                  <div class="inline-flex items-center px-2 py-0.5 border-2 border-slate-900 rounded font-mono font-black text-xs tracking-wider bg-amber-300 text-slate-900 shadow-xs">
                    {{ order.vehicle?.licensePlate || order.assetIdentifier || 'S/PLACA' }}
                  </div>
                  <span class="text-[10px] text-slate-400 font-mono">#{{ order.orderNumber }}</span>
                </div>

                <p class="text-xs font-bold text-slate-800 truncate">
                  {{ order.vehicle ? `${order.vehicle.brand} ${order.vehicle.model}` : order.assetName }}
                </p>
                <p class="text-[11px] text-slate-500 truncate mt-0.5">
                  👤 {{ order.customer?.firstName }} {{ order.customer?.lastName }}
                </p>

                <div class="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span class="text-slate-400 font-medium">{{ formatDate(order.createdAt) }}</span>
                  <button
                    @click.stop="updateOrderStatus(order.id, 'in-progress')"
                    class="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition-all"
                  >
                    Iniciar ⏩
                  </button>
                </div>
              </div>

              <div v-if="data.yardColumns.RECEIVED.length === 0" class="text-center py-8 text-xs text-slate-400 font-medium">
                Sin vehículos en espera de ingreso
              </div>
            </div>
          </div>

          <!-- Columna 2: En Diagnóstico / Proceso (IN_PROGRESS) -->
          <div class="bg-blue-50/40 border border-blue-200 rounded-2xl p-3 flex flex-col min-h-[420px]">
            <div class="flex items-center justify-between pb-2.5 mb-2.5 border-b border-blue-200">
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                <span class="text-xs font-black text-blue-900 uppercase tracking-wider">2. En Proceso</span>
              </div>
              <span class="text-xs font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                {{ data.yardColumns.IN_PROGRESS.length }}
              </span>
            </div>

            <div class="space-y-2.5 flex-1 overflow-y-auto max-h-[600px]">
              <div
                v-for="order in data.yardColumns.IN_PROGRESS"
                :key="order.id"
                class="bg-white p-3 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
                @click="viewOrderDetail(order)"
              >
                <div class="flex items-center justify-between mb-1.5">
                  <div class="inline-flex items-center px-2 py-0.5 border-2 border-slate-900 rounded font-mono font-black text-xs tracking-wider bg-amber-300 text-slate-900">
                    {{ order.vehicle?.licensePlate || order.assetIdentifier || 'S/PLACA' }}
                  </div>
                  <span class="text-xs font-black text-slate-900 font-mono">{{ formatCurrency(order.total) }}</span>
                </div>

                <p class="text-xs font-bold text-slate-800 truncate">
                  {{ order.vehicle ? `${order.vehicle.brand} ${order.vehicle.model}` : order.assetName }}
                </p>

                <p v-if="order.assignedWorker" class="text-[11px] text-blue-700 font-bold truncate mt-1">
                  👨‍🔧 {{ order.assignedWorker.firstName }} {{ order.assignedWorker.lastName }}
                </p>
                <p v-else class="text-[11px] text-amber-600 font-semibold mt-1">
                  ⚠️ Sin mecánico asignado
                </p>

                <div class="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[10px]">
                  <button
                    @click.stop="updateOrderStatus(order.id, 'waiting-parts')"
                    class="px-1.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded"
                  >
                    ⏳ Falta parte
                  </button>
                  <button
                    @click.stop="updateOrderStatus(order.id, 'complete')"
                    class="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded"
                  >
                    Terminar ✅
                  </button>
                </div>
              </div>

              <div v-if="data.yardColumns.IN_PROGRESS.length === 0" class="text-center py-8 text-xs text-slate-400 font-medium">
                Bahías libres de trabajos en curso
              </div>
            </div>
          </div>

          <!-- Columna 3: Esperando Repuestos (WAITING_PARTS) -->
          <div class="bg-purple-50/40 border border-purple-200 rounded-2xl p-3 flex flex-col min-h-[420px]">
            <div class="flex items-center justify-between pb-2.5 mb-2.5 border-b border-purple-200">
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                <span class="text-xs font-black text-purple-900 uppercase tracking-wider">3. Espera Repuesto</span>
              </div>
              <span class="text-xs font-black bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                {{ data.yardColumns.WAITING_PARTS.length }}
              </span>
            </div>

            <div class="space-y-2.5 flex-1 overflow-y-auto max-h-[600px]">
              <div
                v-for="order in data.yardColumns.WAITING_PARTS"
                :key="order.id"
                class="bg-white p-3 rounded-xl border border-purple-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
                @click="viewOrderDetail(order)"
              >
                <div class="flex items-center justify-between mb-1.5">
                  <div class="inline-flex items-center px-2 py-0.5 border-2 border-slate-900 rounded font-mono font-black text-xs tracking-wider bg-amber-300 text-slate-900">
                    {{ order.vehicle?.licensePlate || order.assetIdentifier || 'S/PLACA' }}
                  </div>
                  <span class="text-[10px] font-bold text-purple-700 bg-purple-50 px-1 rounded">Detenido</span>
                </div>

                <p class="text-xs font-bold text-slate-800 truncate">
                  {{ order.vehicle ? `${order.vehicle.brand} ${order.vehicle.model}` : order.assetName }}
                </p>

                <p class="text-[11px] text-slate-500 mt-1">
                  📦 {{ order.materials?.length || 0 }} repuestos vinculados
                </p>

                <div class="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-end">
                  <button
                    @click.stop="updateOrderStatus(order.id, 'in-progress')"
                    class="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded transition-all"
                  >
                    Repuesto llegó ⏩
                  </button>
                </div>
              </div>

              <div v-if="data.yardColumns.WAITING_PARTS.length === 0" class="text-center py-8 text-xs text-slate-400 font-medium">
                Sin órdenes bloqueadas por partes
              </div>
            </div>
          </div>

          <!-- Columna 4: Listo para Entrega (COMPLETED) -->
          <div class="bg-emerald-50/40 border border-emerald-200 rounded-2xl p-3 flex flex-col min-h-[420px]">
            <div class="flex items-center justify-between pb-2.5 mb-2.5 border-b border-emerald-200">
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                <span class="text-xs font-black text-emerald-900 uppercase tracking-wider">4. Por Entregar</span>
              </div>
              <span class="text-xs font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                {{ data.yardColumns.COMPLETED.length }}
              </span>
            </div>

            <div class="space-y-2.5 flex-1 overflow-y-auto max-h-[600px]">
              <div
                v-for="order in data.yardColumns.COMPLETED"
                :key="order.id"
                class="bg-white p-3 rounded-xl border border-emerald-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
                @click="viewOrderDetail(order)"
              >
                <div class="flex items-center justify-between mb-1.5">
                  <div class="inline-flex items-center px-2 py-0.5 border-2 border-slate-900 rounded font-mono font-black text-xs tracking-wider bg-amber-300 text-slate-900">
                    {{ order.vehicle?.licensePlate || order.assetIdentifier || 'S/PLACA' }}
                  </div>
                  <span class="text-xs font-black text-emerald-700">{{ formatCurrency(order.total) }}</span>
                </div>

                <p class="text-xs font-bold text-slate-800 truncate">
                  {{ order.vehicle ? `${order.vehicle.brand} ${order.vehicle.model}` : order.assetName }}
                </p>

                <p class="text-[11px] text-slate-500 truncate mt-1">
                  👤 {{ order.customer?.firstName }} {{ order.customer?.lastName }}
                </p>

                <div class="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span class="text-[10px] text-emerald-600 font-bold">Listo ✅</span>
                  <button
                    @click.stop="goToPos(order.id)"
                    class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] rounded-lg shadow-sm transition-all flex items-center gap-1"
                  >
                    <span>💳</span> Facturar
                  </button>
                </div>
              </div>

              <div v-if="data.yardColumns.COMPLETED.length === 0" class="text-center py-8 text-xs text-slate-400 font-medium">
                Sin vehículos listos para entrega inmediata
              </div>
            </div>
          </div>

          <!-- Columna 5: Entregados / Facturados Hoy (BILLED) -->
          <div class="bg-slate-100 border border-slate-200 rounded-2xl p-3 flex flex-col min-h-[420px]">
            <div class="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200">
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                <span class="text-xs font-black text-slate-700 uppercase tracking-wider">5. Entregados</span>
              </div>
              <span class="text-xs font-black bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                {{ data.yardColumns.BILLED.length }}
              </span>
            </div>

            <div class="space-y-2.5 flex-1 overflow-y-auto max-h-[600px]">
              <div
                v-for="order in data.yardColumns.BILLED"
                :key="order.id"
                class="bg-white/80 p-3 rounded-xl border border-slate-200 shadow-2xs opacity-85 hover:opacity-100 transition-all cursor-pointer"
                @click="viewOrderDetail(order)"
              >
                <div class="flex items-center justify-between mb-1.5">
                  <div class="inline-flex items-center px-1.5 py-0.5 border border-slate-600 rounded font-mono font-bold text-[11px] bg-slate-100 text-slate-700">
                    {{ order.vehicle?.licensePlate || order.assetIdentifier || 'S/PLACA' }}
                  </div>
                  <span class="text-[11px] font-bold text-slate-700">{{ formatCurrency(order.total) }}</span>
                </div>

                <p class="text-xs font-medium text-slate-700 truncate">
                  {{ order.vehicle ? `${order.vehicle.brand} ${order.vehicle.model}` : order.assetName }}
                </p>

                <p class="text-[10px] text-slate-400 mt-1">
                  Facturado y despachado de patio
                </p>
              </div>

              <div v-if="data.yardColumns.BILLED.length === 0" class="text-center py-8 text-xs text-slate-400 font-medium">
                Sin entregas registradas hoy
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Recepciones Recientes (Check-ins) -->
      <section v-if="data.recentCheckIns && data.recentCheckIns.length > 0" class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 class="text-sm font-black text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>📋</span>
          <span>Últimas Hojas de Recepción (Check-Ins) en Patio</span>
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="ci in data.recentCheckIns"
            :key="ci.id"
            class="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
          >
            <div>
              <div class="flex items-center gap-2">
                <span class="font-mono font-black text-xs px-2 py-0.5 bg-amber-300 text-slate-900 border border-slate-900 rounded">
                  {{ ci.vehicle?.licensePlate }}
                </span>
                <span class="text-xs font-bold text-slate-800">
                  {{ ci.vehicle?.brand }} {{ ci.vehicle?.model }}
                </span>
              </div>
              <p class="text-[11px] text-slate-500 mt-1">
                Kilometraje: <span class="font-bold text-slate-700">{{ ci.mileage?.toLocaleString() }} km</span> • Combustible: <span class="font-bold text-slate-700">{{ ci.fuelLevel }}</span>
              </p>
            </div>
            <div class="text-right">
              <span class="text-[10px] text-slate-400 font-medium block">{{ formatDate(ci.createdAt) }}</span>
              <router-link
                :to="`/vehicles`"
                class="text-[11px] font-bold text-blue-600 hover:underline inline-block mt-0.5"
              >
                Ficha 🔍
              </router-link>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- MODAL DE DETALLE DE ORDEN EN PATIO -->
    <div
      v-if="isDetailModalOpen && selectedOrder"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
    >
      <div class="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-2xl">🚗</span>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-mono font-black px-2 py-0.5 bg-amber-300 text-slate-900 rounded text-xs">
                  {{ selectedOrder.vehicle?.licensePlate || selectedOrder.assetIdentifier || 'S/PLACA' }}
                </span>
                <h3 class="text-sm font-black">{{ selectedOrder.orderNumber }}</h3>
              </div>
              <p class="text-xs text-slate-300 mt-0.5">
                {{ selectedOrder.vehicle ? `${selectedOrder.vehicle.brand} ${selectedOrder.vehicle.model}` : selectedOrder.assetName }}
              </p>
            </div>
          </div>
          <button @click="isDetailModalOpen = false" class="text-slate-400 hover:text-white text-lg font-bold cursor-pointer">✕</button>
        </div>

        <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <!-- Datos de Cliente y Técnico -->
          <div class="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span class="text-slate-400 font-bold block uppercase text-[10px]">Cliente Propietario</span>
              <span class="font-bold text-slate-800">
                {{ selectedOrder.customer?.firstName }} {{ selectedOrder.customer?.lastName }}
              </span>
              <span v-if="selectedOrder.customer?.phoneNumber" class="block text-slate-500 text-[11px]">
                📞 {{ selectedOrder.customer.phoneNumber }}
              </span>
            </div>
            <div>
              <span class="text-slate-400 font-bold block uppercase text-[10px]">Mecánico Asignado</span>
              <span class="font-bold text-slate-800">
                {{ selectedOrder.assignedWorker ? `${selectedOrder.assignedWorker.firstName} ${selectedOrder.assignedWorker.lastName}` : 'No asignado' }}
              </span>
              <span v-if="selectedOrder.assignedWorker?.specialty" class="block text-slate-500 text-[11px]">
                🔧 {{ selectedOrder.assignedWorker.specialty }}
              </span>
            </div>
          </div>

          <!-- Totales Financieros -->
          <div class="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs flex justify-between items-center">
            <div>
              <span class="text-slate-500">Mano de Obra: <strong class="text-slate-900">{{ formatCurrency(selectedOrder.laborTotal) }}</strong></span>
              <span class="mx-2 text-slate-300">|</span>
              <span class="text-slate-500">Repuestos: <strong class="text-slate-900">{{ formatCurrency(selectedOrder.materialsTotal) }}</strong></span>
            </div>
            <span class="text-base font-black text-blue-900">{{ formatCurrency(selectedOrder.total) }}</span>
          </div>

          <!-- Repuestos Cargados -->
          <div>
            <h4 class="text-xs font-black uppercase text-slate-700 tracking-wider mb-1.5">Repuestos Consumidos</h4>
            <div v-if="selectedOrder.materials && selectedOrder.materials.length > 0" class="border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
              <div v-for="mat in selectedOrder.materials" :key="mat.id" class="p-2.5 flex justify-between items-center">
                <span>{{ mat.quantity }}x {{ mat.product?.name || 'Repuesto' }}</span>
                <span class="font-bold text-slate-800">{{ formatCurrency(mat.total) }}</span>
              </div>
            </div>
            <p v-else class="text-xs text-slate-400 italic">No se han registrado repuestos en esta orden.</p>
          </div>
        </div>

        <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            @click="isDetailModalOpen = false"
            class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Cerrar
          </button>

          <div class="flex items-center gap-2">
            <button
              v-if="selectedOrder.status === 'COMPLETED'"
              @click="goToPos(selectedOrder.id)"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1"
            >
              <span>💳</span> Facturar en POS
            </button>
            <router-link
              :to="`/service-orders`"
              class="px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all cursor-pointer"
            >
              Editar Orden Completa ↗
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL DE CONFIGURACIÓN DEL TALLER -->
    <div
      v-if="isConfigModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
    >
      <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xl">⚙️</span>
            <h3 class="text-sm font-black">Ajustes del Vertical Taller Automotriz</h3>
          </div>
          <button @click="isConfigModalOpen = false" class="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
        </div>

        <form @submit.prevent="saveConfig" class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Número de Bahías de Trabajo</label>
            <input
              v-model.number="config.baysCount"
              type="number"
              min="1"
              max="50"
              required
              class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:border-blue-500 focus:outline-none"
            />
            <p class="text-[11px] text-slate-400 mt-1">Capacidad máxima de vehículos simultáneos en patio de servicio.</p>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Términos de Recepción / Recibo</label>
            <textarea
              v-model="config.receptionTerms"
              rows="3"
              class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Texto impreso en la hoja de recepción vehicular..."
            ></textarea>
          </div>

          <div class="flex items-center justify-between pt-2">
            <span class="text-xs font-bold text-slate-700">Notificaciones automáticas a clientes</span>
            <input
              type="checkbox"
              v-model="config.enableCustomerNotifications"
              class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <div class="pt-4 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              @click="isConfigModalOpen = false"
              class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isSavingConfig"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
            >
              {{ isSavingConfig ? 'Guardando...' : 'Guardar Ajustes' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>
