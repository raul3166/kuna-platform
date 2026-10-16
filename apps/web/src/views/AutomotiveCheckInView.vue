<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

interface Vehicle {
  id: string
  licensePlate: string
  brand: string
  model: string
  year?: number
  color?: string
  mileage?: number
  vehicleType: string
  fuelType?: string
  customer?: {
    id: string
    firstName: string
    lastName: string
    phoneNumber?: string
    identificationNumber?: string
  }
}

interface Worker {
  id: string
  firstName: string
  lastName: string
  specialty?: string
}

interface ServiceItem {
  id: string
  name: string
  basePrice: number
}

interface Customer {
  id: string
  firstName: string
  lastName: string
  identificationNumber?: string
  phoneNumber?: string
}

// Estados
const searchPlate = ref('')
const isSearching = ref(false)
const vehiclesList = ref<Vehicle[]>([])
const selectedVehicle = ref<Vehicle | null>(null)
const workers = ref<Worker[]>([])
const serviceCatalog = ref<ServiceItem[]>([])
const customers = ref<Customer[]>([])

const isNewVehicleModalOpen = ref(false)
const isSubmitting = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// Formulario de Check-In
const checkInForm = ref({
  mileage: 0,
  fuelLevel: 'HALF',
  receptionNotes: '',
  customerBelongings: '',
  damagesNotes: '',
  assignedWorkerId: '',
  serviceItemId: '',
  inventoryCheck: {
    spareTire: true,
    jack: true,
    wheelWrench: true,
    tools: false,
    radio: true,
    antenna: true,
    documents: true,
    extinguisher: true,
  } as Record<string, boolean>,
})

// Formulario para registrar vehículo nuevo
const newVehicleForm = ref({
  customerId: '',
  licensePlate: '',
  brand: '',
  model: '',
  year: new Date().getFullYear(),
  color: '',
  vehicleType: 'CAR',
  mileage: 0,
})

const fuelLevels = [
  { value: 'EMPTY', label: 'E (Vacío)', icon: '⛽', color: 'text-red-600 bg-red-50 border-red-200' },
  { value: 'QUARTER', label: '1/4', icon: '⛽', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'HALF', label: '1/2 (Medio)', icon: '⛽', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'THREE_QUARTERS', label: '3/4', icon: '⛽', color: 'text-teal-600 bg-teal-50 border-teal-200' },
  { value: 'FULL', label: 'F (Lleno)', icon: '⛽', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
]

const checklistItems = [
  { key: 'spareTire', label: 'Llanta de repuesto' },
  { key: 'jack', label: 'Gato hidráulico' },
  { key: 'wheelWrench', label: 'Llave de pernos' },
  { key: 'tools', label: 'Estuche de herramientas' },
  { key: 'radio', label: 'Radio / Pantalla táctil' },
  { key: 'antenna', label: 'Antena' },
  { key: 'documents', label: 'Documentos / Tarjeta propiedad' },
  { key: 'extinguisher', label: 'Extintor y botiquín' },
]

async function loadInitialData() {
  try {
    const orgId = authStore.currentOrganization?.id
    const [workersRes, servicesRes, custRes] = await Promise.all([
      api.get('/service-workers', { params: { organizationId: orgId, isActive: true } }),
      api.get('/service-items', { params: { organizationId: orgId, isActive: true } }),
      api.get('/customers', { params: { organizationId: orgId } }),
    ])

    workers.value = Array.isArray(workersRes.data) ? workersRes.data : (workersRes.data.items || [])
    serviceCatalog.value = Array.isArray(servicesRes.data) ? servicesRes.data : (servicesRes.data.items || [])
    customers.value = Array.isArray(custRes.data) ? custRes.data : (custRes.data.items || [])
  } catch (error) {
    console.error('Error al cargar datos auxiliares:', error)
  }
}

async function searchVehicles() {
  if (!searchPlate.value.trim()) {
    vehiclesList.value = []
    return
  }

  isSearching.value = true
  try {
    const orgId = authStore.currentOrganization?.id
    const res = await api.get('/automotive/vehicles', {
      params: { organizationId: orgId, search: searchPlate.value.trim() },
    })
    vehiclesList.value = res.data

    // Si hay una coincidencia exacta de placa, seleccionarla directamente
    const cleanSearch = searchPlate.value.trim().toUpperCase()
    const exact = vehiclesList.value.find((v) => v.licensePlate === cleanSearch)
    if (exact) {
      selectVehicle(exact)
    }
  } catch (error) {
    console.error('Error al buscar vehículos:', error)
  } finally {
    isSearching.value = false
  }
}

function selectVehicle(v: Vehicle) {
  selectedVehicle.value = v
  checkInForm.value.mileage = v.mileage || 0
}

function clearSelectedVehicle() {
  selectedVehicle.value = null
  searchPlate.value = ''
  vehiclesList.value = []
}

function openNewVehicleModal() {
  newVehicleForm.value.licensePlate = searchPlate.value.trim().toUpperCase()
  isNewVehicleModalOpen.value = true
}

async function handleCreateVehicle() {
  try {
    const orgId = authStore.currentOrganization?.id
    const res = await api.post('/automotive/vehicles', {
      ...newVehicleForm.value,
      organizationId: orgId,
    })
    selectVehicle(res.data)
    isNewVehicleModalOpen.value = false
  } catch (error: any) {
    alert(error.response?.data?.message || 'Error al registrar el vehículo.')
  }
}

async function handleSubmitCheckIn() {
  if (!selectedVehicle.value) {
    alert('Debe seleccionar o registrar un vehículo.')
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const orgId = authStore.currentOrganization?.id
    const branchId = authStore.currentBranch?.id

    const payload = {
      organizationId: orgId,
      branchId,
      vehicleId: selectedVehicle.value.id,
      mileage: Number(checkInForm.value.mileage),
      fuelLevel: checkInForm.value.fuelLevel,
      damages: checkInForm.value.damagesNotes ? { notes: checkInForm.value.damagesNotes } : null,
      inventoryCheck: checkInForm.value.inventoryCheck,
      customerBelongings: checkInForm.value.customerBelongings || null,
      receptionNotes: checkInForm.value.receptionNotes || null,
      assignedWorkerId: checkInForm.value.assignedWorkerId || undefined,
      serviceItemId: checkInForm.value.serviceItemId || undefined,
      createServiceOrder: true,
    }

    const res = await api.post('/automotive/check-in', payload)
    successMessage.value = `¡Recepción registrada exitosamente! Orden creada: #${res.data.serviceOrder?.orderNumber || ''}`

    setTimeout(() => {
      router.push('/automotive-dashboard')
    }, 1200)
  } catch (error: any) {
    console.error('Error al registrar check-in:', error)
    errorMessage.value = error.response?.data?.message || 'Error al registrar la hoja de recepción.'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  loadInitialData()
})
</script>

<template>
  <AppLayout>
    <div class="max-w-4xl mx-auto pb-12">
      <!-- Encabezado -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <router-link
            to="/automotive-dashboard"
            class="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 mb-1"
          >
            ← Volver al Patio de Taller
          </router-link>
          <div class="flex items-center gap-2">
            <span class="text-3xl">📝</span>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight">Hoja de Recepción Técnica (Check-In)</h1>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">
            Ingreso oficial de vehículo, checklist de inventario y generación de orden de trabajo.
          </p>
        </div>
      </div>

      <!-- Alertas -->
      <div v-if="successMessage" class="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-bold flex items-center gap-2">
        <span>🎉</span>
        <span>{{ successMessage }}</span>
      </div>

      <div v-if="errorMessage" class="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-bold flex items-center gap-2">
        <span>⚠️</span>
        <span>{{ errorMessage }}</span>
      </div>

      <form @submit.prevent="handleSubmitCheckIn" class="space-y-6">
        <!-- PASO 1: SELECCIÓN O BÚSQUEDA DE VEHÍCULO -->
        <section class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h2 class="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
            <span>1️⃣</span>
            <span>Identificación del Vehículo</span>
          </h2>

          <div v-if="!selectedVehicle">
            <div class="flex gap-2">
              <div class="relative flex-1">
                <input
                  v-model="searchPlate"
                  type="text"
                  placeholder="Escriba la placa o patente (ej: ABC-123)..."
                  @input="searchVehicles"
                  class="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold tracking-wider focus:bg-white focus:border-blue-500 focus:outline-none uppercase"
                />
                <span v-if="isSearching" class="absolute right-3 top-3.5 text-xs text-slate-400">Buscando...</span>
              </div>

              <button
                type="button"
                @click="openNewVehicleModal"
                class="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <span>➕</span>
                <span>Registrar Nuevo</span>
              </button>
            </div>

            <!-- Lista de sugerencias de vehículos -->
            <div v-if="vehiclesList.length > 0" class="mt-3 border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
              <div
                v-for="v in vehiclesList"
                :key="v.id"
                @click="selectVehicle(v)"
                class="p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-all"
              >
                <div class="flex items-center gap-3">
                  <span class="font-mono font-black text-xs px-2 py-0.5 bg-amber-300 text-slate-900 border border-slate-900 rounded">
                    {{ v.licensePlate }}
                  </span>
                  <div>
                    <p class="text-xs font-bold text-slate-800">{{ v.brand }} {{ v.model }} {{ v.year || '' }}</p>
                    <p class="text-[11px] text-slate-400">Propietario: {{ v.customer?.firstName }} {{ v.customer?.lastName }}</p>
                  </div>
                </div>
                <button type="button" class="text-xs font-bold text-blue-600">Seleccionar ➔</button>
              </div>
            </div>

            <div v-else-if="searchPlate.length >= 2 && !isSearching" class="mt-3 text-center py-4 bg-slate-50 rounded-xl border border-slate-200">
              <p class="text-xs text-slate-500">No encontramos ningún vehículo con esa placa.</p>
              <button
                type="button"
                @click="openNewVehicleModal"
                class="mt-2 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                ¿Desea registrar el vehículo {{ searchPlate.toUpperCase() }} ahora?
              </button>
            </div>
          </div>

          <!-- Tarjeta de Vehículo Seleccionado -->
          <div v-else class="p-4 bg-amber-50/50 border border-amber-200 rounded-xl flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="px-3 py-1 bg-amber-300 text-slate-900 border-2 border-slate-900 rounded font-mono font-black text-base shadow-xs">
                {{ selectedVehicle.licensePlate }}
              </div>
              <div>
                <p class="text-sm font-black text-slate-900">{{ selectedVehicle.brand }} {{ selectedVehicle.model }} ({{ selectedVehicle.year || 'S/A' }})</p>
                <p class="text-xs text-slate-500 mt-0.5">
                  Propietario: <strong class="text-slate-700">{{ selectedVehicle.customer?.firstName }} {{ selectedVehicle.customer?.lastName }}</strong>
                  <span v-if="selectedVehicle.customer?.phoneNumber"> • Tel: {{ selectedVehicle.customer?.phoneNumber }}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              @click="clearSelectedVehicle"
              class="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-red-600 bg-white border border-slate-200 rounded-lg cursor-pointer"
            >
              Cambiar ✕
            </button>
          </div>
        </section>

        <!-- PASO 2: CONDICIONES DE ENTRADA Y COMBUSTIBLE -->
        <section class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 class="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <span>2️⃣</span>
            <span>Estado Operativo al Ingresar</span>
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Kilometraje de Entrada *</label>
              <input
                v-model.number="checkInForm.mileage"
                type="number"
                min="0"
                required
                placeholder="Ej: 45000"
                class="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:bg-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Mecánico Responsable</label>
              <select
                v-model="checkInForm.assignedWorkerId"
                class="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">-- Asignar después --</option>
                <option v-for="w in workers" :key="w.id" :value="w.id">
                  {{ w.firstName }} {{ w.lastName }} ({{ w.specialty || 'Taller' }})
                </option>
              </select>
            </div>
          </div>

          <!-- Nivel de Combustible -->
          <div>
            <label class="block text-xs font-bold uppercase text-slate-700 mb-2">Nivel de Combustible en Tanque *</label>
            <div class="grid grid-cols-5 gap-2">
              <button
                v-for="fl in fuelLevels"
                :key="fl.value"
                type="button"
                @click="checkInForm.fuelLevel = fl.value"
                :class="[
                  'p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs flex flex-col items-center justify-center gap-1',
                  checkInForm.fuelLevel === fl.value
                    ? fl.color + ' ring-2 ring-blue-500 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                ]"
              >
                <span class="text-base">{{ fl.icon }}</span>
                <span>{{ fl.label }}</span>
              </button>
            </div>
          </div>
        </section>

        <!-- PASO 3: INVENTARIO DE ACCESORIOS Y PERTENENCIAS -->
        <section class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 class="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <span>3️⃣</span>
            <span>Checklist de Accesorios y Pertenencias</span>
          </h2>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <label
              v-for="item in checklistItems"
              :key="item.key"
              class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer select-none text-xs font-bold text-slate-700"
            >
              <input
                type="checkbox"
                v-model="checkInForm.inventoryCheck[item.key]"
                class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>{{ item.label }}</span>
            </label>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Daños Previos / Carrocería</label>
              <textarea
                v-model="checkInForm.damagesNotes"
                rows="2"
                placeholder="Rayones en puerta derecha, golpe frontal, etc..."
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
              ></textarea>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Objetos de Valor Declarados</label>
              <textarea
                v-model="checkInForm.customerBelongings"
                rows="2"
                placeholder="Gafas de sol, cargadores, dinero u objetos dejados en cabina..."
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
              ></textarea>
            </div>
          </div>
        </section>

        <!-- PASO 4: MOTIVO DE INGRESO Y SERVICIO SOLICITADO -->
        <section class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 class="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <span>4️⃣</span>
            <span>Motivo de Ingreso & Orden de Trabajo</span>
          </h2>

          <div>
            <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Falla Reportada / Solicitud del Cliente *</label>
            <textarea
              v-model="checkInForm.receptionNotes"
              rows="3"
              required
              placeholder="Ej: Cambio de aceite y filtros, ruido extraño al frenar, revisión general de suspensión..."
              class="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:outline-none"
            ></textarea>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Servicio Preliminar (Catálogo)</label>
            <select
              v-model="checkInForm.serviceItemId"
              class="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">-- Sin servicio predefinido (mano de obra libre) --</option>
              <option v-for="s in serviceCatalog" :key="s.id" :value="s.id">
                {{ s.name }} (Base: ${{ s.basePrice?.toLocaleString() }})
              </option>
            </select>
          </div>
        </section>

        <!-- BOTÓN DE GUARDAR RECEPCIÓN -->
        <div class="flex items-center justify-between pt-2">
          <router-link
            to="/automotive-dashboard"
            class="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            Cancelar
          </router-link>

          <button
            type="submit"
            :disabled="isSubmitting || !selectedVehicle"
            class="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>🏁</span>
            <span>{{ isSubmitting ? 'Registrando en Patio...' : 'Completar Recepción y Crear Orden' }}</span>
          </button>
        </div>
      </form>

      <!-- MODAL RÁPIDO PARA REGISTRAR VEHÍCULO NUEVO -->
      <div
        v-if="isNewVehicleModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
      >
        <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <h3 class="text-sm font-black flex items-center gap-2">
              <span>🚗</span>
              <span>Registrar Vehículo en Flota</span>
            </h3>
            <button @click="isNewVehicleModalOpen = false" class="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
          </div>

          <form @submit.prevent="handleCreateVehicle" class="p-6 space-y-3.5">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Cliente Propietario *</label>
              <select
                v-model="newVehicleForm.customerId"
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
                <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Placa / Patente *</label>
                <input
                  v-model="newVehicleForm.licensePlate"
                  type="text"
                  required
                  class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Tipo</label>
                <select
                  v-model="newVehicleForm.vehicleType"
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
                  v-model="newVehicleForm.brand"
                  type="text"
                  required
                  placeholder="Ej: Toyota"
                  class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Modelo *</label>
                <input
                  v-model="newVehicleForm.model"
                  type="text"
                  required
                  placeholder="Ej: Corolla"
                  class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Año Modelo</label>
                <input
                  v-model.number="newVehicleForm.year"
                  type="number"
                  min="1950"
                  max="2030"
                  class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Color</label>
                <input
                  v-model="newVehicleForm.color"
                  type="text"
                  placeholder="Ej: Gris Plata"
                  class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                @click="isNewVehicleModalOpen = false"
                class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
              >
                Guardar y Seleccionar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
