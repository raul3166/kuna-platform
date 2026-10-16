<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

interface Customer {
  id: string
  firstName: string
  lastName: string
  identificationNumber?: string
  phoneNumber?: string
  email?: string
}

interface Vehicle {
  id: string
  licensePlate: string
  brand: string
  model: string
  year?: number
  color?: string
  vin?: string
  mileage?: number
  vehicleType: string
  fuelType?: string
  notes?: string
  customer?: Customer
  _count?: {
    serviceOrders: number
    checkIns: number
  }
}

interface VehicleDetail extends Vehicle {
  serviceOrders?: any[]
  checkIns?: any[]
}

const vehicles = ref<Vehicle[]>([])
const customers = ref<Customer[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const selectedType = ref('ALL')

// Modales
const isVehicleModalOpen = ref(false)
const isHistoryModalOpen = ref(false)
const isSaving = ref(false)
const selectedVehicle = ref<VehicleDetail | null>(null)
const isLoadingHistory = ref(false)

// Formulario de Vehículo
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const vehicleForm = ref({
  customerId: '',
  licensePlate: '',
  brand: '',
  model: '',
  year: new Date().getFullYear(),
  color: '',
  vin: '',
  mileage: 0,
  vehicleType: 'CAR',
  fuelType: 'Gasolina',
  notes: '',
})

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
  return new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

async function loadVehicles() {
  isLoading.value = true
  try {
    const orgId = authStore.currentOrganization?.id
    const [vehRes, custRes] = await Promise.all([
      api.get('/automotive/vehicles', { params: { organizationId: orgId } }),
      api.get('/customers', { params: { organizationId: orgId } }),
    ])
    vehicles.value = vehRes.data
    customers.value = Array.isArray(custRes.data) ? custRes.data : (custRes.data.items || [])
  } catch (error) {
    console.error('Error al cargar vehículos:', error)
  } finally {
    isLoading.value = false
  }
}

const filteredVehicles = computed(() => {
  return vehicles.value.filter((v) => {
    const matchesType = selectedType.value === 'ALL' || v.vehicleType === selectedType.value
    if (!matchesType) return false

    if (!searchQuery.value.trim()) return true
    const q = searchQuery.value.toLowerCase()
    const plate = v.licensePlate.toLowerCase()
    const brand = v.brand.toLowerCase()
    const model = v.model.toLowerCase()
    const custName = `${v.customer?.firstName || ''} ${v.customer?.lastName || ''}`.toLowerCase()
    const custDoc = (v.customer?.identificationNumber || '').toLowerCase()
    return plate.includes(q) || brand.includes(q) || model.includes(q) || custName.includes(q) || custDoc.includes(q)
  })
})

function openCreateModal() {
  isEditing.value = false
  editingId.value = null
  vehicleForm.value = {
    customerId: '',
    licensePlate: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    vin: '',
    mileage: 0,
    vehicleType: 'CAR',
    fuelType: 'Gasolina',
    notes: '',
  }
  isVehicleModalOpen.value = true
}

function openEditModal(v: Vehicle) {
  isEditing.value = true
  editingId.value = v.id
  vehicleForm.value = {
    customerId: v.customer?.id || '',
    licensePlate: v.licensePlate,
    brand: v.brand,
    model: v.model,
    year: v.year || new Date().getFullYear(),
    color: v.color || '',
    vin: v.vin || '',
    mileage: v.mileage || 0,
    vehicleType: v.vehicleType || 'CAR',
    fuelType: v.fuelType || 'Gasolina',
    notes: v.notes || '',
  }
  isVehicleModalOpen.value = true
}

async function saveVehicle() {
  isSaving.value = true
  try {
    const orgId = authStore.currentOrganization?.id
    if (isEditing.value && editingId.value) {
      await api.patch(`/automotive/vehicles/${editingId.value}`, vehicleForm.value, {
        params: { organizationId: orgId },
      })
    } else {
      await api.post('/automotive/vehicles', {
        ...vehicleForm.value,
        organizationId: orgId,
      })
    }
    isVehicleModalOpen.value = false
    await loadVehicles()
  } catch (error: any) {
    alert(error.response?.data?.message || 'Error al guardar el vehículo.')
  } finally {
    isSaving.value = false
  }
}

async function viewHistory(v: Vehicle) {
  isLoadingHistory.value = true
  isHistoryModalOpen.value = true
  try {
    const orgId = authStore.currentOrganization?.id
    const res = await api.get(`/automotive/vehicles/${v.id}`, {
      params: { organizationId: orgId },
    })
    selectedVehicle.value = res.data
  } catch (error) {
    console.error('Error al cargar historial del vehículo:', error)
  } finally {
    isLoadingHistory.value = false
  }
}

function goToCheckIn(plate: string) {
  router.push({ path: '/automotive-checkin', query: { plate } })
}

onMounted(() => {
  loadVehicles()
})
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Encabezado -->
      <header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-3xl">🚗</span>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight">Flota de Vehículos & Motos</h1>
            <span class="text-xs font-black bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
              {{ vehicles.length }} registrados
            </span>
          </div>
          <p class="text-xs text-slate-500 mt-1">
            Directorio vehicular de clientes, historiales de servicio técnico y control de kilometrajes.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <router-link
            to="/automotive-dashboard"
            class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>🏎️</span>
            <span>Patio & Bahías</span>
          </router-link>

          <button
            @click="openCreateModal"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>➕</span>
            <span>Registrar Vehículo</span>
          </button>
        </div>
      </header>

      <!-- Barra de Filtros y Búsqueda -->
      <section class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div class="relative flex-1 w-full">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por placa, marca, modelo, VIN o cliente..."
            class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:border-blue-500 focus:outline-none"
          />
          <span class="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
        </div>

        <div class="flex items-center gap-2 w-full md:w-auto">
          <label class="text-xs font-bold text-slate-500 uppercase text-[11px] shrink-0">Tipo:</label>
          <select
            v-model="selectedType"
            class="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">Todos los tipos</option>
            <option value="CAR">Automóvil</option>
            <option value="MOTORCYCLE">Motocicleta</option>
            <option value="VAN">Camioneta / Van</option>
            <option value="TRUCK">Camión / Pesado</option>
            <option value="OTHER">Otros</option>
          </select>
        </div>
      </section>

      <!-- Tabla de Vehículos -->
      <div v-if="isLoading" class="p-12 text-center text-xs font-bold text-slate-400 bg-white border border-slate-200 rounded-2xl animate-pulse">
        Cargando flota de vehículos...
      </div>

      <div v-else class="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th class="py-3 px-4">Placa / Matrícula</th>
                <th class="py-3 px-4">Vehículo</th>
                <th class="py-3 px-4">Propietario</th>
                <th class="py-3 px-4">Kilometraje</th>
                <th class="py-3 px-4">Servicios</th>
                <th class="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="v in filteredVehicles"
                :key="v.id"
                class="hover:bg-slate-50/80 transition-colors"
              >
                <!-- Placa -->
                <td class="py-3.5 px-4">
                  <div class="inline-flex items-center px-2 py-0.5 border-2 border-slate-900 rounded font-mono font-black text-xs bg-amber-300 text-slate-900 shadow-2xs">
                    {{ v.licensePlate }}
                  </div>
                </td>

                <!-- Vehículo -->
                <td class="py-3.5 px-4">
                  <div class="font-bold text-slate-900 text-xs">{{ v.brand }} {{ v.model }}</div>
                  <div class="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span>{{ v.year || 'S/Año' }}</span>
                    <span>•</span>
                    <span>{{ v.color || 'Color estándar' }}</span>
                    <span>•</span>
                    <span class="font-semibold text-slate-600">{{ v.vehicleType }}</span>
                  </div>
                </td>

                <!-- Propietario -->
                <td class="py-3.5 px-4">
                  <div class="font-bold text-slate-800">
                    {{ v.customer?.firstName }} {{ v.customer?.lastName }}
                  </div>
                  <div class="text-[11px] text-slate-400 mt-0.5">
                    {{ v.customer?.phoneNumber || v.customer?.identificationNumber || 'Sin contacto' }}
                  </div>
                </td>

                <!-- Kilometraje -->
                <td class="py-3.5 px-4 font-mono font-bold text-slate-700">
                  {{ v.mileage ? v.mileage.toLocaleString() + ' km' : 'Sin registro' }}
                </td>

                <!-- Cantidad de Servicios -->
                <td class="py-3.5 px-4">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {{ v._count?.serviceOrders || 0 }} órdenes
                  </span>
                </td>

                <!-- Acciones -->
                <td class="py-3.5 px-4 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <button
                      @click="viewHistory(v)"
                      class="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition-all cursor-pointer text-xs"
                      title="Ver Historial Clínico"
                    >
                      Historial 📑
                    </button>

                    <button
                      @click="openEditModal(v)"
                      class="p-1.5 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-all"
                      title="Editar Datos"
                    >
                      ✏️
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="filteredVehicles.length === 0">
                <td colspan="6" class="text-center py-12 text-slate-400 font-medium">
                  No se encontraron vehículos registrados con esos criterios.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- MODAL DE HOJA DE VIDA / HISTORIAL DEL VEHÍCULO -->
    <div
      v-if="isHistoryModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
    >
      <div class="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        <!-- Encabezado del Historial -->
        <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
            <span class="text-2xl">📑</span>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-mono font-black px-2 py-0.5 bg-amber-300 text-slate-900 rounded text-xs">
                  {{ selectedVehicle?.licensePlate }}
                </span>
                <h3 class="text-sm font-black">Historial Clínico / Hoja de Vida</h3>
              </div>
              <p class="text-xs text-slate-300 mt-0.5">
                {{ selectedVehicle?.brand }} {{ selectedVehicle?.model }} ({{ selectedVehicle?.year || '' }}) • {{ selectedVehicle?.vin || 'Sin VIN' }}
              </p>
            </div>
          </div>
          <button @click="isHistoryModalOpen = false" class="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
        </div>

        <div v-if="isLoadingHistory" class="p-12 text-center text-xs text-slate-400 font-bold animate-pulse">
          Cargando hoja de vida del vehículo...
        </div>

        <!-- Contenido del Historial -->
        <div v-else-if="selectedVehicle" class="p-6 space-y-6 overflow-y-auto flex-1">
          <!-- Tarjeta de Ficha Técnica -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <span class="text-slate-400 font-bold block uppercase text-[10px]">Propietario</span>
              <span class="font-bold text-slate-900">{{ selectedVehicle.customer?.firstName }} {{ selectedVehicle.customer?.lastName }}</span>
              <span class="block text-slate-500 text-[11px]">{{ selectedVehicle.customer?.phoneNumber }}</span>
            </div>
            <div>
              <span class="text-slate-400 font-bold block uppercase text-[10px]">Kilometraje Actual</span>
              <span class="font-mono font-black text-slate-900">{{ selectedVehicle.mileage?.toLocaleString() || 0 }} km</span>
            </div>
            <div>
              <span class="text-slate-400 font-bold block uppercase text-[10px]">Color / Combustible</span>
              <span class="font-bold text-slate-700">{{ selectedVehicle.color || 'N/D' }} • {{ selectedVehicle.fuelType || 'Gasolina' }}</span>
            </div>
            <div>
              <span class="text-slate-400 font-bold block uppercase text-[10px]">Total Intervenciones</span>
              <span class="font-bold text-blue-700">{{ selectedVehicle.serviceOrders?.length || 0 }} visitas técnicas</span>
            </div>
          </div>

          <!-- Línea de Tiempo de Órdenes de Servicio -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-xs font-black uppercase text-slate-800 tracking-wider">Historial de Trabajos en Taller</h4>
              <button
                @click="goToCheckIn(selectedVehicle.licensePlate)"
                class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                ➕ Nuevo Ingreso
              </button>
            </div>

            <div v-if="selectedVehicle.serviceOrders && selectedVehicle.serviceOrders.length > 0" class="space-y-3">
              <div
                v-for="order in selectedVehicle.serviceOrders"
                :key="order.id"
                class="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2"
              >
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2">
                    <span class="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      #{{ order.orderNumber }}
                    </span>
                    <span class="text-slate-400 text-[11px]">{{ formatDate(order.createdAt) }}</span>
                  </div>
                  <span
                    :class="[
                      'px-2 py-0.5 rounded-full text-[10px] font-black uppercase',
                      order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                      order.status === 'BILLED' ? 'bg-slate-100 text-slate-800' :
                      order.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    ]"
                  >
                    {{ order.status }}
                  </span>
                </div>

                <p class="text-xs text-slate-700">
                  <strong class="text-slate-900">Motivo:</strong> {{ order.initialNotes || 'Mantenimiento' }}
                </p>

                <p v-if="order.assignedWorker" class="text-[11px] text-slate-500">
                  👨‍🔧 Técnico: <strong>{{ order.assignedWorker.firstName }} {{ order.assignedWorker.lastName }}</strong>
                </p>

                <!-- Repuestos Cambiados -->
                <div v-if="order.materials && order.materials.length > 0" class="pt-2 border-t border-slate-100">
                  <span class="text-[10px] font-bold text-slate-400 uppercase block mb-1">Repuestos Instalados:</span>
                  <div class="flex flex-wrap gap-1.5">
                    <span
                      v-for="m in order.materials"
                      :key="m.id"
                      class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px]"
                    >
                      {{ m.quantity }}x {{ m.product?.name }}
                    </span>
                  </div>
                </div>

                <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Monto Total:</span>
                  <span class="text-sm font-black text-blue-900">{{ formatCurrency(order.total) }}</span>
                </div>
              </div>
            </div>

            <div v-else class="text-center py-8 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-xl">
              Este vehículo no registra órdenes de trabajo anteriores.
            </div>
          </div>
        </div>

        <div class="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            @click="isHistoryModalOpen = false"
            class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL DE REGISTRO / EDICIÓN DE VEHÍCULO -->
    <div
      v-if="isVehicleModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
    >
      <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <h3 class="text-sm font-black flex items-center gap-2">
            <span>🚗</span>
            <span>{{ isEditing ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo' }}</span>
          </h3>
          <button @click="isVehicleModalOpen = false" class="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
        </div>

        <form @submit.prevent="saveVehicle" class="p-6 space-y-3.5">
          <div>
            <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Cliente Propietario *</label>
            <select
              v-model="vehicleForm.customerId"
              required
              class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:border-blue-500 focus:outline-none"
            >
              <option value="">-- Seleccionar Cliente --</option>
              <option v-for="c in customers" :key="c.id" :value="c.id">
                {{ c.firstName }} {{ c.lastName }} ({{ c.identificationNumber || 'S/Doc' }})
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Placa / Matrícula *</label>
              <input
                v-model="vehicleForm.licensePlate"
                type="text"
                required
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Tipo de Vehículo</label>
              <select
                v-model="vehicleForm.vehicleType"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:border-blue-500 focus:outline-none"
              >
                <option value="CAR">Automóvil</option>
                <option value="MOTORCYCLE">Motocicleta</option>
                <option value="VAN">Camioneta / Van</option>
                <option value="TRUCK">Camión / Pesado</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Marca *</label>
              <input
                v-model="vehicleForm.brand"
                type="text"
                required
                placeholder="Ej: Renault"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Modelo *</label>
              <input
                v-model="vehicleForm.model"
                type="text"
                required
                placeholder="Ej: Duster"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Año Modelo</label>
              <input
                v-model.number="vehicleForm.year"
                type="number"
                min="1950"
                max="2030"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Color</label>
              <input
                v-model="vehicleForm.color"
                type="text"
                placeholder="Gris"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Kilometraje</label>
              <input
                v-model.number="vehicleForm.mileage"
                type="number"
                min="0"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Número de Chasis / VIN</label>
            <input
              v-model="vehicleForm.vin"
              type="text"
              placeholder="Opcional..."
              class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              @click="isVehicleModalOpen = false"
              class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isSaving"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
            >
              {{ isSaving ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Registrar') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>

