<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
import AppLayout from '../components/AppLayout.vue';

const authStore = useAuthStore();
const router = useRouter();

// Estados de listas y tablas
const serviceOrders = ref<any[]>([]);
const workers = ref<any[]>([]);
const customers = ref<any[]>([]);
const availableProducts = ref<any[]>([]);
const serviceCatalog = ref<any[]>([]);
const loading = ref(false);
const loadingSubmit = ref(false);

// Modales
const showCreateModal = ref(false);
const showDetailModal = ref(false);
const selectedOrder = ref<any>(null);

// Formulario para nuevo material/repuesto
const newMaterial = ref({
  productId: '',
  quantity: 1,
});

// Filtros de búsqueda y paginación local
const filterStatus = ref<string>('ALL');
const filterWorkerId = ref<string>('ALL');
const searchQuery = ref<string>(''); // <- Filtro de búsqueda por texto (N° orden, cliente, activo)

// Búsqueda de clientes en el modal
const customerSearch = ref('');
const loadingCustomers = ref(false);

// Generador de número de orden por defecto
const generateOrderNumber = () => `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

// Formulario de creación
const initialForm = {
  customerId: '',
  orderNumber: '',
  assetName: '',
  assignedWorkerId: '',
  serviceItemId: '',
  scheduledAt: new Date().toISOString().slice(0, 16),
};

const form = ref({ ...initialForm });

// Cargar Órdenes de Servicio
const fetchServiceOrders = async () => {
  loading.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    if (!orgId) return;

    const branchId = authStore.currentBranch?.id;

    const params: Record<string, any> = {
      organizationId: orgId,
      ...(branchId ? { branchId } : {}),
      ...(filterStatus.value !== 'ALL' ? { status: filterStatus.value } : {}),
      ...(filterWorkerId.value !== 'ALL' ? { assignedWorkerId: filterWorkerId.value } : {}),
    };

    const { data } = await api.get('/service-orders', { params });
    serviceOrders.value = Array.isArray(data) ? data : (data.items || data.data || []);
  } catch (error) {
    console.error('Error al cargar órdenes de servicio:', error);
  } finally {
    loading.value = false;
  }
};

// Cargar Técnicos / Personal
const fetchWorkers = async () => {
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    if (!orgId) return;

    const { data } = await api.get('/service-workers', {
      params: { organizationId: orgId, isActive: true }
    });
    workers.value = Array.isArray(data) ? data : (data.items || data.data || []);
  } catch (error) {
    console.error('Error al cargar personal de servicio:', error);
  }
};

// Cargar Productos del Inventario
const fetchProducts = async () => {
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    if (!orgId) return;
    const { data } = await api.get('/products', { params: { organizationId: orgId } });
    availableProducts.value = Array.isArray(data) ? data : (data.items || data.data || []);
  } catch (error) {
    console.error('Error al cargar productos del inventario:', error);
  }
};

// Cargar el Catálogo de Servicios
const fetchServiceCatalog = async () => {
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    if (!orgId) return;
    const { data } = await api.get('/service-items', { params: { organizationId: orgId } });
    serviceCatalog.value = Array.isArray(data) ? data : (data.items || data.data || []);
  } catch (error) {
    console.error('Error al cargar el catálogo de servicios:', error);
  }
};

// Buscar clientes para el selector
const searchCustomers = async () => {
  if (!customerSearch.value || customerSearch.value.length < 2) return;
  loadingCustomers.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const { data } = await api.get('/customers', {
      params: { organizationId: orgId, search: customerSearch.value },
    });
    customers.value = Array.isArray(data) ? data : (data.items || data.data || []);
  } catch (error) {
    console.error('Error buscando clientes:', error);
  } finally {
    loadingCustomers.value = false;
  }
};

// Guardar nueva Orden de Servicio
// Guardar nueva Orden de Servicio
const saveOrder = async () => {
  loadingSubmit.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const branchId = authStore.currentBranch?.id;

    // Buscar el servicio seleccionado en el catálogo para extraer su precio base si es necesario
    const selectedService = serviceCatalog.value.find(s => s.id === form.value.serviceItemId);

    const payload = {
      organizationId: orgId,
      branchId: branchId,
      customerId: form.value.customerId,
      orderNumber: form.value.orderNumber,
      assetName: form.value.assetName,
      assignedWorkerId: form.value.assignedWorkerId || undefined,
      serviceItemId: form.value.serviceItemId || undefined,
      // Si tu backend requiere un precio o costo inicial basado en el catálogo:
      laborTotal: selectedService ? Number(selectedService.basePrice || selectedService.price || 0) : 0,
      scheduledAt: form.value.scheduledAt ? new Date(form.value.scheduledAt).toISOString() : undefined,
    };

    await api.post('/service-orders', payload);
    showCreateModal.value = false;
    form.value = { ...initialForm };
    customerSearch.value = '';
    fetchServiceOrders();
  } catch (error: any) {
    const msg = error?.response?.data?.message;
    alert(Array.isArray(msg) ? msg.join('\n') : (msg || 'Error al crear la orden de servicio'));
  } finally {
    loadingSubmit.value = false;
  }
};
// Cambiar estado de la orden
const updateOrderStatus = async (orderId: string, endpointAction: string) => {
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    await api.patch(`/service-orders/${orderId}/${endpointAction}`, {}, {
      params: { organizationId: orgId }
    });
    fetchServiceOrders();
    if (showDetailModal.value && selectedOrder.value?.id === orderId) {
      const { data } = await api.get(`/service-orders/${orderId}`, { params: { organizationId: orgId } });
      selectedOrder.value = data;
    }
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al actualizar el estado de la orden');
  }
};

// Redirigir al POS inyectando la serviceOrderId en la URL
function goToPosWithServiceOrder(orderId: string) {
  router.push({ path: '/pos', query: { serviceOrderId: orderId } });
}

// Agregar Material / Repuesto
const addOrderMaterial = async () => {
  if (!newMaterial.value.productId) return;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const productObj = availableProducts.value.find(p => p.id === newMaterial.value.productId);

    const unitPrice = Number(productObj?.price || productObj?.salePrice || 1);
    const unitCost = Number(productObj?.cost || productObj?.purchasePrice || productObj?.unitCost || unitPrice);

    await api.post(`/service-order-materials`, {
      serviceOrderId: selectedOrder.value.id,
      productId: newMaterial.value.productId,
      quantity: Number(newMaterial.value.quantity),
      unitPrice: unitPrice > 0 ? unitPrice : 1,
      unitCost: unitCost > 0 ? unitCost : 1,
    }, {
      params: { organizationId: orgId }
    });

    const { data } = await api.get(`/service-orders/${selectedOrder.value.id}`, { params: { organizationId: orgId } });
    selectedOrder.value = data;
    newMaterial.value = { productId: '', quantity: 1 };
    fetchServiceOrders();
  } catch (error: any) {
    const msg = error?.response?.data?.message;
    alert(Array.isArray(msg) ? msg.join('\n') : (msg || 'Error al agregar el material'));
  }
};

// Eliminar Material / Repuesto
const removeOrderMaterial = async (materialId: string) => {
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    await api.delete(`/service-order-materials/${materialId}`, {
      params: { organizationId: orgId }
    });

    const { data } = await api.get(`/service-orders/${selectedOrder.value.id}`, { params: { organizationId: orgId } });
    selectedOrder.value = data;
    fetchServiceOrders();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al eliminar el material');
  }
};

// Filtro computado de órdenes de servicio para la búsqueda local por texto
const filteredServiceOrders = computed(() => {
  if (!searchQuery.value.trim()) return serviceOrders.value;
  const query = searchQuery.value.toLowerCase();
  return serviceOrders.value.filter(order => {
    const orderNum = (order.orderNumber || order.code || order.id).toLowerCase();
    const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.toLowerCase();
    const asset = (order.assetName || order.title || '').toLowerCase();
    return orderNum.includes(query) || customerName.includes(query) || asset.includes(query);
  });
});

// Auxiliares UI
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'PENDING':
      return { text: 'Pendiente', class: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'IN_PROGRESS':
      return { text: 'En Proceso', class: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'WAITING_PARTS':
      return { text: 'Esperando Repuestos', class: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'COMPLETED':
      return { text: 'Completada', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'BILLED':
      return { text: 'Facturada', class: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'CANCELLED':
      return { text: 'Cancelada', class: 'bg-rose-50 text-rose-700 border-rose-200' };
    default:
      return { text: status, class: 'bg-slate-50 text-slate-700 border-slate-200' };
  }
};

const openCreateModal = () => {
  form.value = {
    ...initialForm,
    orderNumber: generateOrderNumber()
  };
  showCreateModal.value = true;
};

const openDetailModal = async (order: any) => {
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const { data } = await api.get(`/service-orders/${order.id}`, { params: { organizationId: orgId } });
    selectedOrder.value = data;
  } catch (error) {
    selectedOrder.value = order;
  }
  showDetailModal.value = true;
};

watch([filterStatus, filterWorkerId], () => {
  fetchServiceOrders();
});

onMounted(() => {
  fetchWorkers();
  fetchProducts();
  fetchServiceCatalog();
  fetchServiceOrders();
});
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Órdenes de Servicio</h1>
          <p class="text-sm text-slate-500 mt-1">Gestión, seguimiento y asignación de trabajos técnicos.</p>
        </div>
        <button
          @click="openCreateModal"
          class="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all text-sm gap-2"
        >
          <span>🛠️</span> Nueva Orden
        </button>
      </div>

      <!-- Barra de Filtros y Búsqueda -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div>
          <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Buscar Orden / Cliente / Activo</label>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Ej. ORD-123456 o nombre..."
            class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Estado</label>
          <select v-model="filterStatus" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="ALL">Todos los estados</option>
            <option value="PENDING">Pendientes</option>
            <option value="IN_PROGRESS">En Proceso</option>
            <option value="WAITING_PARTS">Esperando Repuestos</option>
            <option value="COMPLETED">Completadas</option>
            <option value="BILLED">Facturadas</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Técnico / Personal Asignado</label>
          <select v-model="filterWorkerId" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="ALL">Todos los técnicos</option>
            <option v-for="w in workers" :key="w.id" :value="w.id">
              {{ w.firstName }} {{ w.lastName }} ({{ w.role || 'Técnico' }})
            </option>
          </select>
        </div>
      </div>

      <!-- Tabla de Órdenes -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div v-if="loading" class="p-12 text-center text-slate-400">
          Cargando órdenes de servicio...
        </div>

        <div v-else-if="filteredServiceOrders.length === 0" class="p-12 text-center text-slate-400 space-y-2">
          <span class="text-4xl block">🔧</span>
          <p class="text-sm font-medium">No se encontraron órdenes de servicio con los filtros aplicados.</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50/70 border-b border-slate-100 text-xs uppercase font-bold text-slate-500">
              <tr>
                <th class="px-6 py-3.5">N° Orden & Cliente</th>
                <th class="px-6 py-3.5">Equipo / Activo</th>
                <th class="px-6 py-3.5">Técnico Asignado</th>
                <th class="px-6 py-3.5">Programado</th>
                <th class="px-6 py-3.5">Estado</th>
                <th class="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="order in filteredServiceOrders" :key="order.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <p class="font-bold text-slate-900">#{{ order.orderNumber || order.code || order.id.slice(0, 8) }}</p>
                  <p class="text-xs text-slate-500 font-medium">
                    {{ order.customer?.firstName }} {{ order.customer?.lastName || '' }}
                  </p>
                </td>
                <td class="px-6 py-4">
                  <p class="font-semibold text-slate-800">{{ order.assetName || order.title || 'S/D' }}</p>
                </td>
                <td class="px-6 py-4">
                  <span v-if="order.assignedWorker" class="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                    👷 {{ order.assignedWorker?.firstName }} {{ order.assignedWorker?.lastName }}
                  </span>
                  <span v-else class="text-xs text-slate-400 italic">Sin asignar</span>
                </td>
                <td class="px-6 py-4 text-xs font-medium text-slate-700">
                  {{ order.scheduledAt ? new Date(order.scheduledAt).toLocaleString('es-ES') : 'Inmediato' }}
                </td>
                <td class="px-6 py-4">
                  <span
                    :class="getStatusBadge(order.status).class"
                    class="px-2.5 py-1 rounded-lg text-xs font-bold border inline-block"
                  >
                    {{ getStatusBadge(order.status).text }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right space-x-2">
                  <button
                    v-if="order.status === 'PENDING'"
                    @click="updateOrderStatus(order.id, 'in-progress')"
                    class="text-xs font-bold text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 transition-colors"
                  >
                    Iniciar
                  </button>
                  <button
                    v-if="order.status === 'IN_PROGRESS'"
                    @click="updateOrderStatus(order.id, 'complete')"
                    class="text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                  >
                    Completar
                  </button>
                  <button
                    @click="openDetailModal(order)"
                    class="text-xs font-bold text-slate-700 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors"
                  >
                    Gestionar
                  </button>
                  <button
                    v-if="order.status === 'COMPLETED' || order.status === 'IN_PROGRESS'"
                    @click="goToPosWithServiceOrder(order.id)"
                    class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm inline-flex items-center gap-1.5"
                  >
                    <span>🛒</span> Facturar en el POS
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal Crear Orden -->
      <div v-if="showCreateModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100">
          <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 class="text-lg font-bold text-slate-900">Crear Orden de Servicio</h3>
            <button @click="showCreateModal = false" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
          </div>

          <form @submit.prevent="saveOrder" class="p-6 space-y-4">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Cliente</label>
              <div class="flex gap-2">
                <input
                  v-model="customerSearch"
                  type="text"
                  placeholder="Nombre o ID del cliente..."
                  @keyup.enter="searchCustomers"
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  @click="searchCustomers"
                  class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Buscar
                </button>
              </div>

              <div v-if="customers.length > 0" class="mt-2">
                <select v-model="form.customerId" required class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
                  <option value="" disabled>-- Selecciona un cliente --</option>
                  <option v-for="c in customers" :key="c.id" :value="c.id">
                    {{ c.firstName }} {{ c.lastName }} ({{ c.identificationNumber || 'S/D' }})
                  </option>
                </select>
              </div>
            </div>

            <!-- Selección del Catálogo de Servicios al Crear -->
            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Servicio del Catálogo</label>
              <select
                v-model="form.serviceItemId"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">-- Selecciona un servicio del catálogo --</option>
                <option v-for="srv in serviceCatalog" :key="srv.id" :value="srv.id">
                  {{ srv.name }} - ${{ srv.basePrice || srv.price || 0 }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Número de Orden</label>
              <input
                v-model="form.orderNumber"
                type="text"
                required
                placeholder="Ej. ORD-001"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Equipo / Bien a intervenir (assetName)</label>
              <input
                v-model="form.assetName"
                type="text"
                required
                placeholder="Ej. Fogón industrial, Aire acondicionado"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Técnico Asignado (Opcional)</label>
              <select
                v-model="form.assignedWorkerId"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">-- Sin asignar --</option>
                <option v-for="w in workers" :key="w.id" :value="w.id">
                  👷 {{ w.firstName }} {{ w.lastName }} ({{ w.role || 'Técnico' }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Fecha y Hora Programada</label>
              <input
                v-model="form.scheduledAt"
                type="datetime-local"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div class="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                @click="showCreateModal = false"
                class="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="loadingSubmit || !form.customerId"
                class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-all"
              >
                {{ loadingSubmit ? 'Guardando...' : 'Crear Orden' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal de Gestión / Detalle de Orden y Materiales (Repuestos) -->
      <div v-if="showDetailModal && selectedOrder" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-100">
          <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10">
            <div>
              <h3 class="text-lg font-bold text-slate-900">Gestionar Orden #{{ selectedOrder.orderNumber || selectedOrder.id.slice(0, 8) }}</h3>
              <p class="text-xs text-slate-500">Detalles y materiales utilizados en el trabajo</p>
            </div>
            <button @click="showDetailModal = false" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
          </div>

          <div class="p-6 space-y-6 text-sm text-slate-600">
            <!-- Info General -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span class="block text-xs font-bold uppercase text-slate-400">Cliente</span>
                <p class="font-semibold text-slate-800 mt-0.5">
                  {{ selectedOrder.customer?.firstName }} {{ selectedOrder.customer?.lastName || '' }}
                </p>
              </div>
              <div>
                <span class="block text-xs font-bold uppercase text-slate-400">Estado Actual</span>
                <div class="mt-0.5">
                  <span :class="getStatusBadge(selectedOrder.status).class" class="px-2 py-0.5 rounded-lg text-xs font-bold border inline-block">
                    {{ getStatusBadge(selectedOrder.status).text }}
                  </span>
                </div>
              </div>
              <div>
                <span class="block text-xs font-bold uppercase text-slate-400">Equipo / Activo</span>
                <p class="font-semibold text-slate-800 mt-0.5">{{ selectedOrder.assetName || 'S/D' }}</p>
              </div>
              <div>
                <span class="block text-xs font-bold uppercase text-slate-400">Técnico</span>
                <p class="font-semibold text-slate-800 mt-0.5">
                  {{ selectedOrder.assignedWorker ? `${selectedOrder.assignedWorker.firstName} ${selectedOrder.assignedWorker.lastName}` : 'Sin asignar' }}
                </p>
              </div>
            </div>

            <!-- SECCIÓN DE MATERIALES / REPUESTOS -->
            <div class="space-y-3">
              <h4 class="font-bold text-slate-900 text-xs uppercase tracking-wider">Materiales y Repuestos Utilizados</h4>

              <div class="border border-slate-100 rounded-xl overflow-hidden">
                <table class="w-full text-left text-xs text-slate-600">
                  <thead class="bg-slate-50 font-bold uppercase text-slate-500 border-b border-slate-100">
                    <tr>
                      <th class="px-4 py-2.5">Producto</th>
                      <th class="px-4 py-2.5">Cant.</th>
                      <th class="px-4 py-2.5">Precio Unit.</th>
                      <th class="px-4 py-2.5">Total</th>
                      <th class="px-4 py-2.5 text-right" v-if="selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'BILLED'">Acciones</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr v-for="mat in selectedOrder.materials" :key="mat.id">
                      <td class="px-4 py-2.5 font-medium text-slate-900">{{ mat.product?.name || 'Repuesto' }}</td>
                      <td class="px-4 py-2.5">{{ mat.quantity }}</td>
                      <td class="px-4 py-2.5">${{ mat.unitPrice }}</td>
                      <td class="px-4 py-2.5 font-semibold">${{ mat.total }}</td>
                      <td class="px-4 py-2.5 text-right" v-if="selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'BILLED'">
                        <button @click="removeOrderMaterial(mat.id)" class="text-rose-600 hover:underline font-bold">Eliminar</button>
                      </td>
                    </tr>
                    <tr v-if="!selectedOrder.materials || selectedOrder.materials.length === 0">
                      <td colspan="5" class="px-4 py-6 text-center text-slate-400 italic">No se han agregado materiales o repuestos a esta orden.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Formulario para agregar material -->
              <div v-if="selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'BILLED'" class="bg-slate-50 p-4 rounded-xl flex flex-col sm:flex-row gap-3 items-end border border-slate-100">
                <div class="flex-1 w-full">
                  <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Seleccionar Repuesto / Producto del Inventario</label>
                  <select v-model="newMaterial.productId" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
                    <option value="" disabled>-- Seleccione un producto --</option>
                    <option v-for="prod in availableProducts" :key="prod.id" :value="prod.id">
                      {{ prod.name }} (Stock: {{ prod.stock }})
                    </option>
                  </select>
                </div>
                <div class="w-full sm:w-28">
                  <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Cantidad</label>
                  <input v-model.number="newMaterial.quantity" type="number" min="1" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white" />
                </div>
                <button @click="addOrderMaterial" class="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-all">
                  + Agregar
                </button>
              </div>
            </div>

            <!-- Acciones de estado -->
            <div class="pt-4 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
              <button
                v-if="selectedOrder.status === 'PENDING'"
                @click="updateOrderStatus(selectedOrder.id, 'in-progress')"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-colors"
              >
                Iniciar Orden
              </button>
              <button
                v-if="selectedOrder.status === 'IN_PROGRESS'"
                @click="updateOrderStatus(selectedOrder.id, 'complete')"
                class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors"
              >
                Completar Orden
              </button>
              <button
                @click="showDetailModal = false"
                class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
