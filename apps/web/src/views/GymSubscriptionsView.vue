<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'
import AppLayout from '../components/AppLayout.vue'

const router = useRouter()
const authStore = useAuthStore()

const subscriptions = ref<any[]>([])
const customers = ref<any[]>([])
const plans = ref<any[]>([])
const loading = ref(false)
const loadingSubmit = ref(false)

const filterTab = ref<'ALL' | 'ACTIVE' | 'CXC' | 'PAUSED'>('ALL')
const searchQuery = ref('')

// Modal de Nueva Membresía
const showModal = ref(false)
const form = ref({
  customerId: '',
  membershipPlanId: '',
  startDate: new Date().toISOString().split('T')[0],
  paymentStatus: 'PAID',
  totalAmount: 0,
  paidAmount: 0,
  paymentNotes: '',
  medicalAlerts: '',
  notes: '',
})

// Modal de Abono Parcial CxC
const selectedSubForPayment = ref<any>(null)
const paymentForm = ref({
  amount: 0,
  notes: '',
})

// Modal de Congelar / Extender Vigencia
const selectedSubForFreeze = ref<any>(null)
const freezeMode = ref<'FREEZE' | 'EXTEND'>('FREEZE')
const freezeForm = ref({
  reason: '',
  days: 7,
})

// Modal de Alerta de Salud / Lesión
const selectedCustomerForMedical = ref<any>(null)
const medicalAlertsInput = ref('')

const activeOrgId = computed(
  () => authStore.currentOrganization?.id || authStore.user?.organizationId || ''
)

const kpis = computed(() => {
  const activeCount = subscriptions.value.filter((s) => s.status === 'ACTIVE').length
  const pausedCount = subscriptions.value.filter((s) => s.status === 'PAUSED').length
  const cxcSubs = subscriptions.value.filter(
    (s) => s.status !== 'CANCELLED' && Number(s.balanceAmount || 0) > 0
  )
  const cxcTotal = cxcSubs.reduce((sum, s) => sum + Number(s.balanceAmount || 0), 0)
  const collectedTotal = subscriptions.value
    .filter((s) => s.status !== 'CANCELLED')
    .reduce((sum, s) => sum + Number(s.paidAmount || 0), 0)

  return {
    activeCount,
    pausedCount,
    cxcCount: cxcSubs.length,
    cxcTotal,
    collectedTotal,
  }
})

const filteredSubscriptions = computed(() => {
  let list = subscriptions.value

  if (filterTab.value === 'ACTIVE') {
    list = list.filter((s) => s.status === 'ACTIVE')
  } else if (filterTab.value === 'PAUSED') {
    list = list.filter((s) => s.status === 'PAUSED')
  } else if (filterTab.value === 'CXC') {
    list = list.filter((s) => s.status !== 'CANCELLED' && Number(s.balanceAmount || 0) > 0)
  }

  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter((s) => {
      const name = `${s.customer?.firstName || ''} ${s.customer?.lastName || ''} ${s.customer?.companyName || ''}`.toLowerCase()
      const doc = String(s.customer?.identificationNumber || '').toLowerCase()
      const planName = String(s.plan?.name || '').toLowerCase()
      return name.includes(q) || doc.includes(q) || planName.includes(q)
    })
  }

  return list
})

function formatCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

async function fetchSubscriptions() {
  if (!activeOrgId.value) return
  loading.value = true
  try {
    const { data } = await api.get('/gym-subscriptions', {
      params: { organizationId: activeOrgId.value },
    })
    subscriptions.value = Array.isArray(data) ? data : data.items || data.data || []
  } catch (error) {
    console.error('Error fetching subscriptions:', error)
  } finally {
    loading.value = false
  }
}

async function fetchMetadata() {
  if (!activeOrgId.value) return
  try {
    const [custRes, planRes] = await Promise.all([
      api.get('/customers', { params: { organizationId: activeOrgId.value } }).catch(() => ({ data: [] })),
      api.get('/gym-membership-plans', { params: { organizationId: activeOrgId.value } }).catch(() => ({ data: [] })),
    ])

    customers.value = Array.isArray(custRes.data) ? custRes.data : custRes.data.items || custRes.data.data || []
    plans.value = Array.isArray(planRes.data) ? planRes.data : planRes.data.items || planRes.data.data || []
  } catch (error) {
    console.error('Error fetching metadata:', error)
  }
}

watch(
  () => form.value.membershipPlanId,
  (planId) => {
    const selectedPlan = plans.value.find((p) => p.id === planId)
    if (selectedPlan) {
      const price = Number(selectedPlan.price || 0)
      form.value.totalAmount = price
      if (form.value.paymentStatus === 'PAID') {
        form.value.paidAmount = price
      } else if (form.value.paymentStatus === 'PENDING') {
        form.value.paidAmount = 0
      }
    }
  }
)

watch(
  () => form.value.customerId,
  (custId) => {
    const cust = customers.value.find((c) => c.id === custId)
    if (cust) {
      form.value.medicalAlerts = cust.medicalAlerts || ''
    }
  }
)

function openCreateModal() {
  form.value = {
    customerId: '',
    membershipPlanId: '',
    startDate: new Date().toISOString().split('T')[0],
    paymentStatus: 'PAID',
    totalAmount: 0,
    paidAmount: 0,
    paymentNotes: '',
    medicalAlerts: '',
    notes: '',
  }
  showModal.value = true
}

function goToPos(sub: any) {
  const productId = sub.plan?.productId || sub.plan?.product?.id
  const customerId = sub.customerId
  const productName = sub.plan?.name
  router.push({
    path: '/pos',
    query: {
      ...(productId ? { productId } : {}),
      ...(productName ? { productName } : {}),
      ...(customerId ? { customerId } : {}),
    },
  })
}

async function saveSubscription() {
  if (!activeOrgId.value) return
  loadingSubmit.value = true
  try {
    await api.post('/gym-subscriptions', {
      organizationId: activeOrgId.value,
      branchId: authStore.currentBranch?.id || '',
      customerId: form.value.customerId,
      membershipPlanId: form.value.membershipPlanId,
      startDate: form.value.startDate,
      paymentStatus: form.value.paymentStatus,
      totalAmount: Number(form.value.totalAmount || 0),
      paidAmount:
        form.value.paymentStatus === 'PAID'
          ? Number(form.value.totalAmount || 0)
          : form.value.paymentStatus === 'PENDING'
          ? 0
          : Number(form.value.paidAmount || 0),
      paymentNotes: form.value.paymentNotes || undefined,
      medicalAlerts: form.value.medicalAlerts,
      notes: form.value.notes || undefined,
    })
    showModal.value = false
    await Promise.all([fetchSubscriptions(), fetchMetadata()])
  } catch (error: any) {
    alert(error.response?.data?.message || 'Error al guardar membresía')
  } finally {
    loadingSubmit.value = false
  }
}

function openPaymentModal(sub: any) {
  selectedSubForPayment.value = sub
  paymentForm.value = {
    amount: Number(sub.balanceAmount || 0),
    notes: '',
  }
}

async function submitPayment() {
  if (!selectedSubForPayment.value) return
  loadingSubmit.value = true
  try {
    await api.post(`/gym-subscriptions/${selectedSubForPayment.value.id}/payments`, {
      amount: Number(paymentForm.value.amount),
      notes: paymentForm.value.notes || undefined,
    })
    selectedSubForPayment.value = null
    await fetchSubscriptions()
  } catch (error: any) {
    alert(error.response?.data?.message || 'Error al registrar abono')
  } finally {
    loadingSubmit.value = false
  }
}

function openFreezeOrExtendModal(sub: any, mode: 'FREEZE' | 'EXTEND') {
  selectedSubForFreeze.value = sub
  freezeMode.value = mode
  freezeForm.value = {
    reason: '',
    days: 7,
  }
}

async function submitFreezeOrExtend() {
  if (!selectedSubForFreeze.value) return
  loadingSubmit.value = true
  try {
    if (freezeMode.value === 'FREEZE') {
      await api.patch(`/gym-subscriptions/${selectedSubForFreeze.value.id}/freeze`, {
        reason: freezeForm.value.reason || undefined,
      })
    } else {
      await api.patch(`/gym-subscriptions/${selectedSubForFreeze.value.id}/extend`, {
        days: Number(freezeForm.value.days),
        reason: freezeForm.value.reason || undefined,
      })
    }
    selectedSubForFreeze.value = null
    await fetchSubscriptions()
  } catch (error: any) {
    alert(error.response?.data?.message || 'Error al actualizar vigencia de la membresía')
  } finally {
    loadingSubmit.value = false
  }
}

async function handleUnfreeze(sub: any) {
  if (!confirm(`¿Reactivar la membresía de ${sub.customer?.firstName}? Los días congelados se sumarán automáticamente a su fecha de vencimiento.`)) {
    return
  }
  try {
    await api.patch(`/gym-subscriptions/${sub.id}/unfreeze`)
    await fetchSubscriptions()
  } catch (error: any) {
    alert(error.response?.data?.message || 'No se pudo reactivar la membresía')
  }
}

function openMedicalModal(sub: any) {
  selectedCustomerForMedical.value = sub.customer
  medicalAlertsInput.value = sub.customer?.medicalAlerts || ''
}

async function submitMedicalAlert() {
  if (!selectedCustomerForMedical.value) return
  loadingSubmit.value = true
  try {
    await api.patch(`/gym-subscriptions/customers/${selectedCustomerForMedical.value.id}/medical-alerts`, {
      medicalAlerts: medicalAlertsInput.value,
    })
    selectedCustomerForMedical.value = null
    await Promise.all([fetchSubscriptions(), fetchMetadata()])
  } catch (error: any) {
    alert(error.response?.data?.message || 'No se pudo actualizar la alerta médica')
  } finally {
    loadingSubmit.value = false
  }
}

onMounted(() => {
  fetchSubscriptions()
  fetchMetadata()
})
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">
            🏋️ Control de Membresías, Congelamiento y Cartera CxC
          </h1>
          <p class="text-sm text-slate-500 mt-1">
            Gestiona membresías activas, abonos parciales (CxC), congelamiento por viaje/incapacidad y alertas de salud del socio.
          </p>
        </div>
        <button
          type="button"
          @click="openCreateModal"
          class="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all text-sm gap-2 cursor-pointer"
        >
          <span>✨</span> Nueva Membresía
        </button>
      </div>

      <!-- KPIs -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          @click="filterTab = 'ACTIVE'"
          class="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm cursor-pointer hover:bg-emerald-50/30 transition"
        >
          <span class="text-xs font-bold uppercase text-emerald-700 block">✅ Membresías Activas</span>
          <span class="text-2xl font-black text-emerald-700">{{ kpis.activeCount }}</span>
        </div>

        <div
          @click="filterTab = 'CXC'"
          class="bg-white p-4 rounded-xl border border-amber-200 shadow-sm cursor-pointer hover:bg-amber-50/30 transition"
        >
          <span class="text-xs font-bold uppercase text-amber-700 block">💰 Cuentas por Cobrar (CxC)</span>
          <span class="text-2xl font-black text-amber-800">{{ formatCurrency(kpis.cxcTotal) }}</span>
          <span class="text-[11px] text-amber-700 block">{{ kpis.cxcCount }} socio(s) con saldo pendiente</span>
        </div>

        <div
          @click="filterTab = 'PAUSED'"
          class="bg-white p-4 rounded-xl border border-sky-200 shadow-sm cursor-pointer hover:bg-sky-50/30 transition"
        >
          <span class="text-xs font-bold uppercase text-sky-700 block">❄️ Congeladas (Paused)</span>
          <span class="text-2xl font-black text-sky-700">{{ kpis.pausedCount }}</span>
        </div>

        <div
          @click="filterTab = 'ALL'"
          class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:bg-slate-50 transition"
        >
          <span class="text-xs font-bold uppercase text-slate-500 block">💵 Total Recaudado</span>
          <span class="text-2xl font-black text-slate-900">{{ formatCurrency(kpis.collectedTotal) }}</span>
        </div>
      </div>

      <!-- Filtros y Búsqueda -->
      <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex flex-wrap gap-1.5">
          <button
            type="button"
            @click="filterTab = 'ALL'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer"
            :class="filterTab === 'ALL' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200'"
          >
            Todas ({{ subscriptions.length }})
          </button>
          <button
            type="button"
            @click="filterTab = 'ACTIVE'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer"
            :class="filterTab === 'ACTIVE' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-600 border-slate-200'"
          >
            ✅ Activas ({{ kpis.activeCount }})
          </button>
          <button
            type="button"
            @click="filterTab = 'CXC'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer"
            :class="filterTab === 'CXC' ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-50 text-slate-600 border-slate-200'"
          >
            💰 Por Cobrar CxC ({{ kpis.cxcCount }})
          </button>
          <button
            type="button"
            @click="filterTab = 'PAUSED'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer"
            :class="filterTab === 'PAUSED' ? 'bg-sky-600 text-white border-sky-600' : 'bg-slate-50 text-slate-600 border-slate-200'"
          >
            ❄️ Congeladas ({{ kpis.pausedCount }})
          </button>
        </div>

        <search class="w-full sm:w-72">
          <form @submit.prevent>
            <label for="gym-sub-search" class="sr-only">Buscar socio o plan</label>
            <input
              id="gym-sub-search"
              v-model="searchQuery"
              type="search"
              placeholder="Buscar socio, documento o plan..."
              class="w-full rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs"
            />
          </form>
        </search>
      </div>

      <!-- Tabla de Membresías -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-100 text-left">
            <thead class="bg-slate-50/75">
              <tr>
                <th class="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase">Socio / Salud</th>
                <th class="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase">Plan</th>
                <th class="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase">Vigencia</th>
                <th class="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase">Estado</th>
                <th class="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase">Finanzas / CxC</th>
                <th class="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm bg-white">
              <tr v-for="sub in filteredSubscriptions" :key="sub.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-5 py-4">
                  <div class="font-bold text-slate-900">
                    {{ `${sub.customer?.firstName || ''} ${sub.customer?.lastName || ''}`.trim() || sub.customer?.companyName || 'Socio' }}
                  </div>
                  <div class="text-xs text-slate-400">
                    Doc: {{ sub.customer?.identificationNumber || '—' }}
                  </div>
                  <div
                    v-if="sub.customer?.medicalAlerts"
                    class="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold"
                  >
                    🩺 {{ sub.customer.medicalAlerts }}
                  </div>
                </td>

                <td class="px-5 py-4">
                  <div class="font-semibold text-slate-800">{{ sub.plan?.name || 'Plan' }}</div>
                  <div class="text-xs text-slate-400">{{ formatCurrency(sub.totalAmount) }}</div>
                </td>

                <td class="px-5 py-4 text-xs text-slate-600">
                  <div>Inicio: <strong>{{ formatDate(sub.startDate) }}</strong></div>
                  <div>Vence: <strong>{{ formatDate(sub.endDate) }}</strong></div>
                  <span v-if="sub.extendedDays > 0" class="text-[11px] text-teal-700 font-bold">
                    +{{ sub.extendedDays }} día(s) extendidos
                  </span>
                </td>

                <td class="px-5 py-4">
                  <span
                    class="px-2.5 py-1 text-xs font-bold rounded-full border inline-flex items-center gap-1"
                    :class="
                      sub.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : sub.status === 'PAUSED'
                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    "
                  >
                    {{ sub.status === 'ACTIVE' ? '✅ Activa' : sub.status === 'PAUSED' ? '❄️ Congelada' : sub.status }}
                  </span>
                  <p v-if="sub.status === 'PAUSED' && sub.freezeReason" class="text-[11px] text-sky-700 mt-1">
                    Motivo: {{ sub.freezeReason }}
                  </p>
                </td>

                <td class="px-5 py-4 text-xs">
                  <span
                    class="px-2.5 py-0.5 rounded-full font-bold border inline-block mb-1"
                    :class="
                      Number(sub.balanceAmount || 0) <= 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : sub.paymentStatus === 'PARTIAL'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    "
                  >
                    {{
                      Number(sub.balanceAmount || 0) <= 0
                        ? 'Pagado Total'
                        : sub.paymentStatus === 'PARTIAL'
                        ? 'Abono Parcial'
                        : 'Por Cobrar'
                    }}
                  </span>
                  <div class="text-slate-500">
                    Pagado: <strong class="text-emerald-700">{{ formatCurrency(sub.paidAmount) }}</strong>
                  </div>
                  <div v-if="Number(sub.balanceAmount || 0) > 0" class="text-rose-700 font-bold">
                    Saldo: {{ formatCurrency(sub.balanceAmount) }}
                  </div>
                </td>

                <td class="px-5 py-4 text-right">
                  <div class="flex flex-wrap justify-end gap-1.5">
                    <button
                      v-if="Number(sub.balanceAmount || 0) > 0"
                      type="button"
                      @click="openPaymentModal(sub)"
                      class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                    >
                      💵 Abonar
                    </button>

                    <button
                      v-if="sub.status === 'ACTIVE'"
                      type="button"
                      @click="openFreezeOrExtendModal(sub, 'FREEZE')"
                      class="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold cursor-pointer"
                    >
                      ❄️ Congelar
                    </button>

                    <button
                      v-if="sub.status === 'PAUSED'"
                      type="button"
                      @click="handleUnfreeze(sub)"
                      class="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer"
                    >
                      ☀️ Reactivar
                    </button>

                    <button
                      type="button"
                      @click="openFreezeOrExtendModal(sub, 'EXTEND')"
                      class="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-bold cursor-pointer"
                    >
                      📅 +Días
                    </button>

                    <button
                      type="button"
                      @click="openMedicalModal(sub)"
                      title="Alertas de Salud / Lesiones"
                      class="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer"
                    >
                      🩺
                    </button>

                    <button
                      type="button"
                      @click="goToPos(sub)"
                      title="Facturar en POS"
                      class="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold cursor-pointer"
                    >
                      💳 POS
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="filteredSubscriptions.length === 0">
                <td colspan="6" class="px-6 py-12 text-center text-slate-400">
                  <div class="flex flex-col items-center justify-center space-y-2">
                    <span class="text-3xl">📋</span>
                    <p class="text-sm font-medium">No hay membresías con este filtro.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODAL: ASIGNAR MEMBRESÍA CON CXC Y ALERTA DE SALUD -->
      <div v-if="showModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div class="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100 my-8">
          <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 id="modal-gym-sub-title" class="text-lg font-bold text-slate-900">Asignar Membresía de Gimnasio</h3>
            <button type="button" @click="showModal = false" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">✕</button>
          </div>

          <form @submit.prevent="saveSubscription" aria-labelledby="modal-gym-sub-title" class="p-6 space-y-4">
            <div>
              <label for="gym-customer" class="block text-xs font-bold uppercase text-slate-500 mb-1">Socio <span aria-hidden="true">*</span></label>
              <select id="gym-customer" v-model="form.customerId" required class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-white">
                <option disabled value="">Seleccione un socio</option>
                <option v-for="c in customers" :key="c.id" :value="c.id">
                  {{ `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.companyName || 'Sin Nombre' }}
                  ({{ c.identificationNumber || 'Sin cédula' }})
                </option>
              </select>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="gym-plan" class="block text-xs font-bold uppercase text-slate-500 mb-1">Plan de Membresía <span aria-hidden="true">*</span></label>
                <select id="gym-plan" v-model="form.membershipPlanId" required class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-white">
                  <option disabled value="">Seleccione un plan</option>
                  <option v-for="p in plans" :key="p.id" :value="p.id">
                    {{ p.name }} - {{ formatCurrency(p.price) }} ({{ p.durationDays }}d)
                  </option>
                </select>
              </div>
              <div>
                <label for="gym-start" class="block text-xs font-bold uppercase text-slate-500 mb-1">Fecha de Inicio <span aria-hidden="true">*</span></label>
                <input id="gym-start" type="date" v-model="form.startDate" required class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-white" />
              </div>
            </div>

            <!-- Modalidad de Pago (3 opciones mutuamente excluyentes -> radio buttons en fieldset) -->
            <fieldset class="border border-slate-200 rounded-xl p-3">
              <legend class="text-xs font-bold uppercase text-slate-500 px-1">Modalidad de Pago (CxC)</legend>
              <div class="grid grid-cols-3 gap-2 mt-1">
                <div class="flex items-center gap-1.5 bg-emerald-50/60 px-2.5 py-2 rounded-lg border border-emerald-200">
                  <input id="gym-pay-paid" v-model="form.paymentStatus" type="radio" name="paymentStatus" value="PAID" class="accent-emerald-600" />
                  <label for="gym-pay-paid" class="text-xs font-bold text-emerald-800 cursor-pointer">Pago Total</label>
                </div>
                <div class="flex items-center gap-1.5 bg-amber-50/60 px-2.5 py-2 rounded-lg border border-amber-200">
                  <input id="gym-pay-partial" v-model="form.paymentStatus" type="radio" name="paymentStatus" value="PARTIAL" class="accent-amber-600" />
                  <label for="gym-pay-partial" class="text-xs font-bold text-amber-800 cursor-pointer">Abono Parcial</label>
                </div>
                <div class="flex items-center gap-1.5 bg-rose-50/60 px-2.5 py-2 rounded-lg border border-rose-200">
                  <input id="gym-pay-pending" v-model="form.paymentStatus" type="radio" name="paymentStatus" value="PENDING" class="accent-rose-600" />
                  <label for="gym-pay-pending" class="text-xs font-bold text-rose-800 cursor-pointer">A Crédito</label>
                </div>
              </div>
            </fieldset>

            <div v-if="form.paymentStatus === 'PARTIAL'" class="grid grid-cols-2 gap-3 bg-amber-50/60 p-3 rounded-xl border border-amber-200">
              <div>
                <label for="gym-paid-amount" class="block text-xs font-bold uppercase text-amber-800 mb-1">Abono Inicial (COP)</label>
                <input id="gym-paid-amount" v-model.number="form.paidAmount" type="number" min="0" :max="form.totalAmount" class="w-full rounded-xl border border-amber-300 px-3 py-1.5 text-sm font-bold bg-white" />
              </div>
              <div>
                <span class="block text-xs font-bold uppercase text-amber-800 mb-1">Saldo Pendiente CxC</span>
                <p class="text-base font-black text-rose-700 mt-1.5">
                  {{ formatCurrency(Math.max(0, Number(form.totalAmount || 0) - Number(form.paidAmount || 0))) }}
                </p>
              </div>
            </div>

            <div>
              <label for="gym-medical" class="block text-xs font-bold uppercase text-rose-700 mb-1">
                🩺 Alertas de Salud / Lesiones del Socio (Opcional)
              </label>
              <input
                id="gym-medical"
                v-model="form.medicalAlerts"
                type="text"
                placeholder="Ej: Lesión de hombro, hipertensión, hernia lumbar..."
                class="w-full rounded-xl border border-rose-200 bg-rose-50/30 px-3.5 py-2 text-sm"
              />
            </div>

            <div class="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button type="button" @click="showModal = false" class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 cursor-pointer">Cancelar</button>
              <button type="submit" :disabled="loadingSubmit" class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm cursor-pointer disabled:opacity-50">
                {{ loadingSubmit ? 'Guardando...' : 'Asignar Membresía' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL: REGISTRAR ABONO PARCIAL (CxC) -->
      <div v-if="selectedSubForPayment" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-100 overflow-hidden">
          <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h3 id="modal-gym-pay-title" class="text-base font-bold text-slate-900">💵 Registrar Abono a Membresía</h3>
            <button type="button" @click="selectedSubForPayment = null" class="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
          </div>
          <form @submit.prevent="submitPayment" aria-labelledby="modal-gym-pay-title" class="p-6 space-y-4">
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs">
              <p class="font-bold text-amber-900">{{ selectedSubForPayment.customer?.firstName }} {{ selectedSubForPayment.customer?.lastName }}</p>
              <p class="text-amber-800 mt-0.5">Saldo pendiente actual: <strong>{{ formatCurrency(selectedSubForPayment.balanceAmount) }}</strong></p>
            </div>
            <div>
              <label for="gym-abono-amount" class="block text-xs font-bold uppercase text-slate-500 mb-1">Valor del Abono <span aria-hidden="true">*</span></label>
              <input id="gym-abono-amount" v-model.number="paymentForm.amount" type="number" min="1" :max="selectedSubForPayment.balanceAmount" required class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-bold" />
            </div>
            <div>
              <label for="gym-abono-notes" class="block text-xs font-bold uppercase text-slate-500 mb-1">Medio de pago / Comprobante</label>
              <input id="gym-abono-notes" v-model="paymentForm.notes" type="text" placeholder="Ej: Nequi, Transferencia Bancolombia, Efectivo..." class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm" />
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" @click="selectedSubForPayment = null" class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer">Cancelar</button>
              <button type="submit" :disabled="loadingSubmit" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer">Confirmar Abono</button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL: CONGELAR O EXTENDER DÍAS -->
      <div v-if="selectedSubForFreeze" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-100 overflow-hidden">
          <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h3 id="modal-gym-freeze-title" class="text-base font-bold text-slate-900">
              {{ freezeMode === 'FREEZE' ? '❄️ Congelar Membresía' : '📅 Extender Días de Vigencia' }}
            </h3>
            <button type="button" @click="selectedSubForFreeze = null" class="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
          </div>
          <form @submit.prevent="submitFreezeOrExtend" aria-labelledby="modal-gym-freeze-title" class="p-6 space-y-4">
            <div v-if="freezeMode === 'EXTEND'">
              <label for="gym-ext-days" class="block text-xs font-bold uppercase text-slate-500 mb-1">Días a sumar a la fecha de vencimiento <span aria-hidden="true">*</span></label>
              <input id="gym-ext-days" v-model.number="freezeForm.days" type="number" min="1" required class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-bold" />
            </div>
            <div>
              <label for="gym-freeze-reason" class="block text-xs font-bold uppercase text-slate-500 mb-1">Motivo</label>
              <input id="gym-freeze-reason" v-model="freezeForm.reason" type="text" placeholder="Ej: Viaje, incapacidad médica, compensación..." class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm" />
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" @click="selectedSubForFreeze = null" class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer">Cancelar</button>
              <button type="submit" :disabled="loadingSubmit" class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer">
                {{ freezeMode === 'FREEZE' ? 'Congelar Ahora' : 'Extender Vigencia' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL: ALERTA MÉDICA / LESIONES -->
      <div v-if="selectedCustomerForMedical" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-100 overflow-hidden">
          <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-rose-50">
            <h3 id="modal-gym-med-title" class="text-base font-bold text-rose-900">🩺 Alertas de Salud y Lesiones</h3>
            <button type="button" @click="selectedCustomerForMedical = null" class="text-rose-400 hover:text-rose-700 cursor-pointer">✕</button>
          </div>
          <form @submit.prevent="submitMedicalAlert" aria-labelledby="modal-gym-med-title" class="p-6 space-y-4">
            <p class="text-xs text-slate-600">
              Socio: <strong>{{ selectedCustomerForMedical.firstName }} {{ selectedCustomerForMedical.lastName }}</strong>. Esta alerta se mostrará al entrenador y en la terminal de acceso.
            </p>
            <div>
              <label for="gym-med-input" class="block text-xs font-bold uppercase text-slate-500 mb-1">Condición física, lesión o restricción</label>
              <textarea id="gym-med-input" v-model="medicalAlertsInput" rows="3" placeholder="Ej: Lesión de menisco derecho, hipertensión controlada..." class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm"></textarea>
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" @click="selectedCustomerForMedical = null" class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer">Cancelar</button>
              <button type="submit" :disabled="loadingSubmit" class="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer">Guardar Alerta</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
