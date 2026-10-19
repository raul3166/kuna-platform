<template>
  <AppLayout>
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- Encabezado -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-teal-100 text-teal-800 rounded-full">
              Vertical Inmobiliaria & Administración de Propiedades
            </span>
            <span class="text-xs text-slate-400">Reutilizando Core: Propietarios e Inquilinos (Customer), Asesores (ServiceWorker) y POS</span>
          </div>
          <h1 class="text-2xl font-bold text-slate-900 mt-1">Portafolio de Inmuebles, Arrendamientos & Dispersión a Propietarios</h1>
          <p class="text-sm text-slate-500">
            Control de ocupación inmobiliaria, recaudo de cánones en POS, comisión de agencia y liquidación neta a propietarios.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button
            @click="loadDashboard"
            class="px-3.5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition"
          >
            ↻ Actualizar Portafolio
          </button>
          <router-link
            to="/real-estate-leases"
            class="px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition shadow-sm"
          >
            🏢 Inmuebles, Contratos & Cánones
          </router-link>
          <button
            @click="showConfigModal = true"
            class="p-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition"
            title="Parámetros Inmobiliarios"
          >
            ⚙️
          </button>
        </div>
      </div>

      <!-- KPIs Inmobiliarios -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-bold uppercase text-slate-400">Portafolio Total</div>
          <div class="text-2xl font-extrabold text-slate-900 mt-1">{{ kpis.totalPropertiesCount }}</div>
          <div class="text-xs text-slate-500 mt-0.5">{{ kpis.availablePropertiesCount }} disponibles</div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-bold uppercase text-teal-600">Ocupación</div>
          <div class="text-2xl font-extrabold text-teal-600 mt-1">{{ kpis.occupancyRatePct }}%</div>
          <div class="text-xs text-slate-500 mt-0.5">{{ kpis.rentedPropertiesCount }} arrendados</div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-bold uppercase text-indigo-600">Contratos Activos</div>
          <div class="text-2xl font-extrabold text-indigo-600 mt-1">{{ kpis.activeLeasesCount }}</div>
          <div class="text-xs text-slate-500 mt-0.5">Arrendamientos vigentes</div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-bold uppercase text-slate-700">Facturación Cánones</div>
          <div class="text-xl font-extrabold text-slate-900 mt-1">{{ formatCurrency(kpis.monthlyRentPortfolio) }}</div>
          <div class="text-xs text-slate-500 mt-0.5">Canon + Admon mensual</div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-bold uppercase text-emerald-600">Comisión Agencia</div>
          <div class="text-xl font-extrabold text-emerald-600 mt-1">{{ formatCurrency(kpis.monthlyAgencyCommission) }}</div>
          <div class="text-xs text-slate-500 mt-0.5">Ingreso inmobiliaria/mes</div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-bold uppercase text-amber-600">Cánones por Recaudar</div>
          <div class="text-2xl font-extrabold text-amber-600 mt-1">{{ kpis.pendingRentChargesCount }}</div>
          <div class="text-xs text-slate-500 mt-0.5">Pendientes en POS</div>
        </div>
      </div>

      <!-- Kanban de Estado de Ocupación de Inmuebles -->
      <div v-if="loading" class="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500">
        Cargando portafolio de inmuebles y contratos...
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="col in statusColumns"
          :key="col.key"
          class="bg-slate-50 rounded-2xl border border-slate-200 flex flex-col max-h-[560px]"
        >
          <div class="p-3.5 border-b border-slate-200 flex items-center justify-between bg-white rounded-t-2xl">
            <div class="flex items-center gap-2">
              <span class="text-lg">{{ col.icon }}</span>
              <div>
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-800">{{ col.title }}</h3>
                <p class="text-[11px] text-slate-400">{{ col.subtitle }}</p>
              </div>
            </div>
            <span class="px-2 py-0.5 text-xs font-bold rounded-full" :class="col.badgeClass">
              {{ (propertiesByStatus[col.key] || []).length }}
            </span>
          </div>

          <div class="p-3 space-y-3 overflow-y-auto flex-1">
            <div
              v-if="(propertiesByStatus[col.key] || []).length === 0"
              class="text-center py-8 text-xs text-slate-400 italic"
            >
              Sin inmuebles en este estado
            </div>

            <div
              v-for="prop in propertiesByStatus[col.key]"
              :key="prop.id"
              class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-2"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {{ prop.code }}
                </span>
                <span class="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {{ formatPropertyType(prop.propertyType) }}
                </span>
              </div>

              <div>
                <div class="font-bold text-sm text-slate-900 leading-tight">{{ prop.title }}</div>
                <div class="text-xs text-slate-500 mt-0.5">📍 {{ prop.address }} ({{ prop.neighborhood || prop.city }})</div>
              </div>

              <div class="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                <div>
                  <span class="text-slate-400 block">Canon Mensual:</span>
                  <span class="font-bold text-slate-900">{{ formatCurrency(prop.monthlyRentPrice) }}</span>
                </div>
                <div>
                  <span class="text-slate-400 block">Propietario:</span>
                  <span class="font-semibold text-slate-700 truncate block">
                    {{ prop.ownerCustomer?.firstName }} {{ prop.ownerCustomer?.lastName || '' }}
                  </span>
                </div>
              </div>

              <div class="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>📐 {{ Number(prop.areaM2 || 0) }} m² • 🛏️ {{ prop.bedrooms }} • 🚿 {{ prop.bathrooms }}</span>
                <span class="font-bold text-teal-700">Com. {{ Number(prop.agencyCommissionPct) }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabla de Cánones de Arrendamiento, Cobro POS y Dispersión a Propietarios -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-slate-900">Cánones de Arrendamiento, Cobro POS & Giro a Propietarios</h2>
            <p class="text-xs text-slate-500">
              Recauda el canon del inquilino en POS, retén automáticamente la comisión de la inmobiliaria y controla el giro neto al propietario.
            </p>
          </div>
          <router-link
            to="/real-estate-leases"
            class="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200"
          >
            Emitir nuevo canon / Ver contratos →
          </router-link>
        </div>

        <div v-if="recentRentCharges.length === 0" class="p-8 text-center text-sm text-slate-400">
          Aún no hay cánones de arrendamiento emitidos. Crea un contrato en <strong>Inmuebles, Contratos & Cánones</strong>.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                <th class="py-2.5 px-4">Periodo</th>
                <th class="py-2.5 px-4">Inmueble / Contrato</th>
                <th class="py-2.5 px-4">Inquilino (Paga)</th>
                <th class="py-2.5 px-4">Total Canon</th>
                <th class="py-2.5 px-4">Comisión Agencia</th>
                <th class="py-2.5 px-4">Neto Propietario</th>
                <th class="py-2.5 px-4">Recaudo POS</th>
                <th class="py-2.5 px-4">Giro a Propietario</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr v-for="ch in recentRentCharges" :key="ch.id" class="hover:bg-slate-50">
                <td class="py-2.5 px-4 font-mono text-xs font-bold text-teal-700">
                  {{ ch.periodLabel }}
                </td>
                <td class="py-2.5 px-4">
                  <div class="font-bold text-slate-900">{{ ch.lease?.property?.title }}</div>
                  <div class="text-xs text-slate-400">{{ ch.lease?.contractNumber }}</div>
                </td>
                <td class="py-2.5 px-4">
                  <div class="font-semibold text-slate-800">
                    {{ ch.lease?.tenantCustomer?.firstName }} {{ ch.lease?.tenantCustomer?.lastName || '' }}
                  </div>
                </td>
                <td class="py-2.5 px-4 font-extrabold text-slate-900">
                  {{ formatCurrency(ch.totalAmount) }}
                </td>
                <td class="py-2.5 px-4 font-bold text-emerald-700">
                  {{ formatCurrency(ch.agencyCommissionAmount) }}
                </td>
                <td class="py-2.5 px-4">
                  <div class="font-bold text-indigo-700">{{ formatCurrency(ch.ownerNetAmount) }}</div>
                  <div class="text-[11px] text-slate-400">
                    Prop: {{ ch.lease?.property?.ownerCustomer?.firstName }} {{ ch.lease?.property?.ownerCustomer?.lastName || '' }}
                  </div>
                </td>
                <td class="py-2.5 px-4">
                  <span
                    v-if="ch.serviceOrder?.saleId"
                    class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800"
                  >
                    ✅ Recaudado POS
                  </span>
                  <router-link
                    v-else-if="ch.serviceOrder?.id"
                    :to="`/pos?serviceOrderId=${ch.serviceOrder.id}`"
                    class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition shadow-sm"
                  >
                    💳 Cobrar en POS
                  </router-link>
                </td>
                <td class="py-2.5 px-4">
                  <button
                    @click="toggleOwnerDisbursed(ch.id)"
                    class="px-3 py-1 rounded-lg text-xs font-bold border transition"
                    :class="ch.isOwnerDisbursed ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'"
                  >
                    {{ ch.isOwnerDisbursed ? '🏦 Girado a Propietario' : '⏳ Marcar Giro' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal Configuración Inmobiliaria -->
      <div
        v-if="showConfigModal"
        class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 class="text-lg font-bold text-slate-900">Parámetros de Administración Inmobiliaria</h3>
            <button @click="showConfigModal = false" class="text-slate-400 hover:text-slate-600 text-xl">×</button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Comisión de Administración por Defecto (%)
              </label>
              <input
                v-model.number="configForm.defaultAgencyCommissionPct"
                type="number"
                step="0.5"
                min="0"
                max="100"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Día Límite de Pago Mensual por Defecto (1 - 31)
              </label>
              <input
                v-model.number="configForm.defaultPaymentDay"
                type="number"
                min="1"
                max="31"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Tasa de Interés Moratorio Mensual (%)
              </label>
              <input
                v-model.number="configForm.lateFeeInterestPct"
                type="number"
                step="0.1"
                min="0"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <label class="flex items-center gap-2 text-sm text-slate-700 cursor-pointer pt-1">
              <input
                v-model="configForm.autoGenerateFirstRentCharge"
                type="checkbox"
                class="rounded text-teal-600"
              />
              <span>Generar primer canon mensual automáticamente al firmar contrato</span>
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
              class="px-5 py-2 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700"
            >
              Guardar Configuración
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

const kpis = ref({
  totalPropertiesCount: 0,
  rentedPropertiesCount: 0,
  availablePropertiesCount: 0,
  occupancyRatePct: 0,
  activeLeasesCount: 0,
  monthlyRentPortfolio: 0,
  monthlyAgencyCommission: 0,
  pendingRentChargesCount: 0,
});

const propertiesByStatus = ref<Record<string, any[]>>({
  AVAILABLE: [],
  RESERVED: [],
  RENTED: [],
  MAINTENANCE: [],
});

const recentRentCharges = ref<any[]>([]);

const statusColumns = [
  {
    key: 'AVAILABLE',
    title: 'Disponibles',
    subtitle: 'En oferta comercial',
    icon: '🟢',
    badgeClass: 'bg-emerald-100 text-emerald-800',
  },
  {
    key: 'RESERVED',
    title: 'Reservados / Estudio',
    subtitle: 'En estudio de póliza',
    icon: '⏳',
    badgeClass: 'bg-amber-100 text-amber-800',
  },
  {
    key: 'RENTED',
    title: 'Arrendados',
    subtitle: 'Generando canon mensual',
    icon: '🔑',
    badgeClass: 'bg-teal-100 text-teal-800',
  },
  {
    key: 'MAINTENANCE',
    title: 'En Mantenimiento',
    subtitle: 'Reparaciones locativas',
    icon: '🛠️',
    badgeClass: 'bg-rose-100 text-rose-800',
  },
];

const showConfigModal = ref(false);
const configForm = ref({
  defaultAgencyCommissionPct: 10,
  defaultPaymentDay: 5,
  lateFeeInterestPct: 2,
  autoGenerateFirstRentCharge: true,
});

function formatCurrency(val: any): string {
  const num = Number(val ?? 0);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(num);
}

function formatPropertyType(type: string): string {
  const map: Record<string, string> = {
    APARTMENT: 'Apartamento',
    HOUSE: 'Casa',
    COMMERCIAL_LOCAL: 'Local Comercial',
    OFFICE: 'Oficina',
    WAREHOUSE: 'Bodega',
    LAND: 'Lote / Terreno',
  };
  return map[type] || type;
}

async function loadDashboard() {
  loading.value = true;
  try {
    const orgId = authStore.user?.organizationId;
    const branchId = authStore.user?.branchId;
    const [dashRes, cfgRes] = await Promise.all([
      api.get('/real-estate/dashboard', {
        params: { organizationId: orgId, branchId },
      }),
      api.get('/real-estate/config', {
        params: { organizationId: orgId },
      }),
    ]);

    if (dashRes.data) {
      kpis.value = dashRes.data.kpis || kpis.value;
      propertiesByStatus.value =
        dashRes.data.propertiesByStatus || propertiesByStatus.value;
      recentRentCharges.value = dashRes.data.recentRentCharges || [];
    }

    if (cfgRes.data?.config) {
      configForm.value = {
        ...configForm.value,
        ...cfgRes.data.config,
      };
    }
  } catch (error) {
    console.error('Error cargando dashboard inmobiliario:', error);
  } finally {
    loading.value = false;
  }
}

async function toggleOwnerDisbursed(chargeId: string) {
  try {
    await api.patch(`/real-estate/rent-charges/${chargeId}/disburse`, null, {
      params: { organizationId: authStore.user?.organizationId },
    });
    await loadDashboard();
  } catch (error: any) {
    alert(
      error?.response?.data?.message ||
        'No se pudo actualizar el estado de dispersión al propietario.',
    );
  }
}

async function saveConfig() {
  try {
    await api.patch('/real-estate/config', {
      organizationId: authStore.user?.organizationId,
      ...configForm.value,
    });
    showConfigModal.value = false;
  } catch (error: any) {
    alert(
      error?.response?.data?.message ||
        'Error al guardar la configuración inmobiliaria.',
    );
  }
}

onMounted(() => {
  loadDashboard();
});
</script>

