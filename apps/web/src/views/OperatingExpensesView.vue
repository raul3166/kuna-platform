<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'
import AppLayout from '../components/AppLayout.vue'

const authStore = useAuthStore()

const loading = ref(false)
const loadingSubmit = ref(false)
const expenses = ref<any[]>([])
const summary = ref<any>(null)

// Filtros de período, categoría y estado
const now = new Date()
const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0] || ''
const todayStr = now.toISOString().split('T')[0] || ''

const fromDate = ref<string>(firstDayOfMonth)
const toDate = ref<string>(todayStr)
const filterCategory = ref<string>('ALL')
const filterStatus = ref<string>('ALL')

const showCreateModal = ref(false)

const categories: { value: string; label: string; icon: string; badgeClass: string }[] = [
  { value: 'RENT', label: 'Arriendo / Local', icon: '🏢', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'UTILITIES', label: 'Servicios Públicos / Internet', icon: '⚡', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200' },
  { value: 'PAYROLL', label: 'Nómina / Honorarios', icon: '👩‍💼', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'MARKETING', label: 'Publicidad / Marketing', icon: '📣', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'MAINTENANCE', label: 'Mantenimiento / Aseo', icon: '🧹', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  { value: 'SUPPLIES', label: 'Insumos / Papelería / Cafetería', icon: '📦', badgeClass: 'bg-teal-50 text-teal-700 border-teal-200' },
  { value: 'TAXES', label: 'Impuestos / Trámites / Bancos', icon: '🏛️', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  { value: 'OTHER', label: 'Otros Gastos Operativos', icon: '💸', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
]

const paymentMethods: { value: string; label: string }[] = [
  { value: 'TRANSFER', label: 'Transferencia Bancaria' },
  { value: 'NEQUI', label: 'Nequi / Daviplata' },
  { value: 'CASH', label: 'Efectivo / Caja General' },
  { value: 'PETTY_CASH', label: 'Caja Menor' },
  { value: 'CARD', label: 'Tarjeta Débito / Crédito' },
]

const initialForm = {
  category: 'RENT',
  description: '',
  beneficiaryName: '',
  amount: 0,
  paymentMethod: 'TRANSFER',
  status: 'PAID',
  expenseDate: todayStr,
  reference: '',
  notes: '',
}

const form = ref({ ...initialForm })

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
  const datePart = String(d).split('T')[0]
  return new Date(`${datePart}T00:00:00`).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getCategoryMeta(cat: string) {
  return (
    categories.find((c) => c.value === cat) || {
      value: cat,
      label: cat,
      icon: '💸',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    }
  )
}

function getPaymentMethodLabel(method: string): string {
  return paymentMethods.find((m) => m.value === method)?.label || method
}

const activeOrgId = computed(
  () => authStore.currentOrganization?.id || authStore.user?.organizationId || ''
)

const activeBranchId = computed(() => authStore.currentBranch?.id || undefined)

async function fetchExpensesAndSummary() {
  if (!activeOrgId.value) return
  loading.value = true
  try {
    const commonParams = {
      organizationId: activeOrgId.value,
      ...(activeBranchId.value ? { branchId: activeBranchId.value } : {}),
      from: fromDate.value,
      to: toDate.value,
    }

    const [listRes, summaryRes] = await Promise.all([
      api.get('/operating-expenses', {
        params: {
          ...commonParams,
          ...(filterCategory.value !== 'ALL' ? { category: filterCategory.value } : {}),
          ...(filterStatus.value !== 'ALL' ? { status: filterStatus.value } : {}),
        },
      }),
      api.get('/operating-expenses/summary', {
        params: commonParams,
      }),
    ])

    expenses.value = Array.isArray(listRes.data) ? listRes.data : []
    summary.value = summaryRes.data || null
  } catch (err) {
    console.error('Error cargando gastos operativos y flujo de caja:', err)
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  form.value = {
    ...initialForm,
    expenseDate: todayStr,
  }
  showCreateModal.value = true
}

async function saveExpense() {
  if (!activeOrgId.value) return
  loadingSubmit.value = true
  try {
    await api.post('/operating-expenses', {
      organizationId: activeOrgId.value,
      branchId: activeBranchId.value,
      category: form.value.category,
      description: form.value.description,
      beneficiaryName: form.value.beneficiaryName || undefined,
      amount: Number(form.value.amount),
      paymentMethod: form.value.paymentMethod,
      status: form.value.status,
      expenseDate: form.value.expenseDate,
      reference: form.value.reference || undefined,
      notes: form.value.notes || undefined,
    })
    showCreateModal.value = false
    await fetchExpensesAndSummary()
  } catch (err: any) {
    alert(err?.response?.data?.message || 'Error al registrar el gasto operativo')
  } finally {
    loadingSubmit.value = false
  }
}

async function markAsPaid(expense: any) {
  if (!confirm(`¿Marcar el gasto ${expense.expenseNumber} (${formatCurrency(expense.amount)}) como PAGADO?`)) {
    return
  }
  try {
    await api.patch(
      `/operating-expenses/${expense.id}/status`,
      { status: 'PAID' },
      { params: { organizationId: activeOrgId.value } }
    )
    await fetchExpensesAndSummary()
  } catch (err: any) {
    alert(err?.response?.data?.message || 'No se pudo actualizar el estado del gasto')
  }
}

async function deleteExpense(expense: any) {
  if (!confirm(`¿Eliminar el registro de gasto ${expense.expenseNumber} por ${formatCurrency(expense.amount)}?`)) {
    return
  }
  try {
    await api.delete(`/operating-expenses/${expense.id}`, {
      params: { organizationId: activeOrgId.value },
    })
    await fetchExpensesAndSummary()
  } catch (err: any) {
    alert(err?.response?.data?.message || 'No se pudo eliminar el gasto')
  }
}

watch([filterCategory, filterStatus], () => {
  fetchExpensesAndSummary()
})

onMounted(() => {
  fetchExpensesAndSummary()
})
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <span class="inline-block text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full mb-1">
            Módulo Core Transversal
          </span>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">
            💸 Gastos Operativos y Estado de Resultados Real
          </h1>
          <p class="text-sm text-slate-500 mt-1">
            Registra arriendo, servicios públicos, nómina e insumos y visualiza la Utilidad Neta Real de tu empresa en tiempo real.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            @click="fetchExpensesAndSummary"
            class="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition cursor-pointer"
          >
            🔄 Actualizar
          </button>
          <button
            type="button"
            @click="openCreateModal"
            class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition cursor-pointer"
          >
            ➕ Registrar Gasto
          </button>
        </div>
      </div>

      <!-- TABLERO DE FLUJO DE CAJA REAL Y UTILIDAD NETA -->
      <div v-if="summary" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- 1. Ingresos Totales Consolidados -->
        <div class="bg-white rounded-2xl border border-emerald-200 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase text-emerald-700">📈 Ingresos del Período</span>
            <span class="text-lg">💰</span>
          </div>
          <p class="text-2xl font-black text-emerald-700 mt-2">
            {{ formatCurrency(summary.incomeBreakdown?.totalIncome) }}
          </p>
          <div class="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-0.5">
            <div v-if="summary.incomeBreakdown?.salesPos > 0" class="flex justify-between">
              <span>Ventas POS / Facturación:</span>
              <strong class="text-slate-700">{{ formatCurrency(summary.incomeBreakdown.salesPos) }}</strong>
            </div>
            <div v-if="summary.incomeBreakdown?.studioPackages > 0" class="flex justify-between">
              <span>Paquetes / Abonos Studio:</span>
              <strong class="text-slate-700">{{ formatCurrency(summary.incomeBreakdown.studioPackages) }}</strong>
            </div>
            <div v-if="summary.incomeBreakdown?.gymMemberships > 0" class="flex justify-between">
              <span>Membresías Gym:</span>
              <strong class="text-slate-700">{{ formatCurrency(summary.incomeBreakdown.gymMemberships) }}</strong>
            </div>
            <div v-if="summary.incomeBreakdown?.serviceOrders > 0" class="flex justify-between">
              <span>Órdenes de Servicio:</span>
              <strong class="text-slate-700">{{ formatCurrency(summary.incomeBreakdown.serviceOrders) }}</strong>
            </div>
            <div v-if="summary.incomeBreakdown?.hotelReservations > 0" class="flex justify-between">
              <span>Reservas de Hotel:</span>
              <strong class="text-slate-700">{{ formatCurrency(summary.incomeBreakdown.hotelReservations) }}</strong>
            </div>
            <div v-if="summary.incomeBreakdown?.pendingReceivables > 0" class="flex justify-between text-amber-700 pt-1">
              <span>Cartera CxC por cobrar:</span>
              <strong>{{ formatCurrency(summary.incomeBreakdown.pendingReceivables) }}</strong>
            </div>
          </div>
        </div>

        <!-- 2. Gastos Operativos -->
        <div class="bg-white rounded-2xl border border-rose-200 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase text-rose-700">💸 Gastos Operativos</span>
            <span class="text-lg">🧾</span>
          </div>
          <p class="text-2xl font-black text-rose-700 mt-2">
            {{ formatCurrency(summary.outflowBreakdown?.totalOperatingExpenses) }}
          </p>
          <div class="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-0.5">
            <div class="flex justify-between">
              <span>Gastos Pagados:</span>
              <strong class="text-slate-700">{{ formatCurrency(summary.outflowBreakdown?.paidOperatingExpenses) }}</strong>
            </div>
            <div class="flex justify-between text-amber-700">
              <span>Por Pagar (Pendientes):</span>
              <strong>{{ formatCurrency(summary.outflowBreakdown?.pendingOperatingExpenses) }}</strong>
            </div>
          </div>
        </div>

        <!-- 3. Compras de Inventario / Proveedores -->
        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase text-slate-500">📦 Compras a Proveedores</span>
            <span class="text-lg">🚚</span>
          </div>
          <p class="text-2xl font-black text-slate-800 mt-2">
            {{ formatCurrency(summary.outflowBreakdown?.inventoryPurchases) }}
          </p>
          <p class="text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-100">
            Facturas de compra registradas en el período
          </p>
        </div>

        <!-- 4. Utilidad Neta Real -->
        <div
          class="rounded-2xl border p-5 shadow-sm"
          :class="
            Number(summary.netResult?.netProfit || 0) >= 0
              ? 'bg-gradient-to-br from-slate-900 to-indigo-950 text-white border-indigo-900'
              : 'bg-rose-950 text-white border-rose-800'
          "
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase text-indigo-200">🏆 Utilidad Neta Real</span>
            <span
              class="text-xs font-bold px-2 py-0.5 rounded-full"
              :class="
                Number(summary.netResult?.netProfit || 0) >= 0
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  : 'bg-rose-500/20 text-rose-200 border border-rose-400/30'
              "
            >
              Margen: {{ summary.netResult?.profitMarginPct || 0 }}%
            </span>
          </div>
          <p class="text-2xl font-black mt-2">
            {{ formatCurrency(summary.netResult?.netProfit) }}
          </p>
          <p class="text-[11px] text-indigo-200 mt-2.5 pt-2 border-t border-white/15">
            Ingresos − Gastos Operativos − Compras
          </p>
        </div>
      </div>

      <!-- Desglose por Categoría de Gasto -->
      <div
        v-if="summary?.expensesByCategory && summary.expensesByCategory.length > 0"
        class="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm"
      >
        <h2 class="text-xs font-bold uppercase text-slate-500 mb-3">
          📊 Distribución de Gastos por Categoría en el Período
        </h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            v-for="item in summary.expensesByCategory"
            :key="item.category"
            class="p-3 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2"
          >
            <div>
              <span class="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span>{{ getCategoryMeta(item.category).icon }}</span>
                <span>{{ getCategoryMeta(item.category).label }}</span>
              </span>
              <span class="text-sm font-black text-slate-900 block mt-0.5">
                {{ formatCurrency(item.total) }}
              </span>
            </div>
            <span class="text-[11px] font-bold bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-500">
              {{ item.count }} reg.
            </span>
          </div>
        </div>
      </div>

      <!-- Barra de Filtros -->
      <search>
        <form
          @submit.prevent="fetchExpensesAndSummary"
          aria-labelledby="expenses-filter-heading"
          class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"
        >
          <h2 id="expenses-filter-heading" class="sr-only">Filtrar gastos operativos por fecha, categoría y estado</h2>
          <div class="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
            <div>
              <label for="filter-from" class="block text-xs font-bold uppercase text-slate-500 mb-1">Desde</label>
              <input
                id="filter-from"
                v-model="fromDate"
                name="from"
                type="date"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label for="filter-to" class="block text-xs font-bold uppercase text-slate-500 mb-1">Hasta</label>
              <input
                id="filter-to"
                v-model="toDate"
                name="to"
                type="date"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label for="filter-cat" class="block text-xs font-bold uppercase text-slate-500 mb-1">Categoría</label>
              <select
                id="filter-cat"
                v-model="filterCategory"
                name="category"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option value="ALL">Todas las categorías</option>
                <option v-for="c in categories" :key="c.value" :value="c.value">
                  {{ c.icon }} {{ c.label }}
                </option>
              </select>
            </div>
            <div>
              <label for="filter-status" class="block text-xs font-bold uppercase text-slate-500 mb-1">Estado</label>
              <select
                id="filter-status"
                v-model="filterStatus"
                name="status"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option value="ALL">Todos</option>
                <option value="PAID">✅ Pagados</option>
                <option value="PENDING">⏳ Por Pagar (Pendientes)</option>
              </select>
            </div>
            <div>
              <button
                type="submit"
                :disabled="loading"
                class="w-full py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition cursor-pointer disabled:opacity-50"
              >
                {{ loading ? 'Consultando...' : '🔍 Aplicar Período' }}
              </button>
            </div>
          </div>
        </form>
      </search>

      <!-- Tabla de Gastos Operativos -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div v-if="loading" class="p-12 text-center text-slate-400">
          Cargando gastos operativos...
        </div>
        <div v-else-if="expenses.length === 0" class="p-12 text-center text-slate-400 space-y-2">
          <span class="text-4xl block">🧾</span>
          <p class="text-sm font-medium">No hay gastos operativos registrados en este período.</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50/80 border-b border-slate-100 text-xs uppercase font-bold text-slate-500">
              <tr>
                <th class="px-4 py-3">Folio / Fecha</th>
                <th class="px-4 py-3">Categoría</th>
                <th class="px-4 py-3">Concepto / Beneficiario</th>
                <th class="px-4 py-3">Medio de Pago</th>
                <th class="px-4 py-3">Estado</th>
                <th class="px-4 py-3 text-right">Monto</th>
                <th class="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="exp in expenses" :key="exp.id" class="hover:bg-slate-50/60">
                <td class="px-4 py-3">
                  <p class="font-bold text-slate-800 text-xs">{{ exp.expenseNumber }}</p>
                  <p class="text-xs text-slate-400">{{ formatDate(exp.expenseDate) }}</p>
                </td>
                <td class="px-4 py-3">
                  <span
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border"
                    :class="getCategoryMeta(exp.category).badgeClass"
                  >
                    <span>{{ getCategoryMeta(exp.category).icon }}</span>
                    <span>{{ getCategoryMeta(exp.category).label }}</span>
                  </span>
                </td>
                <td class="px-4 py-3">
                  <p class="font-semibold text-slate-900">{{ exp.description }}</p>
                  <p v-if="exp.beneficiaryName || exp.reference" class="text-xs text-slate-400">
                    <span v-if="exp.beneficiaryName">👤 {{ exp.beneficiaryName }}</span>
                    <span v-if="exp.reference"> • Ref: {{ exp.reference }}</span>
                  </p>
                </td>
                <td class="px-4 py-3 text-xs font-medium text-slate-600">
                  {{ getPaymentMethodLabel(exp.paymentMethod) }}
                </td>
                <td class="px-4 py-3">
                  <span
                    class="px-2.5 py-0.5 rounded-full text-xs font-bold border"
                    :class="
                      exp.status === 'PAID'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    "
                  >
                    {{ exp.status === 'PAID' ? '✅ Pagado' : '⏳ Por Pagar' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right font-black text-slate-900">
                  {{ formatCurrency(exp.amount) }}
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex justify-end gap-1.5">
                    <button
                      v-if="exp.status === 'PENDING'"
                      type="button"
                      @click="markAsPaid(exp)"
                      class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                    >
                      ✔️ Marcar Pagado
                    </button>
                    <button
                      type="button"
                      @click="deleteExpense(exp)"
                      class="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- MODAL: REGISTRAR NUEVO GASTO OPERATIVO -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
    >
      <div class="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-100 overflow-hidden my-8">
        <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 id="modal-expense-title" class="text-lg font-bold text-slate-900">
            💸 Registrar Gasto Operativo
          </h3>
          <button
            type="button"
            @click="showCreateModal = false"
            class="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="saveExpense" aria-labelledby="modal-expense-title" class="p-6 space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="exp-category" class="block text-xs font-bold uppercase text-slate-500 mb-1">
                Categoría <span aria-hidden="true">*</span>
              </label>
              <select
                id="exp-category"
                v-model="form.category"
                name="category"
                required
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option v-for="c in categories" :key="c.value" :value="c.value">
                  {{ c.icon }} {{ c.label }}
                </option>
              </select>
            </div>
            <div>
              <label for="exp-date" class="block text-xs font-bold uppercase text-slate-500 mb-1">
                Fecha del Gasto <span aria-hidden="true">*</span>
              </label>
              <input
                id="exp-date"
                v-model="form.expenseDate"
                name="expenseDate"
                type="date"
                required
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label for="exp-description" class="block text-xs font-bold uppercase text-slate-500 mb-1">
              Concepto / Descripción <span aria-hidden="true">*</span>
            </label>
            <input
              id="exp-description"
              v-model="form.description"
              name="description"
              type="text"
              required
              placeholder="Ej: Pago de arriendo mes de noviembre, Factura EPM / Energía..."
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="exp-amount" class="block text-xs font-bold uppercase text-slate-500 mb-1">
                Valor (COP) <span aria-hidden="true">*</span>
              </label>
              <input
                id="exp-amount"
                v-model.number="form.amount"
                name="amount"
                type="number"
                min="1"
                required
                placeholder="Ej: 1500000"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"
              />
            </div>
            <div>
              <label for="exp-beneficiary" class="block text-xs font-bold uppercase text-slate-500 mb-1">
                Beneficiario / Proveedor
              </label>
              <input
                id="exp-beneficiary"
                v-model="form.beneficiaryName"
                name="beneficiaryName"
                type="text"
                placeholder="Ej: Inmobiliaria, EPM, Claro..."
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="exp-method" class="block text-xs font-bold uppercase text-slate-500 mb-1">
                Medio de Pago
              </label>
              <select
                id="exp-method"
                v-model="form.paymentMethod"
                name="paymentMethod"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option v-for="m in paymentMethods" :key="m.value" :value="m.value">
                  {{ m.label }}
                </option>
              </select>
            </div>
            <div>
              <label for="exp-ref" class="block text-xs font-bold uppercase text-slate-500 mb-1">
                Nro. Factura / Comprobante
              </label>
              <input
                id="exp-ref"
                v-model="form.reference"
                name="reference"
                type="text"
                autocorrect="off"
                spellcheck="false"
                placeholder="Ej: FAC-1024 / Nequi #8821"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <!-- Estado del Gasto: 2 opciones mutuamente excluyentes -> radio buttons dentro de fieldset -->
          <fieldset class="border border-slate-200 rounded-xl p-3">
            <legend class="text-xs font-bold uppercase text-slate-500 px-1">
              Estado del Pago
            </legend>
            <div class="grid grid-cols-2 gap-2 mt-1">
              <div class="flex items-center gap-2 bg-emerald-50/60 px-3 py-2 rounded-lg border border-emerald-200">
                <input
                  id="status-paid"
                  v-model="form.status"
                  type="radio"
                  name="status"
                  value="PAID"
                  class="accent-emerald-600"
                />
                <label for="status-paid" class="text-xs font-bold text-emerald-800 cursor-pointer">
                  ✅ Pagado (Egreso Realizado)
                </label>
              </div>
              <div class="flex items-center gap-2 bg-amber-50/60 px-3 py-2 rounded-lg border border-amber-200">
                <input
                  id="status-pending"
                  v-model="form.status"
                  type="radio"
                  name="status"
                  value="PENDING"
                  class="accent-amber-600"
                />
                <label for="status-pending" class="text-xs font-bold text-amber-800 cursor-pointer">
                  ⏳ Por Pagar (Cuenta Pendiente)
                </label>
              </div>
            </div>
          </fieldset>

          <div>
            <label for="exp-notes" class="block text-xs font-bold uppercase text-slate-500 mb-1">
              Notas adicionales (Opcional)
            </label>
            <textarea
              id="exp-notes"
              v-model="form.notes"
              name="notes"
              rows="2"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            ></textarea>
          </div>

          <div class="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              @click="showCreateModal = false"
              class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="loadingSubmit || !form.description || form.amount <= 0"
              class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold cursor-pointer"
            >
              {{ loadingSubmit ? 'Guardando...' : 'Guardar Gasto' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>

