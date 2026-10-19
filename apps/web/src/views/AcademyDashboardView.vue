<template>
  <AppLayout>
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- Encabezado -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 rounded-full">
              Vertical Academia & Centro Educativo
            </span>
            <span class="text-xs text-slate-400">Reutilizando Core: Estudiantes (Customer), Docentes (ServiceWorker), Libros (Product) y POS</span>
          </div>
          <h1 class="text-2xl font-bold text-slate-900 mt-1">Campus Académico, Grupos, Asistencia & Matrículas</h1>
          <p class="text-sm text-slate-500">
            Control de programas educativos, cohortes/grupos, planilla de asistencia, calificaciones y cobro de matrículas en POS.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button
            @click="loadDashboard"
            class="px-3.5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition"
          >
            ↻ Actualizar Campus
          </button>
          <router-link
            to="/academy-programs"
            class="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-sm"
          >
            🎓 Cursos, Grupos & Matricular
          </router-link>
          <button
            @click="showConfigModal = true"
            class="p-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition"
            title="Parámetros Académicos y Escala de Calificación"
          >
            ⚙️
          </button>
        </div>
      </div>

      <!-- KPIs Académicos -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-bold uppercase text-slate-400">Programas Activos</div>
          <div class="text-2xl font-extrabold text-slate-900 mt-1">{{ kpis.activeCoursesCount }}</div>
          <div class="text-xs text-slate-500 mt-0.5">Cursos en oferta</div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-bold uppercase text-blue-600">Grupos Abiertos</div>
          <div class="text-2xl font-extrabold text-blue-600 mt-1">{{ kpis.activeCohortsCount }}</div>
          <div class="text-xs text-slate-500 mt-0.5">Cohortes en clase</div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-bold uppercase text-indigo-600">Estudiantes Activos</div>
          <div class="text-2xl font-extrabold text-indigo-600 mt-1">{{ kpis.activeEnrollmentsCount }}</div>
          <div class="text-xs text-slate-500 mt-0.5">Matrículas vigentes</div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-bold uppercase text-emerald-600">Asistencia Global</div>
          <div class="text-2xl font-extrabold text-emerald-600 mt-1">{{ kpis.averageAttendancePct }}%</div>
          <div class="text-xs text-slate-500 mt-0.5">Meta mínima: {{ configForm.minAttendancePct }}%</div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-bold uppercase text-amber-600">Por Cobrar en POS</div>
          <div class="text-2xl font-extrabold text-amber-600 mt-1">{{ kpis.pendingBillingEnrollmentsCount }}</div>
          <div class="text-xs text-slate-500 mt-0.5">Matrículas sin recibo</div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-bold uppercase text-slate-700">Ingreso Académico</div>
          <div class="text-xl font-extrabold text-slate-900 mt-1">{{ formatCurrency(kpis.expectedTuitionRevenue) }}</div>
          <div class="text-xs text-slate-500 mt-0.5">Total matrículas activas</div>
        </div>
      </div>

      <!-- Grupos / Cohortes Activos con Toma de Asistencia -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Grupos y Cohortes en Curso</h2>
            <p class="text-xs text-slate-500">Selecciona un grupo para pasar lista de asistencia y registrar notas de sesión.</p>
          </div>
          <router-link
            to="/academy-programs"
            class="text-xs font-bold text-blue-600 hover:text-blue-800 underline"
          >
            + Abrir nuevo grupo o matricular estudiante →
          </router-link>
        </div>

        <div v-if="loading" class="bg-white p-10 rounded-2xl border border-slate-200 text-center text-slate-500">
          Cargando grupos académicos y matrículas...
        </div>

        <div
          v-else-if="activeCohorts.length === 0"
          class="bg-white p-10 rounded-2xl border border-slate-200 text-center space-y-2"
        >
          <div class="text-3xl">🎓</div>
          <div class="font-bold text-slate-800">No hay grupos o cohortes abiertos actualmente</div>
          <p class="text-xs text-slate-500">Crea un programa académico y abre tu primer grupo desde la consola de Oferta Académica.</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="cohort in activeCohorts"
            :key="cohort.id"
            class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between space-y-4"
          >
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  {{ cohort.code }}
                </span>
                <span class="text-xs font-semibold text-slate-500">
                  📍 {{ cohort.classroom || 'Aula Principal' }}
                </span>
              </div>

              <div>
                <h3 class="text-base font-bold text-slate-900">{{ cohort.name }}</h3>
                <p class="text-xs text-blue-700 font-semibold">
                  {{ cohort.course?.name }} ({{ cohort.course?.level }})
                </p>
              </div>

              <div class="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>🗓️ <strong>Horario:</strong> {{ cohort.scheduleLabel }}</div>
                <div>
                  👩‍🏫 <strong>Docente:</strong>
                  {{ cohort.teacherWorker ? `${cohort.teacherWorker.firstName} ${cohort.teacherWorker.lastName || ''}` : 'Por asignar' }}
                </div>
                <div class="flex items-center justify-between pt-1">
                  <span>👥 <strong>Cupos:</strong> {{ cohort._count?.enrollments || 0 }} / {{ cohort.maxCapacity }}</span>
                  <span class="font-bold text-emerald-700">
                    {{ Math.round(((cohort._count?.enrollments || 0) / (cohort.maxCapacity || 1)) * 100) }}% ocupado
                  </span>
                </div>
              </div>
            </div>

            <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <span class="text-[11px] text-slate-400">
                Inicio: {{ formatDate(cohort.startDate) }}
              </span>
              <button
                @click="openAttendanceModal(cohort.id)"
                class="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition shadow-sm"
              >
                📋 Pasar Lista / Calificar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabla de Matrículas Recientes y Recaudo POS -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-slate-900">Matrículas Recientes & Estado de Cobro POS</h2>
            <p class="text-xs text-slate-500">
              Cada matrícula genera una Orden de Servicio vinculada al POS para facturar inscripción, pensión y kits de estudio.
            </p>
          </div>
          <router-link
            to="/academy-programs"
            class="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200"
          >
            Ver todas las matrículas →
          </router-link>
        </div>

        <div v-if="recentEnrollments.length === 0" class="p-8 text-center text-sm text-slate-400">
          Aún no se han registrado matrículas de estudiantes.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                <th class="py-2.5 px-4">Matrícula</th>
                <th class="py-2.5 px-4">Estudiante</th>
                <th class="py-2.5 px-4">Curso / Grupo</th>
                <th class="py-2.5 px-4">Asistencia</th>
                <th class="py-2.5 px-4">Nota Promedio</th>
                <th class="py-2.5 px-4">Total Pactado</th>
                <th class="py-2.5 px-4">Estado Cobro POS</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr v-for="enr in recentEnrollments" :key="enr.id" class="hover:bg-slate-50">
                <td class="py-2.5 px-4 font-mono text-xs font-bold text-blue-700">
                  {{ enr.enrollmentNumber }}
                </td>
                <td class="py-2.5 px-4">
                  <div class="font-bold text-slate-900">
                    {{ enr.studentCustomer?.firstName }} {{ enr.studentCustomer?.lastName || '' }}
                  </div>
                  <div v-if="enr.guardianName" class="text-[11px] text-slate-400">
                    Acudiente: {{ enr.guardianName }}
                  </div>
                </td>
                <td class="py-2.5 px-4">
                  <div class="font-semibold text-slate-800">{{ enr.cohort?.course?.name }}</div>
                  <div class="text-xs text-slate-500">{{ enr.cohort?.name }}</div>
                </td>
                <td class="py-2.5 px-4">
                  <span
                    class="px-2 py-0.5 rounded-full text-xs font-bold"
                    :class="Number(enr.attendancePct) >= configForm.minAttendancePct ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'"
                  >
                    {{ Math.round(Number(enr.attendancePct ?? 100)) }}%
                  </span>
                </td>
                <td class="py-2.5 px-4 font-bold text-slate-800">
                  {{ enr.finalGrade !== null && enr.finalGrade !== undefined ? Number(enr.finalGrade).toFixed(1) : 'S/N' }}
                </td>
                <td class="py-2.5 px-4">
                  <div class="font-bold text-slate-900">{{ formatCurrency(enr.agreedTotalAmount) }}</div>
                  <div v-if="Number(enr.scholarshipPct) > 0" class="text-[10px] text-emerald-700 font-semibold">
                    Beca {{ Number(enr.scholarshipPct) }}%
                  </div>
                </td>
                <td class="py-2.5 px-4">
                  <span
                    v-if="enr.serviceOrder?.saleId"
                    class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800"
                  >
                    ✅ Facturada en POS
                  </span>
                  <router-link
                    v-else-if="enr.serviceOrder?.id"
                    :to="`/pos?serviceOrderId=${enr.serviceOrder.id}`"
                    class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition shadow-sm"
                  >
                    💳 Cobrar en POS
                  </router-link>
                  <span v-else class="text-xs text-slate-400">Cortesía / Beca 100%</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal: Planilla de Asistencia y Calificación de Sesión -->
      <div
        v-if="showAttendanceModal && selectedCohortDetail"
        class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      >
        <div class="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <span class="text-xs font-bold uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                Planilla de Clase & Evaluación
              </span>
              <h3 class="text-lg font-bold text-slate-900 mt-1">
                {{ selectedCohortDetail.name }} — {{ selectedCohortDetail.course?.name }}
              </h3>
            </div>
            <button @click="showAttendanceModal = false" class="text-slate-400 hover:text-slate-600 text-xl">×</button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Fecha de la Sesión</label>
              <input
                v-model="attendanceSession.sessionDate"
                type="date"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
              />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Tema Visto en Clase / Evaluación</label>
              <input
                v-model="attendanceSession.topic"
                type="text"
                placeholder="Ej: Unidad 2: Conversación y Práctica Guiada"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
              />
            </div>
          </div>

          <div
            v-if="attendanceRows.length === 0"
            class="p-8 text-center text-sm text-slate-500 bg-slate-50 rounded-xl"
          >
            Este grupo aún no tiene estudiantes matriculados. Ve a <strong>Cursos, Grupos & Matricular</strong> para inscribir alumnos.
          </div>

          <div v-else class="overflow-x-auto border border-slate-200 rounded-xl">
            <table class="w-full text-left border-collapse text-sm">
              <thead>
                <tr class="bg-slate-100 text-slate-600 text-xs uppercase">
                  <th class="py-2.5 px-3">Estudiante</th>
                  <th class="py-2.5 px-3">Estado Asistencia</th>
                  <th class="py-2.5 px-3 w-28">Nota (0 - {{ configForm.gradingScaleMax }})</th>
                  <th class="py-2.5 px-3">Observación</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                <tr v-for="row in attendanceRows" :key="row.enrollmentId">
                  <td class="py-2.5 px-3">
                    <div class="font-bold text-slate-900">{{ row.studentName }}</div>
                    <div class="text-[11px] text-slate-400">
                      Asist. acumulada: {{ Math.round(row.currentAttendancePct) }}%
                    </div>
                  </td>
                  <td class="py-2.5 px-3">
                    <select
                      v-model="row.status"
                      class="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold"
                    >
                      <option value="PRESENT">✅ Presente</option>
                      <option value="LATE">⏰ Llegada Tarde</option>
                      <option value="EXCUSED">📄 Excusa Médica/Justificada</option>
                      <option value="ABSENT">❌ Ausente</option>
                    </select>
                  </td>
                  <td class="py-2.5 px-3">
                    <input
                      v-model.number="row.gradeScore"
                      type="number"
                      step="0.1"
                      min="0"
                      :max="configForm.gradingScaleMax"
                      placeholder="Opcional"
                      class="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold"
                    />
                  </td>
                  <td class="py-2.5 px-3">
                    <input
                      v-model="row.notes"
                      type="text"
                      placeholder="Nota de participación..."
                      class="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              @click="showAttendanceModal = false"
              class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              v-if="attendanceRows.length > 0"
              @click="saveCohortAttendance"
              :disabled="savingAttendance"
              class="px-5 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {{ savingAttendance ? 'Guardando Planilla...' : 'Guardar Asistencia y Calificaciones' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Configuración de Academia -->
      <div
        v-if="showConfigModal"
        class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 class="text-lg font-bold text-slate-900">Configuración Académica</h3>
            <button @click="showConfigModal = false" class="text-slate-400 hover:text-slate-600 text-xl">×</button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Nota Máxima de Escala (Ej: 5.0 o 100)
              </label>
              <input
                v-model.number="configForm.gradingScaleMax"
                type="number"
                step="0.5"
                min="1"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Nota Mínima Aprobatoria
              </label>
              <input
                v-model.number="configForm.minPassingGrade"
                type="number"
                step="0.1"
                min="0"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Porcentaje Mínimo de Asistencia para Certificar (%)
              </label>
              <input
                v-model.number="configForm.minAttendancePct"
                type="number"
                min="0"
                max="100"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <label class="flex items-center gap-2 text-sm text-slate-700 cursor-pointer pt-1">
              <input
                v-model="configForm.autoCreateServiceOrderOnEnrollment"
                type="checkbox"
                class="rounded text-blue-600"
              />
              <span>Generar Orden de Cobro POS automáticamente al matricular</span>
            </label>
          </div>

          <div class="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              @click="showConfigModal = false"
              class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cerrar
            </button>
            <button
              @click="saveConfig"
              class="px-5 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700"
            >
              Guardar Parámetros
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const loading = ref(false);
const savingAttendance = ref(false);

const kpis = ref({
  activeCoursesCount: 0,
  activeCohortsCount: 0,
  activeEnrollmentsCount: 0,
  averageAttendancePct: 100,
  pendingBillingEnrollmentsCount: 0,
  expectedTuitionRevenue: 0,
});

const activeCohorts = ref<any[]>([]);
const recentEnrollments = ref<any[]>([]);

const showAttendanceModal = ref(false);
const selectedCohortDetail = ref<any | null>(null);
const attendanceSession = ref({
  sessionDate: new Date().toISOString().slice(0, 10),
  topic: '',
});
const attendanceRows = ref<
  Array<{
    enrollmentId: string;
    studentName: string;
    currentAttendancePct: number;
    status: string;
    gradeScore?: number;
    notes: string;
  }>
>([]);

const showConfigModal = ref(false);
const configForm = ref({
  gradingScaleMax: 5.0,
  minPassingGrade: 3.0,
  minAttendancePct: 80,
  autoCreateServiceOrderOnEnrollment: true,
});

function formatCurrency(val: any): string {
  const num = Number(val ?? 0);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(val: string | Date): string {
  if (!val) return '-';
  return new Date(val).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

async function loadDashboard() {
  loading.value = true;
  try {
    const orgId = authStore.user?.organizationId;
    const branchId = authStore.user?.branchId;
    const [dashRes, cfgRes] = await Promise.all([
      api.get('/academy/dashboard', {
        params: { organizationId: orgId, branchId },
      }),
      api.get('/academy/config', {
        params: { organizationId: orgId },
      }),
    ]);

    if (dashRes.data) {
      kpis.value = dashRes.data.kpis || kpis.value;
      activeCohorts.value = dashRes.data.activeCohorts || [];
      recentEnrollments.value = dashRes.data.recentEnrollments || [];
    }

    if (cfgRes.data?.config) {
      configForm.value = {
        ...configForm.value,
        ...cfgRes.data.config,
      };
    }
  } catch (error) {
    console.error('Error cargando campus académico:', error);
  } finally {
    loading.value = false;
  }
}

async function openAttendanceModal(cohortId: string) {
  try {
    const orgId = authStore.user?.organizationId;
    const res = await api.get(`/academy/cohorts/${cohortId}`, {
      params: { organizationId: orgId },
    });
    selectedCohortDetail.value = res.data;
    attendanceSession.value = {
      sessionDate: new Date().toISOString().slice(0, 10),
      topic: '',
    };
    const enrollments = res.data?.enrollments || [];
    attendanceRows.value = enrollments
      .filter((e: any) => e.status === 'ACTIVE')
      .map((e: any) => ({
        enrollmentId: e.id,
        studentName: `${e.studentCustomer?.firstName || ''} ${e.studentCustomer?.lastName || ''}`.trim(),
        currentAttendancePct: Number(e.attendancePct ?? 100),
        status: 'PRESENT',
        gradeScore: undefined,
        notes: '',
      }));
    showAttendanceModal.value = true;
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al cargar el listado de estudiantes del grupo.');
  }
}

async function saveCohortAttendance() {
  if (!selectedCohortDetail.value) return;
  savingAttendance.value = true;
  try {
    await api.post('/academy/attendance/batch', {
      organizationId: authStore.user?.organizationId,
      cohortId: selectedCohortDetail.value.id,
      sessionDate: attendanceSession.value.sessionDate,
      topic: attendanceSession.value.topic || 'Sesión Académica Regular',
      records: attendanceRows.value.map((r) => ({
        enrollmentId: r.enrollmentId,
        status: r.status,
        gradeScore:
          r.gradeScore !== undefined && String(r.gradeScore) !== ''
            ? Number(r.gradeScore)
            : undefined,
        notes: r.notes || undefined,
      })),
    });
    showAttendanceModal.value = false;
    await loadDashboard();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al registrar la asistencia del grupo.');
  } finally {
    savingAttendance.value = false;
  }
}

async function saveConfig() {
  try {
    await api.patch('/academy/config', {
      organizationId: authStore.user?.organizationId,
      ...configForm.value,
    });
    showConfigModal.value = false;
  } catch (error: any) {
    alert(error?.response?.data?.message || 'No se pudo guardar la configuración académica.');
  }
}

onMounted(() => {
  loadDashboard();
});
</script>

