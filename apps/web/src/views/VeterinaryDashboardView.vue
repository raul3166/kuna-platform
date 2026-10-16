<template>
  <AppLayout>
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- Encabezado -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-teal-100 text-teal-800 rounded-full">
              Vertical Veterinaria & Pet Shop
            </span>
            <span class="text-xs text-slate-400">Reutilizando Core: Clientes, Técnicos, Servicios, Stock y POS</span>
          </div>
          <h1 class="text-2xl font-bold text-slate-900 mt-1">Centro Clínico Veterinario & Pet Shop</h1>
          <p class="text-sm text-slate-500">
            Monitoreo de pacientes en clínica, consultas del día, recordatorios de vacunación y facturación integrada.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <router-link
            to="/veterinary-pets"
            class="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
          >
            🐾 Pacientes / Mascotas
          </router-link>
          <router-link
            to="/veterinary-consultations"
            class="px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition shadow-sm"
          >
            + Nueva Consulta / Vacuna
          </router-link>
          <button
            @click="showConfigModal = true"
            class="p-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition"
            title="Configuración de Veterinaria"
          >
            ⚙️
          </button>
        </div>
      </div>

      <!-- Tarjetas KPI -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-xs font-semibold uppercase text-slate-400">Mascotas Activas</div>
          <div class="text-3xl font-extrabold text-slate-900 mt-2">{{ dashboard.kpis.totalPets }}</div>
          <div class="text-xs text-teal-600 mt-1 font-medium">Pacientes con expediente</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-xs font-semibold uppercase text-slate-400">Consultas Hoy</div>
          <div class="text-3xl font-extrabold text-teal-600 mt-2">{{ dashboard.kpis.consultationsToday }}</div>
          <div class="text-xs text-slate-500 mt-1">Historias registradas hoy</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-xs font-semibold uppercase text-slate-400">En Clínica / Grooming</div>
          <div class="text-3xl font-extrabold text-amber-600 mt-2">{{ dashboard.kpis.activePatientsInClinic }}</div>
          <div class="text-xs text-slate-500 mt-1">Órdenes activas en atención</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-xs font-semibold uppercase text-slate-400">Refuerzos Próximos</div>
          <div class="text-3xl font-extrabold text-rose-600 mt-2">{{ dashboard.kpis.upcomingVaccinationsCount }}</div>
          <div class="text-xs text-slate-500 mt-1">Vacunas / Desparasitación (30d)</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-xs font-semibold uppercase text-slate-400">Facturación en Curso</div>
          <div class="text-2xl font-extrabold text-emerald-600 mt-2">
            ${{ Number(dashboard.kpis.estimatedRevenueInClinic || 0).toLocaleString('es-CO') }}
          </div>
          <div class="text-xs text-slate-500 mt-1">Consultas + insumos activos</div>
        </div>
      </div>

      <!-- Sección Principal: Pacientes en Atención y Alertas de Vacunación -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Pacientes en Clínica / Peluquería con Cobro en POS -->
        <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-bold text-slate-900">Pacientes en Atención (Clínica / Grooming / Cirugía)</h2>
              <p class="text-xs text-slate-500">Órdenes vinculadas a mascotas listas para cierre o cobro en POS</p>
            </div>
            <button
              @click="loadDashboard"
              class="text-xs font-semibold text-teal-600 hover:text-teal-800"
            >
              ↻ Actualizar
            </button>
          </div>

          <div v-if="loading" class="p-8 text-center text-slate-400 text-sm">
            Cargando actividad clínica...
          </div>

          <div v-else-if="dashboard.activeOrders.length === 0" class="p-8 text-center">
            <p class="text-slate-500 text-sm">No hay mascotas en atención activa en este momento.</p>
            <router-link
              to="/veterinary-consultations"
              class="inline-block mt-3 text-xs font-semibold text-teal-600 hover:underline"
            >
              + Iniciar nueva consulta o grooming
            </router-link>
          </div>

          <div v-else class="divide-y divide-slate-100">
            <div
              v-for="order in dashboard.activeOrders"
              :key="order.id"
              class="p-4 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-slate-900 text-sm">
                    {{ order.pet?.name || order.assetName }}
                  </span>
                  <span class="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-700">
                    {{ formatSpecies(order.pet?.species) }}
                  </span>
                  <span
                    :class="statusBadgeClass(order.status)"
                    class="px-2 py-0.5 text-[11px] font-bold rounded-full"
                  >
                    {{ formatOrderStatus(order.status) }}
                  </span>
                </div>
                <div class="text-xs text-slate-600">
                  <span class="font-medium">Propietario:</span> {{ formatCustomerName(order.customer) }}
                  <span v-if="order.assignedWorker" class="ml-2">
                    • <span class="font-medium">Vet/Groomer:</span> {{ formatWorkerName(order.assignedWorker) }}
                  </span>
                </div>
                <div class="text-xs text-slate-500">
                  Orden <span class="font-mono font-semibold">{{ order.orderNumber }}</span>:
                  {{ order.initialNotes || 'Atención veterinaria' }}
                </div>
              </div>

              <div class="flex items-center gap-3 self-end sm:self-center">
                <div class="text-right">
                  <div class="text-sm font-bold text-slate-900">
                    ${{ Number(order.total || 0).toLocaleString('es-CO') }}
                  </div>
                  <div class="text-[11px] text-slate-400">
                    {{ (order.materials?.length || 0) }} insumos
                  </div>
                </div>

                <button
                  v-if="order.status !== 'COMPLETED'"
                  @click="completeServiceOrder(order.id)"
                  class="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold hover:bg-amber-200 transition"
                >
                  Dar Alta / Finalizar
                </button>

                <router-link
                  :to="`/pos?serviceOrderId=${order.id}`"
                  class="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition"
                >
                  Cobrar en POS
                </router-link>
              </div>
            </div>
          </div>
        </div>

        <!-- Recordatorios de Vacunación y Desparasitación -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-slate-100">
            <h2 class="text-lg font-bold text-slate-900">Próximos Refuerzos Sanitarios</h2>
            <p class="text-xs text-slate-500">Vacunas y antiparasitarios por vencer (30 días)</p>
          </div>

          <div v-if="dashboard.upcomingVaccinations.length === 0" class="p-6 text-center text-slate-400 text-sm">
            Sin refuerzos pendientes para los próximos 30 días.
          </div>

          <div v-else class="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            <div
              v-for="vac in dashboard.upcomingVaccinations"
              :key="vac.id"
              class="p-4 hover:bg-slate-50 transition space-y-1"
            >
              <div class="flex items-center justify-between">
                <span class="font-bold text-slate-900 text-sm">{{ vac.pet?.name }}</span>
                <span
                  :class="isOverdue(vac.nextDueDate) ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'"
                  class="px-2 py-0.5 rounded-full text-[11px] font-bold"
                >
                  {{ formatDate(vac.nextDueDate) }}
                </span>
              </div>
              <div class="text-xs font-semibold text-teal-700">
                {{ vac.vaccineName }} ({{ vac.type }})
              </div>
              <div class="text-xs text-slate-500">
                Tutor: {{ formatCustomerName(vac.pet?.customer) }}
                <span v-if="vac.pet?.customer?.phoneNumber">• 📞 {{ vac.pet.customer.phoneNumber }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Últimas Historias Clínicas -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Últimas Historias Clínicas y Consultas</h2>
            <p class="text-xs text-slate-500">Trazabilidad médica reciente en la clínica</p>
          </div>
          <router-link
            to="/veterinary-consultations"
            class="text-xs font-semibold text-teal-600 hover:underline"
          >
            Ver todas / Nueva consulta →
          </router-link>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                <th class="py-3 px-4">Fecha</th>
                <th class="py-3 px-4">Paciente</th>
                <th class="py-3 px-4">Propietario</th>
                <th class="py-3 px-4">Tipo</th>
                <th class="py-3 px-4">Signos Vitales</th>
                <th class="py-3 px-4">Motivo / Diagnóstico</th>
                <th class="py-3 px-4">Veterinario</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm">
              <tr v-if="dashboard.recentMedicalRecords.length === 0">
                <td colspan="7" class="py-6 text-center text-slate-400">
                  Aún no hay consultas registradas.
                </td>
              </tr>
              <tr
                v-for="rec in dashboard.recentMedicalRecords"
                :key="rec.id"
                class="hover:bg-slate-50"
              >
                <td class="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                  {{ formatDateTime(rec.visitDate) }}
                </td>
                <td class="py-3 px-4 font-semibold text-slate-900">
                  {{ rec.pet?.name }}
                  <span class="block text-xs font-normal text-slate-400">{{ formatSpecies(rec.pet?.species) }}</span>
                </td>
                <td class="py-3 px-4 text-xs text-slate-600">
                  {{ formatCustomerName(rec.pet?.customer) }}
                </td>
                <td class="py-3 px-4">
                  <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700">
                    {{ formatVisitType(rec.visitType) }}
                  </span>
                </td>
                <td class="py-3 px-4 text-xs text-slate-600">
                  <span v-if="rec.weightKg">{{ rec.weightKg }} kg</span>
                  <span v-if="rec.temperatureC" class="ml-2">{{ rec.temperatureC }} °C</span>
                </td>
                <td class="py-3 px-4 text-xs">
                  <div class="font-medium text-slate-800">{{ rec.reason }}</div>
                  <div v-if="rec.diagnosis" class="text-slate-500">Dx: {{ rec.diagnosis }}</div>
                </td>
                <td class="py-3 px-4 text-xs text-slate-600">
                  {{ formatWorkerName(rec.veterinarian) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal Configuración Veterinaria -->
      <div
        v-if="showConfigModal"
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      >
        <div class="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
          <div class="flex items-center justify-between border-b pb-3">
            <h3 class="text-lg font-bold text-slate-900">Configuración Veterinaria & Pet Shop</h3>
            <button @click="showConfigModal = false" class="text-slate-400 hover:text-slate-600">✕</button>
          </div>

          <div class="space-y-3 text-sm">
            <div>
              <label class="block font-medium text-slate-700 mb-1">Días de anticipación alerta de vacunas</label>
              <input
                v-model.number="configForm.vaccinationAlertDays"
                type="number"
                min="1"
                class="w-full border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <label class="block font-medium text-slate-700 mb-1">Duración estándar de consulta (minutos)</label>
              <input
                v-model.number="configForm.defaultConsultationMinutes"
                type="number"
                min="10"
                class="w-full border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>

            <label class="flex items-center gap-2 cursor-pointer pt-1">
              <input
                v-model="configForm.autoCreateOrderOnConsultation"
                type="checkbox"
                class="rounded text-teal-600"
              />
              <span class="text-slate-700">Generar Orden de Servicio automáticamente en cada consulta</span>
            </label>

            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="configForm.enableGrooming"
                type="checkbox"
                class="rounded text-teal-600"
              />
              <span class="text-slate-700">Habilitar servicios de Peluquería / Grooming</span>
            </label>
          </div>

          <div class="flex justify-end gap-2 pt-4 border-t">
            <button
              @click="showConfigModal = false"
              class="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm"
            >
              Cancelar
            </button>
            <button
              @click="saveConfig"
              class="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700"
            >
              Guardar Cambios
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
const showConfigModal = ref(false);

const dashboard = ref<any>({
  kpis: {
    totalPets: 0,
    consultationsToday: 0,
    activePatientsInClinic: 0,
    upcomingVaccinationsCount: 0,
    estimatedRevenueInClinic: 0,
  },
  activeOrders: [],
  recentMedicalRecords: [],
  upcomingVaccinations: [],
  speciesDistribution: [],
});

const configForm = ref({
  vaccinationAlertDays: 15,
  defaultConsultationMinutes: 30,
  autoCreateOrderOnConsultation: true,
  enableGrooming: true,
});

const getOrgId = () =>
  authStore.currentOrganization?.id || authStore.user?.organizationId || undefined;

const formatCustomerName = (c?: any) => {
  if (!c) return 'N/A';
  if (c.companyName) return c.companyName;
  const full = `${c.firstName || ''} ${c.lastName || ''}`.trim();
  return full || c.name || 'Cliente';
};

const formatWorkerName = (w?: any) => {
  if (!w) return 'General';
  const full = `${w.firstName || ''} ${w.lastName || ''}`.trim();
  return full || w.fullName || w.name || 'Profesional';
};

const loadDashboard = async () => {
  loading.value = true;
  try {
    const organizationId = getOrgId();
    const [dashRes, cfgRes] = await Promise.all([
      api.get('/veterinary/dashboard', { params: { organizationId } }),
      api.get('/veterinary/config', { params: { organizationId } }),
    ]);
    dashboard.value = dashRes.data;
    if (cfgRes.data?.settings) {
      configForm.value = {
        ...configForm.value,
        ...cfgRes.data.settings,
      };
    }
  } catch (error) {
    console.error('Error cargando dashboard veterinario:', error);
  } finally {
    loading.value = false;
  }
};

const completeServiceOrder = async (orderId: string) => {
  try {
    const organizationId = getOrgId();
    await api.patch(`/service-orders/${orderId}/status`, {
      organizationId,
      status: 'COMPLETED',
    });
    await loadDashboard();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al finalizar la orden de atención');
  }
};

const saveConfig = async () => {
  try {
    const organizationId = getOrgId();
    await api.patch('/veterinary/config', {
      organizationId,
      ...configForm.value,
    });
    showConfigModal.value = false;
  } catch (error) {
    console.error('Error guardando configuración veterinaria:', error);
  }
};

const formatSpecies = (species?: string) => {
  const map: Record<string, string> = {
    CANINE: '🐶 Canino',
    FELINE: '🐱 Felino',
    AVIAN: '🦜 Ave',
    RODENT: '🐹 Roedor',
    REPTILE: '🐢 Reptil',
    EQUINE: '🐴 Equino',
    BOVINE: '🐮 Bovino',
    OTHER: '🐾 Otro',
  };
  return species ? map[species] || species : '🐾 Mascota';
};

const formatVisitType = (type?: string) => {
  const map: Record<string, string> = {
    CONSULTATION: 'Consulta General',
    EMERGENCY: 'Urgencia',
    VACCINATION: 'Vacunación',
    DEWORMING: 'Desparasitación',
    SURGERY: 'Cirugía',
    GROOMING: 'Peluquería / Grooming',
    CHECKUP: 'Control',
    HOSPITALIZATION: 'Hospitalización',
  };
  return type ? map[type] || type : 'Consulta';
};

const formatOrderStatus = (status?: string) => {
  const map: Record<string, string> = {
    PENDING: 'En Espera',
    IN_PROGRESS: 'En Consulta / Atención',
    WAITING_PARTS: 'Observación / Exámenes',
    COMPLETED: 'Alta Lista para Cobro',
    BILLED: 'Facturado',
  };
  return status ? map[status] || status : '';
};

const statusBadgeClass = (status?: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-800';
    case 'IN_PROGRESS':
      return 'bg-sky-100 text-sky-800';
    case 'WAITING_PARTS':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

const isOverdue = (dateStr?: string) => {
  if (!dateStr) return false;
  return new Date(dateStr).getTime() < Date.now();
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('es-CO');
};

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};

onMounted(() => {
  loadDashboard();
});
</script>

