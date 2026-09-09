<!-- src/views/StudioSubscriptionsView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import AppLayout from '../components/AppLayout.vue';

const authStore = useAuthStore();
const subscriptions = ref<any[]>([]);
const customers = ref<any[]>([]);
const plans = ref<any[]>([]);
const showModal = ref(false);
const loading = ref(false);

const form = ref({
  customerId: '',
  studioPlanId: '',
  startDate: new Date().toISOString().split('T')[0],
  autoRenew: false,
  organizationId: '',
  branchId: ''
});

const fetchData = async () => {
  loading.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    if (!orgId) return;

    const [subsRes, custRes, plansRes] = await Promise.all([
      api.get('/studio-subscriptions', { params: { organizationId: orgId } }),
      api.get('/customers', { params: { organizationId: orgId } }),
      api.get('/studio-plans', { params: { organizationId: orgId, isActive: true } })
    ]);

    subscriptions.value = Array.isArray(subsRes.data) ? subsRes.data : (subsRes.data.items || subsRes.data.data || []);
    customers.value = Array.isArray(custRes.data) ? custRes.data : (custRes.data.items || custRes.data.data || []);
    plans.value = Array.isArray(plansRes.data) ? plansRes.data : (plansRes.data.items || plansRes.data.data || []);
  } catch (error) {
    console.error('Error al cargar datos de suscripciones:', error);
  } finally {
    loading.value = false;
  }
};

const openCreateModal = () => {
  form.value = {
    customerId: '',
    studioPlanId: '',
    startDate: new Date().toISOString().split('T')[0],
    autoRenew: false,
    organizationId: authStore.user?.organizationId || authStore.currentOrganization?.id || '',
    branchId: authStore.currentBranch?.id || ''
  };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const saveSubscription = async () => {
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id || '';
    const branchId = authStore.currentBranch?.id || '';

    // Enviar estrictamente las propiedades declaradas en el DTO
    const payload = {
      organizationId: orgId,
      branchId: branchId,
      customerId: form.value.customerId,
      studioPlanId: form.value.studioPlanId,
      startDate: form.value.startDate,
    };

    await api.post('/studio-subscriptions', payload);
    closeModal();
    fetchData();
  } catch (error: any) {
    const serverMessage = error.response?.data?.message;
    console.error('Error al registrar suscripción:', serverMessage || error);
    alert(`Error: ${Array.isArray(serverMessage) ? serverMessage.join(', ') : serverMessage || 'Error al guardar'}`);
  }
};

const cancelSubscription = async (id: string) => {
  if (confirm('¿Estás seguro de cancelar esta suscripción?')) {
    try {
      await api.patch(`/studio-subscriptions/${id}/cancel`);
      fetchData();
    } catch (error) {
      console.error('Error al cancelar suscripción:', error);
    }
  }
};

const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Activa', class: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
    case 'EXPIRED':
      return { label: 'Vencida', class: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
    case 'CANCELLED':
      return { label: 'Cancelada', class: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
    default:
      return { label: status, class: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-500' };
  }
};

onMounted(() => {
  fetchData();
});
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Suscripciones y Tiqueteras</h1>
          <p class="text-sm text-slate-500 mt-1">Administra los paquetes activos y saldo de clases de los alumnos.</p>
        </div>
        <button
          @click="openCreateModal"
          class="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all duration-200 text-sm gap-2"
        >
          <span>🎟️</span> Vender / Asignar Plan
        </button>
      </div>

      <!-- Tabla de Suscripciones -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-100 text-left">
            <thead class="bg-slate-50/75">
              <tr>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Alumno / Cliente</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Plan / Tiquetera</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Inicio</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vencimiento</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Clases Restantes</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm bg-white">
              <tr v-for="sub in subscriptions" :key="sub.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <div class="font-semibold text-slate-900">
                    {{ sub.customer?.firstName }} {{ sub.customer?.lastName }}
                  </div>
                  <div class="text-xs text-slate-400">
                    {{ sub.customer?.identificationNumber || sub.customer?.documentNumber || sub.customer?.email || 'Sin Doc' }}
                  </div>
                </td>
                <td class="px-6 py-4 font-medium text-slate-800">
                  {{ sub.studioPlan?.name || 'Plan Eliminado' }}
                </td>
                <td class="px-6 py-4 text-slate-600">{{ formatDate(sub.startDate) }}</td>
                <td class="px-6 py-4 text-slate-600 font-medium">{{ formatDate(sub.endDate) }}</td>
                <td class="px-6 py-4">
                  <span v-if="sub.studioPlan?.type === 'CLASS_PACK'" class="font-bold" :class="sub.remainingClasses > 0 ? 'text-purple-700' : 'text-rose-600'">
                    🎟️ {{ sub.remainingClasses }} / {{ sub.initialClasses }}
                  </span>
                  <span v-else class="text-blue-600 font-semibold text-xs bg-blue-50 px-2 py-1 rounded">
                    ♾️ Ilimitado
                  </span>
                </td>
                <td class="px-6 py-4">
                  <span :class="getStatusBadge(sub.status).class" class="px-2.5 py-1 text-xs font-semibold rounded-full border inline-flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full" :class="getStatusBadge(sub.status).dot"></span>
                    {{ getStatusBadge(sub.status).label }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                  <button
                    v-if="sub.status === 'ACTIVE'"
                    @click="cancelSubscription(sub.id)"
                    class="font-medium text-rose-600 hover:text-rose-900 transition-colors"
                  >
                    Cancelar
                  </button>
                  <span v-else class="text-xs text-slate-400">-</span>
                </td>
              </tr>
              <tr v-if="subscriptions.length === 0 && !loading">
                <td colspan="7" class="px-6 py-12 text-center text-slate-400">
                  <div class="flex flex-col items-center justify-center space-y-2">
                    <span class="text-3xl">🎟️</span>
                    <p class="text-sm font-medium">No hay suscripciones registradas aún.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal de Creación -->
      <div v-if="showModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100 transform transition-all">
          <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 class="text-lg font-bold text-slate-900">Nueva Suscripción / Tiquetera</h3>
            <button @click="closeModal" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg">✕</button>
          </div>

          <form @submit.prevent="saveSubscription" class="p-6 space-y-4">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Seleccionar Alumno / Cliente</label>
              <select v-model="form.customerId" required class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white">
                <option value="" disabled>-- Selecciona un cliente --</option>
                <option v-for="c in customers" :key="c.id" :value="c.id">
                  {{ c.firstName }} {{ c.lastName }} ({{ c.identificationNumber || c.documentNumber || 'Sin Doc' }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Plan / Tiquetera</label>
              <select v-model="form.studioPlanId" required class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white">
                <option value="" disabled>-- Selecciona un plan --</option>
                <option v-for="p in plans" :key="p.id" :value="p.id">
                  {{ p.name }} - ${{ p.price }} ({{ p.type === 'CLASS_PACK' ? `${p.totalClasses} clases` : 'Ilimitado' }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Fecha de Inicio</label>
              <input v-model="form.startDate" type="date" required class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
            </div>

            <div class="pt-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="form.autoRenew" type="checkbox" class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                <span class="text-sm font-medium text-slate-700">Renovación Automática</span>
              </label>
            </div>

            <div class="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button type="button" @click="closeModal" class="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Cancelar</button>
              <button type="submit" class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors">Registrar Suscripción</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
