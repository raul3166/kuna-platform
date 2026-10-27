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
const classBookings = ref<any[]>([]);
const classAttendances = ref<any[]>([]);
const selectedCustomerIds = ref<string[]>([]);
const loadingRoster = ref(false);
const runningBulk = ref(false);
const checkingInCustomerId = ref<string | null>(null);
const checkInResult = ref<any | null>(null);
const loading = ref(false);

// Buscador rápido por nombre para alumnos que llegaron sin reserva previa
const walkInSearch = ref('');
const walkInResults = ref<any[]>([]);
const searchingWalkIn = ref(false);

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
  loadClassRoster();
};

const loadClassRoster = async () => {
  const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
  const branchId = authStore.currentBranch?.id;
  if (!orgId || !selectedScheduleId.value || !selectedDate.value) {
    classBookings.value = [];
    classAttendances.value = [];
    selectedCustomerIds.value = [];
    return;
  }

  loadingRoster.value = true;
  try {
    const [bookingsRes, attendancesRes] = await Promise.all([
      api.get('/studio-bookings', {
        params: {
          organizationId: orgId,
          ...(branchId ? { branchId } : {}),
          studioScheduleId: selectedScheduleId.value,
          bookingDate: selectedDate.value,
          status: 'CONFIRMED',
        },
      }).catch(() => ({ data: [] })),
      api.get('/studio-attendances', {
        params: {
          organizationId: orgId,
          ...(branchId ? { branchId } : {}),
          studioScheduleId: selectedScheduleId.value,
          date: selectedDate.value,
        },
      }).catch(() => ({ data: [] })),
    ]);

    classBookings.value = Array.isArray(bookingsRes.data)
      ? bookingsRes.data
      : (bookingsRes.data.items || bookingsRes.data.data || []);

    classAttendances.value = Array.isArray(attendancesRes.data)
      ? attendancesRes.data
      : (attendancesRes.data.items || attendancesRes.data.data || []);

    selectedCustomerIds.value = selectedCustomerIds.value.filter(
      (id) => !isCustomerAttended(id)
    );
  } catch (error) {
    console.error('Error al cargar lista de clase:', error);
  } finally {
    loadingRoster.value = false;
  }
};

const isCustomerAttended = (customerId: string) => {
  return classAttendances.value.some(
    (a) => a.customerId === customerId && a.status === 'ALLOWED'
  );
};

const getCustomerAttendanceLog = (customerId: string) => {
  return classAttendances.value.find(
    (a) => a.customerId === customerId && a.status === 'ALLOWED'
  );
};

const pendingBookings = computed(() =>
  classBookings.value.filter((b) => !isCustomerAttended(b.customerId))
);

const toggleSelectAllPending = () => {
  if (selectedCustomerIds.value.length === pendingBookings.value.length) {
    selectedCustomerIds.value = [];
  } else {
    selectedCustomerIds.value = pendingBookings.value.map((b) => b.customerId);
  }
};

const markStudentAttendance = async (customer: { id: string; identificationNumber?: string; firstName?: string; lastName?: string }) => {
  checkingInCustomerId.value = customer.id;
  checkInResult.value = null;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const branchId = authStore.currentBranch?.id;

    const { data } = await api.post('/studio-attendances/check-in', {
      customerId: customer.id,
      documentNumber: customer.identificationNumber || undefined,
      organizationId: orgId,
      branchId: branchId || undefined,
      studioScheduleId: selectedScheduleId.value || undefined,
      date: selectedDate.value,
    });

    checkInResult.value = data;
    await Promise.all([loadClassRoster(), fetchRecentLogs()]);
  } catch (error: any) {
    const serverMsg = error.response?.data?.message;
    checkInResult.value = {
      status: 'DENIED',
      reason: Array.isArray(serverMsg) ? serverMsg.join(', ') : (serverMsg || 'Error al registrar asistencia'),
    };
  } finally {
    checkingInCustomerId.value = null;
  }
};

const runBulkAttendance = async () => {
  if (selectedCustomerIds.value.length === 0) return;
  runningBulk.value = true;
  checkInResult.value = null;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const branchId = authStore.currentBranch?.id;
    let allowedCount = 0;
    let deniedReasons: string[] = [];

    for (const custId of [...selectedCustomerIds.value]) {
      const booking = classBookings.value.find((b) => b.customerId === custId);
      try {
        const { data } = await api.post('/studio-attendances/check-in', {
          customerId: custId,
          documentNumber: booking?.customer?.identificationNumber || undefined,
          organizationId: orgId,
          branchId: branchId || undefined,
          studioScheduleId: selectedScheduleId.value || undefined,
          date: selectedDate.value,
        });
        if (data?.status === 'ALLOWED') {
          allowedCount++;
        } else {
          deniedReasons.push(`${booking?.customer?.firstName || 'Alumno'}: ${data?.reason || 'Sin tiquetera activa'}`);
        }
      } catch (e: any) {
        deniedReasons.push(`${booking?.customer?.firstName || 'Alumno'}: ${e?.response?.data?.message || 'Error'}`);
      }
    }

    selectedCustomerIds.value = [];
    await Promise.all([loadClassRoster(), fetchRecentLogs()]);

    if (deniedReasons.length === 0) {
      checkInResult.value = {
        status: 'ALLOWED',
        customer: { firstName: `${allowedCount} alumno(s)`, lastName: 'registrados en la clase' },
      };
    } else {
      checkInResult.value = {
        status: allowedCount > 0 ? 'ALLOWED' : 'DENIED',
        customer: { firstName: `${allowedCount} presentes`, lastName: '' },
        reason: `Novedades: ${deniedReasons.join(' | ')}`,
      };
    }
  } finally {
    runningBulk.value = false;
  }
};

const searchWalkInCustomers = async () => {
  if (!walkInSearch.value || walkInSearch.value.trim().length < 2) {
    walkInResults.value = [];
    return;
  }
  searchingWalkIn.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const { data } = await api.get('/customers', {
      params: { organizationId: orgId, search: walkInSearch.value.trim() },
    });
    walkInResults.value = Array.isArray(data) ? data : (data.items || data.data || []);
  } catch (error) {
    console.error('Error buscando alumnos:', error);
  } finally {
    searchingWalkIn.value = false;
  }
};

watch(selectedDate, () => {
  autoSelectScheduleForDate();
});

watch(selectedScheduleId, () => {
  loadClassRoster();
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
      branchId: branchId || undefined,
      studioScheduleId: selectedScheduleId.value || undefined,
      date: selectedDate.value
    });

    checkInResult.value = data;
    searchQuery.value = '';
    await Promise.all([loadClassRoster(), fetchRecentLogs()]);
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
              <h3 class="text-lg font-bold text-emerald-900">¡Asistencia Registrada!</h3>
              <p class="text-sm text-emerald-700">
                Alumno: <strong>{{ checkInResult.customer?.firstName }} {{ checkInResult.customer?.lastName }}</strong>
              </p>
              <p v-if="checkInResult.remainingClasses !== undefined && checkInResult.remainingClasses !== null" class="text-xs font-semibold text-emerald-800 mt-0.5">
                Clases restantes en tiquetera: {{ checkInResult.remainingClasses }}
              </p>
              <p v-if="checkInResult.reason && checkInResult.reason !== 'Ingreso autorizado'" class="text-xs text-amber-800 mt-1 font-medium">
                {{ checkInResult.reason }}
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

      <!-- Llamado a Lista de la Clase Seleccionada (Para el Instructor en Sala) -->
      <div v-if="selectedScheduleId" class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>📋</span> Lista de Clase (Correr Asistencia)
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">
              Selecciona las personas que llegaron a la clase o marca su ingreso individualmente.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-if="pendingBookings.length > 0"
              type="button"
              @click="toggleSelectAllPending"
              class="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
            >
              {{ selectedCustomerIds.length === pendingBookings.length ? 'Deseleccionar todos' : 'Seleccionar pendientes' }}
            </button>
            <button
              v-if="selectedCustomerIds.length > 0"
              type="button"
              :disabled="runningBulk"
              @click="runBulkAttendance"
              class="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
            >
              {{ runningBulk ? 'Procesando...' : `✅ Correr Asistencia (${selectedCustomerIds.length})` }}
            </button>
          </div>
        </div>

        <div class="p-6 space-y-5">
          <div v-if="loadingRoster" class="py-6 text-center text-slate-400 text-sm">
            Cargando alumnos inscritos en la clase...
          </div>

          <div v-else-if="classBookings.length === 0" class="py-6 text-center text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
            <p class="text-xs font-medium">No hay reservas previas registradas para esta clase.</p>
            <p class="text-[11px] text-slate-400 mt-0.5">Usa el buscador de abajo para registrar a los alumnos que llegaron.</p>
          </div>

          <div v-else class="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
            <div
              v-for="booking in classBookings"
              :key="booking.id"
              :class="isCustomerAttended(booking.customerId) ? 'bg-emerald-50/40' : 'bg-white hover:bg-slate-50/70'"
              class="flex items-center justify-between gap-3 px-4 py-3 transition-colors"
            >
              <label class="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                <input
                  v-if="!isCustomerAttended(booking.customerId)"
                  v-model="selectedCustomerIds"
                  :value="booking.customerId"
                  type="checkbox"
                  class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span v-else class="text-emerald-600 text-base">✅</span>
                <div class="min-w-0">
                  <p class="text-sm font-bold text-slate-900 truncate">
                    {{ booking.customer?.firstName }} {{ booking.customer?.lastName || '' }}
                  </p>
                  <p class="text-xs text-slate-500">
                    Cédula: {{ booking.customer?.identificationNumber || 'S/D' }}
                    <span v-if="booking.customer?.phoneNumber"> · 📞 {{ booking.customer.phoneNumber }}</span>
                  </p>
                </div>
              </label>

              <div class="shrink-0">
                <span
                  v-if="isCustomerAttended(booking.customerId)"
                  class="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800"
                >
                  Presente ({{ formatTime(getCustomerAttendanceLog(booking.customerId)?.checkInAt) }})
                </span>
                <button
                  v-else
                  type="button"
                  :disabled="checkingInCustomerId === booking.customerId"
                  @click="markStudentAttendance({ id: booking.customerId, identificationNumber: booking.customer?.identificationNumber, firstName: booking.customer?.firstName, lastName: booking.customer?.lastName })"
                  class="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                >
                  {{ checkingInCustomerId === booking.customerId ? 'Marcando...' : '✅ Asistió' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Buscador rápido por nombre si llegó un alumno sin reserva previa -->
          <div class="pt-3 border-t border-slate-100">
            <label class="block text-xs font-bold uppercase text-slate-500 mb-2">
              ➕ ¿Llegó un alumno sin reserva previa? Búscalo por nombre o cédula:
            </label>
            <div class="flex gap-2">
              <input
                v-model="walkInSearch"
                @input="searchWalkInCustomers"
                type="text"
                placeholder="Escribe el nombre o cédula del alumno..."
                class="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div v-if="walkInResults.length > 0" class="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50 max-h-48 overflow-y-auto">
              <div
                v-for="cust in walkInResults"
                :key="cust.id"
                class="flex items-center justify-between px-3.5 py-2.5 text-xs"
              >
                <div>
                  <span class="font-bold text-slate-900">{{ cust.firstName }} {{ cust.lastName || '' }}</span>
                  <span class="text-slate-500 ml-2">Doc: {{ cust.identificationNumber || 'S/D' }}</span>
                </div>
                <span
                  v-if="isCustomerAttended(cust.id)"
                  class="text-emerald-700 font-bold"
                >
                  ✅ Ya registrado en esta clase
                </span>
                <button
                  v-else
                  type="button"
                  :disabled="checkingInCustomerId === cust.id"
                  @click="markStudentAttendance(cust)"
                  class="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 font-bold transition-colors"
                >
                  ✅ Marcar Asistencia
                </button>
              </div>
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
