<script setup lang="ts">
import { ref } from 'vue';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import AppLayout from '../components/AppLayout.vue';

const authStore = useAuthStore();
const documentNumber = ref('');
const checkInResult = ref<any>(null);
const loading = ref(false);

const handleCheckIn = async () => {
  if (!documentNumber.value) return;
  loading.value = true;
  checkInResult.value = null;

  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const branchId = authStore.currentBranch?.id;

    const { data } = await api.post('/gym-attendances/check-in', {
      documentNumber: documentNumber.value,
      organizationId: orgId,
      branchId: branchId
    });

    // Asignamos la respuesta del backend (que contiene data.status, data.customer, etc.)
    checkInResult.value = data;
  } catch (error: any) {
    // Si el cliente no existe o hay error 404/500
    checkInResult.value = {
      status: 'DENIED',
      reason: error.response?.data?.message || 'Error al procesar el acceso',
      customer: null,
      plan: null,
      subscription: null
    };
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <AppLayout>
    <div class="max-w-2xl mx-auto space-y-6">
      <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100 text-center">
        <h1 class="text-2xl font-black text-slate-900 tracking-tight">Terminal de Acceso / Check-in</h1>
        <p class="text-sm text-slate-500 mt-1">Verifica en tiempo real el estado de la membresía del socio mediante su documento.</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <form @submit.prevent="handleCheckIn" class="flex gap-3">
          <input
            v-model="documentNumber"
            type="text"
            placeholder="Ingrese cédula o documento..."
            class="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            required
          />
          <button
            type="submit"
            :disabled="loading"
            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-all shadow-sm font-semibold text-sm disabled:opacity-50 flex items-center justify-center min-w-[140px]"
          >
            {{ loading ? 'Verificando...' : 'Verificar Acceso' }}
          </button>
        </form>
      </div>

      <div
        v-if="checkInResult"
        :class="checkInResult.status === 'ALLOWED' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'"
        class="border rounded-xl p-6 text-center shadow-sm"
      >
        <div class="text-4xl mb-2">{{ checkInResult.status === 'ALLOWED' ? '✅' : '❌' }}</div>
        <h2 class="text-lg font-bold mb-1">
          {{ checkInResult.status === 'ALLOWED' ? 'ACCESO PERMITIDO' : 'ACCESO DENEGADO' }}
        </h2>
        <p class="text-sm font-medium opacity-90">{{ checkInResult.reason }}</p>

        <div v-if="checkInResult.customer" class="mt-4 text-left border-t border-slate-200/60 pt-4 text-sm space-y-1">
          <p><strong>Socio:</strong> {{ checkInResult.customer.name || `${checkInResult.customer.firstName} ${checkInResult.customer.lastName}` }}</p>
          <p><strong>Plan Actual:</strong> {{ checkInResult.plan?.name || 'Sin plan asignado' }}</p>
          <p><strong>Vence el:</strong> {{ checkInResult.subscription?.endDate ? new Date(checkInResult.subscription.endDate).toLocaleDateString() : '-' }}</p>
          <p><strong>Ingresos en este plan:</strong> <span class="font-semibold text-blue-600">{{ checkInResult.totalCheckIns || 1 }} veces</span></p>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
