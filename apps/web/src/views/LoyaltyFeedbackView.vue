<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'
import AppLayout from '../components/AppLayout.vue'

const authStore = useAuthStore()

const loading = ref(false)
const activeTab = ref<'loyalty' | 'feedback'>('loyalty')

const loyaltySummary = ref<any>({
  totalCustomers: 0,
  customersWithPoints: 0,
  totalPointsCirculating: 0,
  estimatedRedemptionValueCop: 0,
})
const csatSummary = ref<any>({
  totalReviews: 0,
  averageRating: 0,
  starDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  satisfactionPct: 100,
})
const customers = ref<any[]>([])
const feedbacks = ref<any[]>([])

const searchQuery = ref('')
const filterVertical = ref('ALL')
const filterRating = ref<string>('ALL')

// Modal de Ajuste / Redención de Puntos
const selectedCustomerForPoints = ref<any>(null)
const pointsActionMode = ref<'ADD' | 'REDEEM'>('ADD')
const pointsAmount = ref<number>(50)
const pointsReason = ref('')
const submittingPoints = ref(false)

// Modal de Registro de Reseña / Calificación CSAT
const showFeedbackModal = ref(false)
const submittingFeedback = ref(false)
const feedbackForm = ref({
  customerId: '',
  verticalCode: 'CORE',
  subjectName: '',
  staffName: '',
  rating: 5,
  comment: '',
  isAnonymous: false,
})

const verticalLabels: Record<string, { label: string; icon: string }> = {
  CORE: { label: 'General / Empresa', icon: '🏢' },
  RETAIL: { label: 'Retail / Tienda POS', icon: '🏪' },
  RESTAURANT: { label: 'Restaurante', icon: '🍽️' },
  HOTEL: { label: 'Hotel & Hospedaje', icon: '🏨' },
  STUDIO: { label: 'Studio (Yoga / Pilates)', icon: '🧘‍♀️' },
  GYM: { label: 'Gimnasio', icon: '🏋️' },
  BEAUTY: { label: 'Salón / Barbería / Spa', icon: '💇' },
  VETERINARY: { label: 'Veterinaria & Pet Shop', icon: '🐾' },
  AUTOMOTIVE: { label: 'Taller Automotriz', icon: '🏎️' },
  LAUNDRY: { label: 'Lavandería', icon: '🧺' },
  BAKERY: { label: 'Panadería & Pastelería', icon: '🥐' },
  ACADEMY: { label: 'Academia & Educación', icon: '🎓' },
  REAL_ESTATE: { label: 'Inmobiliaria', icon: '🔑' },
  SERVICES: { label: 'Órdenes de Servicio', icon: '🛠️' },
}

const activeOrgId = computed(
  () => authStore.currentOrganization?.id || authStore.user?.organizationId || ''
)

const filteredCustomers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return customers.value
  return customers.value.filter((c) => {
    const fullName = `${c.firstName || ''} ${c.lastName || ''} ${c.companyName || ''}`.toLowerCase()
    const idNum = String(c.identificationNumber || '').toLowerCase()
    const email = String(c.email || '').toLowerCase()
    return fullName.includes(q) || idNum.includes(q) || email.includes(q)
  })
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

function getLoyaltyTier(points: number) {
  const pts = Number(points || 0)
  if (pts >= 1000) {
    return { name: '👑 Diamante VIP', classes: 'bg-indigo-100 text-indigo-800 border-indigo-300' }
  }
  if (pts >= 400) {
    return { name: '🥇 Oro', classes: 'bg-amber-100 text-amber-800 border-amber-300' }
  }
  if (pts >= 100) {
    return { name: '🥈 Plata', classes: 'bg-slate-200 text-slate-800 border-slate-300' }
  }
  return { name: '🌱 Bronce', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
}

function getVerticalMeta(code: string) {
  return verticalLabels[code] || { label: code, icon: '⭐' }
}

async function fetchDashboard() {
  if (!activeOrgId.value) return
  loading.value = true
  try {
    const res = await api.get('/loyalty-feedback/dashboard', {
      params: {
        organizationId: activeOrgId.value,
        ...(filterVertical.value !== 'ALL' ? { verticalCode: filterVertical.value } : {}),
        ...(filterRating.value !== 'ALL' ? { rating: Number(filterRating.value) } : {}),
      },
    })
    loyaltySummary.value = res.data?.loyaltySummary || loyaltySummary.value
    csatSummary.value = res.data?.csatSummary || csatSummary.value
    customers.value = Array.isArray(res.data?.customers) ? res.data.customers : []
    feedbacks.value = Array.isArray(res.data?.feedbacks) ? res.data.feedbacks : []
  } catch (err) {
    console.error('Error cargando dashboard de fidelización y CSAT:', err)
  } finally {
    loading.value = false
  }
}

function openPointsModal(customer: any, mode: 'ADD' | 'REDEEM') {
  selectedCustomerForPoints.value = customer
  pointsActionMode.value = mode
  pointsAmount.value = mode === 'REDEEM' ? Math.min(100, Number(customer.loyaltyPoints || 0)) : 50
  pointsReason.value = ''
}

async function submitPointsAdjustment() {
  if (!selectedCustomerForPoints.value || !activeOrgId.value) return
  const amt = Math.abs(Number(pointsAmount.value || 0))
  if (amt <= 0) return

  submittingPoints.value = true
  try {
    const delta = pointsActionMode.value === 'REDEEM' ? -amt : amt
    await api.patch(`/loyalty-feedback/customers/${selectedCustomerForPoints.value.id}/points`, {
      organizationId: activeOrgId.value,
      pointsDelta: delta,
      reason: pointsReason.value || undefined,
    })
    selectedCustomerForPoints.value = null
    await fetchDashboard()
  } catch (err: any) {
    alert(err?.response?.data?.message || 'No se pudo actualizar los puntos del cliente')
  } finally {
    submittingPoints.value = false
  }
}

function openNewFeedbackModal() {
  feedbackForm.value = {
    customerId: customers.value[0]?.id || '',
    verticalCode: 'CORE',
    subjectName: '',
    staffName: '',
    rating: 5,
    comment: '',
    isAnonymous: false,
  }
  showFeedbackModal.value = true
}

async function submitFeedback() {
  if (!activeOrgId.value) return
  submittingFeedback.value = true
  try {
    await api.post('/loyalty-feedback/feedback', {
      organizationId: activeOrgId.value,
      branchId: authStore.currentBranch?.id,
      customerId: feedbackForm.value.customerId || undefined,
      verticalCode: feedbackForm.value.verticalCode,
      subjectName: feedbackForm.value.subjectName || 'Atención General',
      staffName: feedbackForm.value.staffName || undefined,
      rating: Number(feedbackForm.value.rating),
      comment: feedbackForm.value.comment || undefined,
      isAnonymous: feedbackForm.value.isAnonymous,
    })
    showFeedbackModal.value = false
    activeTab.value = 'feedback'
    await fetchDashboard()
  } catch (err: any) {
    alert(err?.response?.data?.message || 'Error al registrar la calificación')
  } finally {
    submittingFeedback.value = false
  }
}

watch([filterVertical, filterRating], () => {
  fetchDashboard()
})

onMounted(() => {
  fetchDashboard()
})
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <span class="inline-block text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full mb-1">
            Módulo Core Transversal
          </span>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">
            ⭐ Fidelización (Puntos) y Satisfacción del Cliente (CSAT 1–5 ★)
          </h1>
          <p class="text-sm text-slate-500 mt-1">
            Acumulación automática de puntos (1 pto por cada $1.000 COP en compras/servicios), redención de beneficios y reseñas de las 14 verticales.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            @click="fetchDashboard"
            class="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition cursor-pointer"
          >
            🔄 Actualizar
          </button>
          <button
            type="button"
            @click="openNewFeedbackModal"
            class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-sm transition cursor-pointer"
          >
            ⭐ Registrar Reseña / Calificación
          </button>
        </div>
      </div>

      <!-- KPIs Ejecutivos 360° -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase text-amber-700">🎁 Puntos en Circulación</span>
            <span class="text-lg">🪙</span>
          </div>
          <p class="text-2xl font-black text-amber-700 mt-2">
            {{ Number(loyaltySummary.totalPointsCirculating || 0).toLocaleString('es-CO') }} pts
          </p>
          <p class="text-xs text-slate-500 mt-1">
            {{ loyaltySummary.customersWithPoints }} de {{ loyaltySummary.totalCustomers }} clientes con saldo activo
          </p>
        </div>

        <div class="bg-white rounded-2xl border border-emerald-200 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase text-emerald-700">💵 Equivalencia Cashback</span>
            <span class="text-lg">💎</span>
          </div>
          <p class="text-2xl font-black text-emerald-700 mt-2">
            {{ formatCurrency(loyaltySummary.estimatedRedemptionValueCop) }}
          </p>
          <p class="text-xs text-slate-500 mt-1">
            Valor referencial de redención ($50 COP / pto)
          </p>
        </div>

        <div class="bg-white rounded-2xl border border-indigo-200 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase text-indigo-700">⭐ Calificación Promedio</span>
            <span class="text-lg">🌟</span>
          </div>
          <p class="text-2xl font-black text-indigo-700 mt-2">
            {{ csatSummary.averageRating || '5.0' }} / 5.0 ★
          </p>
          <p class="text-xs text-slate-500 mt-1">
            Basado en {{ csatSummary.totalReviews }} reseña(s) recibida(s)
          </p>
        </div>

        <div class="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl border border-indigo-900 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase text-indigo-200">😊 Índice de Satisfacción</span>
            <span class="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
              CSAT
            </span>
          </div>
          <p class="text-2xl font-black mt-2">
            {{ csatSummary.satisfactionPct }}%
          </p>
          <p class="text-xs text-indigo-200 mt-1">
            Clientes que califican con 4★ o 5★
          </p>
        </div>
      </div>

      <!-- Pestañas -->
      <div class="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          @click="activeTab = 'loyalty'"
          class="px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer"
          :class="
            activeTab === 'loyalty'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          "
        >
          🎁 Ranking de Puntos y Redención ({{ customers.length }})
        </button>
        <button
          type="button"
          @click="activeTab = 'feedback'"
          class="px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer"
          :class="
            activeTab === 'feedback'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          "
        >
          ⭐ Reseñas y Opiniones Multi-Vertical ({{ feedbacks.length }})
        </button>
      </div>

      <!-- TAB 1: PROGRAMA DE PUNTOS Y REDENCIÓN -->
      <section v-if="activeTab === 'loyalty'" class="space-y-4">
        <search>
          <form @submit.prevent aria-labelledby="loyalty-search-heading" class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <label id="loyalty-search-heading" for="loyalty-customer-search" class="block text-xs font-bold uppercase text-slate-500 mb-1.5">
              Buscar cliente por nombre, documento o correo para consultar o redimir sus puntos
            </label>
            <input
              id="loyalty-customer-search"
              v-model="searchQuery"
              name="q"
              type="search"
              placeholder="Ej: Nombre del cliente, cédula o correo..."
              class="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
            />
          </form>
        </search>

        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div v-if="loading" class="p-12 text-center text-slate-400">Cargando clientes y puntos...</div>
          <div v-else-if="filteredCustomers.length === 0" class="p-12 text-center text-slate-400">
            No se encontraron clientes con ese criterio.
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-left text-sm text-slate-600">
              <thead class="bg-slate-50/80 border-b border-slate-100 text-xs uppercase font-bold text-slate-500">
                <tr>
                  <th class="px-4 py-3">Cliente</th>
                  <th class="px-4 py-3">Nivel VIP</th>
                  <th class="px-4 py-3 text-right">Puntos Acumulados</th>
                  <th class="px-4 py-3 text-right">Beneficio Estimado</th>
                  <th class="px-4 py-3 text-right">Acciones de Fidelidad</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="c in filteredCustomers" :key="c.id" class="hover:bg-slate-50/60">
                  <td class="px-4 py-3">
                    <p class="font-bold text-slate-900">{{ c.firstName }} {{ c.lastName || '' }}</p>
                    <p class="text-xs text-slate-400">
                      {{ c.identificationNumber || 'Sin doc' }}
                      <span v-if="c.email"> • {{ c.email }}</span>
                    </p>
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="px-2.5 py-0.5 rounded-full text-xs font-bold border"
                      :class="getLoyaltyTier(c.loyaltyPoints).classes"
                    >
                      {{ getLoyaltyTier(c.loyaltyPoints).name }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <span class="text-base font-black text-amber-700">
                      ⭐ {{ Number(c.loyaltyPoints || 0).toLocaleString('es-CO') }} pts
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right font-semibold text-emerald-700">
                    {{ formatCurrency(Number(c.loyaltyPoints || 0) * 50) }}
                  </td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex justify-end gap-1.5">
                      <button
                        type="button"
                        @click="openPointsModal(c, 'ADD')"
                        class="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold cursor-pointer"
                      >
                        ➕ Sumar Puntos
                      </button>
                      <button
                        v-if="Number(c.loyaltyPoints || 0) > 0"
                        type="button"
                        @click="openPointsModal(c, 'REDEEM')"
                        class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                      >
                        🎁 Redimir
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- TAB 2: RESEÑAS Y OPINIONES MULTI-VERTICAL (CSAT) -->
      <section v-if="activeTab === 'feedback'" class="space-y-4">
        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <label for="csat-vertical-filter" class="text-xs font-bold uppercase text-slate-500">Vertical:</label>
            <select
              id="csat-vertical-filter"
              v-model="filterVertical"
              class="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold bg-white"
            >
              <option value="ALL">Todas las verticales</option>
              <option v-for="(meta, code) in verticalLabels" :key="code" :value="code">
                {{ meta.icon }} {{ meta.label }}
              </option>
            </select>
          </div>

          <div class="flex flex-wrap gap-1.5">
            <button
              type="button"
              @click="filterRating = 'ALL'"
              class="px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer"
              :class="filterRating === 'ALL' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200'"
            >
              Todas ({{ csatSummary.totalReviews }})
            </button>
            <button
              v-for="star in [5, 4, 3, 2, 1]"
              :key="star"
              type="button"
              @click="filterRating = String(star)"
              class="px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer"
              :class="filterRating === String(star) ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 text-slate-600 border-slate-200'"
            >
              {{ star }}★ ({{ csatSummary.starDistribution?.[star] || 0 }})
            </button>
          </div>
        </div>

        <div v-if="feedbacks.length === 0" class="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
          Aún no hay reseñas con este filtro.
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="fb in feedbacks"
            :key="fb.id"
            class="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div class="flex items-start justify-between gap-2">
                <div>
                  <span class="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                    {{ getVerticalMeta(fb.verticalCode).icon }} {{ getVerticalMeta(fb.verticalCode).label }}
                  </span>
                  <h3 class="text-base font-black text-slate-900 mt-1.5">
                    {{ fb.subjectName || 'Experiencia General' }}
                  </h3>
                  <p v-if="fb.staffName" class="text-xs text-slate-500">
                    👩‍💼 Atendido por: <strong>{{ fb.staffName }}</strong>
                  </p>
                </div>
                <div class="text-right">
                  <span class="text-amber-500 font-black text-sm tracking-tight">
                    {{ '★'.repeat(fb.rating) }}{{ '☆'.repeat(5 - fb.rating) }}
                  </span>
                  <span class="block text-[11px] text-slate-400 mt-0.5">
                    {{ formatDate(fb.createdAt) }}
                  </span>
                </div>
              </div>

              <p v-if="fb.comment" class="mt-3 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                "{{ fb.comment }}"
              </p>
            </div>

            <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                👤 <strong>{{ fb.customerName }}</strong>
              </span>
              <span v-if="fb.isAnonymous" class="text-[11px] bg-slate-100 px-2 py-0.5 rounded-full">
                Reseña Anónima
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- MODAL: SUMAR O REDIMIR PUNTOS -->
    <div
      v-if="selectedCustomerForPoints"
      class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-100 overflow-hidden">
        <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 id="modal-points-title" class="text-base font-bold text-slate-900">
            {{ pointsActionMode === 'REDEEM' ? '🎁 Redimir Puntos de Fidelidad' : '➕ Otorgar Puntos de Fidelidad' }}
          </h3>
          <button type="button" @click="selectedCustomerForPoints = null" class="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">
            ✕
          </button>
        </div>

        <form @submit.prevent="submitPointsAdjustment" aria-labelledby="modal-points-title" class="p-6 space-y-4">
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs">
            <p class="font-bold text-amber-900">
              {{ selectedCustomerForPoints.firstName }} {{ selectedCustomerForPoints.lastName || '' }}
            </p>
            <p class="text-amber-800 mt-0.5">
              Saldo actual: <strong>{{ selectedCustomerForPoints.loyaltyPoints || 0 }} puntos</strong>
              ({{ formatCurrency(Number(selectedCustomerForPoints.loyaltyPoints || 0) * 50) }})
            </p>
          </div>

          <div>
            <label for="points-input" class="block text-xs font-bold uppercase text-slate-500 mb-1">
              Cantidad de Puntos a {{ pointsActionMode === 'REDEEM' ? 'Redimir' : 'Sumar' }} <span aria-hidden="true">*</span>
            </label>
            <input
              id="points-input"
              v-model.number="pointsAmount"
              name="pointsAmount"
              type="number"
              min="1"
              :max="pointsActionMode === 'REDEEM' ? Number(selectedCustomerForPoints.loyaltyPoints || 1) : undefined"
              required
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-bold"
            />
            <p class="text-[11px] text-slate-500 mt-1">
              Equivalente referencial en descuento: <strong>{{ formatCurrency(Number(pointsAmount || 0) * 50) }}</strong>
            </p>
          </div>

          <div>
            <label for="points-reason" class="block text-xs font-bold uppercase text-slate-500 mb-1">
              Motivo / Beneficio Redimido
            </label>
            <input
              id="points-reason"
              v-model="pointsReason"
              name="reason"
              type="text"
              placeholder="Ej: Descuento en compra, Clase de cortesía, Bono cumpleaños..."
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
            />
          </div>

          <div class="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              @click="selectedCustomerForPoints = null"
              class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="submittingPoints || pointsAmount <= 0"
              class="px-5 py-2 rounded-xl text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              :class="pointsActionMode === 'REDEEM' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'"
            >
              {{ submittingPoints ? 'Procesando...' : pointsActionMode === 'REDEEM' ? 'Confirmar Redención' : 'Sumar Puntos' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: REGISTRAR RESEÑA / CALIFICACIÓN CSAT -->
    <div
      v-if="showFeedbackModal"
      class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
    >
      <div class="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-100 overflow-hidden my-8">
        <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 id="modal-feedback-title" class="text-base font-bold text-slate-900">
            ⭐ Registrar Calificación de Satisfacción (1–5 ★)
          </h3>
          <button type="button" @click="showFeedbackModal = false" class="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">
            ✕
          </button>
        </div>

        <form @submit.prevent="submitFeedback" aria-labelledby="modal-feedback-title" class="p-6 space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="fb-customer" class="block text-xs font-bold uppercase text-slate-500 mb-1">
                Cliente (+10 pts por calificar)
              </label>
              <select
                id="fb-customer"
                v-model="feedbackForm.customerId"
                name="customerId"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option value="">Cliente General / Sin identificar</option>
                <option v-for="c in customers" :key="c.id" :value="c.id">
                  {{ c.firstName }} {{ c.lastName || '' }}
                </option>
              </select>
            </div>
            <div>
              <label for="fb-vertical" class="block text-xs font-bold uppercase text-slate-500 mb-1">
                Área / Vertical
              </label>
              <select
                id="fb-vertical"
                v-model="feedbackForm.verticalCode"
                name="verticalCode"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option v-for="(meta, code) in verticalLabels" :key="code" :value="code">
                  {{ meta.icon }} {{ meta.label }}
                </option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="fb-subject" class="block text-xs font-bold uppercase text-slate-500 mb-1">
                Servicio / Habitación / Producto <span aria-hidden="true">*</span>
              </label>
              <input
                id="fb-subject"
                v-model="feedbackForm.subjectName"
                name="subjectName"
                type="text"
                required
                placeholder="Ej: Habitación 204, Corte & Barba, Mantenimiento..."
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label for="fb-staff" class="block text-xs font-bold uppercase text-slate-500 mb-1">
                Persona que Atendió (Opcional)
              </label>
              <input
                id="fb-staff"
                v-model="feedbackForm.staffName"
                name="staffName"
                type="text"
                placeholder="Ej: Carolina, Recepción, Técnico Juan..."
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <!-- Calificación de 1 a 5 estrellas (5 opciones mutuamente excluyentes -> radio buttons en fieldset) -->
          <fieldset class="border border-slate-200 rounded-xl p-3">
            <legend class="text-xs font-bold uppercase text-slate-500 px-1">
              Calificación (1 a 5 Estrellas)
            </legend>
            <div class="grid grid-cols-5 gap-2 mt-1">
              <div
                v-for="star in [1, 2, 3, 4, 5]"
                :key="star"
                class="flex items-center justify-center gap-1.5 py-2 rounded-lg border"
                :class="feedbackForm.rating === star ? 'bg-amber-50 border-amber-400 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-600'"
              >
                <input
                  :id="`star-rate-${star}`"
                  v-model.number="feedbackForm.rating"
                  type="radio"
                  name="rating"
                  :value="star"
                  class="accent-amber-500"
                />
                <label :for="`star-rate-${star}`" class="text-xs font-black cursor-pointer">
                  {{ star }} ★
                </label>
              </div>
            </div>
          </fieldset>

          <div>
            <label for="fb-comment" class="block text-xs font-bold uppercase text-slate-500 mb-1">
              Comentario o Sugerencia
            </label>
            <textarea
              id="fb-comment"
              v-model="feedbackForm.comment"
              name="comment"
              rows="2"
              placeholder="¿Qué fue lo que más gustó o qué podemos mejorar?"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            ></textarea>
          </div>

          <div class="flex items-center gap-2">
            <input
              id="fb-anon"
              v-model="feedbackForm.isAnonymous"
              name="isAnonymous"
              type="checkbox"
              class="accent-indigo-600"
            />
            <label for="fb-anon" class="text-xs font-semibold text-slate-600 cursor-pointer">
              Mostrar esta reseña como anónima
            </label>
          </div>

          <div class="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              @click="showFeedbackModal = false"
              class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="submittingFeedback || !feedbackForm.subjectName"
              class="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {{ submittingFeedback ? 'Guardando...' : 'Guardar Calificación' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>

