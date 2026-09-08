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

const form = ref({
  customerId: '',
  membershipPlanId: '',
  startDate: new Date().toISOString().split('T')[0],
  organizationId: '',
  branchId: ''
});

const fetchSubscriptions = async () => {
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    if (!orgId) return;
    const { data } = await api.get('/gym-subscriptions', {
      params: { organizationId: orgId }
    });
    subscriptions.value = Array.isArray(data) ? data : (data.items || data.data || []);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
  }
};

const fetchMetadata = async () => {
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;

    const [custRes, planRes] = await Promise.all([
      api.get('/customers', orgId ? { params: { organizationId: orgId } } : {}).catch(() => ({ data: [] })),
      api.get('/gym-membership-plans', orgId ? { params: { organizationId: orgId } } : {}).catch(() => ({ data: [] }))
    ]);

    customers.value = Array.isArray(custRes.data) ? custRes.data : (custRes.data.items || custRes.data.data || []);
    plans.value = Array.isArray(planRes.data) ? planRes.data : (planRes.data.items || planRes.data.data || []);
  } catch (error) {
    console.error('Error fetching metadata:', error);
  }
};

const openCreateModal = () => {
  form.value = {
    customerId: '',
    membershipPlanId: '',
    startDate: new Date().toISOString().split('T')[0],
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
    form.value.organizationId = authStore.user?.organizationId || authStore.currentOrganization?.id || '';
    form.value.branchId = authStore.currentBranch?.id || '';

    await api.post('/gym-subscriptions', form.value);
    closeModal();
    fetchSubscriptions();
  } catch (error: any) {
    console.error('Errores de validación del backend:', error.response?.data?.message);
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
  fetchSubscriptions();
  fetchMetadata();
});
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Control de Suscripciones</h1>
          <p class="text-sm text-slate-500 mt-1">Gestiona las membresías asignadas a los clientes y sus estados de pago.</p>
        </div>
        <button
          @click="openCreateModal"
          class="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all duration-200 text-sm gap-2"
        >
          <span>✨</span> Nueva Suscripción
        </button>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-100 text-left">
            <thead class="bg-slate-50/75">
              <tr>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Inicio</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Expiración</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado de Pago</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm bg-white">
              <tr v-for="sub in subscriptions" :key="sub.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4 font-semibold text-slate-900">{{ `${sub.customer?.firstName || ''} ${sub.customer?.lastName || ''}`.trim() || sub.customer?.companyName || 'Cliente' }}</td>
                <td class="px-6 py-4 text-slate-600">{{ sub.plan?.name || 'Plan' }}</td>
                <td class="px-6 py-4 text-slate-600">{{ sub.startDate ? new Date(sub.startDate).toLocaleDateString() : '-' }}</td>
                <td class="px-6 py-4 text-slate-600">{{ sub.endDate ? new Date(sub.endDate).toLocaleDateString() : '-' }}</td>
                <td class="px-6 py-4">
                  <span :class="sub.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'" class="px-2.5 py-1 text-xs font-semibold rounded-full border inline-flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full" :class="sub.paymentStatus === 'PAID' ? 'bg-emerald-500' : 'bg-amber-500'"></span>
                    {{ sub.paymentStatus === 'PAID' ? 'Pagado' : sub.paymentStatus }}
                  </span>
                </td>
              </tr>
              <tr v-if="subscriptions.length === 0">
                <td colspan="5" class="px-6 py-12 text-center text-slate-400">
                  <div class="flex flex-col items-center justify-center space-y-2">
                    <span class="text-3xl">📋</span>
                    <p class="text-sm font-medium">No hay suscripciones registradas.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal Moderno -->
      <div v-if="showModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100 transform transition-all">
          <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 class="text-lg font-bold text-slate-900">Asignar Membresía</h3>
            <button @click="closeModal" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg">✕</button>
          </div>

          <form @submit.prevent="saveSubscription" class="p-6 space-y-4">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Cliente</label>
              <select v-model="form.customerId" required class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white">
                <option disabled value="">Seleccione un cliente</option>
                <option v-for="c in customers" :key="c.id" :value="c.id">
                  {{ `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.companyName || 'Sin Nombre' }}
                  ({{ c.identificationNumber || 'Sin cédula' }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Plan de Membresía</label>
              <select v-model="form.membershipPlanId" required class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white">
                <option disabled value="">Seleccione un plan</option>
                <option v-for="p in plans" :key="p.id" :value="p.id">{{ p.name }} - {{ formatCurrency(p.price) }} ({{ p.durationDays }} días)</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Fecha de Inicio</label>
              <input type="date" v-model="form.startDate" required class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white" />
            </div>

            <div class="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button type="button" @click="closeModal" class="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Cancelar</button>
              <button type="submit" class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors">Asignar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
