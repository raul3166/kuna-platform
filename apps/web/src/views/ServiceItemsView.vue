<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import AppLayout from '../components/AppLayout.vue';

const authStore = useAuthStore();

// Estados
const serviceItems = ref<any[]>([]);
const loading = ref(false);
const loadingSubmit = ref(false);
const showModal = ref(false);

// Filtros
const searchQuery = ref('');
const filterStatus = ref<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

// Formulario alineado con CreateServiceItemDto
const initialForm = {
  id: '',
  name: '',
  description: '',
  category: '',
  basePrice: 0,
  estimatedMinutes: 60,
  isActive: true,
};

const form = ref({ ...initialForm });

// Cargar catálogo de servicios
const fetchServiceItems = async () => {
  loading.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    if (!orgId) return;

    const params: Record<string, any> = {
      organizationId: orgId,
      ...(searchQuery.value ? { search: searchQuery.value } : {}),
      ...(filterStatus.value !== 'ALL' ? { isActive: filterStatus.value === 'ACTIVE' } : {}),
    };

    const { data } = await api.get('/service-items', { params });
    serviceItems.value = Array.isArray(data) ? data : (data.items || data.data || []);
  } catch (error) {
    console.error('Error al cargar catálogo de servicios:', error);
  } finally {
    loading.value = false;
  }
};

// Guardar servicio (Crear / Editar)
const saveServiceItem = async () => {
  loadingSubmit.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;

    // Construimos únicamente el payload permitido por la API (sin id)
    const payload = {
      organizationId: orgId,
      name: form.value.name,
      description: form.value.description || undefined,
      category: form.value.category || undefined,
      basePrice: Number(form.value.basePrice),
      estimatedMinutes: Number(form.value.estimatedMinutes),
      isActive: form.value.isActive,
    };

    if (form.value.id) {
      await api.patch(`/service-items/${form.value.id}`, payload, {
        params: { organizationId: orgId }
      });
    } else {
      await api.post('/service-items', payload);
    }

    showModal.value = false;
    form.value = { ...initialForm };
    fetchServiceItems();
  } catch (error: any) {
    const msg = error?.response?.data?.message;
    alert(Array.isArray(msg) ? msg.join('\n') : (msg || 'Error al guardar el ítem de servicio'));
  } finally {
    loadingSubmit.value = false;
  }
};

// Modales y formularios
const openCreateModal = () => {
  form.value = { ...initialForm };
  showModal.value = true;
};

const openEditModal = (item: any) => {
  form.value = {
    id: item.id,
    name: item.name || '',
    description: item.description || '',
    category: item.category || '',
    basePrice: Number(item.basePrice || item.price || 0),
    estimatedMinutes: Number(item.estimatedMinutes || 60),
    isActive: item.isActive ?? true,
  };
  showModal.value = true;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(amount || 0);
};

watch([filterStatus], () => {
  fetchServiceItems();
});

onMounted(() => {
  fetchServiceItems();
});
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Catálogo de Servicios</h1>
          <p class="text-sm text-slate-500 mt-1">Administra los tipos de servicios, tarifas base y tiempos estimados.</p>
        </div>
        <button
          @click="openCreateModal"
          class="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all text-sm gap-2"
        >
          <span>📋</span> Nuevo Servicio
        </button>
      </div>

      <!-- Filtros -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div class="sm:col-span-2 flex gap-2">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por nombre o descripción..."
            @keyup.enter="fetchServiceItems"
            class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            @click="fetchServiceItems"
            class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            Buscar
          </button>
        </div>

        <div>
          <select v-model="filterStatus" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="ALL">Todos los estados</option>
            <option value="ACTIVE">Activos</option>
            <option value="INACTIVE">Inactivos</option>
          </select>
        </div>
      </div>

      <!-- Tabla de ítems de servicio -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div v-if="loading" class="p-12 text-center text-slate-400">
          Cargando catálogo de servicios...
        </div>

        <div v-else-if="serviceItems.length === 0" class="p-12 text-center text-slate-400 space-y-2">
          <span class="text-4xl block">🛠️</span>
          <p class="text-sm font-medium">No hay servicios registrados en el catálogo.</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50/70 border-b border-slate-100 text-xs uppercase font-bold text-slate-500">
              <tr>
                <th class="px-6 py-3.5">Servicio</th>
                <th class="px-6 py-3.5">Descripción</th>
                <th class="px-6 py-3.5">Tiempo Est.</th>
                <th class="px-6 py-3.5">Tarifa Base</th>
                <th class="px-6 py-3.5">Estado</th>
                <th class="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="item in serviceItems" :key="item.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <p class="font-bold text-slate-900">{{ item.name }}</p>
                  <p v-if="item.category" class="text-xs text-slate-400">{{ item.category }}</p>
                </td>
                <td class="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                  {{ item.description || 'Sin descripción' }}
                </td>
                <td class="px-6 py-4 font-medium text-slate-700 text-xs">
                  ⏱️ {{ item.estimatedMinutes }} min
                </td>
                <td class="px-6 py-4 font-bold text-slate-900">
                  {{ formatCurrency(item.basePrice) }}
                </td>
                <td class="px-6 py-4">
                  <span
                    :class="item.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'"
                    class="px-2.5 py-1 rounded-lg text-xs font-bold border inline-block"
                  >
                    {{ item.isActive ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                  <button
                    @click="openEditModal(item)"
                    class="text-xs font-bold text-slate-600 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal Crear / Editar -->
      <div v-if="showModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
          <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 class="text-lg font-bold text-slate-900">{{ form.id ? 'Editar Servicio' : 'Nuevo Servicio' }}</h3>
            <button @click="showModal = false" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
          </div>

          <form @submit.prevent="saveServiceItem" class="p-6 space-y-4">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Nombre del Servicio</label>
              <input v-model="form.name" type="text" required placeholder="Ej. Mantenimiento General" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Descripción</label>
              <textarea v-model="form.description" rows="2" placeholder="Detalle del servicio..." class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Tarifa / Precio Base</label>
                <input v-model.number="form.basePrice" type="number" step="1000" min="0" required class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900" />
              </div>
              <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Duración (Minutos)</label>
                <input v-model.number="form.estimatedMinutes" type="number" min="5" required class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>
            </div>

            <div class="flex items-center gap-2 pt-2">
              <input id="itemIsActive" v-model="form.isActive" type="checkbox" class="w-4 h-4 rounded text-blue-600 border-slate-300" />
              <label for="itemIsActive" class="text-sm font-semibold text-slate-700">Servicio Activo</label>
            </div>

            <div class="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button type="button" @click="showModal = false" class="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold hover:bg-slate-50">Cancelar</button>
              <button type="submit" :disabled="loadingSubmit" class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
                {{ loadingSubmit ? 'Guardando...' : 'Guardar Servicio' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
