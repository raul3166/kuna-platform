<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import AppLayout from '../components/AppLayout.vue';

const authStore = useAuthStore();

// Estados principales
const bookings = ref<any[]>([]);
const schedules = ref<any[]>([]);
const customers = ref<any[]>([]);
const loading = ref(false);
const loadingSubmit = ref(false);

// Modales
const showCreateModal = ref(false);

// Filtros
const filterDate = ref(new Date().toISOString().split('T')[0]);
const filterStatus = ref<string>('ALL');
const filterScheduleId = ref<string>('ALL');

// Búsqueda de clientes dentro del modal
const customerSearch = ref('');
const loadingCustomers = ref(false);

// Validación de Disponibilidad / Cupos
const remainingSpots = ref<number | null>(null);
const checkingSpots = ref(false);

// Formulario de reserva
const initialForm = {
  customerId: '',
  studioScheduleId: '',
  bookingDate: new Date().toISOString().split('T')[0],
};
const form = ref({ ...initialForm });

const instructorLabel = (schedule: any) => {
  const instructor = schedule?.effectiveInstructor || schedule?.instructor;
  if (instructor) return [instructor.firstName, instructor.lastName].filter(Boolean).join(' ');
  return 'Sin instructor recurrente';
};

const selectedSchedule = computed(() =>
  schedules.value.find((schedule) => schedule.id === form.value.studioScheduleId)
);

// Cargar reservas con filtros
const fetchBookings = async () => {
  loading.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    if (!orgId) return;

    const branchId = authStore.currentBranch?.id;

    const params: Record<string, any> = {
      organizationId: orgId,
      ...(branchId ? { branchId } : {}),
      ...(filterDate.value ? { bookingDate: filterDate.value } : {}),
      ...(filterStatus.value !== 'ALL' ? { status: filterStatus.value } : {}),
      ...(filterScheduleId.value !== 'ALL' ? { studioScheduleId: filterScheduleId.value } : {}),
    };

    const { data } = await api.get('/studio-bookings', { params });
    bookings.value = Array.isArray(data) ? data : (data.items || data.data || []);
  } catch (error) {
    console.error('Error al obtener reservas:', error);
  } finally {
    loading.value = false;
  }
};

// Cargar la parrilla de horarios para los dropdowns
const fetchSchedules = async (date?: string) => {
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const branchId = authStore.currentBranch?.id;
    if (!orgId) return;

    const { data } = await api.get('/studio-schedules', {
      params: { organizationId: orgId, ...(branchId ? { branchId } : {}), ...(date ? { date } : {}) },
    });
    schedules.value = Array.isArray(data) ? data : (data.items || data.data || []);
  } catch (error) {
    console.error('Error al cargar horarios:', error);
  }
};

// Validar cupos disponibles en la fecha/horario seleccionados
const checkAvailability = async () => {
  if (!form.value.studioScheduleId || !form.value.bookingDate) {
    remainingSpots.value = null;
    return;
  }

  checkingSpots.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const branchId = authStore.currentBranch?.id;

    const [bookingsRes, attendancesRes] = await Promise.all([
      api.get('/studio-bookings', {
        params: {
          organizationId: orgId,
          ...(branchId ? { branchId } : {}),
          studioScheduleId: form.value.studioScheduleId,
          bookingDate: form.value.bookingDate,
          status: 'CONFIRMED',
        },
      }).catch(() => ({ data: [] })),
      api.get('/studio-attendances', {
        params: {
          organizationId: orgId,
          ...(branchId ? { branchId } : {}),
          studioScheduleId: form.value.studioScheduleId,
          date: form.value.bookingDate,
        },
      }).catch(() => ({ data: [] })),
    ]);

    const activeBookings = Array.isArray(bookingsRes.data)
      ? bookingsRes.data
      : (bookingsRes.data.items || bookingsRes.data.data || []);

    const allAttendances = Array.isArray(attendancesRes.data)
      ? attendancesRes.data
      : (attendancesRes.data.items || attendancesRes.data.data || []);

    const allowedAttendances = allAttendances.filter(
      (a: any) => a.status === 'ALLOWED'
    );

    const directAttendances = allowedAttendances.filter((att: any) => {
      return !activeBookings.some((b: any) => b.customerId === att.customerId);
    });

    const totalOccupied = activeBookings.length + directAttendances.length;

    const selectedSchedule = schedules.value.find((s) => s.id === form.value.studioScheduleId);
    const maxCapacity = selectedSchedule?.capacity || 15;

    remainingSpots.value = Math.max(0, maxCapacity - totalOccupied);
  } catch (error) {
    console.error('Error al validar cupos:', error);
    remainingSpots.value = null;
  } finally {
    checkingSpots.value = false;
  }
};

// Buscar clientes para el selector del modal
const searchCustomers = async () => {
  if (!customerSearch.value || customerSearch.value.length < 2) return;
  loadingCustomers.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const { data } = await api.get('/customers', {
      params: { organizationId: orgId, search: customerSearch.value },
    });
    customers.value = Array.isArray(data) ? data : (data.items || data.data || []);
  } catch (error) {
    console.error('Error buscando clientes:', error);
  } finally {
    loadingCustomers.value = false;
  }
};

// Guardar nueva reserva
const saveBooking = async () => {
  if (remainingSpots.value !== null && remainingSpots.value <= 0) {
    alert('No hay cupos disponibles para la fecha u horario seleccionado.');
    return;
  }

  loadingSubmit.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const branchId = authStore.currentBranch?.id;

    const payload = {
      ...form.value,
      organizationId: orgId,
      branchId: branchId,
    };

    await api.post('/studio-bookings', payload);
    showCreateModal.value = false;
    form.value = { ...initialForm };
    customerSearch.value = '';
    fetchBookings();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al procesar la reserva');
  } finally {
    loadingSubmit.value = false;
  }
};

// Cancelar reserva
const cancelBooking = async (id: string) => {
  if (!confirm('¿Deseas cancelar esta reserva?')) return;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    await api.patch(`/studio-bookings/${id}/cancel`, null, {
      params: { organizationId: orgId },
    });
    fetchBookings();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al cancelar la reserva');
  }
};

// Filtrar las clases que corresponden al día de la semana de la fecha seleccionada
const availableSchedulesForSelectedDate = computed(() => {
  if (!form.value.bookingDate) return [];

  const [year, month, day] = form.value.bookingDate.split('-').map(Number);
  if (!year || !month || !day) return [];

  const selectedDate = new Date(year, month - 1, day);
  const dayOfWeek = selectedDate.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado

  return schedules.value.filter((sch) => sch.dayOfWeek === dayOfWeek);
});

// Métodos auxiliares
const openCreateModal = async () => {
  const selectedDateStr = filterDate.value || new Date().toISOString().split('T')[0];
  form.value = {
    customerId: '',
    studioScheduleId: '',
    bookingDate: selectedDateStr,
  };

  await fetchSchedules(selectedDateStr);

  // Seleccionar la primera clase válida para la fecha elegida
  if (availableSchedulesForSelectedDate.value.length > 0) {
    form.value.studioScheduleId = availableSchedulesForSelectedDate.value[0].id;
  }

  showCreateModal.value = true;
  checkAvailability();
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'CONFIRMED':
      return { text: 'Confirmada', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'CANCELLED':
      return { text: 'Cancelada', class: 'bg-rose-50 text-rose-700 border-rose-200' };
    default:
      return { text: status, class: 'bg-slate-50 text-slate-700 border-slate-200' };
  }
};

// Escuchar cambios de filtros principales de la tabla
watch([filterDate, filterStatus, filterScheduleId], () => {
  fetchBookings();
});

// Escuchar cambios de fecha dentro del modal para reajustar clases y verificar cupos
watch(() => form.value.bookingDate, async (newDate) => {
  if (!showCreateModal.value || !newDate) return;

  await fetchSchedules(newDate);

  const validSchedules = availableSchedulesForSelectedDate.value;
  const isCurrentScheduleValid = validSchedules.some((s) => s.id === form.value.studioScheduleId);

  // Si la clase previamente seleccionada no corresponde al nuevo día, se auto-selecciona la primera opción
  if (!isCurrentScheduleValid) {
    form.value.studioScheduleId = validSchedules[0]?.id || '';
  }

  checkAvailability();
});

// Escuchar cambios de la clase seleccionada en el modal para revalidar disponibilidad
watch(() => form.value.studioScheduleId, () => {
  if (showCreateModal.value) {
    checkAvailability();
  }
});

onMounted(() => {
  fetchSchedules();
  fetchBookings();
});
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Gestión de Reservas</h1>
          <p class="text-sm text-slate-500 mt-1">Administra y agende cupos para las clases del estudio.</p>
        </div>
        <button
          @click="openCreateModal"
          class="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all text-sm gap-2"
        >
          <span>📌</span> Nueva Reserva
        </button>
      </div>

      <!-- Barra de Filtros -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div>
          <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Fecha de la Clase</label>
          <input
            v-model="filterDate"
            type="date"
            class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Horario / Clase</label>
          <select v-model="filterScheduleId" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
            <option value="ALL">Todas las clases</option>
            <option v-for="sch in schedules" :key="sch.id" :value="sch.id">
              {{ sch.className }} ({{ sch.startTime }} - {{ sch.endTime }})
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Estado</label>
          <select v-model="filterStatus" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
            <option value="ALL">Todos los estados</option>
            <option value="CONFIRMED">Confirmadas</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
        </div>
      </div>

      <!-- Tabla de Reservas -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div v-if="loading" class="p-12 text-center text-slate-400">
          Cargando reservas...
        </div>

        <div v-else-if="bookings.length === 0" class="p-12 text-center text-slate-400 space-y-2">
          <span class="text-4xl block">📅</span>
          <p class="text-sm font-medium">No se encontraron reservas para esta selección.</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50/70 border-b border-slate-100 text-xs uppercase font-bold text-slate-500">
              <tr>
                <th class="px-6 py-3.5">Cliente</th>
                <th class="px-6 py-3.5">Clase</th>
                <th class="px-6 py-3.5">Fecha y Hora</th>
                <th class="px-6 py-3.5">Estado</th>
                <th class="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="b in bookings" :key="b.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <p class="font-bold text-slate-900">{{ b.customer?.firstName }} {{ b.customer?.lastName || '' }}</p>
                  <p class="text-xs text-slate-400">Doc: {{ b.customer?.identificationNumber || 'N/A' }}</p>
                </td>
                <td class="px-6 py-4">
                  <p class="font-semibold text-slate-800">{{ b.schedule?.className }}</p>
                  <p class="text-xs text-slate-400">Profesora/or: {{ instructorLabel(b.schedule) }}</p>
                </td>
                <td class="px-6 py-4">
                  <p class="font-medium text-slate-800">
                    {{ new Date(b.bookingDate).toLocaleDateString('es-ES', { timeZone: 'UTC' }) }}
                  </p>
                  <p class="text-xs text-slate-500">🕒 {{ b.schedule?.startTime }} - {{ b.schedule?.endTime }}</p>
                </td>
                <td class="px-6 py-4">
                  <span
                    :class="getStatusBadge(b.status).class"
                    class="px-2.5 py-1 rounded-lg text-xs font-bold border inline-block"
                  >
                    {{ getStatusBadge(b.status).text }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                  <button
                    v-if="b.status === 'CONFIRMED'"
                    @click="cancelBooking(b.id)"
                    class="text-xs font-bold text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <span v-else class="text-xs text-slate-300 italic">Sin acciones</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal Nueva Reserva -->
      <div v-if="showCreateModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
          <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 class="text-lg font-bold text-slate-900">Agendar Nueva Reserva</h3>
            <button @click="showCreateModal = false" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
          </div>

          <form @submit.prevent="saveBooking" class="p-6 space-y-4">
            <!-- Buscar Cliente -->
            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Buscar Cliente</label>
              <div class="flex gap-2">
                <input
                  v-model="customerSearch"
                  type="text"
                  placeholder="Nombre o identificación..."
                  @keyup.enter="searchCustomers"
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  @click="searchCustomers"
                  class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Buscar
                </button>
              </div>

              <!-- Selector de Cliente encuestado -->
              <div v-if="customers.length > 0" class="mt-2">
                <select v-model="form.customerId" required class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
                  <option value="" disabled>-- Selecciona un cliente --</option>
                  <option v-for="c in customers" :key="c.id" :value="c.id">
                    {{ c.firstName }} {{ c.lastName }} ({{ c.identificationNumber }})
                  </option>
                </select>
              </div>
              <p v-else-if="loadingCustomers" class="text-xs text-slate-400 mt-1">Buscando...</p>
            </div>

            <!-- Seleccionar Fecha primero -->
            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Fecha de la Reserva</label>
              <input
                v-model="form.bookingDate"
                type="date"
                required
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <!-- Seleccionar Clase/Horario disponible para ese día -->
            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Clase Disponible</label>
              <select
                v-model="form.studioScheduleId"
                required
                :disabled="availableSchedulesForSelectedDate.length === 0"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="" disabled>
                  {{ availableSchedulesForSelectedDate.length > 0 ? '-- Selecciona una clase --' : 'No hay clases programadas para este día' }}
                </option>
                <option v-for="sch in availableSchedulesForSelectedDate" :key="sch.id" :value="sch.id">
                  {{ sch.className }} ({{ sch.startTime }} - {{ sch.endTime }}) · {{ instructorLabel(sch) }}
                </option>
              </select>
              <div v-if="selectedSchedule" class="mt-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-800">
                Instructor asignado: <strong>{{ instructorLabel(selectedSchedule) }}</strong>
              </div>
              <p v-if="availableSchedulesForSelectedDate.length === 0" class="text-xs text-rose-500 mt-1 font-medium">
                ⚠️ No existen clases recurrentes configuradas para este día de la semana.
              </p>
            </div>

            <!-- Indicador de Disponibilidad / Cupos -->
            <div
              v-if="form.studioScheduleId && form.bookingDate"
              class="p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors"
              :class="[
                checkingSpots
                  ? 'bg-slate-50 border-slate-200 text-slate-600'
                  : (remainingSpots !== null && remainingSpots > 0)
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
              ]"
            >
              <span v-if="checkingSpots" class="flex items-center gap-1.5">
                ⏳ Verificando disponibilidad de cupos...
              </span>
              <template v-else-if="remainingSpots !== null">
                <span v-if="remainingSpots > 0">
                  🟢 Cupos disponibles: <strong>{{ remainingSpots }}</strong>
                </span>
                <span v-else>
                  🔴 Clase llena. No quedan cupos para esta fecha.
                </span>
              </template>
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
                :disabled="loadingSubmit || !form.customerId || checkingSpots || (remainingSpots !== null && remainingSpots <= 0)"
                class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-all"
              >
                {{ loadingSubmit ? 'Procesando...' : 'Confirmar Reserva' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
