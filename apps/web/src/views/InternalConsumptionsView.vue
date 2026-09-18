<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { api } from '../services/api';
import AppLayout from '../components/AppLayout.vue';

// Tipos e Interfaces
interface ConsumptionLineItem {
  id?: string;
  productId: string;
  productName?: string;
  sku?: string;
  quantity: number;
  unitCost: number;
}

interface InternalConsumption {
  id: string;
  code: string;
  date: string;
  warehouse: string;
  reason: 'Uso Administrativo' | 'Mantenimiento / Limpieza' | 'Merma / Danado' | 'Degustacion / Muestras' | 'Otros';
  requestedBy: string;
  department?: string;
  status: 'Aprobado' | 'Borrador' | 'Anulado';
  totalCost: number;
  items: ConsumptionLineItem[];
  notes?: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  cost: number;
}

const authStore = useAuthStore();

// Obtención dinámica de IDs de contexto
const getOrganizationId = () => authStore.user?.organizationId || authStore.currentOrganization?.id || '';
const getBranchId = () => authStore.currentBranch?.id || authStore.user?.branchId || '';

// Estados globales de la vista
const isLoading = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref('');

const availableProducts = ref<Product[]>([]);
const consumptions = ref<InternalConsumption[]>([]);

const mapConsumption = (raw: any): InternalConsumption => {
  const rawMovements = raw.inventoryMovements || raw.items || [];

  // Transformar los movimientos/ítems de la API
  const items: ConsumptionLineItem[] = rawMovements.map((m: any) => {
    const prodId = m.productId || m.product?.id;
    const catalogProduct = availableProducts.value.find((p) => p.id === prodId);

    // Math.abs por si la cantidad de inventario viene negativa en la BD
    const quantity = Math.abs(Number(m.quantity || 0));
    const unitCost = Number(m.unitCost || catalogProduct?.cost || 0);

    return {
      id: m.id,
      productId: prodId,
      productName: m.product?.name || catalogProduct?.name || 'Producto',
      sku: m.product?.sku || catalogProduct?.sku || '',
      quantity,
      unitCost,
    };
  });

  // Calcular el costo total sumando subtotales de ítems
  const totalCost = items.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0);

  // Formatear nombre del solicitante desde objeto user
  const userName = raw.requestedBy || (
    raw.user
      ? `${raw.user.firstName || ''} ${raw.user.lastName || ''}`.trim() || raw.user.email
      : 'N/A'
  );

  return {
    id: raw.id,
    code: raw.code || 'N/A',
    date: raw.createdAt || raw.date,
    warehouse: raw.branch?.name || raw.warehouse || 'Almacén Principal',
    reason: raw.reason || raw.department || 'Uso Administrativo',
    requestedBy: userName,
    department: raw.department,
    status: raw.status || 'Aprobado', // Si viene nulo del backend se asigna 'Aprobado'
    totalCost: raw.totalCost || totalCost,
    items,
    notes: raw.notes,
  };
};

// Carga Inicial de Datos desde la API
const fetchConsumptions = async () => {
  const orgId = getOrganizationId();
  if (!orgId) return;

  isLoading.value = true;
  errorMessage.value = '';
  try {
    const { data } = await api.get('/internal-consumptions', {
      params: {
        organizationId: orgId,
        branchId: getBranchId()
      }
    });
    const rawList = Array.isArray(data) ? data : (data.items || data.data || []);
    consumptions.value = rawList.map(mapConsumption); // <-- Mapeo transformador
  } catch (error: any) {
    console.error('Error fetching consumptions:', error);
    errorMessage.value = error.response?.data?.message || 'Error al cargar los consumos internos.';
  } finally {
    isLoading.value = false;
  }
};

const viewDetail = async (consumption: InternalConsumption) => {
  try {
    const { data } = await api.get(`/internal-consumptions/${consumption.id}`, {
      params: { organizationId: getOrganizationId() }
    });
    selectedDetail.value = mapConsumption(data); // <-- Mapeo en detalle
  } catch {
    selectedDetail.value = consumption;
  }
  isDetailModalOpen.value = true;
};

const fetchProducts = async () => {
  const orgId = getOrganizationId();
  if (!orgId) return;

  try {
    const { data } = await api.get('/products', {
      params: { organizationId: orgId }
    });
    availableProducts.value = Array.isArray(data) ? data : (data.items || data.data || []);
  } catch (error) {
    console.error('Error al cargar catálogo de productos:', error);
  }
};

// Filtros y Búsqueda
const searchQuery = ref('');
const selectedReason = ref('');
const selectedStatus = ref('');

const filteredConsumptions = computed(() => {
  return consumptions.value.filter((item) => {
    const matchesSearch =
      item.code?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.requestedBy?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.warehouse?.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesReason = !selectedReason.value || item.reason === selectedReason.value;
    const matchesStatus = !selectedStatus.value || item.status === selectedStatus.value;
    return matchesSearch && matchesReason && matchesStatus;
  });
});

// KPIs
const totalMonthlyCost = computed(() => {
  return consumptions.value
    .filter((c) => c.status === 'Aprobado')
    .reduce((acc, curr) => acc + Number(curr.totalCost || 0), 0);
});

const totalApprovedCount = computed(() => {
  return consumptions.value.filter((c) => c.status === 'Aprobado').length;
});

// Modales y Formulario
const isCreateModalOpen = ref(false);
const isDetailModalOpen = ref(false);
const selectedDetail = ref<InternalConsumption | null>(null);

const form = ref({
  warehouse: 'Almacén Principal',
  reason: 'Uso Administrativo' as InternalConsumption['reason'],
  requestedBy: '',
  department: '',
  notes: '',
  items: [] as ConsumptionLineItem[]
});

const selectedProductIdToAdd = ref('');
const selectedQtyToAdd = ref(1);

const formatCurrency = (value: number | string) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
};

const addLineItem = () => {
  if (!selectedProductIdToAdd.value) return;
  const prod = availableProducts.value.find((p) => p.id === selectedProductIdToAdd.value);
  if (!prod) return;

  const existing = form.value.items.find((i) => i.productId === prod.id);
  if (existing) {
    existing.quantity += selectedQtyToAdd.value;
  } else {
    form.value.items.push({
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      quantity: selectedQtyToAdd.value,
      unitCost: Number(prod.cost || 0)
    });
  }

  selectedProductIdToAdd.value = '';
  selectedQtyToAdd.value = 1;
};

const removeLineItem = (index: number) => {
  form.value.items.splice(index, 1);
};

const formTotalCost = computed(() => {
  return form.value.items.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0);
});

const openCreateModal = () => {
  form.value = {
    warehouse: 'Almacén Principal',
    reason: 'Uso Administrativo',
    requestedBy: '',
    department: '',
    notes: '',
    items: []
  };
  isCreateModalOpen.value = true;
};

const closeModal = () => {
  isCreateModalOpen.value = false;
};

// Guardar consumo interno
const saveConsumption = async (status: 'Aprobado' | 'Borrador') => {
  if (form.value.items.length === 0) {
    alert('Debe agregar al menos un producto al consumo interno.');
    return;
  }

  const orgId = getOrganizationId();
  const branchId = getBranchId();

  if (!orgId || !branchId) {
    alert('No se pudo determinar la Organización o Sucursal actual. Por favor re-inicia tu sesión.');
    return;
  }

  isSubmitting.value = true;

 // En InternalConsumptionsView.vue
const payload = {
  organizationId: orgId, // O la variable donde guardes el ID de la organización
  branchId: branchId,       // O la variable donde guardes la sucursal activa
  userId: authStore.user.id,                 // O el ID del usuario en sesión
  department: form.value.department,
  notes: form.value.notes,
  items: form.value.items.map((item) => ({
    productId: item.productId,
    quantity: Number(item.quantity),
  })),
};


  try {
    await api.post('/internal-consumptions', payload);
    closeModal();
    fetchConsumptions();
  } catch (error: any) {
    console.error('Error de backend al guardar consumo:', error.response?.data?.message);
    const msg = error.response?.data?.message;
    alert(Array.isArray(msg) ? msg.join(', ') : (msg || 'Error al guardar el consumo interno.'));
  } finally {
    isSubmitting.value = false;
  }
};



const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Aprobado':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Borrador':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Anulado':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

onMounted(() => {
  fetchConsumptions();
  fetchProducts();
});
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Encabezado de la página -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Consumo Interno y Bajas</h1>
          <p class="text-sm text-slate-500 mt-1">Registro de salidas de stock por consumo propio, mermas o muestras comerciales.</p>
        </div>
        <button
          @click="openCreateModal"
          class="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all duration-200 text-sm gap-2"
        >
          <span>✨</span> Registrar Consumo
        </button>
      </div>

      <!-- Tarjetas de Métricas -->
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Salidas Aprobadas</span>
          <h2 class="mt-2 text-2xl font-black text-slate-900">
            {{ formatCurrency(totalMonthlyCost) }}
          </h2>
        </div>

        <div class="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Registros Aprobados</span>
          <h2 class="mt-2 text-2xl font-black text-blue-600">
            {{ totalApprovedCount }} <span class="text-xs font-medium text-slate-400">Reg.</span>
          </h2>
        </div>

        <div class="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Estado Operativo</span>
          <h2 class="mt-2 text-xl font-black text-slate-900">
            Activo
          </h2>
        </div>
      </div>

      <!-- Alerta de Error si ocurre -->
      <div v-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        ⚠️ {{ errorMessage }}
      </div>

      <!-- Filtros de búsqueda -->
      <div class="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por código, responsable o almacén..."
          class="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
        <select
          v-model="selectedReason"
          class="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
        >
          <option value="">Todos los Motivos</option>
          <option value="Uso Administrativo">Uso Administrativo</option>
          <option value="Mantenimiento / Limpieza">Mantenimiento / Limpieza</option>
          <option value="Merma / Danado">Merma / Dañado</option>
          <option value="Degustacion / Muestras">Degustación / Muestras</option>
          <option value="Otros">Otros</option>
        </select>
        <select
          v-model="selectedStatus"
          class="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
        >
          <option value="">Todos los Estados</option>
          <option value="Aprobado">Aprobado</option>
          <option value="Borrador">Borrador</option>
          <option value="Anulado">Anulado</option>
        </select>
      </div>

      <!-- Tabla principal -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-100 text-left">
            <thead class="bg-slate-50/75">
              <tr>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Código / Fecha</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Almacén</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Motivo</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Solicitante</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Costo Total</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Estado</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm bg-white">
              <tr v-for="item in filteredConsumptions" :key="item.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <div class="font-bold text-slate-900 font-mono">{{ item.code || 'N/A' }}</div>
                  <div class="text-xs text-slate-400 mt-0.5 font-mono">{{ item.date ? new Date(item.date).toLocaleDateString() : '-' }}</div>
                </td>
                <td class="px-6 py-4 font-medium text-slate-700 whitespace-nowrap">{{ item.warehouse || 'Principal' }}</td>
                <td class="px-6 py-4">
                  <span class="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200">
                    {{ item.reason }}
                  </span>
                </td>
                <td class="px-6 py-4 text-slate-600">{{ item.requestedBy || 'N/A' }}</td>
                <td class="px-6 py-4 text-right font-mono font-bold text-slate-900">
                  {{ formatCurrency(item.totalCost) }}
                </td>
                <td class="px-6 py-4 text-center">
                  <span :class="['inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', getStatusBadge(item.status)]">
                    {{ item.status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                  <button
                    @click="viewDetail(item)"
                    class="font-semibold text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Ver Detalle
                  </button>
                </td>
              </tr>
              <tr v-if="filteredConsumptions.length === 0">
                <td colspan="7" class="px-6 py-12 text-center text-slate-400">
                  <div class="flex flex-col items-center justify-center space-y-2">
                    <span class="text-3xl">📋</span>
                    <p class="text-sm font-medium">No hay consumos registrados.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal Crear Consumo Interno -->
      <div v-if="isCreateModalOpen" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
          <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 class="text-lg font-bold text-slate-900">Nuevo Registro de Consumo Interno</h3>
            <button @click="closeModal" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg">✕</button>
          </div>

          <div class="p-6 space-y-4 overflow-y-auto flex-1">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Almacén Origen</label>
                <select v-model="form.warehouse" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
                  <option value="Almacén Principal">Almacén Principal</option>
                  <option value="Sucursal Norte">Sucursal Norte</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Motivo</label>
                <select v-model="form.reason" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
                  <option value="Uso Administrativo">Uso Administrativo</option>
                  <option value="Mantenimiento / Limpieza">Mantenimiento / Limpieza</option>
                  <option value="Merma / Danado">Merma / Dañado</option>
                  <option value="Degustacion / Muestras">Degustación / Muestras</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Solicitante / Responsable</label>
                <input v-model="form.requestedBy" type="text" placeholder="Ej. Juan Pérez" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Departamento</label>
                <input v-model="form.department" type="text" placeholder="Ej. Mantenimiento" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
            </div>

            <!-- Selección de Productos -->
            <div class="pt-2 border-t border-slate-100">
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Agregar Productos</label>
              <div class="flex gap-2">
                <select v-model="selectedProductIdToAdd" class="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
                  <option value="" disabled>Seleccione un producto...</option>
                  <option v-for="p in availableProducts" :key="p.id" :value="p.id">
                    {{ p.name }} ({{ p.sku }}) - {{ formatCurrency(p.cost) }}
                  </option>
                </select>
                <input v-model.number="selectedQtyToAdd" type="number" min="1" class="w-20 rounded-xl border border-slate-200 px-3 py-2 text-sm text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                <button @click="addLineItem" type="button" class="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-semibold transition-colors">
                  + Añadir
                </button>
              </div>
            </div>

            <!-- Lista de Ítems Agregados -->
            <div class="border border-slate-200 rounded-xl overflow-hidden">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th class="p-2.5">Producto</th>
                    <th class="p-2.5 text-center">Cant.</th>
                    <th class="p-2.5 text-right">Costo Unit.</th>
                    <th class="p-2.5 text-right">Subtotal</th>
                    <th class="p-2.5 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="(item, idx) in form.items" :key="item.productId">
                    <td class="p-2.5 font-semibold text-slate-800">{{ item.productName }}</td>
                    <td class="p-2.5 text-center font-mono">{{ item.quantity }}</td>
                    <td class="p-2.5 text-right font-mono">{{ formatCurrency(item.unitCost) }}</td>
                    <td class="p-2.5 text-right font-mono font-bold text-slate-900">{{ formatCurrency(item.quantity * item.unitCost) }}</td>
                    <td class="p-2.5 text-center">
                      <button @click="removeLineItem(idx)" class="text-rose-600 hover:text-rose-800 font-bold">✕</button>
                    </td>
                  </tr>
                  <tr v-if="form.items.length === 0">
                    <td colspan="5" class="p-4 text-center text-slate-400 italic">No has agregado productos a este registro.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="flex justify-between items-center font-bold text-slate-900 text-base pt-2">
              <span>Costo Total Estimado:</span>
              <span class="font-mono text-lg font-black">{{ formatCurrency(formTotalCost) }}</span>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Observaciones / Justificación</label>
              <textarea v-model="form.notes" rows="2" class="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Escribe detalles adicionales..."></textarea>
            </div>
          </div>

          <div class="border-t border-slate-100 px-6 py-4 bg-slate-50/50 flex justify-end gap-3">
            <button @click="closeModal" type="button" class="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-100 transition-colors">Cancelar</button>
            <button @click="saveConsumption('Borrador')" :disabled="isSubmitting" type="button" class="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-50">Guardar Borrador</button>
            <button @click="saveConsumption('Aprobado')" :disabled="isSubmitting" type="button" class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-50">Aprobar y Descontar Stock</button>
          </div>
        </div>
      </div>

      <!-- Modal Detalle -->
      <div v-if="isDetailModalOpen && selectedDetail" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-100">
          <div class="flex justify-between items-start border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-lg font-bold text-slate-900 font-mono">{{ selectedDetail.code }}</h3>
              <p class="text-xs text-slate-400 font-mono">{{ selectedDetail.date ? new Date(selectedDetail.date).toLocaleDateString() : '-' }}</p>
            </div>
            <span :class="['inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', getStatusBadge(selectedDetail.status)]">
              {{ selectedDetail.status }}
            </span>
          </div>

          <div class="space-y-1 text-sm text-slate-700">
            <p><strong>Almacén:</strong> {{ selectedDetail.warehouse }}</p>
            <p><strong>Motivo:</strong> {{ selectedDetail.reason }}</p>
            <p><strong>Solicitante:</strong> {{ selectedDetail.requestedBy }}</p>
            <p v-if="selectedDetail.notes"><strong>Notas:</strong> {{ selectedDetail.notes }}</p>
          </div>

          <div class="border border-slate-200 rounded-xl overflow-hidden">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th class="p-2">Producto</th>
                  <th class="p-2 text-center">Cant.</th>
                  <th class="p-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="item in selectedDetail.items" :key="item.productId">
                  <td class="p-2 font-medium text-slate-800">{{ item.productName || item.productId }}</td>
                  <td class="p-2 text-center font-mono">{{ item.quantity }}</td>
                  <td class="p-2 text-right font-mono font-bold">{{ formatCurrency(item.quantity * item.unitCost) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex justify-between items-center font-bold text-slate-900 border-t border-slate-100 pt-3">
            <span>Total:</span>
            <span class="font-mono text-base font-black">{{ formatCurrency(selectedDetail.totalCost) }}</span>
          </div>

          <div class="flex justify-end pt-2">
            <button @click="isDetailModalOpen = false" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
