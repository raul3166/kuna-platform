<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import AppLayout from '../components/AppLayout.vue';

const authStore = useAuthStore();

// Estados principales
const rooms = ref<any[]>([]);
const loading = ref(false);
const loadingSubmit = ref(false);

// Modales
const showCreateModal = ref(false);
const editingRoomId = ref<string | null>(null);

// Filtros
const filterStatus = ref<string>('ALL');
const filterType = ref<string>('ALL');

// Formulario de habitación
const initialForm = {
  number: '',
  type: 'STANDARD',
  capacity: 2,
  pricePerNight: 120000,
  description: '',
  status: 'AVAILABLE',
};
const form = ref({ ...initialForm });

// Tipos de habitación disponibles
const roomTypes = [
  { value: 'SINGLE', label: 'Sencilla' },
  { value: 'STANDARD', label: 'Estándar' },
  { value: 'DOUBLE', label: 'Doble' },
  { value: 'SUITE', label: 'Suite' },
  { value: 'PENTHOUSE', label: 'Penthouse' },
];

// Métricas KPI
const kpiStats = computed(() => {
  const total = rooms.value.length;
  const available = rooms.value.filter(r => r.status === 'AVAILABLE').length;
  const occupied = rooms.value.filter(r => r.status === 'OCCUPIED').length;
  const cleaning = rooms.value.filter(r => r.status === 'CLEANING').length;
  const maintenance = rooms.value.filter(r => r.status === 'MAINTENANCE' || r.status === 'OUT_OF_ORDER').length;
  return { total, available, occupied, cleaning, maintenance };
});

const formatCurrency = (val: number | string | null) => {
  const num = Number(val || 0);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(num);
};

// Cargar habitaciones con filtros
const fetchRooms = async () => {
  loading.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    if (!orgId) return;

    const branchId = authStore.currentBranch?.id;

    const params: Record<string, any> = {
      organizationId: orgId,
      ...(branchId ? { branchId } : {}),
      ...(filterStatus.value !== 'ALL' ? { status: filterStatus.value } : {}),
      ...(filterType.value !== 'ALL' ? { roomType: filterType.value } : {}),
    };

    const { data } = await api.get('/hotel-rooms', { params });
    rooms.value = Array.isArray(data) ? data : (data.items || data.data || []);
  } catch (error) {
    console.error('Error al obtener habitaciones:', error);
  } finally {
    loading.value = false;
  }
};

// Abrir modal de creación
const openCreateModal = () => {
  editingRoomId.value = null;
  form.value = { ...initialForm };
  showCreateModal.value = true;
};

// Abrir modal de edición
const openEditModal = (room: any) => {
  editingRoomId.value = room.id;
  form.value = {
    number: room.roomNumber,
    type: room.roomType || 'STANDARD',
    capacity: room.capacity || 2,
    pricePerNight: room.pricePerNight ? Number(room.pricePerNight) : 120000,
    description: room.description || '',
    status: room.status || 'AVAILABLE',
  };
  showCreateModal.value = true;
};

// Guardar / Actualizar habitación
const saveRoom = async () => {
  loadingSubmit.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const branchId = authStore.currentBranch?.id;

    const payload = {
      organizationId: orgId,
      branchId: branchId,
      roomNumber: form.value.number,
      roomType: form.value.type,
      capacity: Number(form.value.capacity),
      pricePerNight: Number(form.value.pricePerNight),
      description: form.value.description,
      status: form.value.status,
    };

    if (editingRoomId.value) {
      await api.patch(`/hotel-rooms/${editingRoomId.value}`, payload, {
        params: { organizationId: orgId },
      });
    } else {
      await api.post('/hotel-rooms', payload);
    }

    showCreateModal.value = false;
    form.value = { ...initialForm };
    editingRoomId.value = null;
    fetchRooms();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al guardar la habitación. Verifica los datos.');
    console.error('Error de validación:', error?.response?.data);
  } finally {
    loadingSubmit.value = false;
  }
};

// Eliminar habitación
const deleteRoom = async (id: string, roomNumber: string) => {
  if (!confirm(`¿Estás seguro de eliminar la habitación ${roomNumber}? Esta acción no se puede deshacer.`)) return;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    await api.delete(`/hotel-rooms/${id}`, {
      params: { organizationId: orgId },
    });
    fetchRooms();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'No se pudo eliminar la habitación.');
  }
};

// Cambiar estado rápidamente (Housekeeping & Mantenimiento)
const updateRoomStatus = async (id: string, newStatus: string) => {
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    await api.patch(`/hotel-rooms/${id}/status`, { status: newStatus }, {
      params: { organizationId: orgId },
    });
    fetchRooms();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al actualizar el estado');
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'AVAILABLE':
      return { text: 'Disponible', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'OCCUPIED':
      return { text: 'Ocupada', class: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'MAINTENANCE':
      return { text: 'Mantenimiento', class: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'OUT_OF_ORDER':
      return { text: 'Fuera de Servicio', class: 'bg-rose-50 text-rose-700 border-rose-200' };
    case 'CLEANING':
      return { text: 'En Limpieza', class: 'bg-purple-50 text-purple-700 border-purple-200' };
    default:
      return { text: status, class: 'bg-slate-50 text-slate-700 border-slate-200' };
  }
};

const getTypeLabel = (type: string) => {
  return roomTypes.find(t => t.value === type)?.label || type;
};

// Escuchar cambios de filtros
watch([filterStatus, filterType], () => {
  fetchRooms();
});

onMounted(() => {
  fetchRooms();
});
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Inventario de Habitaciones</h1>
          <p class="text-sm text-slate-500 mt-1">Administra la capacidad, tarifas y el estado de limpieza/mantenimiento de tus habitaciones.</p>
        </div>
        <button
          @click="openCreateModal"
          class="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all text-sm gap-2"
        >
          <span>🛏️</span> Nueva Habitación
        </button>
      </div>

      <!-- Tarjetas KPI -->
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
          <span class="text-xs uppercase font-bold text-slate-400 block">Total</span>
          <span class="text-2xl font-black text-slate-800">{{ kpiStats.total }}</span>
        </div>
        <div class="bg-white p-4 rounded-xl border border-emerald-100 bg-emerald-50/20 shadow-sm text-center">
          <span class="text-xs uppercase font-bold text-emerald-600 block">Disponibles</span>
          <span class="text-2xl font-black text-emerald-700">{{ kpiStats.available }}</span>
        </div>
        <div class="bg-white p-4 rounded-xl border border-blue-100 bg-blue-50/20 shadow-sm text-center">
          <span class="text-xs uppercase font-bold text-blue-600 block">Ocupadas</span>
          <span class="text-2xl font-black text-blue-700">{{ kpiStats.occupied }}</span>
        </div>
        <div class="bg-white p-4 rounded-xl border border-purple-100 bg-purple-50/20 shadow-sm text-center">
          <span class="text-xs uppercase font-bold text-purple-600 block">En Limpieza</span>
          <span class="text-2xl font-black text-purple-700">{{ kpiStats.cleaning }}</span>
        </div>
        <div class="bg-white p-4 rounded-xl border border-amber-100 bg-amber-50/20 shadow-sm text-center col-span-2 sm:col-span-1">
          <span class="text-xs uppercase font-bold text-amber-600 block">Mantenimiento</span>
          <span class="text-2xl font-black text-amber-700">{{ kpiStats.maintenance }}</span>
        </div>
      </div>

      <!-- Barra de Filtros -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Tipo de Habitación</label>
          <select v-model="filterType" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
            <option value="ALL">Todos los tipos</option>
            <option v-for="t in roomTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Estado actual</label>
          <select v-model="filterStatus" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
            <option value="ALL">Todos los estados</option>
            <option value="AVAILABLE">Disponibles</option>
            <option value="OCCUPIED">Ocupadas</option>
            <option value="CLEANING">En Limpieza</option>
            <option value="MAINTENANCE">En Mantenimiento</option>
            <option value="OUT_OF_ORDER">Fuera de Servicio</option>
          </select>
        </div>
      </div>

      <!-- Tabla de Habitaciones -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div v-if="loading" class="p-12 text-center text-slate-400">
          Cargando habitaciones...
        </div>

        <div v-else-if="rooms.length === 0" class="p-12 text-center text-slate-400 space-y-2">
          <span class="text-4xl block">🚪</span>
          <p class="text-sm font-medium">No se encontraron habitaciones con la selección actual.</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50/70 border-b border-slate-100 text-xs uppercase font-bold text-slate-500">
              <tr>
                <th class="px-6 py-3.5">Número</th>
                <th class="px-6 py-3.5">Tipo</th>
                <th class="px-6 py-3.5">Capacidad</th>
                <th class="px-6 py-3.5">Tarifa Noche</th>
                <th class="px-6 py-3.5">Estado actual</th>
                <th class="px-6 py-3.5 text-right">Housekeeping / Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="room in rooms" :key="room.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <p class="font-bold text-slate-900 text-base">Habitación {{ room.roomNumber }}</p>
                  <p class="text-xs text-slate-400 truncate max-w-[180px]">{{ room.description || 'Sin descripción' }}</p>
                </td>
                <td class="px-6 py-4">
                  <span class="font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md text-xs">
                    {{ getTypeLabel(room.roomType) }}
                  </span>
                </td>
                <td class="px-6 py-4 font-medium">
                  👤 {{ room.capacity }} {{ room.capacity === 1 ? 'persona' : 'personas' }}
                </td>
                <td class="px-6 py-4 font-bold text-slate-900">
                  {{ formatCurrency(room.pricePerNight) }}
                </td>
                <td class="px-6 py-4">
                  <span
                    :class="getStatusBadge(room.status).class"
                    class="px-2.5 py-1 rounded-lg text-xs font-bold border inline-block"
                  >
                    {{ getStatusBadge(room.status).text }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right space-x-1.5">
                  <!-- Botones de Housekeeping de 1-clic -->
                  <button
                    v-if="room.status === 'CLEANING' || room.status === 'MAINTENANCE' || room.status === 'OUT_OF_ORDER'"
                    @click="updateRoomStatus(room.id, 'AVAILABLE')"
                    title="Marcar Limpia / Disponible"
                    class="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                  >
                    ✔️ Disponible
                  </button>
                  <button
                    v-if="room.status === 'AVAILABLE'"
                    @click="updateRoomStatus(room.id, 'CLEANING')"
                    title="Marcar en Limpieza"
                    class="text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg border border-purple-200 transition-colors"
                  >
                    🧹 Limpieza
                  </button>
                  <button
                    v-if="room.status !== 'MAINTENANCE' && room.status !== 'OCCUPIED'"
                    @click="updateRoomStatus(room.id, 'MAINTENANCE')"
                    title="Marcar Mantenimiento"
                    class="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg border border-amber-200 transition-colors"
                  >
                    🔧 Mantenimiento
                  </button>

                  <!-- Editar -->
                  <button
                    @click="openEditModal(room)"
                    title="Editar Habitación"
                    class="text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg border border-slate-200 transition-colors text-xs font-bold"
                  >
                    ✏️
                  </button>

                  <!-- Eliminar -->
                  <button
                    @click="deleteRoom(room.id, room.roomNumber)"
                    title="Eliminar Habitación"
                    class="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg border border-rose-100 transition-colors text-xs font-bold"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal Crear / Editar Habitación -->
      <div v-if="showCreateModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
          <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 class="text-lg font-bold text-slate-900">
              {{ editingRoomId ? 'Editar Habitación' : 'Crear Habitación' }}
            </h3>
            <button @click="showCreateModal = false" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
          </div>

          <form @submit.prevent="saveRoom" class="p-6 space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <!-- Número -->
              <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Número / ID</label>
                <input
                  v-model="form.number"
                  type="text"
                  required
                  placeholder="Ej: 101, 102A"
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <!-- Capacidad -->
              <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Capacidad Máx.</label>
                <input
                  v-model="form.capacity"
                  type="number"
                  min="1"
                  required
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <!-- Tipo -->
            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Tipo de Habitación</label>
              <select
                v-model="form.type"
                required
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option v-for="t in roomTypes" :key="t.value" :value="t.value">
                  {{ t.label }}
                </option>
              </select>
            </div>

            <!-- Tarifa por Noche -->
            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Precio por Noche (COP)</label>
              <input
                v-model="form.pricePerNight"
                type="number"
                min="0"
                step="1000"
                required
                placeholder="120000"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <!-- Descripción -->
            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Descripción (Opcional)</label>
              <textarea
                v-model="form.description"
                rows="2"
                placeholder="Vista al mar, balcón, cama king..."
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              ></textarea>
            </div>

            <div class="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                @click="showCreateModal = false"
                class="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="loadingSubmit || !form.number"
                class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-all"
              >
                {{ loadingSubmit ? 'Guardando...' : (editingRoomId ? 'Guardar Cambios' : 'Crear Habitación') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
