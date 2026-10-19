<template>
  <AppLayout>
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- Encabezado -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Recepción de Prendas, Pesaje & Tickets de Lavandería</h1>
          <p class="text-sm text-slate-500">
            Ingreso de lotes por kilogramo o por prenda individual, registro de manchas/daños previos y generación automática de Orden de Servicio.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <router-link
            to="/laundry-dashboard"
            class="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition"
          >
            🧺 Ver Planta Kanban
          </router-link>
        </div>
      </div>

      <!-- Formulario de Recepción de Prendas -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div class="flex items-center justify-between border-b pb-3">
          <h2 class="text-lg font-bold text-slate-900">Nuevo Ticket de Recepción</h2>
          <span class="text-xs text-slate-500">Genera etiqueta de lote y orden para POS</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div class="md:col-span-2">
            <label class="block font-medium text-slate-700 mb-1">Cliente (Core Customer) *</label>
            <select v-model="form.customerId" class="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white">
              <option value="">Seleccione cliente...</option>
              <option v-for="c in customers" :key="c.id" :value="c.id">
                {{ formatCustomerName(c) }} ({{ c.identificationNumber || c.phoneNumber || 'Cliente' }})
              </option>
            </select>
          </div>

          <div>
            <label class="block font-medium text-slate-700 mb-1">Operario Responsable</label>
            <select v-model="form.workerId" class="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white">
              <option value="">Sin asignar aún...</option>
              <option v-for="w in workers" :key="w.id" :value="w.id">
                {{ formatWorkerName(w) }}
              </option>
            </select>
          </div>

          <div>
            <label class="block font-medium text-slate-700 mb-1">Modalidad de Tarifa</label>
            <select v-model="form.pricingMode" class="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white">
              <option value="MIXED">Mixto (Kilos + Prendas Especiales)</option>
              <option value="BY_WEIGHT">Solo por Peso (Kilogramos)</option>
              <option value="BY_GARMENT">Solo por Prenda Individual</option>
            </select>
          </div>
        </div>

        <!-- Bloque de Pesaje y Condiciones de Entrega -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm">
          <div v-if="form.pricingMode !== 'BY_GARMENT'">
            <label class="block text-xs font-bold text-slate-600 mb-1">Peso en Báscula (kg)</label>
            <input
              v-model.number="form.totalWeightKg"
              type="number"
              step="0.1"
              min="0"
              placeholder="Ej: 4.5"
              class="w-full border border-slate-300 rounded-xl px-3 py-1.5 bg-white"
            />
          </div>

          <div v-if="form.pricingMode !== 'BY_GARMENT'">
            <label class="block text-xs font-bold text-slate-600 mb-1">Tarifa por Kg ($)</label>
            <input
              v-model.number="form.pricePerKg"
              type="number"
              min="0"
              class="w-full border border-slate-300 rounded-xl px-3 py-1.5 bg-white"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-600 mb-1">Canasta / Perchero Inicial</label>
            <input
              v-model="form.rackLocation"
              type="text"
              placeholder="Ej: Canasta #08"
              class="w-full border border-slate-300 rounded-xl px-3 py-1.5 bg-white"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-600 mb-1">Fecha/Hora Prometida</label>
            <input
              v-model="form.promisedAt"
              type="datetime-local"
              class="w-full border border-slate-300 rounded-xl px-3 py-1.5 bg-white"
            />
          </div>

          <div class="flex items-center pt-5">
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="form.isExpress" type="checkbox" class="rounded text-rose-600" />
              <span class="text-xs font-extrabold text-rose-700">⚡ Servicio Express (+{{ expressPct }}%)</span>
            </label>
          </div>
        </div>

        <!-- Botones Rápidos de Prendas Frecuentes -->
        <div class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-500">
              Detalle de Prendas Recibidas e Inspección de Estado
            </span>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="preset in garmentPresets"
                :key="preset.name"
                type="button"
                @click="addPresetGarment(preset)"
                class="px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition cursor-pointer"
              >
                + {{ preset.name }}
              </button>
              <button
                type="button"
                @click="addEmptyGarment"
                class="px-2.5 py-1 text-xs font-semibold bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition cursor-pointer"
              >
                + Otra Prenda
              </button>
            </div>
          </div>

          <div v-if="form.items.length === 0" class="text-center py-6 border border-dashed border-slate-300 rounded-xl text-xs text-slate-400">
            Haz clic en los botones rápidos de arriba para detallar las prendas del cliente (Camisas, Pantalones, Edredones, Trajes, etc.)
          </div>

          <div
            v-for="(item, idx) in form.items"
            :key="idx"
            class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs"
          >
            <div class="sm:col-span-3">
              <label class="block text-[10px] text-slate-400">Prenda / Descripción</label>
              <input
                v-model="item.garmentType"
                type="text"
                placeholder="Ej: Camisa sedalina"
                class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
              />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-[10px] text-slate-400">Proceso</label>
              <select v-model="item.processType" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 bg-white">
                <option value="WASH_AND_FOLD">Lavado y Doblado</option>
                <option value="DRY_CLEAN">Lavado en Seco</option>
                <option value="IRON_ONLY">Solo Planchado</option>
                <option value="STAIN_REMOVAL">Desmanchado</option>
                <option value="DYEING">Tintorería</option>
              </select>
            </div>

            <div class="sm:col-span-2">
              <label class="block text-[10px] text-slate-400">Color / Marca</label>
              <input
                v-model="item.color"
                type="text"
                placeholder="Blanco / Zara"
                class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
              />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-[10px] text-slate-400">Manchas / Detalles previos</label>
              <input
                v-model="item.defectsNotes"
                type="text"
                placeholder="Mancha cuello, sin botón..."
                class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
              />
            </div>

            <div class="sm:col-span-1">
              <label class="block text-[10px] text-slate-400">Cant.</label>
              <input
                v-model.number="item.quantity"
                type="number"
                min="1"
                class="w-full border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-center"
              />
            </div>

            <div class="sm:col-span-1">
              <label class="block text-[10px] text-slate-400">Precio Unit.</label>
              <input
                v-model.number="item.unitPrice"
                type="number"
                min="0"
                class="w-full border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
              />
            </div>

            <div class="sm:col-span-1 flex items-center justify-end pt-4">
              <button
                type="button"
                @click="form.items.splice(idx, 1)"
                class="text-rose-500 hover:text-rose-700 font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <!-- Resumen de Liquidación y Botón Guardar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <div class="flex flex-wrap gap-6 text-sm">
            <div>
              <span class="text-slate-500">Cargo por Peso:</span>
              <span class="font-bold text-slate-800 ml-1">${{ weightSubtotal.toLocaleString('es-CO') }}</span>
            </div>
            <div>
              <span class="text-slate-500">Cargo Prendas:</span>
              <span class="font-bold text-slate-800 ml-1">${{ garmentsSubtotal.toLocaleString('es-CO') }}</span>
            </div>
            <div v-if="form.isExpress">
              <span class="text-rose-600">Recargo Express:</span>
              <span class="font-bold text-rose-700 ml-1">+${{ expressAmount.toLocaleString('es-CO') }}</span>
            </div>
            <div class="text-base">
              <span class="font-bold text-slate-700">Total Ticket:</span>
              <span class="font-black text-indigo-700 ml-1">${{ grandTotal.toLocaleString('es-CO') }}</span>
            </div>
          </div>

          <button
            @click="submitTicket"
            :disabled="submitting"
            class="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-sm cursor-pointer"
          >
            {{ submitting ? 'Generando Ticket...' : 'Generar Ticket de Recepción' }}
          </button>
        </div>
      </div>

      <!-- Listado Histórico y Buscador de Tickets -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Directorio de Tickets de Lavandería</h2>
            <p class="text-xs text-slate-500">Búsqueda rápida por número de ticket, cliente o perchero</p>
          </div>
          <div class="flex items-center gap-2">
            <input
              v-model="searchQuery"
              @input="loadTickets"
              type="text"
              placeholder="Buscar LAV-..., cliente o perchero..."
              class="border border-slate-300 rounded-xl px-3 py-1.5 text-xs w-64"
            />
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                <th class="py-3 px-4">Ticket</th>
                <th class="py-3 px-4">Cliente</th>
                <th class="py-3 px-4">Estado</th>
                <th class="py-3 px-4">Prendas / Peso</th>
                <th class="py-3 px-4">Perchero</th>
                <th class="py-3 px-4">Prometido</th>
                <th class="py-3 px-4">Total</th>
                <th class="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm">
              <tr v-if="tickets.length === 0">
                <td colspan="8" class="py-8 text-center text-slate-400">
                  No se encontraron tickets registrados.
                </td>
              </tr>
              <tr v-for="t in tickets" :key="t.id" class="hover:bg-slate-50">
                <td class="py-3 px-4 font-mono font-bold text-indigo-700 text-xs">
                  {{ t.ticketNumber }}
                  <span v-if="t.isExpress" class="ml-1 text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full">
                    ⚡
                  </span>
                </td>
                <td class="py-3 px-4 font-medium text-slate-900 text-xs">
                  {{ formatCustomerName(t.customer) }}
                </td>
                <td class="py-3 px-4">
                  <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                    {{ t.status }}
                  </span>
                </td>
                <td class="py-3 px-4 text-xs text-slate-600">
                  {{ t.totalPieces }} pzas
                  <span v-if="t.totalWeightKg"> • {{ t.totalWeightKg }} kg</span>
                </td>
                <td class="py-3 px-4 text-xs font-semibold text-amber-800">
                  {{ t.rackLocation || '—' }}
                </td>
                <td class="py-3 px-4 text-xs text-slate-500">
                  {{ t.promisedAt ? new Date(t.promisedAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—' }}
                </td>
                <td class="py-3 px-4 font-bold text-slate-900 text-xs">
                  ${{ Number(t.total || 0).toLocaleString('es-CO') }}
                </td>
                <td class="py-3 px-4 text-right space-x-2">
                  <router-link
                    v-if="t.serviceOrderId"
                    :to="`/pos?serviceOrderId=${t.serviceOrderId}`"
                    class="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
                  >
                    Cobrar POS
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppLayout from '../components/AppLayout.vue';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();
const submitting = ref(false);
const searchQuery = ref('');

const customers = ref<any[]>([]);
const workers = ref<any[]>([]);
const tickets = ref<any[]>([]);
const expressPct = ref(30);

const garmentPresets = [
  { name: 'Camisa', processType: 'IRON_ONLY', price: 6500 },
  { name: 'Pantalón / Jean', processType: 'WASH_AND_FOLD', price: 7500 },
  { name: 'Traje 2 Piezas', processType: 'DRY_CLEAN', price: 24000 },
  { name: 'Edredón / Plumón', processType: 'WASH_AND_FOLD', price: 28000 },
  { name: 'Vestido Fiesta', processType: 'DRY_CLEAN', price: 26000 },
  { name: 'Chaqueta / Abrigo', processType: 'DRY_CLEAN', price: 18000 },
];

const form = ref({
  customerId: '',
  workerId: '',
  pricingMode: 'MIXED',
  totalWeightKg: 0,
  pricePerKg: 6000,
  rackLocation: '',
  promisedAt: '',
  isExpress: false,
  notes: '',
  items: [] as Array<{
    garmentType: string;
    processType: string;
    color: string;
    defectsNotes: string;
    quantity: number;
    unitPrice: number;
  }>,
});

const getOrgId = () =>
  authStore.currentOrganization?.id || authStore.user?.organizationId || undefined;

const formatCustomerName = (c?: any) => {
  if (!c) return 'Cliente';
  if (c.companyName) return c.companyName;
  const full = `${c.firstName || ''} ${c.lastName || ''}`.trim();
  return full || c.name || 'Cliente';
};

const formatWorkerName = (w?: any) => {
  if (!w) return 'Operario';
  const full = `${w.firstName || ''} ${w.lastName || ''}`.trim();
  return full || w.fullName || w.name || 'Operario';
};

const weightSubtotal = computed(() => {
  if (form.value.pricingMode === 'BY_GARMENT') return 0;
  return Number(form.value.totalWeightKg || 0) * Number(form.value.pricePerKg || 0);
});

const garmentsSubtotal = computed(() =>
  form.value.items.reduce(
    (acc, it) => acc + Number(it.quantity || 1) * Number(it.unitPrice || 0),
    0,
  ),
);

const expressAmount = computed(() => {
  if (!form.value.isExpress) return 0;
  return Math.round((weightSubtotal.value + garmentsSubtotal.value) * (expressPct.value / 100));
});

const grandTotal = computed(
  () => weightSubtotal.value + garmentsSubtotal.value + expressAmount.value,
);

const addPresetGarment = (preset: { name: string; processType: string; price: number }) => {
  form.value.items.push({
    garmentType: preset.name,
    processType: preset.processType,
    color: '',
    defectsNotes: '',
    quantity: 1,
    unitPrice: preset.price,
  });
};

const addEmptyGarment = () => {
  form.value.items.push({
    garmentType: '',
    processType: 'WASH_AND_FOLD',
    color: '',
    defectsNotes: '',
    quantity: 1,
    unitPrice: 0,
  });
};

const loadCatalogs = async () => {
  const organizationId = getOrgId();
  try {
    const [custRes, workRes, cfgRes] = await Promise.all([
      api.get('/customers', { params: { organizationId } }),
      api.get('/service-workers', { params: { organizationId } }),
      api.get('/laundry/config', { params: { organizationId } }),
    ]);
    customers.value = Array.isArray(custRes.data) ? custRes.data : custRes.data?.data || [];
    workers.value = Array.isArray(workRes.data) ? workRes.data : workRes.data?.data || [];
    if (customers.value.length > 0 && !form.value.customerId) {
      form.value.customerId = customers.value[0].id;
    }
    if (cfgRes.data?.settings) {
      form.value.pricePerKg = Number(cfgRes.data.settings.defaultPricePerKg ?? 6000);
      expressPct.value = Number(cfgRes.data.settings.expressSurchargePct ?? 30);
    }
  } catch (error) {
    console.error('Error cargando catálogos de lavandería:', error);
  }
};

const loadTickets = async () => {
  try {
    const organizationId = getOrgId();
    const res = await api.get('/laundry/tickets', {
      params: {
        organizationId,
        search: searchQuery.value || undefined,
      },
    });
    tickets.value = res.data || [];
  } catch (error) {
    console.error('Error cargando tickets de lavandería:', error);
  }
};

const submitTicket = async () => {
  if (!form.value.customerId) {
    alert('Selecciona un cliente para recibir las prendas.');
    return;
  }
  const validItems = form.value.items.filter((i) => i.garmentType.trim() !== '');
  if (validItems.length === 0 && Number(form.value.totalWeightKg || 0) <= 0) {
    alert('Ingresa el peso en kilogramos o agrega al menos una prenda.');
    return;
  }

  submitting.value = true;
  try {
    const organizationId = getOrgId();
    await api.post('/laundry/tickets', {
      organizationId,
      customerId: form.value.customerId,
      workerId: form.value.workerId || undefined,
      pricingMode: form.value.pricingMode,
      totalWeightKg: Number(form.value.totalWeightKg || 0),
      pricePerKg: Number(form.value.pricePerKg || 0),
      rackLocation: form.value.rackLocation || undefined,
      promisedAt: form.value.promisedAt || undefined,
      isExpress: form.value.isExpress,
      notes: form.value.notes || undefined,
      items: validItems,
    });
    router.push('/laundry-dashboard');
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al crear el ticket de lavandería');
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  loadCatalogs();
  loadTickets();
});
</script>

