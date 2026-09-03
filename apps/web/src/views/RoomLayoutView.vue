<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

interface Table {
  id: string
  roomId: string
  tableNumber: string
  capacity: number
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'BILL_PRINTED'
  currentSaleId?: string
}

interface Room {
  id: string
  name: string
  description?: string
  tables: Table[]
}

const router = useRouter()
const authStore = useAuthStore()

const rooms = ref<Room[]>([])
const selectedRoomId = ref<string>('')
const isLoading = ref(false)
const errorMessage = ref('')

// Modales para creación
const showRoomModal = ref(false)
const showTableModal = ref(false)
const newRoomName = ref('')
const newTableNumber = ref('')
const newTableCapacity = ref(4)

// Modal de Acción sobre Mesa
const selectedTable = ref<Table | null>(null)
const showTableActionModal = ref(false)

async function fetchRooms() {
  const orgId = authStore.user?.organizationId
  const branchId = authStore.currentBranch?.id
  if (!orgId || !branchId) return

  isLoading.value = true
  try {
    const res = await api.get<Room[]>('/restaurants/rooms', {
      params: { organizationId: orgId, branchId }
    })
    rooms.value = res.data ?? []
    if (rooms.value.length > 0 && !selectedRoomId.value) {
      selectedRoomId.value = rooms.value[0].id
    }
  } catch (err: any) {
    errorMessage.value = err.response?.data?.message || 'Error al cargar salones.'
  } finally {
    isLoading.value = false
  }
}

async function createRoom() {
  if (!newRoomName.value.trim()) return
  try {
    await api.post('/restaurants/rooms', {
      organizationId: authStore.user?.organizationId,
      branchId: authStore.currentBranch?.id,
      name: newRoomName.value
    })
    newRoomName.value = ''
    showRoomModal.value = false
    await fetchRooms()
  } catch (err: any) {
    alert(err.response?.data?.message || 'Error al crear salón')
  }
}

async function createTable() {
  if (!selectedRoomId.value || !newTableNumber.value.trim()) return
  try {
    await api.post('/restaurants/tables', {
      roomId: selectedRoomId.value,
      tableNumber: newTableNumber.value,
      capacity: newTableCapacity.value
    })
    newTableNumber.value = ''
    newTableCapacity.value = 4
    showTableModal.value = false
    await fetchRooms()
  } catch (err: any) {
    alert(err.response?.data?.message || 'Error al crear mesa')
  }
}

// Interacción con Mesas
function handleTableClick(table: Table) {
  selectedTable.value = table
  showTableActionModal.value = true
}

async function openTable() {
  if (!selectedTable.value) return
  try {
    await api.patch(`/restaurants/tables/${selectedTable.value.id}/open`)
    showTableActionModal.value = false
    await fetchRooms()
  } catch (err: any) {
    alert(err.response?.data?.message || 'Error al aperturar mesa')
  }
}

async function printBill() {
  if (!selectedTable.value) return
  try {
    await api.patch(`/restaurants/tables/${selectedTable.value.id}/bill-printed`)
    showTableActionModal.value = false
    await fetchRooms()
  } catch (err: any) {
    alert(err.response?.data?.message || 'Error al imprimir precuenta')
  }
}

async function releaseTable() {
  if (!selectedTable.value) return
  try {
    await api.patch(`/restaurants/tables/${selectedTable.value.id}/release`)
    showTableActionModal.value = false
    await fetchRooms()
  } catch (err: any) {
    alert(err.response?.data?.message || 'Error al liberar mesa')
  }
}


function goToPos(tableId: string) {
  router.push({ path: '/pos', query: { tableId } })
}

function goToOrder(tableId: string) {
  router.push({ path: '/restaurant-orders', query: { tableId } })
}

onMounted(() => {
  fetchRooms()
})
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-slate-900">Mapa de Salones y Mesas</h1>
          <p class="mt-1 text-sm text-slate-500">Gestión y distribución de mesas por ambiente operativo.</p>
        </div>
        <div class="flex gap-2">
          <button @click="showRoomModal = true" class="px-4 py-2 bg-slate-800 text-white font-medium text-xs rounded-lg hover:bg-slate-900 transition-colors shadow-sm">
            + Nuevo Salón
          </button>
          <button :disabled="!selectedRoomId" @click="showTableModal = true" class="px-4 py-2 bg-blue-600 text-white font-medium text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
            + Nueva Mesa
          </button>
        </div>
      </div>

      <!-- Pestañas de Salones -->
      <div class="flex border-b border-slate-200 gap-2">
        <button
          v-for="room in rooms"
          :key="room.id"
          @click="selectedRoomId = room.id"
          :class="[
            'px-4 py-2.5 font-semibold text-xs rounded-t-lg transition-colors',
            selectedRoomId === room.id
              ? 'bg-white border-x border-t border-slate-200 text-blue-600'
              : 'text-slate-500 hover:text-slate-700'
          ]"
        >
          🏛️ {{ room.name }} ({{ room.tables ? room.tables.length : 0 }})
        </button>
      </div>

      <!-- Indicador de Carga -->
      <div v-if="isLoading" class="p-8 text-center text-sm text-slate-500 bg-white rounded-xl border border-slate-200">
        Cargando salones y mesas...
      </div>

      <!-- Grid de Mesas del Salón Seleccionado -->
      <div v-else-if="rooms.length > 0 && selectedRoomId" class="space-y-4">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div
            v-for="table in rooms.find(r => r.id === selectedRoomId)?.tables"
            :key="table.id"
            @click="handleTableClick(table)"
            :class="[
              'p-4 rounded-xl border-2 flex flex-col justify-between items-center h-32 cursor-pointer transition-all shadow-sm bg-white hover:scale-105',
              table.status === 'AVAILABLE' ? 'border-emerald-300 hover:border-emerald-500' : '',
              table.status === 'OCCUPIED' ? 'border-rose-300 hover:border-rose-500' : '',
              table.status === 'RESERVED' ? 'border-amber-300 hover:border-amber-500' : '',
              table.status === 'BILL_PRINTED' ? 'border-blue-300 hover:border-blue-500' : ''
            ]"
          >
            <div class="flex justify-between w-full text-xs font-semibold">
              <span class="text-slate-400">Mesa</span>
              <span class="text-slate-500">👤 {{ table.capacity }}</span>
            </div>
            <div class="text-2xl font-black text-slate-800">{{ table.tableNumber }}</div>
            <span
              :class="[
                'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                table.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' : '',
                table.status === 'OCCUPIED' ? 'bg-rose-100 text-rose-700' : '',
                table.status === 'RESERVED' ? 'bg-amber-100 text-amber-700' : '',
                table.status === 'BILL_PRINTED' ? 'bg-blue-100 text-blue-700' : ''
              ]"
            >
              {{ table.status }}
            </span>
          </div>
        </div>

        <!-- Sin mesas en el salón -->
        <div v-if="!rooms.find(r => r.id === selectedRoomId)?.tables?.length" class="p-8 text-center text-sm text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
          Este salón no tiene mesas asignadas. Haz clic en <strong>+ Nueva Mesa</strong> para agregar una.
        </div>
      </div>

      <!-- Empty State (Sin Salones) -->
      <div v-else class="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300 space-y-3">
        <div class="text-4xl">🍽️</div>
        <h3 class="font-bold text-slate-700">No hay salones creados</h3>
        <p class="text-xs text-slate-500">Comienza registrando tu primer salón (ej: Terraza, Salón Principal) para distribuir tus mesas.</p>
        <button @click="showRoomModal = true" class="px-4 py-2 bg-blue-600 text-white font-semibold text-xs rounded-lg hover:bg-blue-700 transition-colors">
          + Crear Primer Salón
        </button>
      </div>

      <!-- Modal Acciones de Mesa -->
      <div v-if="showTableActionModal && selectedTable" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div class="bg-white rounded-xl p-6 w-80 space-y-4 shadow-xl border border-slate-100">
          <div class="flex justify-between items-center border-b pb-2">
            <h3 class="font-bold text-base text-slate-800">Mesa {{ selectedTable.tableNumber }}</h3>
            <span class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">{{ selectedTable.status }}</span>
          </div>

          <div class="flex flex-col gap-2">
            <button
              v-if="selectedTable.status === 'AVAILABLE'"
              @click="openTable"
              class="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors"
            >
              🔓 Ocupar Mesa
            </button>
            <button
              v-if="selectedTable.status === 'OCCUPIED'"
              @click="goToOrder(selectedTable.id)"
              class="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              📝 Tomar Pedido / Ver Pedido
            </button>
            <button
              v-if="selectedTable.status === 'OCCUPIED'"
              @click="goToPos(selectedTable.id)"
              class="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              🛒 Ir al POS / Cargar Orden
            </button>

            <button
              v-if="selectedTable.status === 'OCCUPIED'"
              @click="printBill"
              class="w-full py-2 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition-colors"
            >
              🧾 Imprimir Precuenta
            </button>

            <button
              v-if="selectedTable.status !== 'AVAILABLE'"
              @click="releaseTable"
              class="w-full py-2 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors"
            >
              🧹 Liberar Mesa (Manual)
            </button>
          </div>

          <div class="flex justify-end pt-2 border-t">
            <button @click="showTableActionModal = false" class="px-3 py-1.5 text-slate-500 text-xs font-medium">Cerrar</button>
          </div>
        </div>
      </div>

      <!-- Modales de Creación -->
      <div v-if="showRoomModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div class="bg-white rounded-xl p-6 w-96 space-y-4 shadow-xl border border-slate-100">
          <h3 class="font-bold text-base text-slate-800">Crear Nuevo Salón</h3>
          <input v-model="newRoomName" placeholder="Nombre del Salón (ej: Terraza)" class="w-full border border-slate-300 rounded-lg p-2 text-xs focus:border-blue-500 focus:outline-none" />
          <div class="flex justify-end gap-2">
            <button @click="showRoomModal = false" class="px-3 py-1.5 text-slate-500 text-xs font-medium">Cancelar</button>
            <button @click="createRoom" class="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">Guardar</button>
          </div>
        </div>
      </div>

      <div v-if="showTableModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div class="bg-white rounded-xl p-6 w-96 space-y-4 shadow-xl border border-slate-100">
          <h3 class="font-bold text-base text-slate-800">Crear Nueva Mesa</h3>
          <input v-model="newTableNumber" placeholder="Número o Código (ej: M-01)" class="w-full border border-slate-300 rounded-lg p-2 text-xs focus:border-blue-500 focus:outline-none" />
          <input v-model.number="newTableCapacity" type="number" placeholder="Capacidad" class="w-full border border-slate-300 rounded-lg p-2 text-xs focus:border-blue-500 focus:outline-none" />
          <div class="flex justify-end gap-2">
            <button @click="showTableModal = false" class="px-3 py-1.5 text-slate-500 text-xs font-medium">Cancelar</button>
            <button @click="createTable" class="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
