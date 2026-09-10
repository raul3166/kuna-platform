<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import AppLayout from '../components/AppLayout.vue';

const authStore = useAuthStore();
const schedules = ref<any[]>([]);
const loading = ref(false);
const showModal = ref(false);
const editingId = ref<string | null>(null);
const activeDayFilter = ref<number | 'ALL'>('ALL');

// Estado para el Modal de Asistentes
const showAttendeesModal = ref(false);
const selectedSchedule = ref<any>(null);
const attendeesList = ref<any[]>([]);
const loadingAttendees = ref(false);
const selectedDate = ref(new Date().toISOString().split('T')[0]);

const initialForm = {
  className: '',
  instructorName: '',
  dayOfWeek: 1, // 1: Lunes, ..., 0: Domingo
  startTime: '09:00',
  endTime: '10:00',
  capacity: 15,
  notes: '',
};

const form = ref({ ...initialForm });

const daysOfWeek = [
  { id: 1, name: 'Lunes' },
  { id: 2, name: 'Martes' },
  { id: 3, name: 'Miércoles' },
  { id: 4, name: 'Jueves' },
  { id: 5, name: 'Viernes' },
  { id: 6, name: 'Sábado' },
  { id: 0, name: 'Domingo' }
];

const fetchSchedules = async () => {
  loading.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    if (!orgId) return;

    const branchId = authStore.currentBranch?.id;

    const { data } = await api.get('/studio-schedules', {
      params: {
        organizationId: orgId,
        ...(branchId ? { branchId } : {})
      }
    });

    schedules.value = Array.isArray(data) ? data : (data.items || data.data || []);
  } catch (error) {
    console.error('Error al cargar la parrilla de horarios:', error);
  } finally {
    loading.value = false;
  }
};

const openModal = (scheduleToEdit: any = null) => {
  if (scheduleToEdit) {
    editingId.value = scheduleToEdit.id;
    form.value = {
      className: scheduleToEdit.className,
      instructorName: scheduleToEdit.instructorName || '',
      dayOfWeek: scheduleToEdit.dayOfWeek,
      startTime: scheduleToEdit.startTime,
      endTime: scheduleToEdit.endTime,
      capacity: scheduleToEdit.capacity,
      notes: scheduleToEdit.notes || '',
    };
  } else {
    editingId.value = null;
    form.value = { ...initialForm };
  }
  showModal.value = true;
};

const saveSchedule = async () => {
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const branchId = authStore.currentBranch?.id;

    const payload: Record<string, any> = {
      ...form.value,
      organizationId: orgId,
    };

    if (branchId) {
      payload.branchId = branchId;
    }

    if (editingId.value) {
      await api.patch(`/studio-schedules/${editingId.value}`, payload);
    } else {
      await api.post('/studio-schedules', payload);
    }

    showModal.value = false;
    fetchSchedules();
  } catch (error) {
    console.error('Error al guardar el horario:', error);
  }
};

const deleteSchedule = async (id: string) => {
  if (confirm('¿Deseas eliminar este horario programado?')) {
    try {
      await api.delete(`/studio-schedules/${id}`);
      fetchSchedules();
    } catch (error) {
      console.error('Error al eliminar el horario:', error);
    }
  }
};

// --- Gestión de Asistentes ---
const openAttendeesModal = async (schedule: any) => {
  selectedSchedule.value = schedule;
  showAttendeesModal.value = true;
  await loadAttendees();
};

const loadAttendees = async () => {
  if (!selectedSchedule.value) return;
  loadingAttendees.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const branchId = authStore.currentBranch?.id;

    const { data } = await api.get('/studio-attendances', {
      params: {
        organizationId: orgId,
        ...(branchId ? { branchId } : {}),
        studioScheduleId: selectedSchedule.value.id,
        date: selectedDate.value,
      },
    });

    attendeesList.value = Array.isArray(data) ? data : (data.items || data.data || []);
  } catch (error) {
    console.error('Error al obtener la lista de asistentes:', error);
  } finally {
    loadingAttendees.value = false;
  }
};

const filteredSchedules = computed(() => {
  if (activeDayFilter.value === 'ALL') return schedules.value;
  return schedules.value.filter(s => s.dayOfWeek === activeDayFilter.value);
});

const getDayName = (dayNumber: number) => {
  return daysOfWeek.find(d => d.id === dayNumber)?.name || '-';
};

const getInstructorName = (schedule: any) => {
  if (schedule.instructor) {
    return [schedule.instructor.firstName, schedule.instructor.lastName]
      .filter(Boolean)
      .join(' ');
  }
  return 'Por asignar';
};

onMounted(() => {
  fetchSchedules();
});
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Parrilla de Horarios</h1>
          <p class="text-sm text-slate-500 mt-1">Configura las clases recurrentes para habilitar reservas futuras.</p>
        </div>
        <button
          @click="openModal()"
          class="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all text-sm gap-2"
        >
          <span>⏰</span> Crear Horario
        </button>
      </div>

      <!-- Filtro por Día -->
      <div class="flex gap-2 overflow-x-auto pb-2">
        <button
          @click="activeDayFilter = 'ALL'"
          :class="activeDayFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'"
          class="px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
        >
          Todos los días
        </button>
        <button
          v-for="day in daysOfWeek"
          :key="day.id"
          @click="activeDayFilter = day.id"
          :class="activeDayFilter === day.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'"
          class="px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
        >
          {{ day.name }}
        </button>
      </div>

      <!-- Cuadrícula de Clases -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="sch in filteredSchedules"
          :key="sch.id"
          @click="openModal(sch)"
          class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3 relative hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div class="flex justify-between items-start">
            <span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
              🗓️ {{ getDayName(sch.dayOfWeek) }}
            </span>
            <button
              @click.stop="deleteSchedule(sch.id)"
              class="text-slate-400 hover:text-rose-600 text-sm p-1 rounded-lg hover:bg-rose-50 transition-colors"
            >
              🗑️
            </button>
          </div>

          <div>
            <h3 class="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors">{{ sch.className }}</h3>
            <p class="text-xs text-slate-500 font-medium">Instructor: {{ getInstructorName(sch) }}</p>
          </div>

          <div class="flex items-center gap-4 text-xs font-semibold text-slate-700 bg-slate-50 p-2.5 rounded-xl">
            <span class="inline-flex items-center gap-1">
              🕒 {{ sch.startTime }} - {{ sch.endTime }}
            </span>
            <span class="inline-flex items-center gap-1 text-purple-700">
              👥 {{ sch.capacity || 15 }} cupos
            </span>
          </div>

          <!-- Pie de tarjeta: Notas y Botón para ver Asistentes -->
          <div class="flex justify-between items-center pt-2 border-t border-slate-100 mt-2">
            <p v-if="sch.notes" class="text-xs text-slate-400 italic truncate max-w-[140px]">
              * {{ sch.notes }}
            </p>
            <span v-else></span>

            <button
              @click.stop="openAttendeesModal(sch)"
              class="text-xs font-bold text-blue-600 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 border border-blue-100"
            >
              👥 Ver Asistentes
            </button>
          </div>
        </div>
      </div>

      <div v-if="filteredSchedules.length === 0 && !loading" class="bg-white p-12 rounded-2xl border border-slate-100 text-center text-slate-400">
        <span class="text-4xl block mb-2">🧘‍♀️</span>
        <p class="text-sm font-medium">No hay horarios programados para esta selección.</p>
      </div>

      <!-- Modal Crear / Editar Horario -->
      <div v-if="showModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
          <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 class="text-lg font-bold text-slate-900">
              {{ editingId ? 'Editar Horario' : 'Nuevo Horario de Clase' }}
            </h3>
            <button @click="showModal = false" class="text-slate-400 hover:text-slate-600">✕</button>
          </div>

          <form @submit.prevent="saveSchedule" class="p-6 space-y-4">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Nombre de la Clase</label>
              <input v-model="form.className" placeholder="Ej: Hatha Yoga / Vinyasa" required class="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Día de la Semana</label>
              <select v-model.number="form.dayOfWeek" required class="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm bg-white">
                <option v-for="d in daysOfWeek" :key="d.id" :value="d.id">{{ d.name }}</option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Hora Inicio</label>
                <input v-model="form.startTime" type="time" required class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Hora Fin</label>
                <input v-model="form.endTime" type="time" required class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Instructor</label>
                <input v-model="form.instructorName" placeholder="Nombre" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Cupo Máximo</label>
                <input v-model.number="form.capacity" type="number" min="1" required class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Notas / Reglas (Opcional)</label>
              <input v-model="form.notes" placeholder="Ej: Llegada máxima 7:00 am" class="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm" />
            </div>

            <div class="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button type="button" @click="showModal = false" class="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold">Cancelar</button>
              <button type="submit" class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
                {{ editingId ? 'Actualizar' : 'Guardar Clase' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Ver Asistentes -->
      <div v-if="showAttendeesModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100">
          <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div>
              <h3 class="text-lg font-bold text-slate-900">
                Asistentes: {{ selectedSchedule?.className }}
              </h3>
              <p class="text-xs text-slate-500">
                {{ getDayName(selectedSchedule?.dayOfWeek) }} | {{ selectedSchedule?.startTime }} - {{ selectedSchedule?.endTime }}
              </p>
            </div>
            <button @click="showAttendeesModal = false" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
          </div>

          <div class="p-6 space-y-4">
            <!-- Filtro de Fecha -->
            <div class="flex items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <label class="text-xs font-bold uppercase text-slate-500">Fecha del Check-In:</label>
              <input
                v-model="selectedDate"
                type="date"
                @change="loadAttendees"
                class="rounded-lg border border-slate-200 px-3 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <!-- Lista de Asistentes -->
            <div v-if="loadingAttendees" class="py-8 text-center text-slate-400 text-sm">
              Cargando asistentes...
            </div>

            <div v-else-if="attendeesList.length === 0" class="py-8 text-center text-slate-400">
              <span class="text-3xl block mb-1">📋</span>
              <p class="text-xs font-medium">No hay registrados para esta fecha.</p>
            </div>

            <div v-else class="max-h-64 overflow-y-auto space-y-2 pr-1">
              <div
                v-for="att in attendeesList"
                :key="att.id"
                class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div class="space-y-0.5">
                  <p class="text-sm font-bold text-slate-800">
                    {{ att.customer?.firstName }} {{ att.customer?.lastName || '' }}
                  </p>
                  <p class="text-xs text-slate-500">
                    Doc: {{ att.customer?.identificationNumber || 'N/A' }} • {{ att.subscription?.plan?.name || 'Pase directo' }}
                  </p>
                </div>
                <div class="text-right">
                  <span
                    :class="att.status === 'ALLOWED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'"
                    class="inline-block text-[10px] font-black px-2 py-0.5 rounded-full uppercase"
                  >
                    {{ att.status === 'ALLOWED' ? 'Permitido' : 'Denegado' }}
                  </span>
                  <p class="text-[11px] font-mono text-slate-400 mt-0.5">
                    {{ new Date(att.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-between items-center px-6 py-3 bg-slate-50 border-t border-slate-100">
            <span class="text-xs font-semibold text-slate-500">
              Total: {{ attendeesList.length }} / {{ selectedSchedule?.capacity || 15 }} cupos
            </span>
            <button @click="showAttendeesModal = false" class="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
