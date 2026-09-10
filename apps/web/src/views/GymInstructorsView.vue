<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

// Control de pestañas
type TabType = 'instructors' | 'shifts' | 'settlement';
const activeTab = ref<TabType>('instructors');

// Estados generales
const instructors = ref<any[]>([]);
const schedules = ref<any[]>([]);
const loading = ref(false);
const loadingReport = ref(false);

// Filtros directorio de instructores
const searchQuery = ref('');
const statusFilter = ref<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

// Modales
const showInstructorModal = ref(false);
const isEditingInstructor = ref(false);
const currentInstructorId = ref<string | null>(null);

const showShiftModal = ref(false);
const isEditingShift = ref(false);
const currentShiftId = ref<string | null>(null);

// Formulario de Instructor
const instructorForm = ref({
  firstName: '',
  lastName: '',
  identification: '',
  phoneNumber: '',
  email: '',
  specialty: '',
  businessType: 'GYM',
  paymentModel: 'FIXED_PER_CLASS',
  fixedClassRate: 0,
  perStudentRate: 0,
  isActive: true,
  organizationId: '',
  branchId: ''
});

// Formulario de Turno / Horario de Sala
const shiftForm = ref({
  name: '',
  dayOfWeek: 1, // Lunes
  startTime: '06:00',
  endTime: '12:00',
  instructorId: '',
  notes: '',
  organizationId: '',
  branchId: ''
});

// Asignación rápida / Reemplazo de turno
const assignment = ref({
  gymScheduleId: '',
  instructorId: '',
  shiftDate: '',
  notes: ''
});

// Reporte de liquidación
const today = new Date().toISOString().slice(0, 10);
const reportFilters = ref({
  instructorId: '',
  startDate: today.slice(0, 8) + '01',
  endDate: today
});
const settlementReport = ref<any>(null);

const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const orgId = computed(() => authStore.user?.organizationId || authStore.currentOrganization?.id);
const branchId = computed(() => authStore.currentBranch?.id);

const formatCurrency = (value: number | string) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
};

const getFullName = (item: any) => {
  if (!item) return 'Sin asignar';
  return [item.firstName, item.lastName].filter(Boolean).join(' ');
};

// Cargar instructores de gimnasio
const fetchInstructors = async () => {
  if (!orgId.value) return;
  loading.value = true;
  try {
    const params = {
      organizationId: orgId.value,
      ...(branchId.value ? { branchId: branchId.value } : {}),
      businessType: 'GYM'
    };
    const { data } = await api.get('/instructors', { params });
    instructors.value = Array.isArray(data) ? data : (data.items || data.data || []);
  } catch (error) {
    console.error('Error fetching gym instructors:', error);
  } finally {
    loading.value = false;
  }
};

// Cargar turnos semanales de gimnasio
const fetchSchedules = async () => {
  if (!orgId.value) return;
  try {
    const params = {
      organizationId: orgId.value,
      ...(branchId.value ? { branchId: branchId.value } : {})
    };
    const { data } = await api.get('/gym-schedules', { params });
    schedules.value = Array.isArray(data) ? data : (data.items || data.data || []);
  } catch (error) {
    console.error('Error fetching gym schedules:', error);
  }
};

const filteredInstructors = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return instructors.value.filter((i) => {
    const fullName = getFullName(i).toLowerCase();
    const idNum = (i.identification || '').toLowerCase();
    const spec = (i.specialty || '').toLowerCase();
    const email = (i.email || '').toLowerCase();
    const matchesQuery = !query || fullName.includes(query) || idNum.includes(query) || spec.includes(query) || email.includes(query);

    if (statusFilter.value === 'ACTIVE') return matchesQuery && i.isActive !== false;
    if (statusFilter.value === 'INACTIVE') return matchesQuery && i.isActive === false;
    return matchesQuery;
  });
});

const metrics = computed(() => {
  const total = instructors.value.length;
  const active = instructors.value.filter((i) => i.isActive !== false).length;
  const specialties = new Set(instructors.value.map((i) => i.specialty).filter(Boolean)).size;
  return { total, active, specialties };
});

// Modal Instructor
const openCreateInstructorModal = () => {
  isEditingInstructor.value = false;
  currentInstructorId.value = null;
  instructorForm.value = {
    firstName: '',
    lastName: '',
    identification: '',
    phoneNumber: '',
    email: '',
    specialty: '',
    businessType: 'GYM',
    paymentModel: 'FIXED_PER_CLASS',
    fixedClassRate: 0,
    perStudentRate: 0,
    isActive: true,
    organizationId: orgId.value || '',
    branchId: branchId.value || ''
  };
  showInstructorModal.value = true;
};

const openEditInstructorModal = (instructor: any) => {
  isEditingInstructor.value = true;
  currentInstructorId.value = instructor.id;
  instructorForm.value = {
    firstName: instructor.firstName || '',
    lastName: instructor.lastName || '',
    identification: instructor.identification || '',
    phoneNumber: instructor.phoneNumber || '',
    email: instructor.email || '',
    specialty: instructor.specialty || '',
    businessType: instructor.businessType || 'GYM',
    paymentModel: instructor.paymentModel || 'FIXED_PER_CLASS',
    fixedClassRate: Number(instructor.fixedClassRate) || 0,
    perStudentRate: Number(instructor.perStudentRate) || 0,
    isActive: instructor.isActive !== false,
    organizationId: instructor.organizationId || orgId.value || '',
    branchId: instructor.branchId || branchId.value || ''
  };
  showInstructorModal.value = true;
};

const saveInstructor = async () => {
  if (!instructorForm.value.firstName || !instructorForm.value.identification) {
    alert('Por favor completa el nombre y la identificación del instructor.');
    return;
  }

  try {
    instructorForm.value.organizationId = orgId.value || '';
    instructorForm.value.branchId = branchId.value || '';

    if (isEditingInstructor.value && currentInstructorId.value) {
      await api.patch(`/instructors/${currentInstructorId.value}`, instructorForm.value, {
        params: { organizationId: orgId.value }
      });
    } else {
      await api.post('/instructors', instructorForm.value);
    }
    showInstructorModal.value = false;
    fetchInstructors();
  } catch (error: any) {
    console.error('Error saving instructor:', error);
    const msg = error.response?.data?.message || 'Error al guardar el instructor';
    alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
};

const toggleInstructorStatus = async (instructor: any) => {
  const newStatus = !instructor.isActive;
  const actionText = newStatus ? 'activar' : 'desactivar';
  if (confirm(`¿Deseas ${actionText} a ${getFullName(instructor)}?`)) {
    try {
      await api.patch(`/instructors/${instructor.id}`, { isActive: newStatus }, {
        params: { organizationId: orgId.value }
      });
      fetchInstructors();
    } catch (error) {
      console.error('Error toggling instructor status:', error);
    }
  }
};

// Modal Turno de Sala
const openCreateShiftModal = () => {
  isEditingShift.value = false;
  currentShiftId.value = null;
  shiftForm.value = {
    name: '',
    dayOfWeek: 1,
    startTime: '06:00',
    endTime: '12:00',
    instructorId: '',
    notes: '',
    organizationId: orgId.value || '',
    branchId: branchId.value || ''
  };
  showShiftModal.value = true;
};

const openEditShiftModal = (schedule: any) => {
  isEditingShift.value = true;
  currentShiftId.value = schedule.id;
  shiftForm.value = {
    name: schedule.name || '',
    dayOfWeek: schedule.dayOfWeek ?? 1,
    startTime: schedule.startTime || '06:00',
    endTime: schedule.endTime || '12:00',
    instructorId: schedule.instructorId || '',
    notes: schedule.notes || '',
    organizationId: schedule.organizationId || orgId.value || '',
    branchId: schedule.branchId || branchId.value || ''
  };
  showShiftModal.value = true;
};

const saveShift = async () => {
  if (!shiftForm.value.name || !shiftForm.value.startTime || !shiftForm.value.endTime) {
    alert('Por favor completa el nombre del turno, hora de inicio y hora de fin.');
    return;
  }

  try {
    shiftForm.value.organizationId = orgId.value || '';
    shiftForm.value.branchId = branchId.value || '';

    if (isEditingShift.value && currentShiftId.value) {
      await api.patch(`/gym-schedules/${currentShiftId.value}`, shiftForm.value, {
        params: { organizationId: orgId.value }
      });
    } else {
      await api.post('/gym-schedules', shiftForm.value);
    }
    showShiftModal.value = false;
    fetchSchedules();
  } catch (error: any) {
    console.error('Error saving shift:', error);
    const msg = error.response?.data?.message || 'Error al guardar el turno';
    alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
};

const deleteShift = async (id: string) => {
  if (confirm('¿Estás seguro de desactivar este turno de sala?')) {
    try {
      await api.delete(`/gym-schedules/${id}`, {
        params: { organizationId: orgId.value }
      });
      fetchSchedules();
    } catch (error) {
      console.error('Error deleting shift:', error);
    }
  }
};

// Asignación rápida / Reemplazo
const saveAssignment = async () => {
  if (!assignment.value.gymScheduleId || !assignment.value.instructorId) {
    alert('Selecciona el turno y el instructor.');
    return;
  }

  try {
    if (assignment.value.shiftDate) {
      // Reemplazo para fecha puntual
      await api.post('/gym-schedules/overrides', {
        ...assignment.value,
        organizationId: orgId.value
      });
    } else {
      // Asignación recurrente fija del horario
      await api.patch(`/gym-schedules/${assignment.value.gymScheduleId}`, {
        instructorId: assignment.value.instructorId
      }, {
        params: { organizationId: orgId.value }
      });
    }
    assignment.value = { gymScheduleId: '', instructorId: '', shiftDate: '', notes: '' };
    fetchSchedules();
    alert('Asignación guardada correctamente.');
  } catch (error: any) {
    console.error('Error assigning instructor:', error);
    alert('Error al guardar la asignación.');
  }
};

// Generar reporte de liquidación
const generateSettlementReport = async () => {
  if (!orgId.value) return;
  loadingReport.value = true;
  try {
    const params = {
      organizationId: orgId.value,
      ...(branchId.value ? { branchId: branchId.value } : {}),
      ...reportFilters.value
    };
    const { data } = await api.get('/gym-schedules/settlement/report', { params });
    settlementReport.value = data;
  } catch (error) {
    console.error('Error generating settlement report:', error);
    alert('Error al generar la liquidación.');
  } finally {
    loadingReport.value = false;
  }
};

onMounted(() => {
  fetchInstructors();
  fetchSchedules();
});
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- HEADER CON ACCIÓN Y TABS -->
      <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-5">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-2xl">🏋️</span>
              <h1 class="text-2xl font-black text-slate-900 tracking-tight">Instructores y Turnos de Gimnasio</h1>
            </div>
            <p class="text-sm text-slate-500 mt-1">
              Administra entrenadores de sala, asignación de turnos y liquidación por afluencia de check-in.
            </p>
          </div>

          <!-- Botones de Acción según pestaña -->
          <div class="flex items-center gap-2">
            <button
              v-if="activeTab === 'instructors'"
              @click="openCreateInstructorModal"
              class="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all duration-200 text-sm gap-2 cursor-pointer"
            >
              <span>➕</span> Nuevo Instructor
            </button>
            <button
              v-else-if="activeTab === 'shifts'"
              @click="openCreateShiftModal"
              class="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all duration-200 text-sm gap-2 cursor-pointer"
            >
              <span>➕</span> Nuevo Turno de Sala
            </button>
          </div>
        </div>

        <!-- SELECTOR DE PESTAÑAS (TABS) -->
        <div class="flex border-b border-slate-100 space-x-1 sm:space-x-3 overflow-x-auto">
          <button
            @click="activeTab = 'instructors'"
            class="pb-3 px-3 text-sm font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap"
            :class="activeTab === 'instructors' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'"
          >
            🧑‍🏫 Directorio de Entrenadores ({{ instructors.length }})
          </button>
          <button
            @click="activeTab = 'shifts'"
            class="pb-3 px-3 text-sm font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap"
            :class="activeTab === 'shifts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'"
          >
            🕒 Turnos y Horarios de Sala ({{ schedules.length }})
          </button>
          <button
            @click="activeTab = 'settlement'"
            class="pb-3 px-3 text-sm font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap"
            :class="activeTab === 'settlement' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'"
          >
            💰 Liquidación por Afluencia
          </button>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- PESTAÑA 1: DIRECTORIO DE ENTRENADORES -->
      <!-- ========================================================================= -->
      <div v-show="activeTab === 'instructors'" class="space-y-6">
        <!-- KPI METRICS -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">
              👥
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Total Entrenadores Gym</p>
              <p class="text-2xl font-black text-slate-900">{{ metrics.total }}</p>
            </div>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
              ✅
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Instructores Activos</p>
              <p class="text-2xl font-black text-slate-900">{{ metrics.active }}</p>
            </div>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold">
              🎯
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Especialidades</p>
              <p class="text-2xl font-black text-slate-900">{{ metrics.specialties }}</p>
            </div>
          </div>
        </div>

        <!-- BUSCADOR Y FILTROS -->
        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div class="relative w-full sm:w-80">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar por nombre, cédula o especialidad..."
              class="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
            <span class="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
          </div>

          <div class="flex items-center gap-2 w-full sm:w-auto">
            <button
              @click="statusFilter = 'ALL'"
              class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              :class="statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            >
              Todos ({{ instructors.length }})
            </button>
            <button
              @click="statusFilter = 'ACTIVE'"
              class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              :class="statusFilter === 'ACTIVE' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            >
              Activos ({{ metrics.active }})
            </button>
            <button
              @click="statusFilter = 'INACTIVE'"
              class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              :class="statusFilter === 'INACTIVE' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            >
              Inactivos ({{ instructors.length - metrics.active }})
            </button>
          </div>
        </div>

        <!-- TABLA DE INSTRUCTORES -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-100 text-left">
              <thead class="bg-slate-50/80">
                <tr>
                  <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Instructor</th>
                  <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Identificación</th>
                  <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Especialidad</th>
                  <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contacto</th>
                  <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tarifa / Liquidación</th>
                  <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-sm bg-white">
                <tr v-if="loading">
                  <td colspan="7" class="px-6 py-10 text-center text-slate-400">
                    <div class="inline-flex items-center gap-2">
                      <span class="animate-spin">⏳</span> Cargando instructores...
                    </div>
                  </td>
                </tr>
                <tr v-else-if="filteredInstructors.length === 0">
                  <td colspan="7" class="px-6 py-10 text-center text-slate-400">
                    No se encontraron instructores registrados para el gimnasio.
                  </td>
                </tr>
                <tr
                  v-for="instructor in filteredInstructors"
                  :key="instructor.id"
                  class="hover:bg-slate-50/50 transition-colors"
                >
                  <td class="px-6 py-4 font-semibold text-slate-900">
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs shrink-0">
                        {{ (instructor.firstName?.[0] || 'I').toUpperCase() }}{{ (instructor.lastName?.[0] || '').toUpperCase() }}
                      </div>
                      <div>
                        <p class="font-bold text-slate-900">{{ getFullName(instructor) }}</p>
                        <p v-if="instructor.email" class="text-xs text-slate-400 font-normal">{{ instructor.email }}</p>
                      </div>
                    </div>
                  </td>

                  <td class="px-6 py-4 text-slate-600 font-mono text-xs">
                    {{ instructor.identification }}
                  </td>

                  <td class="px-6 py-4">
                    <span
                      v-if="instructor.specialty"
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100"
                    >
                      {{ instructor.specialty }}
                    </span>
                    <span v-else class="text-xs text-slate-400 italic">No especificada</span>
                  </td>

                  <td class="px-6 py-4 text-slate-600 text-xs">
                    <p v-if="instructor.phoneNumber" class="flex items-center gap-1 font-medium text-slate-700">
                      <span>📱</span> {{ instructor.phoneNumber }}
                    </p>
                    <p v-else class="text-slate-400 italic">Sin teléfono</p>
                  </td>

                  <td class="px-6 py-4 text-slate-700 text-xs font-medium">
                    <div v-if="instructor.paymentModel === 'FIXED_PER_CLASS'">
                      <span class="font-bold text-slate-900">{{ formatCurrency(instructor.fixedClassRate) }}</span>
                      <span class="text-slate-500"> / turno</span>
                    </div>
                    <div v-else-if="instructor.paymentModel === 'PER_STUDENT'">
                      <span class="font-bold text-slate-900">{{ formatCurrency(instructor.perStudentRate) }}</span>
                      <span class="text-slate-500"> / socio en turno</span>
                    </div>
                    <div v-else>
                      <span class="font-bold text-slate-900">{{ formatCurrency(instructor.fixedClassRate) }}</span>
                      <span class="text-slate-500"> base + </span>
                      <span class="font-bold text-slate-900">{{ formatCurrency(instructor.perStudentRate) }}</span>
                      <span class="text-slate-500"> / socio</span>
                    </div>
                  </td>

                  <td class="px-6 py-4">
                    <span
                      :class="instructor.isActive !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'"
                      class="px-2.5 py-1 text-xs font-semibold rounded-full border inline-flex items-center gap-1.5"
                    >
                      <span
                        class="w-1.5 h-1.5 rounded-full"
                        :class="instructor.isActive !== false ? 'bg-emerald-500' : 'bg-rose-500'"
                      ></span>
                      {{ instructor.isActive !== false ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>

                  <td class="px-6 py-4 text-right space-x-2">
                    <button
                      @click="openEditInstructorModal(instructor)"
                      class="font-semibold text-xs px-2.5 py-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      Editar
                    </button>
                    <button
                      @click="toggleInstructorStatus(instructor)"
                      class="font-semibold text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                      :class="instructor.isActive !== false ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'"
                    >
                      {{ instructor.isActive !== false ? 'Desactivar' : 'Activar' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- PESTAÑA 2: TURNOS Y HORARIOS DE SALA -->
      <!-- ========================================================================= -->
      <div v-show="activeTab === 'shifts'" class="space-y-6">
        <!-- ASIGNACIÓN RÁPIDA / REEMPLAZO -->
        <section class="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h2 class="font-bold text-slate-800 mb-1">Asignar Instructor o Suplente a un Turno</h2>
          <p class="text-xs text-slate-500 mb-4">
            Asigna al instructor titular permanente, o ingresa una fecha para registrar una suplencia puntual en sala.
          </p>

          <div class="grid md:grid-cols-4 gap-3">
            <select v-model="assignment.gymScheduleId" class="field">
              <option value="">Selecciona Turno de Sala</option>
              <option v-for="s in schedules" :key="s.id" :value="s.id">
                {{ s.name }} · {{ days[s.dayOfWeek] }} ({{ s.startTime }} - {{ s.endTime }})
              </option>
            </select>

            <select v-model="assignment.instructorId" class="field">
              <option value="">Selecciona Instructor</option>
              <option v-for="i in instructors.filter((x) => x.isActive !== false)" :key="i.id" :value="i.id">
                {{ getFullName(i) }} ({{ i.specialty || 'General' }})
              </option>
            </select>

            <input
              v-model="assignment.shiftDate"
              type="date"
              class="field"
              title="Opcional: Fecha específica para reemplazo"
            />

            <button
              @click="saveAssignment"
              class="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold px-4 py-2.5 cursor-pointer transition-colors"
            >
              Guardar Asignación
            </button>
          </div>

          <div class="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <p class="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-blue-800">
              <strong>Sin fecha:</strong> Asigna al instructor como el titular fijo para todos los turnos semanales de este horario.
            </p>
            <p class="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-amber-800">
              <strong>Con fecha:</strong> Registra un reemplazo puntual; los check-ins de esa franja en esa fecha se le acreditarán al suplente.
            </p>
          </div>
        </section>

        <!-- GRILLA DE TURNOS SEMANALES -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div class="p-5 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 class="font-bold text-slate-800">Turnos Programados en Sala</h2>
              <p class="text-xs text-slate-500 mt-0.5">Configuración de franjas horarias semanales de guardia.</p>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-100 text-left">
              <thead class="bg-slate-50/80">
                <tr>
                  <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Día</th>
                  <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre del Turno</th>
                  <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Horario de Guardia</th>
                  <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Instructor Titular</th>
                  <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reemplazos Próximos</th>
                  <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-sm bg-white">
                <tr v-if="schedules.length === 0">
                  <td colspan="6" class="px-6 py-10 text-center text-slate-400">
                    No hay turnos de sala configurados. Haz clic en <strong>"+ Nuevo Turno de Sala"</strong> arriba.
                  </td>
                </tr>
                <tr v-for="s in schedules" :key="s.id" class="hover:bg-slate-50/50 transition-colors">
                  <td class="px-6 py-4 font-bold text-slate-900">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                      {{ days[s.dayOfWeek] }}
                    </span>
                  </td>

                  <td class="px-6 py-4 font-semibold text-slate-800">
                    {{ s.name }}
                    <p v-if="s.notes" class="text-xs text-slate-400 font-normal">{{ s.notes }}</p>
                  </td>

                  <td class="px-6 py-4 text-slate-700 font-mono text-xs">
                    {{ s.startTime }} – {{ s.endTime }}
                  </td>

                  <td class="px-6 py-4 font-medium text-slate-900">
                    <span v-if="s.instructor" class="inline-flex items-center gap-1.5">
                      <span>🧑‍🏫</span> {{ getFullName(s.instructor) }}
                    </span>
                    <span v-else class="text-xs text-amber-600 italic bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                      Sin titular asignado
                    </span>
                  </td>

                  <td class="px-6 py-4 text-xs">
                    <div v-if="s.shiftInstructors?.length" class="space-y-1">
                      <div
                        v-for="rep in s.shiftInstructors.slice(-2)"
                        :key="rep.id"
                        class="bg-amber-50 text-amber-800 border border-amber-100 rounded px-2 py-0.5 text-[11px]"
                      >
                        {{ rep.shiftDate.slice(0, 10) }}: {{ getFullName(rep.instructor) }}
                      </div>
                    </div>
                    <span v-else class="text-slate-400 text-xs">Ninguno</span>
                  </td>

                  <td class="px-6 py-4 text-right space-x-2">
                    <button
                      @click="openEditShiftModal(s)"
                      class="font-semibold text-xs px-2.5 py-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      Editar
                    </button>
                    <button
                      @click="deleteShift(s.id)"
                      class="font-semibold text-xs px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- PESTAÑA 3: LIQUIDACIÓN POR AFLUENCIA -->
      <!-- ========================================================================= -->
      <div v-show="activeTab === 'settlement'" class="space-y-6">
        <section class="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h2 class="font-bold text-slate-800 mb-1">Generador de Liquidación de Turnos</h2>
          <p class="text-xs text-slate-500 mb-4">
            El sistema cruza cada turno de sala con los ingresos reales registrados en recepción/torniquete para liquidar la base y la afluencia.
          </p>

          <div class="flex flex-wrap gap-3 items-end">
            <div>
              <label class="label">Instructor</label>
              <select v-model="reportFilters.instructorId" class="field min-w-[200px]">
                <option value="">Todos los instructores</option>
                <option v-for="i in instructors" :key="i.id" :value="i.id">
                  {{ getFullName(i) }}
                </option>
              </select>
            </div>

            <div>
              <label class="label">Fecha Desde</label>
              <input v-model="reportFilters.startDate" type="date" class="field" />
            </div>

            <div>
              <label class="label">Fecha Hasta</label>
              <input v-model="reportFilters.endDate" type="date" class="field" />
            </div>

            <button
              @click="generateSettlementReport"
              :disabled="loadingReport"
              class="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all disabled:opacity-50 inline-flex items-center gap-2"
            >
              <span v-if="loadingReport" class="animate-spin">⏳</span>
              <span>{{ loadingReport ? 'Calculando...' : 'Generar Liquidación' }}</span>
            </button>
          </div>

          <!-- RESULTADOS DEL REPORTE -->
          <div v-if="settlementReport" class="mt-6 pt-6 border-t border-slate-100 space-y-4">
            <!-- KPIS DEL REPORTE -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Turnos Cubiertos</p>
                <p class="text-2xl font-black text-slate-900 mt-1">{{ settlementReport.totalShifts }}</p>
              </div>

              <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Socios Asistidos en Sala</p>
                <p class="text-2xl font-black text-blue-600 mt-1">{{ settlementReport.totalAttendees }}</p>
              </div>

              <div class="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                <p class="text-xs font-bold uppercase tracking-wider text-emerald-800">Total Liquidación</p>
                <p class="text-2xl font-black text-emerald-700 mt-1">{{ formatCurrency(settlementReport.totalPayment) }}</p>
              </div>
            </div>

            <!-- TABLA DETALLADA DE TURNOS Y AFLUENCIA -->
            <div class="overflow-x-auto border border-slate-100 rounded-xl mt-4">
              <table class="min-w-full divide-y divide-slate-100 text-left text-sm">
                <thead class="bg-slate-50">
                  <tr>
                    <th class="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Fecha / Turno</th>
                    <th class="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Horario</th>
                    <th class="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Instructor</th>
                    <th class="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Afluencia (Socios)</th>
                    <th class="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Base Fija</th>
                    <th class="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Comisión Socios</th>
                    <th class="px-4 py-3 text-xs font-bold text-slate-500 uppercase font-black text-right">Total Turno</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  <tr v-if="settlementReport.details?.length === 0">
                    <td colspan="7" class="px-4 py-8 text-center text-slate-400">
                      No hubo turnos ni registros de check-in para los filtros seleccionados.
                    </td>
                  </tr>
                  <tr
                    v-for="(row, idx) in settlementReport.details"
                    :key="`${row.scheduleId}-${row.shiftDate}-${idx}`"
                    class="hover:bg-slate-50/50"
                  >
                    <td class="px-4 py-3">
                      <p class="font-bold text-slate-900">{{ row.shiftDate }}</p>
                      <p class="text-xs text-slate-500">{{ row.shiftName }}</p>
                    </td>

                    <td class="px-4 py-3 text-xs font-mono text-slate-600">
                      {{ row.startTime }} - {{ row.endTime }}
                    </td>

                    <td class="px-4 py-3">
                      <span class="font-medium text-slate-800">{{ getFullName(row.instructor) }}</span>
                      <span
                        v-if="row.isReplacement"
                        class="ml-1.5 text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded"
                      >
                        Suplente
                      </span>
                    </td>

                    <td class="px-4 py-3 font-black text-blue-600">
                      {{ row.attendees }} <span class="text-xs font-normal text-slate-400">check-ins</span>
                    </td>

                    <td class="px-4 py-3 text-slate-600">
                      {{ formatCurrency(row.fixedAmount) }}
                    </td>

                    <td class="px-4 py-3 text-slate-600">
                      {{ formatCurrency(row.studentAmount) }}
                    </td>

                    <td class="px-4 py-3 font-black text-slate-900 text-right">
                      {{ formatCurrency(row.total) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <!-- ========================================================================= -->
      <!-- MODAL CREAR / EDITAR INSTRUCTOR -->
      <!-- ========================================================================= -->
      <div v-if="showInstructorModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-xl shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
            <div>
              <h2 class="text-xl font-black text-slate-900">
                {{ isEditingInstructor ? 'Editar Instructor / Entrenador' : 'Nuevo Instructor / Entrenador' }}
              </h2>
              <p class="text-xs text-slate-500 mt-0.5">
                Configura los datos personales y tarifas para turnos o afluencia en el gimnasio.
              </p>
            </div>
            <button @click="showInstructorModal = false" class="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">
              ✕
            </button>
          </div>

          <form @submit.prevent="saveInstructor" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="label">Nombre <span class="text-rose-500">*</span></label>
                <input
                  v-model="instructorForm.firstName"
                  required
                  type="text"
                  placeholder="Ej: Carlos"
                  class="field"
                />
              </div>

              <div>
                <label class="label">Apellido</label>
                <input
                  v-model="instructorForm.lastName"
                  type="text"
                  placeholder="Ej: Ramírez"
                  class="field"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="label">Identificación (DNI / Cédula) <span class="text-rose-500">*</span></label>
                <input
                  v-model="instructorForm.identification"
                  required
                  type="text"
                  placeholder="Ej: 1020304050"
                  class="field"
                />
              </div>

              <div>
                <label class="label">Especialidad</label>
                <input
                  v-model="instructorForm.specialty"
                  type="text"
                  placeholder="Ej: Musculación / Personal Trainer / Funcional"
                  class="field"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="label">Teléfono / WhatsApp</label>
                <input
                  v-model="instructorForm.phoneNumber"
                  type="tel"
                  placeholder="Ej: 3001234567"
                  class="field"
                />
              </div>

              <div>
                <label class="label">Correo Electrónico</label>
                <input
                  v-model="instructorForm.email"
                  type="email"
                  placeholder="Ej: entrenador@gimnasio.com"
                  class="field"
                />
              </div>
            </div>

            <!-- Módulo / Tipo de Negocio -->
            <div class="pt-2 border-t border-slate-100">
              <label class="label">Módulo / Tipo de Negocio</label>
              <select v-model="instructorForm.businessType" class="field">
                <option value="GYM">Gimnasio (Musculación / Pesas / Fitness)</option>
                <option value="STUDIO">Estudio (Yoga / Pilates / Barre)</option>
                <option value="ALL">Ambos (Gimnasio y Estudio)</option>
              </select>
            </div>

            <!-- Esquema de pago -->
            <div class="pt-2 border-t border-slate-100">
              <label class="label">Modelo de Remuneración</label>
              <select v-model="instructorForm.paymentModel" class="field">
                <option value="FIXED_PER_CLASS">Tarifa fija por turno de sala</option>
                <option value="PER_STUDENT">Tarifa por afluencia de socios en su turno</option>
                <option value="HYBRID">Híbrido (Base fija + Comisión por socio en turno)</option>
              </select>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div v-if="instructorForm.paymentModel !== 'PER_STUDENT'">
                <label class="label">Valor base por turno ($ COP)</label>
                <input
                  v-model.number="instructorForm.fixedClassRate"
                  type="number"
                  min="0"
                  placeholder="0"
                  class="field"
                />
              </div>

              <div v-if="instructorForm.paymentModel !== 'FIXED_PER_CLASS'">
                <label class="label">Valor por socio en turno ($ COP)</label>
                <input
                  v-model.number="instructorForm.perStudentRate"
                  type="number"
                  min="0"
                  placeholder="0"
                  class="field"
                />
              </div>
            </div>

            <div class="flex items-center gap-2 pt-2">
              <input
                id="gym-inst-active"
                v-model="instructorForm.isActive"
                type="checkbox"
                class="w-4 h-4 text-blue-600 rounded border-slate-300"
              />
              <label for="gym-inst-active" class="text-xs font-medium text-slate-700 cursor-pointer">
                Instructor habilitado para asignación y operaciones
              </label>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                @click="showInstructorModal = false"
                class="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all cursor-pointer"
              >
                {{ isEditingInstructor ? 'Guardar Cambios' : 'Registrar Instructor' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- MODAL CREAR / EDITAR TURNO DE SALA -->
      <!-- ========================================================================= -->
      <div v-if="showShiftModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-lg shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
            <div>
              <h2 class="text-xl font-black text-slate-900">
                {{ isEditingShift ? 'Editar Turno de Sala' : 'Nuevo Turno de Sala' }}
              </h2>
              <p class="text-xs text-slate-500 mt-0.5">
                Define el horario de guardia para el control de afluencia y liquidación.
              </p>
            </div>
            <button @click="showShiftModal = false" class="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">
              ✕
            </button>
          </div>

          <form @submit.prevent="saveShift" class="space-y-4">
            <div>
              <label class="label">Nombre del Turno <span class="text-rose-500">*</span></label>
              <input
                v-model="shiftForm.name"
                required
                type="text"
                placeholder="Ej: Turno Mañana - Musculación"
                class="field"
              />
            </div>

            <div>
              <label class="label">Día de la Semana <span class="text-rose-500">*</span></label>
              <select v-model.number="shiftForm.dayOfWeek" class="field">
                <option v-for="(dayName, index) in days" :key="index" :value="index">
                  {{ dayName }}
                </option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="label">Hora Inicio <span class="text-rose-500">*</span></label>
                <input
                  v-model="shiftForm.startTime"
                  required
                  type="time"
                  class="field"
                />
              </div>

              <div>
                <label class="label">Hora Fin <span class="text-rose-500">*</span></label>
                <input
                  v-model="shiftForm.endTime"
                  required
                  type="time"
                  class="field"
                />
              </div>
            </div>

            <div>
              <label class="label">Instructor Titular Asignado</label>
              <select v-model="shiftForm.instructorId" class="field">
                <option value="">Sin asignar (asignar después)</option>
                <option v-for="i in instructors.filter((x) => x.isActive !== false)" :key="i.id" :value="i.id">
                  {{ getFullName(i) }} ({{ i.specialty || 'General' }})
                </option>
              </select>
            </div>

            <div>
              <label class="label">Notas / Indicaciones</label>
              <textarea
                v-model="shiftForm.notes"
                rows="2"
                placeholder="Ej: Supervisión zona de pesas libres y máquinas guiadas."
                class="field"
              ></textarea>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                @click="showShiftModal = false"
                class="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all cursor-pointer"
              >
                {{ isEditingShift ? 'Guardar Cambios' : 'Crear Turno' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.field {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 0.55rem 0.75rem;
  font-size: 0.875rem;
  background: white;
  transition: all 0.15s ease-in-out;
}
.field:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}
.label {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 0.35rem;
  letter-spacing: 0.025em;
}
</style>
