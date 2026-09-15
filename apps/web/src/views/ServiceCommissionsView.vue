<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import AppLayout from '../components/AppLayout.vue';

const authStore = useAuthStore();

// Estados
const workers = ref<any[]>([]);
const commissionReports = ref<any[]>([]);
const loading = ref(false);

// Filtros
const startDate = ref<string>('');
const endDate = ref<string>('');
const selectedWorkerId = ref<string>('ALL');
const filterEmploymentType = ref<string>('ALL');

// Cargar personal para los dropdowns
const fetchWorkers = async () => {
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    if (!orgId) return;

    const { data } = await api.get('/service-workers', { params: { organizationId: orgId } });
    workers.value = Array.isArray(data) ? data : (data.items || data.data || []);
  } catch (error) {
    console.error('Error al cargar personal:', error);
  }
};

// Cargar reporte de comisiones
const fetchCommissions = async () => {
  loading.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    if (!orgId) return;

    const params: Record<string, any> = { organizationId: orgId };

    if (startDate.value) params.startDate = startDate.value;
    if (endDate.value) params.endDate = endDate.value;
    if (selectedWorkerId.value && selectedWorkerId.value !== 'ALL') {
      params.workerId = selectedWorkerId.value;
    }
    if (filterEmploymentType.value && filterEmploymentType.value !== 'ALL') {
      params.employmentType = filterEmploymentType.value;
    }

    // URL actualizada al módulo de reportes
    const { data } = await api.get('/service-reports/commissions', { params });
    commissionReports.value = Array.isArray(data) ? data : (data.items || data.data || []);
  } catch (error) {
    console.error('Error al obtener reporte:', error);
  } finally {
    loading.value = false;
  }
};

// Totales calculados alineados con las propiedades del backend NestJS
const totalLaborGenerated = computed(() => {
  return commissionReports.value.reduce((acc, curr) => acc + Number(curr.totalLaborGenerated || 0), 0);
});

const totalCommissionsPayable = computed(() => {
  return commissionReports.value
    .filter(r => r.employmentType !== 'SALARIED')
    .reduce((acc, curr) => acc + Number(curr.totalCommissionEarned || 0), 0);
});

const totalCompletedOrders = computed(() => {
  return commissionReports.value.reduce((acc, curr) => acc + Number(curr.totalOrders || 0), 0);
});

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(amount || 0);
};

watch([startDate, endDate, selectedWorkerId, filterEmploymentType], () => {
  fetchCommissions();
});

onMounted(() => {
  fetchWorkers();
  fetchCommissions();
});
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Rendimiento y Comisiones</h1>
          <p class="text-sm text-slate-500 mt-1">Control de mano de obra generada, productividad de planta y liquidaciones por comisión.</p>
        </div>
      </div>

      <!-- Tarjetas de Métricas -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p class="text-xs font-bold uppercase text-slate-400">Total Mano de Obra Producida</p>
          <p class="text-2xl font-black text-slate-900 mt-1">{{ formatCurrency(totalLaborGenerated) }}</p>
          <p class="text-xs text-slate-500 mt-1">Planta + Contratistas</p>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p class="text-xs font-bold uppercase text-slate-400">Total Comisiones a Pagar</p>
          <p class="text-2xl font-black text-blue-600 mt-1">{{ formatCurrency(totalCommissionsPayable) }}</p>
          <p class="text-xs text-blue-700/70 mt-1">Excluye personal de nómina/planta</p>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p class="text-xs font-bold uppercase text-slate-400">Servicios Completados</p>
          <p class="text-2xl font-black text-emerald-600 mt-1">{{ totalCompletedOrders }}</p>
          <p class="text-xs text-emerald-700/70 mt-1">Órdenes cerradas en el periodo</p>
        </div>
      </div>

      <!-- Filtros -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div>
          <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Fecha Inicial</label>
          <input
            v-model="startDate"
            type="date"
            class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Fecha Final</label>
          <input
            v-model="endDate"
            type="date"
            class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Tipo de Vinculación</label>
          <select v-model="filterEmploymentType" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="ALL">Todos los tipos</option>
            <option value="SALARIED">Personal de Planta (Nómina)</option>
            <option value="COMMISSION">Por Comisión / Contratista</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Técnico / Especialista</label>
          <select v-model="selectedWorkerId" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="ALL">Todos los técnicos</option>
            <option v-for="w in workers" :key="w.id" :value="w.id">
              {{ w.firstName }} {{ w.lastName }}
            </option>
          </select>
        </div>
      </div>

      <!-- Tabla del Reporte -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div v-if="loading" class="p-12 text-center text-slate-400">
          Procesando reporte de producción y comisiones...
        </div>

        <div v-else-if="commissionReports.length === 0" class="p-12 text-center text-slate-400 space-y-2">
          <span class="text-4xl block">📊</span>
          <p class="text-sm font-medium">No hay registros para los filtros seleccionados.</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50/70 border-b border-slate-100 text-xs uppercase font-bold text-slate-500">
              <tr>
                <th class="px-6 py-3.5">Técnico</th>
                <th class="px-6 py-3.5">Vinculación</th>
                <th class="px-6 py-3.5 text-center">Servicios</th>
                <th class="px-6 py-3.5">Mano Obra Generada</th>
                <th class="px-6 py-3.5">% Comisión</th>
                <th class="px-6 py-3.5 text-right">Comisión a Pagar</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="report in commissionReports" :key="report.workerId" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <p class="font-bold text-slate-900">{{ report.workerName }}</p>
                  <p class="text-xs text-slate-400">Doc: {{ report.identification || 'N/A' }}</p>
                </td>

                <td class="px-6 py-4">
                  <span
                    :class="report.employmentType === 'SALARIED'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'"
                    class="px-2.5 py-1 rounded-lg text-xs font-bold border inline-block"
                  >
                    {{ report.employmentType === 'SALARIED' ? '🏢 Planta (Nómina)' : '🤝 Comisión' }}
                  </span>
                </td>

                <td class="px-6 py-4 text-center font-bold text-slate-800">
                  {{ report.totalOrders }}
                </td>

                <td class="px-6 py-4 font-semibold text-slate-900">
                  {{ formatCurrency(report.totalLaborGenerated) }}
                </td>

                <td class="px-6 py-4 font-bold text-slate-600">
                  <template v-if="report.employmentType === 'SALARIED'">
                    <span class="text-slate-400 text-xs">N/A (Nómina)</span>
                  </template>
                  <template v-else>
                    {{ report.commissionPercentage }}%
                  </template>
                </td>

                <td class="px-6 py-4 text-right font-black text-base">
                  <template v-if="report.employmentType === 'SALARIED'">
                    <span class="text-slate-400 text-xs font-semibold">Salario Fijo ($0)</span>
                  </template>
                  <template v-else>
                    <span class="text-blue-600">{{ formatCurrency(report.totalCommissionEarned) }}</span>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
