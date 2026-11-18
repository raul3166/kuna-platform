<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'
import AppLayout from '../components/AppLayout.vue'

const authStore = useAuthStore()

const loading = ref(false)
const loadingSubmit = ref(false)
const activeTab = ref<'cxc' | 'cxp'>('cxc')
const agingFilter = ref<'ALL' | 'CURRENT' | 'DAYS_1_30' | 'DAYS_OVER_30'>('ALL')
const sourceFilter = ref<string>('ALL')
const searchQuery = ref('')

const summary = ref<any>({
  totalReceivable: 0,
  receivablesCount: 0,
  currentReceivable: 0,
  days1To30Receivable: 0,
  over30Receivable: 0,
  totalPayable: 0,
  payablesCount: 0,
  netPortfolioPosition: 0,
})
const receivables = ref<any[]>([])
const payables = ref<any[]>([])

// Modal de Abono / Pago
const selectedItemForPayment = ref<any>(null)
const paymentMode = ref<'CXC' | 'CXP'>('CXC')
const paymentForm = ref({
  amount: 0,
  paymentMethod: 'TRANSFER',
  notes: '',
})

const activeOrgId = computed(
  () => authStore.currentOrganization?.id || authStore.user?.organizationId || ''
)

const filteredReceivables = computed(() => {
  let list = receivables.value
  if (agingFilter.value !== 'ALL') {
    list = list.filter((r) => r.agingBucket === agingFilter.value)
  }
  if (sourceFilter.value !== 'ALL') {
    list = list.filter((r) => r.sourceType === sourceFilter.value)
  }
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter((r) => {
      const text = `${r.customerName || ''} ${r.documentNumber || ''} ${r.concept || ''} ${r.customerDocument || ''}`.toLowerCase()
      return text.includes(q)
    })
  }
  return list
})

const filteredPayables = computed(() => {
  let list = payables.value
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter((p) => {
      const text = `${p.beneficiaryName || ''} ${p.documentNumber || ''} ${p.concept || ''}`.toLowerCase()
      return text.includes(q)
    })
  }
  return list
})

function formatCurrency(val: number | string | null | undefined): string {
  const num = Number(val || 0)
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(num)
}

function formatDate(d?: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getAgingBadge(bucket: string, days: number) {
  if (bucket === 'CURRENT') {
    return {
      label: `Al día (${days}d)`,
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    }
  }
  if (bucket === 'DAYS_1_30') {
    return {
      label: `1–30 días (${days}d)`,
      classes: 'bg-amber-50 text-amber-800 border-amber-300',
    }
  }
  return {
    label: `>30 días (${days}d)`,
    classes: 'bg-rose-50 text-rose-700 border-rose-200',
  }
}

function getWhatsAppReminderLink(item: any): string {
  const rawPhone = item.customerPhone || ''
  const cleanPhone = rawPhone.replace(/\D/g, '')
  const targetPhone =
    cleanPhone.length >= 10
      ? cleanPhone.startsWith('57')
        ? cleanPhone
        : `57${cleanPhone}`
      : ''
  const orgName = authStore.currentOrganization?.name || 'Nuestra Empresa'
  const msg = `Hola ${item.customerName}, te saludamos de ${orgName}. Te recordamos tu saldo pendiente de ${formatCurrency(item.balanceAmount)} correspondiente a ${item.concept} (${item.documentNumber}). ¡Muchas gracias!`
  const encoded = encodeURIComponent(msg)
  return targetPhone ? `https://wa.me/${targetPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`
}

async function fetchPortfolio() {
  if (!activeOrgId.value) return
  loading.value = true
  try {
    const res = await api.get('/accounts-portfolio/dashboard', {
      params: {
        organizationId: activeOrgId.value,
        ...(authStore.currentBranch?.id ? { branchId: authStore.currentBranch.id } : {}),
      },
    })
    summary.value = res.data?.summary || summary.value
    receivables.value = Array.isArray(res.data?.receivables) ? res.data.receivables : []
    payables.value = Array.isArray(res.data?.payables) ? res.data.payables : []
  } catch (err) {
    console.error('Error cargando cartera central CxC y CxP:', err)
  } finally {
    loading.value = false
  }
}

function openPaymentModal(item: any, mode: 'CXC' | 'CXP') {
  selectedItemForPayment.value = item
  paymentMode.value = mode
  paymentForm.value = {
    amount: Number(item.balanceAmount || 0),
    paymentMethod: 'TRANSFER',
    notes: '',
  }
}

async function submitPayment() {
  if (!selectedItemForPayment.value || !activeOrgId.value) return
  loadingSubmit.value = true
  try {
    const endpoint =
      paymentMode.value === 'CXC'
        ? '/accounts-portfolio/receivables/pay'
        : '/accounts-portfolio/payables/pay'

    await api.post(endpoint, {
      organizationId: activeOrgId.value,
      sourceType: selectedItemForPayment.value.sourceType,
      sourceId: selectedItemForPayment.value.id,
      amount: Number(paymentForm.value.amount),
      paymentMethod: paymentForm.value.paymentMethod,
      notes: paymentForm.value.notes || undefined,
    })

    selectedItemForPayment.value = null
    await fetchPortfolio()
  } catch (err: any) {
    alert(err?.response?.data?.message || 'Error al registrar el abono/pago')
  } finally {
    loadingSubmit.value = false
  }
}

onMounted(() => {
  fetchPortfolio()
})
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <span class="inline-block text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full mb-1">
            Módulo Core Financiero Transversal
          </span>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">
            💰 Cartera Central: Cuentas por Cobrar (CxC) y Cuentas por Pagar (CxP)
          </h1>
          <p class="text-sm text-slate-500 mt-1">
            Unifica saldos pendientes de Facturas POS, Anticipos en Órdenes de Servicio, Paquetes de Studio, Membresías de Gym, Facturas de Proveedores y Gastos.
          </p>
        </div>

        <button
          type="button"
          @click="fetchPortfolio"
          class="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition cursor-pointer"
        >
          🔄 Actualizar Cartera
        </button>
      </div>

      <!-- KPIs Ejecutivos de Cartera y Edades -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div
          @click="activeTab = 'cxc'; agingFilter = 'ALL'"
          class="bg-white rounded-2xl border border-emerald-200 p-4 shadow-sm cursor-pointer hover:bg-emerald-50/30 transition"
        >
          <span class="text-xs font-bold uppercase text-emerald-700 block">📥 Total por Cobrar (CxC)</span>
          <span class="text-2xl font-black text-emerald-700 mt-1 block">
            {{ formatCurrency(summary.totalReceivable) }}
          </span>
          <span class="text-[11px] text-slate-500">{{ summary.receivablesCount }} cuenta(s) activa(s)</span>
        </div>

        <div
          @click="activeTab = 'cxc'; agingFilter = 'CURRENT'"
          class="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm cursor-pointer hover:bg-slate-50 transition"
        >
          <span class="text-xs font-bold uppercase text-slate-500 block">🟢 Cartera Al Día (≤7d)</span>
          <span class="text-xl font-black text-slate-800 mt-1 block">
            {{ formatCurrency(summary.currentReceivable) }}
          </span>
          <span class="text-[11px] text-slate-400">Emisión reciente</span>
        </div>

        <div
          @click="activeTab = 'cxc'; agingFilter = 'DAYS_1_30'"
          class="bg-white rounded-2xl border border-amber-200 p-4 shadow-sm cursor-pointer hover:bg-amber-50/30 transition"
        >
          <span class="text-xs font-bold uppercase text-amber-700 block">🟡 Cartera 8–30 Días</span>
          <span class="text-xl font-black text-amber-800 mt-1 block">
            {{ formatCurrency(summary.days1To30Receivable) }}
          </span>
          <span class="text-[11px] text-amber-700">Seguimiento preventivo</span>
        </div>

        <div
          @click="activeTab = 'cxc'; agingFilter = 'DAYS_OVER_30'"
          class="bg-white rounded-2xl border border-rose-200 p-4 shadow-sm cursor-pointer hover:bg-rose-50/30 transition"
        >
          <span class="text-xs font-bold uppercase text-rose-700 block">🔴 Mora > 30 Días</span>
          <span class="text-xl font-black text-rose-700 mt-1 block">
            {{ formatCurrency(summary.over30Receivable) }}
          </span>
          <span class="text-[11px] text-rose-600">Cobro prioritario</span>
        </div>

        <div
          @click="activeTab = 'cxp'"
          class="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl border border-indigo-900 p-4 shadow-sm cursor-pointer"
        >
          <span class="text-xs font-bold uppercase text-indigo-200 block">📤 Cuentas por Pagar (CxP)</span>
          <span class="text-2xl font-black mt-1 block">
            {{ formatCurrency(summary.totalPayable) }}
          </span>
          <span class="text-[11px] text-indigo-200">{{ summary.payablesCount }} obligación(es) con proveedores</span>
        </div>
      </div>

      <!-- Pestañas Principales CxC vs CxP -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            @click="activeTab = 'cxc'"
            class="px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer"
            :class="
              activeTab === 'cxc'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            "
          >
            📥 Cuentas por Cobrar a Clientes — CxC ({{ receivables.length }})
          </button>
          <button
            type="button"
            @click="activeTab = 'cxp'"
            class="px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer"
            :class="
              activeTab === 'cxp'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            "
          >
            📤 Cuentas por Pagar a Proveedores — CxP ({{ payables.length }})
          </button>
        </div>

        <search class="w-full sm:w-72">
          <form @submit.prevent>
            <label for="portfolio-search" class="sr-only">Buscar cliente, proveedor o documento</label>
            <input
              id="portfolio-search"
              v-model="searchQuery"
              type="search"
              placeholder="Buscar cliente, proveedor, orden o factura..."
              class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs"
            />
          </form>
        </search>
      </div>

      <!-- TAB 1: CUENTAS POR COBRAR (CxC) -->
      <section v-if="activeTab === 'cxc'" class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
          <div class="flex flex-wrap gap-1.5">
            <button
              type="button"
              @click="sourceFilter = 'ALL'"
              class="px-3 py-1 rounded-lg text-xs font-bold border cursor-pointer"
              :class="sourceFilter === 'ALL' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200'"
            >
              Todos los Orígenes
            </button>
            <button
              type="button"
              @click="sourceFilter = 'SERVICE_ORDER'"
              class="px-3 py-1 rounded-lg text-xs font-bold border cursor-pointer"
              :class="sourceFilter === 'SERVICE_ORDER' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200'"
            >
              🛠️ Órdenes de Servicio / Taller
            </button>
            <button
              type="button"
              @click="sourceFilter = 'SALE'"
              class="px-3 py-1 rounded-lg text-xs font-bold border cursor-pointer"
              :class="sourceFilter === 'SALE' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200'"
            >
              🧾 Facturas POS
            </button>
            <button
              type="button"
              @click="sourceFilter = 'STUDIO_SUBSCRIPTION'"
              class="px-3 py-1 rounded-lg text-xs font-bold border cursor-pointer"
              :class="sourceFilter === 'STUDIO_SUBSCRIPTION' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200'"
            >
              🧘‍♀️ Paquetes Studio
            </button>
            <button
              type="button"
              @click="sourceFilter = 'GYM_SUBSCRIPTION'"
              class="px-3 py-1 rounded-lg text-xs font-bold border cursor-pointer"
              :class="sourceFilter === 'GYM_SUBSCRIPTION' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200'"
            >
              🏋️ Membresías Gym
            </button>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div v-if="loading" class="p-12 text-center text-slate-400">Cargando cuentas por cobrar...</div>
          <div v-else-if="filteredReceivables.length === 0" class="p-12 text-center text-slate-400 space-y-1">
            <span class="text-3xl block">🎉</span>
            <p class="text-sm font-semibold">No hay cuentas por cobrar pendientes con este filtro.</p>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-left text-sm text-slate-600">
              <thead class="bg-slate-50/80 border-b border-slate-100 text-xs uppercase font-bold text-slate-500">
                <tr>
                  <th class="px-4 py-3">Origen / Documento</th>
                  <th class="px-4 py-3">Cliente</th>
                  <th class="px-4 py-3">Concepto</th>
                  <th class="px-4 py-3">Edad Cartera</th>
                  <th class="px-4 py-3 text-right">Total / Abonado</th>
                  <th class="px-4 py-3 text-right">Saldo por Cobrar</th>
                  <th class="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="item in filteredReceivables" :key="`${item.sourceType}-${item.id}`" class="hover:bg-slate-50/60">
                  <td class="px-4 py-3">
                    <span class="text-[11px] font-bold uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                      {{ item.sourceLabel }}
                    </span>
                    <p class="font-mono font-bold text-slate-900 text-xs mt-1">{{ item.documentNumber }}</p>
                    <p class="text-[11px] text-slate-400">{{ formatDate(item.issueDate) }}</p>
                  </td>
                  <td class="px-4 py-3">
                    <p class="font-bold text-slate-900">{{ item.customerName }}</p>
                    <p v-if="item.customerDocument" class="text-xs text-slate-400">Doc: {{ item.customerDocument }}</p>
                  </td>
                  <td class="px-4 py-3">
                    <p class="font-semibold text-slate-800">{{ item.concept }}</p>
                    <p v-if="item.paymentNotes" class="text-[11px] text-slate-400 truncate max-w-xs">{{ item.paymentNotes }}</p>
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="px-2.5 py-0.5 rounded-full text-xs font-bold border"
                      :class="getAgingBadge(item.agingBucket, item.daysOverdue).classes"
                    >
                      {{ getAgingBadge(item.agingBucket, item.daysOverdue).label }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right text-xs">
                    <div>Total: <strong>{{ formatCurrency(item.totalAmount) }}</strong></div>
                    <div class="text-emerald-700">Abonado: <strong>{{ formatCurrency(item.paidAmount) }}</strong></div>
                  </td>
                  <td class="px-4 py-3 text-right font-black text-rose-700 text-base">
                    {{ formatCurrency(item.balanceAmount) }}
                  </td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex justify-end gap-1.5">
                      <button
                        type="button"
                        @click="openPaymentModal(item, 'CXC')"
                        class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                      >
                        💵 Registrar Abono
                      </button>
                      <a
                        :href="getWhatsAppReminderLink(item)"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Enviar recordatorio de cobro por WhatsApp"
                        class="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold"
                      >
                        💬
                      </a>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- TAB 2: CUENTAS POR PAGAR (CxP) -->
      <section v-if="activeTab === 'cxp'" class="space-y-4">
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div v-if="loading" class="p-12 text-center text-slate-400">Cargando cuentas por pagar...</div>
          <div v-else-if="filteredPayables.length === 0" class="p-12 text-center text-slate-400 space-y-1">
            <span class="text-3xl block">✅</span>
            <p class="text-sm font-semibold">No tienes facturas de proveedores ni gastos pendientes por pagar.</p>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-left text-sm text-slate-600">
              <thead class="bg-slate-50/80 border-b border-slate-100 text-xs uppercase font-bold text-slate-500">
                <tr>
                  <th class="px-4 py-3">Origen / N° Factura</th>
                  <th class="px-4 py-3">Proveedor / Beneficiario</th>
                  <th class="px-4 py-3">Concepto</th>
                  <th class="px-4 py-3">Emisión / Vencimiento</th>
                  <th class="px-4 py-3 text-right">Total / Pagado</th>
                  <th class="px-4 py-3 text-right">Saldo por Pagar</th>
                  <th class="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="p in filteredPayables" :key="`${p.sourceType}-${p.id}`" class="hover:bg-slate-50/60">
                  <td class="px-4 py-3">
                    <span class="text-[11px] font-bold uppercase text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      {{ p.sourceLabel }}
                    </span>
                    <p class="font-mono font-bold text-slate-900 text-xs mt-1">{{ p.documentNumber }}</p>
                  </td>
                  <td class="px-4 py-3 font-bold text-slate-900">
                    {{ p.beneficiaryName }}
                  </td>
                  <td class="px-4 py-3">
                    <p class="font-semibold text-slate-800">{{ p.concept }}</p>
                    <p v-if="p.paymentNotes" class="text-[11px] text-slate-400 truncate max-w-xs">{{ p.paymentNotes }}</p>
                  </td>
                  <td class="px-4 py-3 text-xs">
                    <div>Emitida: {{ formatDate(p.issueDate) }}</div>
                    <div v-if="p.dueDate" class="text-rose-600 font-semibold">Vence: {{ formatDate(p.dueDate) }}</div>
                  </td>
                  <td class="px-4 py-3 text-right text-xs">
                    <div>Total: <strong>{{ formatCurrency(p.totalAmount) }}</strong></div>
                    <div class="text-emerald-700">Pagado: <strong>{{ formatCurrency(p.paidAmount) }}</strong></div>
                  </td>
                  <td class="px-4 py-3 text-right font-black text-rose-700 text-base">
                    {{ formatCurrency(p.balanceAmount) }}
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button
                      type="button"
                      @click="openPaymentModal(p, 'CXP')"
                      class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                    >
                      💸 Registrar Pago / Abono
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- MODAL: REGISTRAR ABONO (CxC) O PAGO A PROVEEDOR (CxP) -->
      <div
        v-if="selectedItemForPayment"
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-100 overflow-hidden">
          <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h3 id="modal-portfolio-pay-title" class="text-base font-bold text-slate-900">
              {{ paymentMode === 'CXC' ? '💵 Registrar Abono de Cliente (CxC)' : '💸 Registrar Pago a Proveedor (CxP)' }}
            </h3>
            <button type="button" @click="selectedItemForPayment = null" class="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">
              ✕
            </button>
          </div>

          <form @submit.prevent="submitPayment" aria-labelledby="modal-portfolio-pay-title" class="p-6 space-y-4">
            <div class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-1">
              <p class="font-bold text-slate-900">
                {{ selectedItemForPayment.customerName || selectedItemForPayment.beneficiaryName }}
              </p>
              <p class="text-slate-600">
                {{ selectedItemForPayment.sourceLabel }} — <strong>{{ selectedItemForPayment.documentNumber }}</strong>
              </p>
              <p class="text-rose-700 font-bold">
                Saldo pendiente: {{ formatCurrency(selectedItemForPayment.balanceAmount) }}
              </p>
            </div>

            <div>
              <label for="port-pay-amount" class="block text-xs font-bold uppercase text-slate-500 mb-1">
                Monto a Abonar / Pagar (COP) <span aria-hidden="true">*</span>
              </label>
              <input
                id="port-pay-amount"
                v-model.number="paymentForm.amount"
                name="amount"
                type="number"
                min="1"
                :max="selectedItemForPayment.balanceAmount"
                required
                class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-bold"
              />
            </div>

            <!-- Medio de Pago (4 opciones mutuamente excluyentes -> radio buttons en fieldset) -->
            <fieldset class="border border-slate-200 rounded-xl p-3">
              <legend class="text-xs font-bold uppercase text-slate-500 px-1">Medio de Pago</legend>
              <div class="grid grid-cols-2 gap-2 mt-1">
                <div class="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                  <input id="pm-transfer" v-model="paymentForm.paymentMethod" type="radio" name="paymentMethod" value="TRANSFER" class="accent-indigo-600" />
                  <label for="pm-transfer" class="text-xs font-semibold text-slate-700 cursor-pointer">Transferencia</label>
                </div>
                <div class="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                  <input id="pm-nequi" v-model="paymentForm.paymentMethod" type="radio" name="paymentMethod" value="NEQUI" class="accent-indigo-600" />
                  <label for="pm-nequi" class="text-xs font-semibold text-slate-700 cursor-pointer">Nequi / Daviplata</label>
                </div>
                <div class="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                  <input id="pm-cash" v-model="paymentForm.paymentMethod" type="radio" name="paymentMethod" value="CASH" class="accent-indigo-600" />
                  <label for="pm-cash" class="text-xs font-semibold text-slate-700 cursor-pointer">Efectivo / Caja</label>
                </div>
                <div class="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                  <input id="pm-card" v-model="paymentForm.paymentMethod" type="radio" name="paymentMethod" value="CARD" class="accent-indigo-600" />
                  <label for="pm-card" class="text-xs font-semibold text-slate-700 cursor-pointer">Tarjeta</label>
                </div>
              </div>
            </fieldset>

            <div>
              <label for="port-pay-notes" class="block text-xs font-bold uppercase text-slate-500 mb-1">
                Referencia / Comprobante / Notas
              </label>
              <input
                id="port-pay-notes"
                v-model="paymentForm.notes"
                name="notes"
                type="text"
                autocorrect="off"
                spellcheck="false"
                placeholder="Ej: Comprobante #99812, Anticipo 50%..."
                class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
              />
            </div>

            <div class="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                @click="selectedItemForPayment = null"
                class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="loadingSubmit || paymentForm.amount <= 0"
                class="px-5 py-2 rounded-xl text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                :class="paymentMode === 'CXC' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'"
              >
                {{ loadingSubmit ? 'Procesando...' : 'Confirmar Registro' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

