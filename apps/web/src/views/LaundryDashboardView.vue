<template>
  <AppLayout>
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- Encabezado -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 rounded-full">
              Vertical Lavandería & Tintorería
            </span>
            <span class="text-xs text-slate-400">Reutilizando Core: Clientes, Operarios, Servicios, Insumos y POS</span>
          </div>
          <h1 class="text-2xl font-bold text-slate-900 mt-1">Planta de Lavandería, Planchado & Percheros</h1>
          <p class="text-sm text-slate-500">
            Control en tiempo real de lotes por kilos y prendas: Recepción → Lavado → Secado → Planchado → Perchero → Entrega POS.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button
            @click="loadDashboard"
            class="px-3.5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition"
          >
            ↻ Actualizar Planta
          </button>
          <router-link
            to="/laundry-intake"
            class="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
          >
            + Recibir Prendas / Kilos
          </router-link>
          <button
            @click="showConfigModal = true"
            class="p-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition"
            title="Configuración de Tarifas de Lavandería"
          >
            ⚙️
          </button>
        </div>
      </div>

      <!-- KPIs Operativos -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-bold uppercase text-slate-400">Tickets Activos</div>
          <div class="text-2xl font-black text-slate-900 mt-1">{{ dashboard.kpis.activeTicketsCount }}</div>
          <div class="text-xs text-indigo-600 mt-0.5 font-medium">En proceso hoy</div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-bold uppercase text-slate-400">Peso en Planta</div>
          <div class="text-2xl font-black text-sky-600 mt-1">{{ dashboard.kpis.totalWeightInPlantKg }} kg</div>
          <div class="text-xs text-slate-500 mt-0.5">Carga acumulada</div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-bold uppercase text-slate-400">Total Prendas</div>
          <div class="text-2xl font-black text-violet-600 mt-1">{{ dashboard.kpis.totalPiecesInPlant }}</div>
          <div class="text-xs text-slate-500 mt-0.5">Piezas registradas</div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-bold uppercase text-slate-400">Listos en Perchero</div>
          <div class="text-2xl font-black text-emerald-600 mt-1">{{ dashboard.kpis.readyForPickupCount }}</div>
          <div class="text-xs text-slate-500 mt-0.5">Para entrega / cobro</div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-bold uppercase text-slate-400">Servicio Express</div>
          <div class="text-2xl font-black text-rose-600 mt-1">{{ dashboard.kpis.expressTicketsCount }}</div>
          <div class="text-xs text-slate-500 mt-0.5">Prioridad alta</div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-bold uppercase text-slate-400">Valor en Planta</div>
          <div class="text-xl font-black text-emerald-700 mt-1">
            ${{ Number(dashboard.kpis.pendingRevenueInPlant || 0).toLocaleString('es-CO') }}
          </div>
          <div class="text-xs text-slate-500 mt-0.5">Por facturar / entregar</div>
        </div>
      </div>

      <!-- Tablero Kanban de Fases de Lavandería -->
      <div v-if="loading" class="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
        Cargando estado de planta de lavandería...
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div
          v-for="col in kanbanColumns"
          :key="col.key"
          class="bg-slate-100/80 rounded-2xl p-3.5 border border-slate-200 flex flex-col space-y-3 min-h-[480px]"
        >
          <!-- Cabecera de Columna -->
          <div class="flex items-center justify-between px-1">
            <div class="flex items-center gap-2">
              <span class="text-base">{{ col.icon }}</span>
              <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                {{ col.label }}
              </h3>
            </div>
            <span class="px-2 py-0.5 text-xs font-bold rounded-full bg-white text-slate-700 shadow-2xs">
              {{ (dashboard.board[col.key] || []).length }}
            </span>
          </div>

          <!-- Tarjetas de Tickets -->
          <div class="space-y-3 flex-1 overflow-y-auto max-h-[620px] pr-0.5">
            <div
              v-if="(dashboard.board[col.key] || []).length === 0"
              class="text-center py-10 text-xs text-slate-400 italic"
            >
              Sin tickets en esta etapa
            </div>

            <div
              v-for="ticket in dashboard.board[col.key]"
              :key="ticket.id"
              class="bg-white rounded-xl p-3.5 shadow-2xs border border-slate-200/90 space-y-2.5 hover:shadow-md transition"
            >
              <div class="flex items-start justify-between gap-2">
                <div>
                  <span class="font-mono font-extrabold text-xs text-indigo-700">
                    {{ ticket.ticketNumber }}
                  </span>
                  <div class="font-bold text-slate-900 text-sm leading-tight mt-0.5">
                    {{ formatCustomerName(ticket.customer) }}
                  </div>
                </div>
                <span
                  v-if="ticket.isExpress"
                  class="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-rose-100 text-rose-700 rounded-full"
                >
                  ⚡ Express
                </span>
              </div>

              <!-- Resumen Peso y Prendas -->
              <div class="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                <span class="px-2 py-0.5 bg-slate-100 rounded-md font-semibold">
                  👕 {{ ticket.totalPieces }} pzas
                </span>
                <span v-if="ticket.totalWeightKg" class="px-2 py-0.5 bg-sky-50 text-sky-700 rounded-md font-semibold">
                  ⚖️ {{ ticket.totalWeightKg }} kg
                </span>
                <span v-if="ticket.rackLocation" class="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md font-semibold">
                  📍 {{ ticket.rackLocation }}
                </span>
              </div>

              <!-- Lista breve de ítems -->
              <div v-if="ticket.items?.length" class="text-[11px] text-slate-500 space-y-0.5 border-t border-slate-100 pt-1.5">
                <div v-for="item in ticket.items.slice(0, 3)" :key="item.id" class="truncate">
                  • {{ item.quantity }}x {{ item.garmentType }}
                  <span class="text-slate-400">({{ formatProcess(item.processType) }})</span>
                </div>
                <div v-if="ticket.items.length > 3" class="text-[10px] text-slate-400 italic">
                  +{{ ticket.items.length - 3 }} prendas adicionales...
                </div>
              </div>

              <!-- Promesa de entrega y Total -->
              <div class="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                <span class="text-[11px] text-slate-400" title="Entrega prometida">
                  🕒 {{ formatShortDate(ticket.promisedAt) }}
                </span>
                <span class="font-extrabold text-slate-900">
                  ${{ Number(ticket.total || 0).toLocaleString('es-CO') }}
                </span>
              </div>

              <!-- Botones de Acción según Fase -->
              <div class="pt-1 flex flex-wrap gap-1.5">
                <button
                  v-if="col.nextStatus"
                  @click="advanceTicket(ticket, col.nextStatus)"
                  class="flex-1 py-1.5 px-2.5 bg-indigo-600 text-white rounded-lg text-[11px] font-bold hover:bg-indigo-700 transition cursor-pointer"
                >
                  Pasar a {{ col.nextLabel }} →
                </button>

                <template v-if="col.key === 'READY'">
                  <router-link
                    v-if="ticket.serviceOrderId && !ticket.serviceOrder?.sale"
                    :to="`/pos?serviceOrderId=${ticket.serviceOrderId}`"
                    class="flex-1 text-center py-1.5 px-2.5 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700 transition"
                  >
                    💳 Cobrar POS
                  </router-link>
                  <button
                    @click="deliverTicket(ticket)"
                    class="flex-1 py-1.5 px-2.5 bg-slate-800 text-white rounded-lg text-[11px] font-bold hover:bg-slate-900 transition cursor-pointer"
                  >
                    ✅ Entregar
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Asignar Perchero al pasar a LISTO (READY) -->
      <div
        v-if="rackModalTicket"
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      >
        <div class="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
          <h3 class="text-base font-bold text-slate-900">
            Ubicar en Perchero / Estante ({{ rackModalTicket.ticketNumber }})
          </h3>
          <p class="text-xs text-slate-500">
            Indica el perchero, gancho o casillero donde queda listo el lote para entrega al cliente:
          </p>
          <input
            v-model="rackLocationInput"
            type="text"
            placeholder="Ej: Perchero A-12 / Casillero 4"
            class="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
          />
          <div class="flex justify-end gap-2 pt-2">
            <button
              @click="rackModalTicket = null"
              class="px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-700"
            >
              Cancelar
            </button>
            <button
              @click="confirmReadyWithRack"
              class="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
            >
              Marcar Listo para Entrega
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Configuración de Lavandería -->
      <div
        v-if="showConfigModal"
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      >
        <div class="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
          <div class="flex items-center justify-between border-b pb-3">
            <h3 class="text-lg font-bold text-slate-900">Configuración de Lavandería & Tintorería</h3>
            <button @click="showConfigModal = false" class="text-slate-400 hover:text-slate-600">✕</button>
          </div>

          <div class="space-y-3 text-sm">
            <div>
              <label class="block font-medium text-slate-700 mb-1">Precio base por Kilogramo ($)</label>
              <input
                v-model.number="configForm.defaultPricePerKg"
                type="number"
                min="0"
                class="w-full border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <label class="block font-medium text-slate-700 mb-1">Recargo por Servicio Express (%)</label>
              <input
                v-model.number="configForm.expressSurchargePct"
                type="number"
                min="0"
                class="w-full border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <label class="block font-medium text-slate-700 mb-1">Tiempo estándar de entrega prometida (Horas)</label>
              <input
                v-model.number="configForm.defaultPromisedHours"
                type="number"
                min="1"
                class="w-full border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>
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
              class="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
            >
              Guardar Tarifas
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
const rackModalTicket = ref<any | null>(null);
const rackLocationInput = ref('');

const kanbanColumns = [
  {
    key: 'RECEIVED',
    label: '1. Recibido',
    icon: '📥',
    nextStatus: 'WASHING',
    nextLabel: 'Lavado',
  },
  {
    key: 'WASHING',
    label: '2. En Lavado',
    icon: '🫧',
    nextStatus: 'DRYING',
    nextLabel: 'Secado',
  },
  {
    key: 'DRYING',
    label: '3. En Secado',
    icon: '💨',
    nextStatus: 'IRONING',
    nextLabel: 'Planchado',
  },
  {
    key: 'IRONING',
    label: '4. Planchado / Doblado',
    icon: '♨️',
    nextStatus: 'READY',
    nextLabel: 'Perchero',
  },
  {
    key: 'READY',
    label: '5. Listo en Perchero',
    icon: '🧥',
    nextStatus: null,
    nextLabel: '',
  },
];

const dashboard = ref<any>({
  kpis: {
    activeTicketsCount: 0,
    readyForPickupCount: 0,
    totalWeightInPlantKg: 0,
    totalPiecesInPlant: 0,
    expressTicketsCount: 0,
    pendingRevenueInPlant: 0,
  },
  board: {
    RECEIVED: [],
    WASHING: [],
    DRYING: [],
    IRONING: [],
    READY: [],
    DELIVERED: [],
  },
  recentTickets: [],
});

const configForm = ref({
  defaultPricePerKg: 6000,
  expressSurchargePct: 30,
  defaultPromisedHours: 24,
});

const getOrgId = () =>
  authStore.currentOrganization?.id || authStore.user?.organizationId || undefined;

const formatCustomerName = (c?: any) => {
  if (!c) return 'Cliente';
  if (c.companyName) return c.companyName;
  const full = `${c.firstName || ''} ${c.lastName || ''}`.trim();
  return full || c.name || 'Cliente';
};

const formatProcess = (proc?: string) => {
  const map: Record<string, string> = {
    WASH_AND_FOLD: 'Lavado y Doblado',
    DRY_CLEAN: 'Lavado en Seco',
    IRON_ONLY: 'Solo Planchado',
    STAIN_REMOVAL: 'Desmanchado',
    DYEING: 'Tintorería',
  };
  return proc ? map[proc] || proc : 'Lavado';
};

const formatShortDate = (dateStr?: string) => {
  if (!dateStr) return 'Sin hora';
  return new Date(dateStr).toLocaleString('es-CO', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const loadDashboard = async () => {
  loading.value = true;
  try {
    const organizationId = getOrgId();
    const [dashRes, cfgRes] = await Promise.all([
      api.get('/laundry/dashboard', { params: { organizationId } }),
      api.get('/laundry/config', { params: { organizationId } }),
    ]);
    dashboard.value = dashRes.data;
    if (cfgRes.data?.settings) {
      configForm.value = {
        ...configForm.value,
        ...cfgRes.data.settings,
      };
    }
  } catch (error) {
    console.error('Error cargando dashboard de lavandería:', error);
  } finally {
    loading.value = false;
  }
};

const advanceTicket = async (ticket: any, nextStatus: string) => {
  if (nextStatus === 'READY') {
    rackModalTicket.value = ticket;
    rackLocationInput.value = ticket.rackLocation || 'Perchero A-01';
    return;
  }

  try {
    const organizationId = getOrgId();
    await api.patch(`/laundry/tickets/${ticket.id}/status`, {
      organizationId,
      status: nextStatus,
    });
    await loadDashboard();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al actualizar etapa del ticket');
  }
};

const confirmReadyWithRack = async () => {
  if (!rackModalTicket.value) return;
  try {
    const organizationId = getOrgId();
    await api.patch(`/laundry/tickets/${rackModalTicket.value.id}/status`, {
      organizationId,
      status: 'READY',
      rackLocation: rackLocationInput.value,
    });
    rackModalTicket.value = null;
    await loadDashboard();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al pasar ticket a Perchero');
  }
};

const deliverTicket = async (ticket: any) => {
  try {
    const organizationId = getOrgId();
    await api.patch(`/laundry/tickets/${ticket.id}/status`, {
      organizationId,
      status: 'DELIVERED',
    });
    await loadDashboard();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al registrar entrega del ticket');
  }
};

const saveConfig = async () => {
  try {
    const organizationId = getOrgId();
    await api.patch('/laundry/config', {
      organizationId,
      ...configForm.value,
    });
    showConfigModal.value = false;
  } catch (error) {
    console.error('Error guardando configuración de lavandería:', error);
  }
};

onMounted(() => {
  loadDashboard();
});
</script>

