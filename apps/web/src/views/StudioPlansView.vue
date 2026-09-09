<!-- src/views/StudioPlansView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import AppLayout from '../components/AppLayout.vue';

const authStore = useAuthStore();
const plans = ref<any[]>([]);
const showModal = ref(false);
const isEditing = ref(false);
const currentId = ref<string | null>(null);

const form = ref({
  name: '',
  description: '',
  price: 0,
  durationDays: 30,
  type: 'UNLIMITED', // 'UNLIMITED' | 'CLASS_PACK'
  totalClasses: null as number | null,
  isNewStudentOnly: false,
  organizationId: '',
  branchId: ''
});

const fetchPlans = async () => {
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    if (!orgId) return;
    const { data } = await api.get('/studio-plans', {
      params: { organizationId: orgId }
    });
    plans.value = Array.isArray(data) ? data : (data.items || data.data || []);
  } catch (error) {
    console.error('Error al cargar planes de estudio:', error);
  }
};

const openCreateModal = () => {
  isEditing.value = false;
  currentId.value = null;
  form.value = {
    name: '',
    description: '',
    price: 0,
    durationDays: 30,
    type: 'UNLIMITED',
    totalClasses: null,
    isNewStudentOnly: false,
    organizationId: authStore.user?.organizationId || authStore.currentOrganization?.id || '',
    branchId: authStore.currentBranch?.id || ''
  };
  showModal.value = true;
};

const editPlan = (plan: any) => {
  isEditing.value = true;
  currentId.value = plan.id;
  form.value = {
    name: plan.name || '',
    description: plan.description || '',
    price: Number(plan.price) || 0,
    durationDays: Number(plan.durationDays) || 30,
    type: plan.type || 'UNLIMITED',
    totalClasses: plan.totalClasses || null,
    isNewStudentOnly: Boolean(plan.isNewStudentOnly),
    organizationId: plan.organizationId || authStore.user?.organizationId || '',
    branchId: plan.branchId || authStore.currentBranch?.id || ''
  };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const savePlan = async () => {
  try {
    form.value.organizationId = authStore.user?.organizationId || authStore.currentOrganization?.id || '';
    form.value.branchId = authStore.currentBranch?.id || '';

    // Si es ilimitado, limpiamos el total de clases
    if (form.value.type === 'UNLIMITED') {
      form.value.totalClasses = null;
    }

    if (isEditing.value && currentId.value) {
      await api.patch(`/studio-plans/${currentId.value}`, form.value);
    } else {
      await api.post('/studio-plans', form.value);
    }
    closeModal();
    fetchPlans();
  } catch (error) {
    console.error('Error al guardar plan de estudio:', error);
  }
};

const deletePlan = async (id: string) => {
  if (confirm('¿Estás seguro de eliminar este plan de estudio?')) {
    try {
      await api.delete(`/studio-plans/${id}`);
      fetchPlans();
    } catch (error) {
      console.error('Error al eliminar plan:', error);
    }
  }
};

const formatCurrency = (value: number | string) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
};

onMounted(() => {
  fetchPlans();
});
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Planes y Tiqueteras de Estudio</h1>
          <p class="text-sm text-slate-500 mt-1">Configura pases ilimitados o paquetes de clases (Yoga, Pilates, Danza).</p>
        </div>
        <button
          @click="openCreateModal"
          class="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all duration-200 text-sm gap-2"
        >
          <span>🧘‍♀️</span> Nuevo Plan
        </button>
      </div>

      <!-- Tabla de Planes -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-100 text-left">
            <thead class="bg-slate-50/75">
              <tr>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Precio</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vigencia</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Modalidad</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Restricción</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm bg-white">
              <tr v-for="plan in plans" :key="plan.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4 font-semibold text-slate-900">{{ plan.name }}</td>
                <td class="px-6 py-4 text-slate-600">{{ plan.description || 'Sin descripción' }}</td>
                <td class="px-6 py-4 font-bold text-slate-900">{{ formatCurrency(plan.price) }}</td>
                <td class="px-6 py-4 text-slate-600 font-medium">{{ plan.durationDays }} días</td>
                <td class="px-6 py-4 text-slate-600 font-medium">
                  <span v-if="plan.type === 'CLASS_PACK'" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                    🎟️ {{ plan.totalClasses }} clases
                  </span>
                  <span v-else class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    ♾️ Ilimitado
                  </span>
                </td>
                <td class="px-6 py-4 text-slate-600">
                  <span v-if="plan.isNewStudentOnly" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    Alumnos Nuevos
                  </span>
                  <span v-else class="text-xs text-slate-400">Público General</span>
                </td>
                <td class="px-6 py-4">
                  <span :class="plan.isActive !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'" class="px-2.5 py-1 text-xs font-semibold rounded-full border inline-flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full" :class="plan.isActive !== false ? 'bg-emerald-500' : 'bg-rose-500'"></span>
                    {{ plan.isActive !== false ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right space-x-3">
                  <button @click="editPlan(plan)" class="font-medium text-blue-600 hover:text-blue-900 transition-colors">Editar</button>
                  <button @click="deletePlan(plan.id)" class="font-medium text-rose-600 hover:text-rose-900 transition-colors">Eliminar</button>
                </td>
              </tr>
              <tr v-if="plans.length === 0">
                <td colspan="8" class="px-6 py-12 text-center text-slate-400">
                  <div class="flex flex-col items-center justify-center space-y-2">
                    <span class="text-3xl">🧘‍♀️</span>
                    <p class="text-sm font-medium">No se encontraron paquetes ni planes de estudio.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal de Creación / Edición -->
      <div v-if="showModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100 transform transition-all">
          <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 class="text-lg font-bold text-slate-900">{{ isEditing ? 'Editar Plan de Estudio' : 'Nuevo Plan / Tiquetera' }}</h3>
            <button @click="closeModal" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg">✕</button>
          </div>

          <form @submit.prevent="savePlan" class="p-6 space-y-4">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Nombre del Plan</label>
              <input v-model="form.name" type="text" required placeholder="Ej. Tiquetera 10 Clases Yoga" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Descripción</label>
              <textarea v-model="form.description" rows="2" placeholder="Detalles o condiciones de uso..." class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"></textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Precio ($)</label>
                <input v-model.number="form.price" type="number" step="0.01" required class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Vigencia (Días)</label>
                <input v-model.number="form.durationDays" type="number" required class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Modalidad</label>
                <select v-model="form.type" required class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white">
                  <option value="UNLIMITED">Ilimitado (Mes/Trimestre)</option>
                  <option value="CLASS_PACK">Tiquetera (Pack de clases)</option>
                </select>
              </div>

              <div v-if="form.type === 'CLASS_PACK'">
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Total de Clases</label>
                <input v-model.number="form.totalClasses" type="number" min="1" required placeholder="Ej. 10" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              </div>
            </div>

            <div class="pt-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="form.isNewStudentOnly" type="checkbox" class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                <span class="text-sm font-medium text-slate-700">Exclusivo para alumnos nuevos (Clase de prueba)</span>
              </label>
            </div>

            <div class="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button type="button" @click="closeModal" class="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Cancelar</button>
              <button type="submit" class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors">Guardar Plan</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
