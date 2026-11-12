<!-- src/views/StudioSubscriptionsView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import AppLayout from '../components/AppLayout.vue';

const router = useRouter();
const authStore = useAuthStore();
const subscriptions = ref<any[]>([]);
const packageRequests = ref<any[]>([]);
const customers = ref<any[]>([]);
const plans = ref<any[]>([]);
const loading = ref(false);
const activeFilter = ref<'ALL' | 'ACTIVE' | 'CXC' | 'PAUSED' | 'REQUESTS'>('ALL');

// Modal Nueva Suscripción
const showModal = ref(false);
const form = ref({
  customerId: '',
  studioPlanId: '',
  startDate: new Date().toISOString().split('T')[0],
  paymentStatus: 'PAID' as 'PAID' | 'PARTIAL' | 'PENDING',
  paidAmount: 0,
  paymentNotes: '',
  medicalAlerts: '',
  organizationId: '',
  branchId: '',
});

// Modal Registrar Abono (CxC)
const showPaymentModal = ref(false);
const paymentTargetSub = ref<any | null>(null);
const paymentForm = ref({
  amount: 0,
  notes: '',
});

// Modal Extender / Congelar Paquete
const showExtendModal = ref(false);
const extendTargetSub = ref<any | null>(null);
const extendForm = ref({
  mode: 'EXTEND' as 'EXTEND' | 'FREEZE',
  extraDays: 7,
  reason: '',
});

// Modal Alertas de Salud / Lesiones
const showMedicalModal = ref(false);
const medicalTargetCustomer = ref<any | null>(null);
const medicalForm = ref({
  medicalAlerts: '',
});

const selectedPlanPrice = computed(() => {
  const plan = plans.value.find((p) => p.id === form.value.studioPlanId);
  return Number(plan?.price || 0);
});

const calculatedPendingBalance = computed(() => {
  const total = selectedPlanPrice.value;
  if (form.value.paymentStatus === 'PAID') return 0;
  if (form.value.paymentStatus === 'PENDING') return total;
  return Math.max(0, total - Number(form.value.paidAmount || 0));
});

const pendingRequestsCount = computed(
  () => packageRequests.value.filter((r) => r.status === 'PENDING').length
);

const totalReceivableAmount = computed(() =>
  subscriptions.value
    .filter((s) => s.status !== 'CANCELLED')
    .reduce((acc, s) => acc + Number(s.balanceAmount || 0), 0)
);

const cxcCount = computed(
  () => subscriptions.value.filter((s) => s.status !== 'CANCELLED' && Number(s.balanceAmount || 0) > 0).length
);

const pausedCount = computed(
  () => subscriptions.value.filter((s) => s.status === 'PAUSED').length
);

const filteredSubscriptions = computed(() => {
  if (activeFilter.value === 'ACTIVE') {
    return subscriptions.value.filter((s) => s.status === 'ACTIVE');
  }
  if (activeFilter.value === 'CXC') {
    return subscriptions.value.filter(
      (s) => s.status !== 'CANCELLED' && Number(s.balanceAmount || 0) > 0
    );
  }
  if (activeFilter.value === 'PAUSED') {
    return subscriptions.value.filter((s) => s.status === 'PAUSED');
  }
  return subscriptions.value;
});

const formatCurrency = (val: number | string) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(val) || 0);
};

const fetchData = async () => {
  loading.value = true;
  try {
    const orgId = authStore.currentOrganization?.id || authStore.user?.organizationId;
    if (!orgId) return;

    const [subsRes, custRes, plansRes, reqsRes] = await Promise.all([
      api.get('/studio-subscriptions', { params: { organizationId: orgId } }),
      api.get('/customers', { params: { organizationId: orgId } }),
      api.get('/studio-plans', { params: { organizationId: orgId, isActive: true } }),
      api
        .get('/studio-subscriptions/package-requests/list', { params: { organizationId: orgId } })
        .catch(() => ({ data: [] })),
    ]);

    subscriptions.value = Array.isArray(subsRes.data)
      ? subsRes.data
      : subsRes.data.items || subsRes.data.data || [];
    customers.value = Array.isArray(custRes.data)
      ? custRes.data
      : custRes.data.items || custRes.data.data || [];
    plans.value = Array.isArray(plansRes.data)
      ? plansRes.data
      : plansRes.data.items || plansRes.data.data || [];
    packageRequests.value = Array.isArray(reqsRes.data) ? reqsRes.data : [];
  } catch (error) {
    console.error('Error al cargar datos de suscripciones:', error);
  } finally {
    loading.value = false;
  }
};

const onSelectCustomerInCreate = () => {
  const c = customers.value.find((x) => x.id === form.value.customerId);
  form.value.medicalAlerts = c?.medicalAlerts || '';
};

const onSelectPlanInCreate = () => {
  const p = plans.value.find((x) => x.id === form.value.studioPlanId);
  if (p && form.value.paymentStatus === 'PARTIAL') {
    form.value.paidAmount = Math.round(Number(p.price || 0) / 2);
  }
};

const openCreateModal = () => {
  form.value = {
    customerId: '',
    studioPlanId: '',
    startDate: new Date().toISOString().split('T')[0],
    paymentStatus: 'PAID',
    paidAmount: 0,
    paymentNotes: '',
    medicalAlerts: '',
    organizationId: authStore.currentOrganization?.id || authStore.user?.organizationId || '',
    branchId: authStore.currentBranch?.id || '',
  };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const goToPos = (sub: any) => {
  const productId = sub.plan?.productId || sub.plan?.product?.id;
  const customerId = sub.customerId;
  const productName = sub.plan?.name;
  router.push({
    path: '/pos',
    query: {
      ...(productId ? { productId } : {}),
      ...(productName ? { productName } : {}),
      ...(customerId ? { customerId } : {}),
    },
  });
};

const saveSubscription = async () => {
  try {
    const orgId = authStore.currentOrganization?.id || authStore.user?.organizationId || '';
    const branchId = authStore.currentBranch?.id || '';

    const payload = {
      organizationId: orgId,
      branchId: branchId,
      customerId: form.value.customerId,
      studioPlanId: form.value.studioPlanId,
      startDate: form.value.startDate,
      paymentStatus: form.value.paymentStatus,
      paidAmount:
        form.value.paymentStatus === 'PARTIAL'
          ? Number(form.value.paidAmount || 0)
          : form.value.paymentStatus === 'PENDING'
            ? 0
            : selectedPlanPrice.value,
      paymentNotes: form.value.paymentNotes,
      medicalAlerts: form.value.medicalAlerts,
    };

    const res = await api.post('/studio-subscriptions', payload);
    closeModal();
    await fetchData();

    const createdSub = res.data;
    const productId = createdSub?.plan?.productId || createdSub?.plan?.product?.id;
    const customerId = createdSub?.customerId;
    const productName = createdSub?.plan?.name;

    if (
      confirm(
        `¡Suscripción registrada con éxito! ¿Deseas ir a la Terminal POS para generar el recibo/factura?`
      )
    ) {
      router.push({
        path: '/pos',
        query: {
          ...(productId ? { productId } : {}),
          ...(productName ? { productName } : {}),
          ...(customerId ? { customerId } : {}),
        },
      });
    }
  } catch (error: any) {
    const serverMessage = error.response?.data?.message;
    alert(
      `Error: ${Array.isArray(serverMessage) ? serverMessage.join(', ') : serverMessage || 'Error al guardar'}`
    );
  }
};

const openPaymentModal = (sub: any) => {
  paymentTargetSub.value = sub;
  paymentForm.value = {
    amount: Number(sub.balanceAmount || 0),
    notes: '',
  };
  showPaymentModal.value = true;
};

const submitPartialPayment = async () => {
  if (!paymentTargetSub.value) return;
  try {
    await api.post(`/studio-subscriptions/${paymentTargetSub.value.id}/payments`, {
      amount: Number(paymentForm.value.amount),
      notes: paymentForm.value.notes,
    });
    showPaymentModal.value = false;
    await fetchData();
  } catch (error: any) {
    alert(error.response?.data?.message || 'Error al registrar el abono');
  }
};

const openFreezeOrExtendModal = (sub: any, mode: 'EXTEND' | 'FREEZE') => {
  extendTargetSub.value = sub;
  extendForm.value = {
    mode,
    extraDays: 7,
    reason: '',
  };
  showExtendModal.value = true;
};

const submitFreezeOrExtend = async () => {
  if (!extendTargetSub.value) return;
  try {
    if (extendForm.value.mode === 'FREEZE') {
      await api.patch(`/studio-subscriptions/${extendTargetSub.value.id}/freeze`, {
        reason: extendForm.value.reason,
      });
    } else {
      await api.patch(`/studio-subscriptions/${extendTargetSub.value.id}/extend`, {
        extraDays: Number(extendForm.value.extraDays),
        reason: extendForm.value.reason,
      });
    }
    showExtendModal.value = false;
    await fetchData();
  } catch (error: any) {
    alert(error.response?.data?.message || 'Error al actualizar la suscripción');
  }
};

const unfreezeSubscription = async (sub: any) => {
  if (
    !confirm(
      `¿Reactivar el paquete de ${sub.customer?.firstName}? Los días que estuvo congelado se sumarán automáticamente a su fecha de vencimiento.`
    )
  )
    return;
  try {
    await api.patch(`/studio-subscriptions/${sub.id}/unfreeze`);
    await fetchData();
  } catch (error: any) {
    alert(error.response?.data?.message || 'Error al descongelar el paquete');
  }
};

const openMedicalAlertsModal = (customer: any) => {
  if (!customer) return;
  medicalTargetCustomer.value = customer;
  medicalForm.value = {
    medicalAlerts: customer.medicalAlerts || '',
  };
  showMedicalModal.value = true;
};

const saveMedicalAlerts = async () => {
  if (!medicalTargetCustomer.value) return;
  try {
    await api.patch(
      `/studio-subscriptions/customer/${medicalTargetCustomer.value.id}/medical-alerts`,
      {
        medicalAlerts: medicalForm.value.medicalAlerts,
      }
    );
    showMedicalModal.value = false;
    await fetchData();
  } catch (error: any) {
    alert(error.response?.data?.message || 'Error al guardar alerta de salud');
  }
};

const approvePackageRequest = async (req: any) => {
  if (
    !confirm(
      `¿Aprobar y activar el paquete "${req.plan?.name}" para ${req.customer?.firstName} ${req.customer?.lastName || ''}?`
    )
  )
    return;
  try {
    await api.post(`/studio-subscriptions/package-requests/${req.id}/approve`, {
      branchId: authStore.currentBranch?.id || undefined,
    });
    await fetchData();
  } catch (error: any) {
    alert(error.response?.data?.message || 'Error al aprobar solicitud');
  }
};

const rejectPackageRequest = async (req: any) => {
  if (!confirm('¿Rechazar esta solicitud de paquete?')) return;
  try {
    await api.patch(`/studio-subscriptions/package-requests/${req.id}/reject`);
    await fetchData();
  } catch (error: any) {
    alert(error.response?.data?.message || 'Error al rechazar solicitud');
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
    day: 'numeric',
  });
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return {
        label: 'Activa',
        class: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
      };
    case 'PAUSED':
      return {
        label: '❄️ Congelada',
        class: 'bg-sky-50 text-sky-700 border-sky-200',
        dot: 'bg-sky-500',
      };
    case 'EXHAUSTED':
      return {
        label: 'Agotada',
        class: 'bg-purple-50 text-purple-700 border-purple-200',
        dot: 'bg-purple-500',
      };
    case 'EXPIRED':
      return {
        label: 'Vencida',
        class: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
      };
    case 'CANCELLED':
      return {
        label: 'Cancelada',
        class: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
      };
    default:
      return {
        label: status,
        class: 'bg-slate-50 text-slate-700 border-slate-200',
        dot: 'bg-slate-500',
      };
  }
};

onMounted(() => {
  fetchData();
});
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <div
        class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100"
      >
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">
            Suscripciones, Renovaciones y Cartera (CxC)
          </h1>
          <p class="text-sm text-slate-500 mt-1">
            Administra los paquetes activos, abonos parciales, congelamientos y alertas médicas de los alumnos.
          </p>
        </div>
        <button
          type="button"
          @click="openCreateModal"
          class="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all duration-200 text-sm gap-2"
        >
          <span>🎟️</span> Vender / Asignar Plan
        </button>
      </div>

      <!-- KPIs de Resumen -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          @click="activeFilter = 'ALL'"
          :class="activeFilter === 'ALL' ? 'ring-2 ring-blue-500 border-blue-200' : 'border-slate-100'"
          class="bg-white p-4 rounded-xl border shadow-sm text-left transition-all"
        >
          <p class="text-xs font-bold uppercase text-slate-400">Paquetes Registrados</p>
          <p class="text-2xl font-black text-slate-900 mt-1">{{ subscriptions.length }}</p>
          <p class="text-xs text-slate-500 mt-0.5">Ver listado completo</p>
        </button>

        <button
          type="button"
          @click="activeFilter = 'CXC'"
          :class="activeFilter === 'CXC' ? 'ring-2 ring-amber-500 border-amber-200' : 'border-slate-100'"
          class="bg-white p-4 rounded-xl border shadow-sm text-left transition-all"
        >
          <p class="text-xs font-bold uppercase text-amber-600">💰 Cuentas por Cobrar (CxC)</p>
          <p class="text-2xl font-black text-amber-700 mt-1">
            {{ formatCurrency(totalReceivableAmount) }}
          </p>
          <p class="text-xs text-slate-500 mt-0.5">{{ cxcCount }} paquete(s) con saldo pendiente</p>
        </button>

        <button
          type="button"
          @click="activeFilter = 'PAUSED'"
          :class="activeFilter === 'PAUSED' ? 'ring-2 ring-sky-500 border-sky-200' : 'border-slate-100'"
          class="bg-white p-4 rounded-xl border shadow-sm text-left transition-all"
        >
          <p class="text-xs font-bold uppercase text-sky-600">❄️ Paquetes Congelados</p>
          <p class="text-2xl font-black text-sky-700 mt-1">{{ pausedCount }}</p>
          <p class="text-xs text-slate-500 mt-0.5">Pausados por viaje o incapacidad</p>
        </button>

        <button
          type="button"
          @click="activeFilter = 'REQUESTS'"
          :class="activeFilter === 'REQUESTS' ? 'ring-2 ring-indigo-500 border-indigo-200' : 'border-slate-100'"
          class="bg-white p-4 rounded-xl border shadow-sm text-left transition-all"
        >
          <p class="text-xs font-bold uppercase text-indigo-600">🔔 Solicitudes del Portal</p>
          <p class="text-2xl font-black text-indigo-700 mt-1">{{ pendingRequestsCount }}</p>
          <p class="text-xs text-slate-500 mt-0.5">Renovaciones por aprobar a 1 clic</p>
        </button>
      </div>

      <!-- Pestañas de Filtro -->
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          @click="activeFilter = 'ALL'"
          :class="activeFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200'"
          class="px-3.5 py-2 rounded-xl text-xs font-bold transition-colors"
        >
          Todas ({{ subscriptions.length }})
        </button>
        <button
          type="button"
          @click="activeFilter = 'ACTIVE'"
          :class="activeFilter === 'ACTIVE' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 border border-slate-200'"
          class="px-3.5 py-2 rounded-xl text-xs font-bold transition-colors"
        >
          Activas
        </button>
        <button
          type="button"
          @click="activeFilter = 'CXC'"
          :class="activeFilter === 'CXC' ? 'bg-amber-600 text-white' : 'bg-white text-amber-800 border border-amber-200'"
          class="px-3.5 py-2 rounded-xl text-xs font-bold transition-colors"
        >
          💰 Con Saldo Pendiente CxC ({{ cxcCount }})
        </button>
        <button
          type="button"
          @click="activeFilter = 'PAUSED'"
          :class="activeFilter === 'PAUSED' ? 'bg-sky-600 text-white' : 'bg-white text-sky-800 border border-sky-200'"
          class="px-3.5 py-2 rounded-xl text-xs font-bold transition-colors"
        >
          ❄️ Congeladas ({{ pausedCount }})
        </button>
        <button
          type="button"
          @click="activeFilter = 'REQUESTS'"
          :class="activeFilter === 'REQUESTS' ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-800 border border-indigo-200'"
          class="px-3.5 py-2 rounded-xl text-xs font-bold transition-colors"
        >
          🔔 Solicitudes de Renovación ({{ pendingRequestsCount }})
        </button>
      </div>

      <!-- Bandeja de Solicitudes de Renovación desde el Portal Público -->
      <div
        v-if="activeFilter === 'REQUESTS' || pendingRequestsCount > 0"
        class="bg-indigo-50/60 rounded-xl border border-indigo-200 p-5 space-y-3"
      >
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-sm font-black text-indigo-950 uppercase tracking-wider">
              🔔 Solicitudes de Paquetes desde el Portal de Alumnos
            </h2>
            <p class="text-xs text-indigo-700">
              Aprueba con 1 clic cuando verifiques la transferencia o pago del alumno.
            </p>
          </div>
        </div>

        <div v-if="packageRequests.length === 0" class="text-xs text-slate-500 py-4 text-center">
          No hay solicitudes de renovación registradas desde el portal.
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-for="req in packageRequests"
            :key="req.id"
            class="bg-white rounded-xl border border-indigo-100 p-4 flex flex-col justify-between gap-3 shadow-sm"
          >
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-sm font-bold text-slate-900">
                  {{ req.customer?.firstName }} {{ req.customer?.lastName || '' }}
                </p>
                <p class="text-xs text-slate-500">
                  Doc: {{ req.customer?.identificationNumber || 'S/D' }}
                  <span v-if="req.customer?.phoneNumber"> · 📞 {{ req.customer.phoneNumber }}</span>
                </p>
                <p class="text-xs font-bold text-indigo-700 mt-1">
                  🎟️ {{ req.plan?.name }} ({{ formatCurrency(req.plan?.price || 0) }})
                </p>
                <p class="text-xs text-slate-600 mt-0.5">
                  Medio: <strong>{{ req.paymentMethod }}</strong> · Valor reportado:
                  <strong>{{ formatCurrency(req.amountPaid || 0) }}</strong>
                </p>
                <p v-if="req.reference || req.notes" class="text-xs text-slate-500 mt-0.5 italic">
                  "{{ [req.reference ? `Ref: ${req.reference}` : '', req.notes || ''].filter(Boolean).join(' — ') }}"
                </p>
              </div>
              <span
                :class="
                  req.status === 'PENDING'
                    ? 'bg-amber-100 text-amber-800'
                    : req.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                "
                class="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
              >
                {{ req.status === 'PENDING' ? 'Pendiente' : req.status === 'APPROVED' ? 'Aprobada' : 'Rechazada' }}
              </span>
            </div>

            <div v-if="req.status === 'PENDING'" class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                @click="rejectPackageRequest(req)"
                class="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold"
              >
                ✕ Rechazar
              </button>
              <button
                type="button"
                @click="approvePackageRequest(req)"
                class="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
              >
                ✅ Aprobar y Activar Paquete
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabla de Suscripciones -->
      <div v-if="activeFilter !== 'REQUESTS'" class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-100 text-left">
            <thead class="bg-slate-50/75">
              <tr>
                <th class="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Alumno / Alertas de Salud
                </th>
                <th class="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Plan / Tiquetera
                </th>
                <th class="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Vigencia
                </th>
                <th class="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Clases
                </th>
                <th class="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Pago / Cartera (CxC)
                </th>
                <th class="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Estado
                </th>
                <th class="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm bg-white">
              <tr
                v-for="sub in filteredSubscriptions"
                :key="sub.id"
                class="hover:bg-slate-50/50 transition-colors"
              >
                <td class="px-5 py-4">
                  <div class="font-semibold text-slate-900">
                    {{ sub.customer?.firstName }} {{ sub.customer?.lastName }}
                  </div>
                  <div class="text-xs text-slate-400">
                    {{
                      sub.customer?.identificationNumber ||
                      sub.customer?.documentNumber ||
                      sub.customer?.email ||
                      'Sin Doc'
                    }}
                  </div>
                  <div class="mt-1 flex flex-wrap items-center gap-1.5">
                    <span
                      v-if="sub.customer?.medicalAlerts"
                      class="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-bold text-rose-700"
                    >
                      🩺 {{ sub.customer.medicalAlerts }}
                    </span>
                    <button
                      type="button"
                      @click="openMedicalAlertsModal(sub.customer)"
                      class="text-[11px] font-semibold text-slate-500 hover:text-blue-600 underline"
                    >
                      {{ sub.customer?.medicalAlerts ? 'Editar alerta' : '+ Alerta médica/lesión' }}
                    </button>
                  </div>
                </td>

                <td class="px-5 py-4 font-medium text-slate-800">
                  <div>{{ (sub.plan || sub.studioPlan)?.name || 'Plan' }}</div>
                  <div v-if="sub.extendedDays > 0" class="text-[11px] text-sky-700 font-semibold mt-0.5">
                    +{{ sub.extendedDays }} día(s) extendidos
                  </div>
                  <div v-if="sub.freezeReason" class="text-[11px] text-slate-400 truncate max-w-[180px]" :title="sub.freezeReason">
                    {{ sub.freezeReason }}
                  </div>
                </td>

                <td class="px-5 py-4 text-slate-600">
                  <div
                    v-if="sub.hasStartedFirstClass === false && sub.status === 'ACTIVE'"
                    class="space-y-0.5"
                  >
                    <span
                      class="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-bold text-amber-800"
                    >
                      ⏳ Inicia en su 1ª clase
                    </span>
                    <p class="text-[11px] text-slate-400">
                      {{ (sub.plan || sub.studioPlan)?.durationDays || 30 }} días desde que asista
                    </p>
                  </div>
                  <div v-else class="text-xs space-y-0.5">
                    <p><span class="text-slate-400">Inicio:</span> {{ formatDate(sub.startDate) }}</p>
                    <p class="font-bold text-slate-800">
                      <span class="text-slate-400 font-normal">Vence:</span> {{ formatDate(sub.endDate) }}
                    </p>
                  </div>
                </td>

                <td class="px-5 py-4">
                  <span
                    v-if="(sub.plan || sub.studioPlan)?.type === 'CLASS_PACK'"
                    class="font-bold"
                    :class="sub.remainingClasses > 0 ? 'text-purple-700' : 'text-rose-600'"
                  >
                    🎟️ {{ sub.remainingClasses }} / {{ sub.totalClasses ?? sub.initialClasses }}
                  </span>
                  <span v-else class="text-blue-600 font-semibold text-xs bg-blue-50 px-2 py-1 rounded">
                    ♾️ Ilimitado
                  </span>
                </td>

                <!-- Columna Cuentas por Cobrar / Abonos -->
                <td class="px-5 py-4">
                  <div v-if="Number(sub.balanceAmount || 0) > 0" class="space-y-1">
                    <span
                      class="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-bold text-amber-800"
                    >
                      💰 Debe {{ formatCurrency(sub.balanceAmount) }}
                    </span>
                    <p class="text-[11px] text-slate-500">
                      Abonado: {{ formatCurrency(sub.paidAmount || 0) }} / {{ formatCurrency(sub.totalAmount || 0) }}
                    </p>
                  </div>
                  <div v-else class="space-y-0.5">
                    <span
                      class="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-700"
                    >
                      ✓ Pagado ({{ formatCurrency(sub.totalAmount || sub.plan?.price || 0) }})
                    </span>
                  </div>
                </td>

                <td class="px-5 py-4">
                  <span
                    :class="getStatusBadge(sub.status).class"
                    class="px-2.5 py-1 text-xs font-semibold rounded-full border inline-flex items-center gap-1.5"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :class="getStatusBadge(sub.status).dot"></span>
                    {{ getStatusBadge(sub.status).label }}
                  </span>
                </td>

                <td class="px-5 py-4 text-right">
                  <div class="flex flex-wrap items-center justify-end gap-1.5">
                    <!-- Registrar Abono si debe saldo -->
                    <button
                      v-if="Number(sub.balanceAmount || 0) > 0 && sub.status !== 'CANCELLED'"
                      type="button"
                      @click="openPaymentModal(sub)"
                      class="font-bold text-xs text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      💵 Abonar
                    </button>

                    <!-- Congelar o Descongelar -->
                    <button
                      v-if="sub.status === 'ACTIVE'"
                      type="button"
                      @click="openFreezeOrExtendModal(sub, 'FREEZE')"
                      title="Congelar paquete por viaje o incapacidad"
                      class="font-semibold text-xs text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      ❄️ Congelar
                    </button>
                    <button
                      v-else-if="sub.status === 'PAUSED'"
                      type="button"
                      @click="unfreezeSubscription(sub)"
                      class="font-bold text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      ▶️ Reactivar
                    </button>

                    <!-- Extender días -->
                    <button
                      v-if="sub.status === 'ACTIVE' || sub.status === 'EXPIRED'"
                      type="button"
                      @click="openFreezeOrExtendModal(sub, 'EXTEND')"
                      title="Extender días de vigencia"
                      class="font-semibold text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      📅 +Días
                    </button>

                    <button
                      type="button"
                      @click="goToPos(sub)"
                      title="Ir al POS para generar la factura"
                      class="font-semibold text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      💳 POS
                    </button>

                    <button
                      v-if="sub.status === 'ACTIVE' || sub.status === 'PAUSED'"
                      type="button"
                      @click="cancelSubscription(sub.id)"
                      class="font-medium text-xs text-rose-600 hover:text-rose-900 px-1.5 py-1 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="filteredSubscriptions.length === 0 && !loading">
                <td colspan="7" class="px-6 py-12 text-center text-slate-400">
                  <div class="flex flex-col items-center justify-center space-y-2">
                    <span class="text-3xl">🎟️</span>
                    <p class="text-sm font-medium">No hay suscripciones en este filtro.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal Nueva Suscripción (Con Pagos Parciales / CxC y Alerta Médica) -->
      <div
        v-if="showModal"
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <div
          class="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100 max-h-[92vh] overflow-y-auto"
        >
          <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 id="create-sub-title" class="text-lg font-bold text-slate-900">
              Vender / Asignar Paquete de Clases
            </h3>
            <button type="button" @click="closeModal" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
              ✕
            </button>
          </div>

          <form @submit.prevent="saveSubscription" aria-labelledby="create-sub-title" class="p-6 space-y-4">
            <div>
              <label for="sub-customer" class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Seleccionar Alumno / Cliente *
              </label>
              <select
                id="sub-customer"
                name="customerId"
                v-model="form.customerId"
                @change="onSelectCustomerInCreate"
                required
                class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 bg-white"
              >
                <option value="" disabled>-- Selecciona un cliente --</option>
                <option v-for="c in customers" :key="c.id" :value="c.id">
                  {{ c.firstName }} {{ c.lastName }} ({{
                    c.identificationNumber || c.documentNumber || 'Sin Doc'
                  }})
                </option>
              </select>
            </div>

            <div>
              <label for="sub-plan" class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Plan / Tiquetera *
              </label>
              <select
                id="sub-plan"
                name="studioPlanId"
                v-model="form.studioPlanId"
                @change="onSelectPlanInCreate"
                required
                class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 bg-white"
              >
                <option value="" disabled>-- Selecciona un plan --</option>
                <option v-for="p in plans" :key="p.id" :value="p.id">
                  {{ p.name }} — {{ formatCurrency(p.price) }} ({{
                    p.type === 'CLASS_PACK' ? `${p.totalClasses} clases` : 'Ilimitado'
                  }})
                </option>
              </select>
            </div>

            <!-- Modalidad de Pago / Cuentas por Cobrar -->
            <fieldset class="rounded-xl border border-slate-200 p-3.5 space-y-3">
              <legend class="px-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                💰 Estado de Pago / Cartera (CxC)
              </legend>
              <div class="grid grid-cols-3 gap-2">
                <label
                  :class="
                    form.paymentStatus === 'PAID'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                  "
                  class="flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs cursor-pointer text-center"
                >
                  <input
                    type="radio"
                    name="paymentStatus"
                    value="PAID"
                    v-model="form.paymentStatus"
                    class="sr-only"
                  />
                  ✓ Pagado Total
                </label>
                <label
                  :class="
                    form.paymentStatus === 'PARTIAL'
                      ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                  "
                  class="flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs cursor-pointer text-center"
                >
                  <input
                    type="radio"
                    name="paymentStatus"
                    value="PARTIAL"
                    v-model="form.paymentStatus"
                    class="sr-only"
                  />
                  💵 Abono Parcial
                </label>
                <label
                  :class="
                    form.paymentStatus === 'PENDING'
                      ? 'bg-rose-50 border-rose-400 text-rose-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                  "
                  class="flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs cursor-pointer text-center"
                >
                  <input
                    type="radio"
                    name="paymentStatus"
                    value="PENDING"
                    v-model="form.paymentStatus"
                    class="sr-only"
                  />
                  ⏳ Por Cobrar
                </label>
              </div>

              <div v-if="form.paymentStatus === 'PARTIAL'" class="space-y-2 pt-1">
                <label for="sub-paid-amount" class="block text-xs font-bold text-slate-700">
                  Valor Abonado Hoy (COP)
                </label>
                <input
                  id="sub-paid-amount"
                  name="paidAmount"
                  v-model.number="form.paidAmount"
                  type="number"
                  min="0"
                  :max="selectedPlanPrice || undefined"
                  class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
                />
              </div>

              <div
                v-if="selectedPlanPrice > 0 && form.paymentStatus !== 'PAID'"
                class="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 flex justify-between"
              >
                <span>Saldo pendiente en Cuentas por Cobrar:</span>
                <strong>{{ formatCurrency(calculatedPendingBalance) }}</strong>
              </div>

              <div>
                <label for="sub-payment-notes" class="block text-xs font-semibold text-slate-600 mb-1">
                  Nota de Pago / Referencia (Opcional)
                </label>
                <input
                  id="sub-payment-notes"
                  name="paymentNotes"
                  v-model="form.paymentNotes"
                  type="text"
                  placeholder="Ej: Nequi 50% inicial, paga resto el 15..."
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </div>
            </fieldset>

            <!-- Alerta de Salud / Lesiones -->
            <div>
              <label for="sub-medical" class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                🩺 Alerta de Salud / Lesiones / Condición (Visible para la Instructora)
              </label>
              <input
                id="sub-medical"
                name="medicalAlerts"
                v-model="form.medicalAlerts"
                type="text"
                placeholder="Ej: Lesión de rodilla derecha, Embarazo 16 sem, Alumna nueva..."
                class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
              />
            </div>

            <div class="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-900">
              <strong>💡 Vigencia desde la 1ª clase:</strong> El conteo del mes se ajustará automáticamente a partir del día en que el alumno asista a su <strong>primera clase</strong>.
            </div>

            <div class="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                @click="closeModal"
                class="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm"
              >
                Registrar Suscripción
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Registrar Abono (CxC) -->
      <div
        v-if="showPaymentModal && paymentTargetSub"
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
          <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-amber-50/60">
            <h3 class="text-base font-bold text-slate-900">💵 Registrar Abono / Pago de Cartera</h3>
            <button type="button" @click="showPaymentModal = false" class="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
          <form @submit.prevent="submitPartialPayment" class="p-6 space-y-4">
            <div class="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p>
                Alumno:
                <strong>{{ paymentTargetSub.customer?.firstName }} {{ paymentTargetSub.customer?.lastName }}</strong>
              </p>
              <p>Paquete: <strong>{{ paymentTargetSub.plan?.name }}</strong></p>
              <p class="text-amber-800 font-bold">
                Saldo pendiente actual: {{ formatCurrency(paymentTargetSub.balanceAmount) }}
              </p>
            </div>

            <div>
              <label for="pay-amount" class="block text-xs font-bold uppercase text-slate-500 mb-1">
                Valor a Abonar (COP) *
              </label>
              <input
                id="pay-amount"
                name="amount"
                v-model.number="paymentForm.amount"
                type="number"
                min="1"
                :max="paymentTargetSub.balanceAmount"
                required
                class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-bold"
              />
            </div>

            <div>
              <label for="pay-notes" class="block text-xs font-bold uppercase text-slate-500 mb-1">
                Medio de Pago / Referencia
              </label>
              <input
                id="pay-notes"
                name="notes"
                v-model="paymentForm.notes"
                type="text"
                placeholder="Ej: Transferencia Bancolombia / Efectivo"
                class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
              />
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                @click="showPaymentModal = false"
                class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
              >
                Confirmar Abono
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Congelar o Extender Vigencia -->
      <div
        v-if="showExtendModal && extendTargetSub"
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
          <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-sky-50/60">
            <h3 class="text-base font-bold text-slate-900">
              {{
                extendForm.mode === 'FREEZE'
                  ? '❄️ Congelar / Pausar Paquete'
                  : '📅 Extender Vigencia del Paquete'
              }}
            </h3>
            <button type="button" @click="showExtendModal = false" class="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
          <form @submit.prevent="submitFreezeOrExtend" class="p-6 space-y-4">
            <p class="text-xs text-slate-600">
              Alumno:
              <strong>{{ extendTargetSub.customer?.firstName }} {{ extendTargetSub.customer?.lastName }}</strong>
              ({{ extendTargetSub.plan?.name }})
            </p>

            <div v-if="extendForm.mode === 'FREEZE'" class="rounded-xl bg-sky-50 border border-sky-200 p-3 text-xs text-sky-900">
              Mientras el paquete esté congelado no vencerá. Cuando el alumno regrese y presiones
              <strong>"Reactivar"</strong>, el sistema sumará automáticamente los días que estuvo pausado a su fecha de vencimiento.
            </div>

            <div v-if="extendForm.mode === 'EXTEND'">
              <label for="ext-days" class="block text-xs font-bold uppercase text-slate-500 mb-1">
                Días adicionales a sumar *
              </label>
              <input
                id="ext-days"
                name="extraDays"
                v-model.number="extendForm.extraDays"
                type="number"
                min="1"
                max="365"
                required
                class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-bold"
              />
            </div>

            <div>
              <label for="ext-reason" class="block text-xs font-bold uppercase text-slate-500 mb-1">
                Motivo (Viaje, incapacidad médica, reposición...)
              </label>
              <input
                id="ext-reason"
                name="reason"
                v-model="extendForm.reason"
                type="text"
                placeholder="Ej: Viaje fuera de la ciudad por 10 días"
                class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
              />
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                @click="showExtendModal = false"
                class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm"
              >
                {{ extendForm.mode === 'FREEZE' ? '❄️ Congelar Ahora' : '📅 Sumar Días' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Editar Alerta Médica / Lesiones -->
      <div
        v-if="showMedicalModal && medicalTargetCustomer"
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
          <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-rose-50/60">
            <h3 class="text-base font-bold text-slate-900">🩺 Alerta de Salud / Lesiones del Alumno</h3>
            <button type="button" @click="showMedicalModal = false" class="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
          <form @submit.prevent="saveMedicalAlerts" class="p-6 space-y-4">
            <p class="text-xs text-slate-600">
              Esta nota aparecerá destacada en la lista de clase para que la instructora tenga precaución durante la práctica de
              <strong>{{ medicalTargetCustomer.firstName }} {{ medicalTargetCustomer.lastName }}</strong>.
            </p>
            <div>
              <label for="med-alert-input" class="block text-xs font-bold uppercase text-slate-500 mb-1">
                Condición médica, lesión o nota importante
              </label>
              <textarea
                id="med-alert-input"
                name="medicalAlerts"
                v-model="medicalForm.medicalAlerts"
                rows="3"
                placeholder="Ej: Lesión de menisco derecho, evitar impacto. / Embarazo 14 semanas..."
                class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
              ></textarea>
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                @click="showMedicalModal = false"
                class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm"
              >
                Guardar Alerta
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
