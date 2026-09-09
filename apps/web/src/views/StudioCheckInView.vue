<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import AppLayout from '../components/AppLayout.vue';

const authStore = useAuthStore();
const searchQuery = ref('');
const selectedDate = ref<string>(new Date().toISOString().split('T')[0]);
const selectedScheduleId = ref<string>('');
const schedules = ref<any[]>([]);
const logs = ref<any[]>([]);
const checkInResult = ref<any | null>(null);
const loading = ref(false);

// Cargar los horarios creados para la sede
const fetchSchedules = async () => {
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const branchId = authStore.currentBranch?.id;
    if (!orgId) return;

    const { data } = await api.get('/studio-schedules', {
      params: { organizationId: orgId, ...(branchId ? { branchId } : {}) }
    });

    schedules.value = Array.isArray(data) ? data : (data.items || data.data || []);
    autoSelectScheduleForDate();
  } catch (error) {
    console.error('Error al cargar horarios:', error);
  }
};

// Clases filtradas EXCLUSIVAMENTE por el día de la semana de la fecha seleccionada
const schedulesForSelectedDate = computed(() => {
  if (!selectedDate.value) return [];
  const [year, month, day] = selectedDate.value.split('-').map(Number);
  if (!year || !month || !day) return [];

  const dateObj = new Date(year, month - 1, day);
  const dayOfWeek = dateObj.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado

  return schedules.value.filter(s => s.dayOfWeek === dayOfWeek);
});

// Ajustar o seleccionar la primera clase disponible al cambiar de fecha
const autoSelectScheduleForDate = () => {
  const validSchedules = schedulesForSelectedDate.value;
  const isCurrentScheduleValid = validSchedules.some(s => s.id === selectedScheduleId.value);

  if (!isCurrentScheduleValid) {
    selectedScheduleId.value = validSchedules[0]?.id || '';
  }
};

watch(selectedDate, () => {
  autoSelectScheduleForDate();
});

const processCheckIn = async () => {
  if (!searchQuery.value.trim()) return;
  loading.value = true;
  checkInResult.value = null;

  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const branchId = authStore.currentBranch?.id;

    const { data } = await api.post('/studio-attendances/check-in', {
      documentNumber: String(searchQuery.value).trim(),
      organizationId: orgId,
      branchId: branchId,
      studioScheduleId: selectedScheduleId.value || undefined,
      date: selectedDate.value
    });

    checkInResult.value = data;
    searchQuery.value = '';
    fetchRecentLogs();
  } catch (error: any) {
    const serverMsg = error.response?.data?.message;
    let formattedReason = 'Error al procesar el ingreso';

    if (Array.isArray(serverMsg)) {
      formattedReason = serverMsg.join(', ');
    } else if (typeof serverMsg === 'string') {
      formattedReason = serverMsg;
    }

    checkInResult.value = {
      status: 'DENIED',
      reason: formattedReason
    };
  } finally {
    loading.value = false;
  }
};

const fetchRecentLogs = async () => {
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    if (!orgId) return;

    const { data } = await api.get('/studio-attendances', {
      params: { organizationId: orgId, limit: 15 }
    });

    logs.value = Array.isArray(data) ? data : (data.items || data.data || []);
  } catch (error) {
    console.error('Error al cargar historial de ingresos:', error);
  }
};

const formatTime = (dateString?: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

onMounted(() => {
  fetchSchedules();
  fetchRecentLogs();
});
</script>

<template>
  <AppLayout>
    <div class="space-y-6 max-w-5xl mx-auto">
      <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center space-y-4">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-600 text-2xl font-bold">
          🧘‍♀️
        </div>
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Terminal Check-In Estudio</h1>
          <p class="text-sm text-slate-500">Selecciona la fecha, clase e ingresa la cédula o código del alumno.</p>
        </div>

        <form @submit.prevent="processCheckIn" class="max-w-md mx-auto space-y-3 pt-2 text-left">

          <!-- Seleccionar Fecha -->
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Fecha del Ingreso</label>
            <input
              v-model="selectedDate"
              type="date"
              required
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <!-- Selector de Clase Filtrado por la Fecha -->
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Clase Programada</label>
            <select
              v-model="selectedScheduleId"
              :disabled="schedulesForSelectedDate.length === 0"
              class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">
                {{ schedulesForSelectedDate.length > 0 ? '-- Selecciona una clase (opcional) --' : 'No hay clases programadas para este día' }}
              </option>
              <option v-for="sch in schedulesForSelectedDate" :key="sch.id" :value="sch.id">
                {{ sch.className }} ({{ sch.startTime }} - {{ sch.endTime }})
              </option>
            </select>

            <p v-if="schedulesForSelectedDate.length === 0" class="text-xs text-rose-500 mt-1 font-medium">
              ⚠️ No existen clases programadas para este día de la semana.
            </p>
          </div>

          <!-- Input Cédula / Código -->
          <div class="flex gap-2 pt-1">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cédula, Documento o Código..."
              autofocus
              required
              class="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
            />
            <button
              type="submit"
              :disabled="loading"
              class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl shadow-sm transition-all duration-200 text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <span>🚪</span> Check-In
            </button>
          </div>
        </form>
      </div>

      <!-- Alerta de Resultado Check-In -->
      <div v-if="checkInResult" class="transition-all duration-300">
        <div
          v-if="checkInResult.status === 'ALLOWED'"
          class="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between"
        >
          <div class="flex items-center gap-4">
            <span class="text-4xl">✅</span>
            <div>
              <h3 class="text-lg font-bold text-emerald-900">¡Acceso Permitido!</h3>
              <p class="text-sm text-emerald-700">
                Alumno: <strong>{{ checkInResult.customer?.firstName }} {{ checkInResult.customer?.lastName }}</strong>
              </p>
              <p v-if="checkInResult.remainingClasses !== undefined && checkInResult.remainingClasses !== null" class="text-xs font-semibold text-emerald-800 mt-0.5">
                Clases restantes en tiquetera: {{ checkInResult.remainingClasses }}
              </p>
            </div>
          </div>
          <span class="text-xs font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900 px-3 py-1 rounded-full">
            {{ checkInResult.checkInAt ? formatTime(checkInResult.checkInAt) : 'Ahora' }}
          </span>
        </div>

        <div
          v-else
          class="p-6 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between"
        >
          <div class="flex items-center gap-4">
            <span class="text-4xl">🚫</span>
            <div>
              <h3 class="text-lg font-bold text-rose-900">Acceso Denegado</h3>
              <p class="text-sm text-rose-700">{{ checkInResult.reason || 'Sin suscripción o tiquetera válida.' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabla de Ingresos Recientes -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wider">Historial de Asistencia Reciente</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-100 text-left">
            <thead class="bg-slate-50/75">
              <tr>
                <th class="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Hora</th>
                <th class="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Alumno</th>
                <th class="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Clase</th>
                <th class="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Resultado</th>
                <th class="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Detalle / Motivo</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm bg-white">
              <tr v-for="log in logs" :key="log.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4 font-mono text-xs text-slate-600">{{ formatTime(log.checkInAt) }}</td>
                <td class="px-6 py-4 font-semibold text-slate-900">
                  {{ log.customer ? `${log.customer.firstName} ${log.customer.lastName || ''}` : 'Desconocido' }}
                </td>
                <td class="px-6 py-4 font-medium text-slate-700">
                  <span v-if="log.schedule" class="px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs border border-purple-100">
                    🧘 {{ log.schedule.className }}
                  </span>
                  <span v-else class="text-xs text-slate-400">General</span>
                </td>
                <td class="px-6 py-4">
                  <span
                    :class="log.status === 'ALLOWED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'"
                    class="px-2.5 py-1 text-xs font-semibold rounded-full border inline-flex items-center gap-1.5"
                  >
                    {{ log.status === 'ALLOWED' ? 'Permitido' : 'Denegado' }}
                  </span>
                </td>
                <td class="px-6 py-4 text-xs text-slate-500">
                  {{ log.reason || (log.status === 'ALLOWED' ? 'Suscripción/Tiquetera Activa' : '-') }}
                </td>
              </tr>
              <tr v-if="logs.length === 0">
                <td colspan="5" class="px-6 py-8 text-center text-slate-400 text-sm">
                  No hay asistencias registradas.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
