<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const activeTab = ref<'retention' | 'occupancy' | 'financial' | 'constancy'>('retention')
const retentionFilter = ref<'ALL' | 'LOW_CLASSES' | 'EXPIRING_SOON' | 'EXPIRED'>('ALL')

const todayStr = new Date().toISOString().slice(0, 10)
const firstDayOfMonthStr = `${todayStr.slice(0, 8)}01`

const startDate = ref(firstDayOfMonthStr)
const endDate = ref(todayStr)

const subscriptions = ref<any[]>([])
const schedules = ref<any[]>([])
const bookings = ref<any[]>([])
const attendances = ref<any[]>([])
const plans = ref<any[]>([])
const settlementReport = ref<any>(null)

const daysOfWeek: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
}

const orgId = computed(
  () => authStore.currentOrganization?.id || authStore.user?.organizationId || ''
)
const branchId = computed(() => authStore.currentBranch?.id || '')

function formatMoney(value: number | string) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—'
  const clean = String(dateStr).slice(0, 10)
  const [y, m, d] = clean.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function daysUntil(dateStr?: string | null): number {
  if (!dateStr) return 999
  const clean = String(dateStr).slice(0, 10)
  const [y, m, d] = clean.split('-').map(Number)
  const target = new Date(y, (m || 1) - 1, d || 1, 23, 59, 59)
  const now = new Date()
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

async function loadAllStudioAnalytics() {
  if (!orgId.value) return
  loading.value = true
  try {
    const baseParams = {
      organizationId: orgId.value,
      ...(branchId.value ? { branchId: branchId.value } : {}),
    }

    const [subsRes, schedRes, bookRes, attRes, plansRes, settleRes] = await Promise.all([
      api.get('/studio-subscriptions', { params: baseParams }).catch(() => ({ data: [] })),
      api.get('/studio-schedules', { params: baseParams }).catch(() => ({ data: [] })),
      api.get('/studio-bookings', { params: baseParams }).catch(() => ({ data: [] })),
      api.get('/studio-attendances', { params: baseParams }).catch(() => ({ data: [] })),
      api.get('/studio-plans', { params: baseParams }).catch(() => ({ data: [] })),
      api
        .get('/instructors/settlement/report', {
          params: {
            ...baseParams,
            startDate: startDate.value,
            endDate: endDate.value,
          },
        })
        .catch(() => ({ data: null })),
    ])

    subscriptions.value = Array.isArray(subsRes.data)
      ? subsRes.data
      : subsRes.data?.items || subsRes.data?.data || []
    schedules.value = Array.isArray(schedRes.data)
      ? schedRes.data
      : schedRes.data?.items || schedRes.data?.data || []
    bookings.value = Array.isArray(bookRes.data)
      ? bookRes.data
      : bookRes.data?.items || bookRes.data?.data || []
    attendances.value = Array.isArray(attRes.data)
      ? attRes.data
      : attRes.data?.items || attRes.data?.data || []
    plans.value = Array.isArray(plansRes.data)
      ? plansRes.data
      : plansRes.data?.items || plansRes.data?.data || []
    settlementReport.value = settleRes.data
  } finally {
    loading.value = false
  }
}

// 1. ANÁLISIS DE RETENCIÓN Y RENOVACIÓN DE TIQUETERAS
const retentionAlerts = computed(() => {
  const alerts: Array<{
    id: string
    customerId: string
    customerName: string
    identification: string
    phone: string
    email: string
    planName: string
    remainingClasses: number | null
    totalClasses: number | null
    endDate: string
    daysLeft: number
    category: 'LOW_CLASSES' | 'EXPIRING_SOON' | 'EXPIRED'
    badgeText: string
    badgeClass: string
    whatsappMessage: string
  }> = []

  const activeCustomerIds = new Set(
    subscriptions.value
      .filter((s) => s.status === 'ACTIVE' && daysUntil(s.endDate) >= 0)
      .map((s) => s.customerId)
  )

  for (const sub of subscriptions.value) {
    const customer = sub.customer || {}
    const customerName =
      [customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
      customer.companyName ||
      'Alumno'
    const planName = sub.plan?.name || 'Paquete Studio'
    const dLeft = daysUntil(sub.endDate)
    const rem = sub.remainingClasses

    if (sub.status === 'ACTIVE' && rem !== null && Number(rem) > 0 && Number(rem) <= 2 && dLeft >= 0) {
      alerts.push({
        id: sub.id,
        customerId: sub.customerId,
        customerName,
        identification: customer.identificationNumber || '—',
        phone: customer.phoneNumber || '',
        email: customer.email || '',
        planName,
        remainingClasses: Number(rem),
        totalClasses: sub.totalClasses,
        endDate: sub.endDate,
        daysLeft: dLeft,
        category: 'LOW_CLASSES',
        badgeText: `🔥 Queda${Number(rem) === 1 ? '' : 'n'} ${rem} clase${Number(rem) === 1 ? '' : 's'}`,
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        whatsappMessage: `¡Hola ${customer.firstName || customerName}! 🧘‍♀️ Te escribimos de ${authStore.currentOrganization?.name || 'el Studio'} para contarte que te queda${Number(rem) === 1 ? '' : 'n'} solo ${rem} clase${Number(rem) === 1 ? '' : 's'} disponible${Number(rem) === 1 ? '' : 's'} en tu tiquetera (${planName}). ¿Te gustaría renovarla para no perder tu ritmo de práctica?`,
      })
    } else if (sub.status === 'ACTIVE' && dLeft >= 0 && dLeft <= 7) {
      alerts.push({
        id: sub.id,
        customerId: sub.customerId,
        customerName,
        identification: customer.identificationNumber || '—',
        phone: customer.phoneNumber || '',
        email: customer.email || '',
        planName,
        remainingClasses: rem,
        totalClasses: sub.totalClasses,
        endDate: sub.endDate,
        daysLeft: dLeft,
        category: 'EXPIRING_SOON',
        badgeText: dLeft === 0 ? '⏳ Vence hoy' : `⏳ Vence en ${dLeft} día${dLeft === 1 ? '' : 's'}`,
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        whatsappMessage: `¡Hola ${customer.firstName || customerName}! 🧘‍♀️ Te recordamos desde ${authStore.currentOrganization?.name || 'el Studio'} que tu plan (${planName}) vence en ${dLeft} día${dLeft === 1 ? '' : 's'} (${formatDate(sub.endDate)}). ¡Escríbenos si deseas agendar tus últimas clases o renovar tu paquete!`,
      })
    } else if (
      (sub.status === 'EXHAUSTED' || dLeft < 0) &&
      !activeCustomerIds.has(sub.customerId)
    ) {
      alerts.push({
        id: sub.id,
        customerId: sub.customerId,
        customerName,
        identification: customer.identificationNumber || '—',
        phone: customer.phoneNumber || '',
        email: customer.email || '',
        planName,
        remainingClasses: rem ?? 0,
        totalClasses: sub.totalClasses,
        endDate: sub.endDate,
        daysLeft: dLeft,
        category: 'EXPIRED',
        badgeText: sub.status === 'EXHAUSTED' ? '💤 Tiquetera Agotada' : '💤 Plan Vencido',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        whatsappMessage: `¡Hola ${customer.firstName || customerName}! 👋 Te extrañamos en ${authStore.currentOrganization?.name || 'el Studio'}. Vimos que tu tiquetera (${planName}) finalizó y queremos invitarte a renovar tu paquete para que retomes tus clases esta semana 🧘‍♀️✨.`,
      })
    }
  }

  return alerts
})

const filteredRetentionAlerts = computed(() => {
  if (retentionFilter.value === 'ALL') return retentionAlerts.value
  return retentionAlerts.value.filter((a) => a.category === retentionFilter.value)
})

function sendWhatsApp(phone: string, message: string) {
  const cleanDigits = (phone || '').replace(/\D/g, '')
  if (!cleanDigits) {
    alert('Este alumno no tiene un número de teléfono registrado en Clientes (CRM).')
    return
  }
  const normalizedPhone = cleanDigits.length === 10 ? `57${cleanDigits}` : cleanDigits
  const url = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`
  window.open(url, '_blank', 'noopener')
}

// 2. ANÁLISIS DE OCUPACIÓN POR CLASE / HORARIO
const occupancyBySchedule = computed(() => {
  return schedules.value.map((sched) => {
    const schedBookings = bookings.value.filter((b) => b.studioScheduleId === sched.id)
    const confirmedOrAttended = schedBookings.filter((b) => b.status === 'CONFIRMED')
    const cancelledCount = schedBookings.filter((b) => b.status === 'CANCELLED').length
    const schedAttendances = attendances.value.filter(
      (a) => a.studioScheduleId === sched.id && a.status === 'ALLOWED'
    )

    // Sesiones distintas en las que hubo reservas o asistencias
    const uniqueDates = new Set<string>()
    for (const b of confirmedOrAttended) {
      if (b.bookingDate) uniqueDates.add(String(b.bookingDate).slice(0, 10))
    }
    for (const a of schedAttendances) {
      if (a.checkInAt) uniqueDates.add(String(a.checkInAt).slice(0, 10))
    }

    const sessionsCount = Math.max(1, uniqueDates.size)
    const totalActivity = Math.max(confirmedOrAttended.length, schedAttendances.length)
    const avgAttendeesPerSession = totalActivity / sessionsCount
    const capacity = Number(sched.capacity) || 15
    const occupancyPct = Math.min(100, Math.round((avgAttendeesPerSession / capacity) * 100))

    const instructor = sched.effectiveInstructor || sched.instructor
    const instructorName = instructor
      ? [instructor.firstName, instructor.lastName].filter(Boolean).join(' ')
      : sched.instructorName || 'Sin asignar'

    return {
      id: sched.id,
      className: sched.className,
      dayName: daysOfWeek[sched.dayOfWeek] || 'Día',
      timeRange: `${sched.startTime} - ${sched.endTime}`,
      instructorName,
      capacity,
      totalConfirmedBookings: confirmedOrAttended.length,
      totalAttendances: schedAttendances.length,
      cancelledCount,
      occupancyPct,
    }
  })
})

// 3. BALANCE FINANCIERO Y PLANES MÁS VENDIDOS EN EL PERIODO
const subscriptionsInPeriod = computed(() => {
  return subscriptions.value.filter((sub) => {
    if (sub.status === 'CANCELLED') return false
    const dateStr = String(sub.startDate || sub.createdAt || '').slice(0, 10)
    return dateStr >= startDate.value && dateStr <= endDate.value
  })
})

const revenueInPeriod = computed(() => {
  return subscriptionsInPeriod.value.reduce(
    (sum, sub) => sum + Number(sub.plan?.price || 0),
    0
  )
})

const instructorPayrollInPeriod = computed(() => {
  return Number(settlementReport.value?.totalPayment || 0)
})

const netOperatingMargin = computed(() => {
  return revenueInPeriod.value - instructorPayrollInPeriod.value
})

const plansPerformance = computed(() => {
  const map = new Map<
    string,
    {
      id: string
      name: string
      type: string
      unitPrice: number
      soldCount: number
      activeCount: number
      totalRevenue: number
    }
  >()

  for (const p of plans.value) {
    map.set(p.id, {
      id: p.id,
      name: p.name,
      type: p.type,
      unitPrice: Number(p.price) || 0,
      soldCount: 0,
      activeCount: 0,
      totalRevenue: 0,
    })
  }

  for (const sub of subscriptions.value) {
    if (sub.status === 'CANCELLED') continue
    const planId = sub.studioPlanId || sub.plan?.id
    if (!planId) continue
    const price = Number(sub.plan?.price || 0)
    const current = map.get(planId) || {
      id: planId,
      name: sub.plan?.name || 'Plan',
      type: sub.plan?.type || 'CLASS_PACK',
      unitPrice: price,
      soldCount: 0,
      activeCount: 0,
      totalRevenue: 0,
    }
    current.soldCount += 1
    if (sub.status === 'ACTIVE') current.activeCount += 1
    current.totalRevenue += price
    map.set(planId, current)
  }

  return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue)
})

// 4. RANKING DE CONSTANCIA DE ALUMNAS Y ALUMNAS INACTIVAS
const studentConstancyList = computed(() => {
  const byCustomer = new Map<
    string,
    {
      customerId: string
      name: string
      phone: string
      attendancesCount: number
      bookingsCount: number
      lastActivityDate: string | null
      activePlanName: string | null
      remainingClasses: number | null
    }
  >()

  for (const sub of subscriptions.value) {
    const cust = sub.customer || {}
    const cid = sub.customerId
    if (!cid) continue
    const existing = byCustomer.get(cid) || {
      customerId: cid,
      name: [cust.firstName, cust.lastName].filter(Boolean).join(' ') || 'Alumno',
      phone: cust.phoneNumber || '',
      attendancesCount: 0,
      bookingsCount: 0,
      lastActivityDate: null,
      activePlanName: null,
      remainingClasses: null,
    }
    if (sub.status === 'ACTIVE') {
      existing.activePlanName = sub.plan?.name || 'Plan Activo'
      existing.remainingClasses = sub.remainingClasses
    }
    byCustomer.set(cid, existing)
  }

  for (const att of attendances.value) {
    if (att.status !== 'ALLOWED' || !att.customerId) continue
    const cust = att.customer || {}
    const existing = byCustomer.get(att.customerId) || {
      customerId: att.customerId,
      name: [cust.firstName, cust.lastName].filter(Boolean).join(' ') || 'Alumno',
      phone: cust.phoneNumber || '',
      attendancesCount: 0,
      bookingsCount: 0,
      lastActivityDate: null,
      activePlanName: null,
      remainingClasses: null,
    }
    existing.attendancesCount += 1
    const attDate = String(att.checkInAt || '').slice(0, 10)
    if (!existing.lastActivityDate || attDate > existing.lastActivityDate) {
      existing.lastActivityDate = attDate
    }
    byCustomer.set(att.customerId, existing)
  }

  for (const b of bookings.value) {
    if (b.status !== 'CONFIRMED' || !b.customerId) continue
    const cust = b.customer || {}
    const existing = byCustomer.get(b.customerId) || {
      customerId: b.customerId,
      name: [cust.firstName, cust.lastName].filter(Boolean).join(' ') || 'Alumno',
      phone: cust.phoneNumber || '',
      attendancesCount: 0,
      bookingsCount: 0,
      lastActivityDate: null,
      activePlanName: null,
      remainingClasses: null,
    }
    existing.bookingsCount += 1
    const bDate = String(b.bookingDate || '').slice(0, 10)
    if (!existing.lastActivityDate || bDate > existing.lastActivityDate) {
      existing.lastActivityDate = bDate
    }
    byCustomer.set(b.customerId, existing)
  }

  return Array.from(byCustomer.values()).sort(
    (a, b) => b.attendancesCount + b.bookingsCount - (a.attendancesCount + a.bookingsCount)
  )
})

onMounted(() => {
  loadAllStudioAnalytics()
})
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- ENCABEZADO Y FILTRO DE FECHAS -->
      <header class="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span class="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 border border-indigo-200">
            🧘‍♀️ Inteligencia Comercial para Estudios
          </span>
          <h1 class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Reportes, Retención y Rentabilidad
          </h1>
          <p class="mt-1 text-sm text-slate-500">
            Alertas de renovación de tiqueteras por WhatsApp, ocupación de salas y margen financiero.
          </p>
        </div>

        <form @submit.prevent="loadAllStudioAnalytics" class="flex flex-wrap items-end gap-3">
          <div>
            <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Desde</label>
            <input
              v-model="startDate"
              type="date"
              class="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-600 focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Hasta</label>
            <input
              v-model="endDate"
              type="date"
              class="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-600 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            :disabled="loading"
            class="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
          >
            {{ loading ? 'Actualizando...' : '🔄 Actualizar Métricas' }}
          </button>
        </form>
      </header>

      <!-- TARJETAS KPI EJECUTIVAS -->
      <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="rounded-2xl bg-white p-5 border border-slate-100 shadow-sm">
          <p class="text-xs font-bold uppercase tracking-wider text-slate-400">
            Ingresos Tiqueteras (Periodo)
          </p>
          <p class="mt-2 text-2xl font-black text-emerald-600">
            {{ formatMoney(revenueInPeriod) }}
          </p>
          <p class="mt-1 text-xs text-slate-500">
            {{ subscriptionsInPeriod.length }} paquete(s) activados en el rango
          </p>
        </div>

        <div class="rounded-2xl bg-white p-5 border border-slate-100 shadow-sm">
          <p class="text-xs font-bold uppercase tracking-wider text-slate-400">
            Pago a Instructores (Periodo)
          </p>
          <p class="mt-2 text-2xl font-black text-slate-900">
            {{ formatMoney(instructorPayrollInPeriod) }}
          </p>
          <p class="mt-1 text-xs text-slate-500">
            {{ settlementReport?.totalClasses || 0 }} clases liquidadas
          </p>
        </div>

        <div class="rounded-2xl bg-white p-5 border border-slate-100 shadow-sm">
          <p class="text-xs font-bold uppercase tracking-wider text-slate-400">
            Utilidad Operativa Studio
          </p>
          <p
            class="mt-2 text-2xl font-black"
            :class="netOperatingMargin >= 0 ? 'text-indigo-600' : 'text-rose-600'"
          >
            {{ formatMoney(netOperatingMargin) }}
          </p>
          <p class="mt-1 text-xs text-slate-500">
            Ingresos por planes menos nómina docente
          </p>
        </div>

        <div class="rounded-2xl bg-white p-5 border border-amber-200 bg-amber-50/40 shadow-sm">
          <p class="text-xs font-bold uppercase tracking-wider text-amber-800">
            Alertas de Renovación
          </p>
          <p class="mt-2 text-2xl font-black text-amber-700">
            {{ retentionAlerts.length }} alumna(s)
          </p>
          <p class="mt-1 text-xs text-amber-700">
            Por quedarse sin clases o próximas a vencer
          </p>
        </div>
      </section>

      <!-- NAVEGACIÓN DE PESTAÑAS -->
      <div class="border-b border-slate-200">
        <nav class="-mb-px flex space-x-6 overflow-x-auto">
          <button
            type="button"
            @click="activeTab = 'retention'"
            :class="[
              activeTab === 'retention'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700',
              'whitespace-nowrap border-b-2 pb-3 text-sm transition-colors',
            ]"
          >
            🚨 Retención y Renovaciones ({{ retentionAlerts.length }})
          </button>

          <button
            type="button"
            @click="activeTab = 'occupancy'"
            :class="[
              activeTab === 'occupancy'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700',
              'whitespace-nowrap border-b-2 pb-3 text-sm transition-colors',
            ]"
          >
            📈 Ocupación de Clases ({{ occupancyBySchedule.length }})
          </button>

          <button
            type="button"
            @click="activeTab = 'financial'"
            :class="[
              activeTab === 'financial'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700',
              'whitespace-nowrap border-b-2 pb-3 text-sm transition-colors',
            ]"
          >
            💰 Rentabilidad por Plan ({{ plansPerformance.length }})
          </button>

          <button
            type="button"
            @click="activeTab = 'constancy'"
            :class="[
              activeTab === 'constancy'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700',
              'whitespace-nowrap border-b-2 pb-3 text-sm transition-colors',
            ]"
          >
            🏆 Constancia de Alumnas ({{ studentConstancyList.length }})
          </button>
        </nav>
      </div>

      <!-- TAB 1: RETENCIÓN Y RENOVACIONES CON WHATSAPP -->
      <section v-if="activeTab === 'retention'" class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              @click="retentionFilter = 'ALL'"
              class="rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors"
              :class="
                retentionFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              "
            >
              Todas ({{ retentionAlerts.length }})
            </button>
            <button
              type="button"
              @click="retentionFilter = 'LOW_CLASSES'"
              class="rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors"
              :class="
                retentionFilter === 'LOW_CLASSES'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              "
            >
              🔥 Quedan 1 o 2 clases
            </button>
            <button
              type="button"
              @click="retentionFilter = 'EXPIRING_SOON'"
              class="rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors"
              :class="
                retentionFilter === 'EXPIRING_SOON'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              "
            >
              ⏳ Vencen en &le; 7 días
            </button>
            <button
              type="button"
              @click="retentionFilter = 'EXPIRED'"
              class="rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors"
              :class="
                retentionFilter === 'EXPIRED'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              "
            >
              💤 Agotadas / Vencidas sin renovar
            </button>
          </div>

          <button
            type="button"
            @click="router.push('/studio-subscriptions')"
            class="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
          >
            + Activar / Renovar Tiquetera
          </button>
        </div>

        <div
          v-if="filteredRetentionAlerts.length === 0"
          class="rounded-2xl bg-white p-10 text-center border border-slate-100 text-sm text-slate-500"
        >
          🎉 No hay alumnas con alertas pendientes en esta categoría. Todas las tiqueteras activas tienen saldo y vigencia holgada.
        </div>

        <div v-else class="overflow-x-auto rounded-2xl bg-white border border-slate-100 shadow-sm">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th class="px-5 py-3.5">Alumna / Contacto</th>
                <th class="px-5 py-3.5">Paquete / Tiquetera</th>
                <th class="px-5 py-3.5">Saldo de Clases</th>
                <th class="px-5 py-3.5">Vencimiento</th>
                <th class="px-5 py-3.5">Alerta</th>
                <th class="px-5 py-3.5 text-right">Acción Comercial</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="item in filteredRetentionAlerts" :key="item.id" class="hover:bg-slate-50/60">
                <td class="px-5 py-4">
                  <p class="font-bold text-slate-900">{{ item.customerName }}</p>
                  <p class="text-xs text-slate-500">
                    🪪 {{ item.identification }} · 📱 {{ item.phone || 'Sin teléfono' }}
                  </p>
                </td>
                <td class="px-5 py-4 font-semibold text-slate-800">
                  {{ item.planName }}
                </td>
                <td class="px-5 py-4">
                  <span class="font-mono font-bold text-slate-900">
                    {{
                      item.remainingClasses === null
                        ? 'Ilimitado'
                        : `${item.remainingClasses} / ${item.totalClasses || '—'}`
                    }}
                  </span>
                </td>
                <td class="px-5 py-4 text-xs text-slate-600">
                  {{ formatDate(item.endDate) }}
                </td>
                <td class="px-5 py-4">
                  <span
                    class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold"
                    :class="item.badgeClass"
                  >
                    {{ item.badgeText }}
                  </span>
                </td>
                <td class="px-5 py-4 text-right space-x-2 whitespace-nowrap">
                  <button
                    type="button"
                    @click="sendWhatsApp(item.phone, item.whatsappMessage)"
                    class="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs"
                  >
                    <span>💬</span> Avisar por WhatsApp
                  </button>
                  <button
                    type="button"
                    @click="router.push('/studio-subscriptions')"
                    class="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    🎟️ Renovar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- TAB 2: OCUPACIÓN DE CLASES Y HORARIOS ESTRELLA -->
      <section v-if="activeTab === 'occupancy'" class="space-y-4">
        <div
          v-if="occupancyBySchedule.length === 0"
          class="rounded-2xl bg-white p-10 text-center border border-slate-100 text-sm text-slate-500"
        >
          Aún no hay horarios configurados en el estudio.
        </div>

        <div v-else class="overflow-x-auto rounded-2xl bg-white border border-slate-100 shadow-sm">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th class="px-5 py-3.5">Clase / Horario</th>
                <th class="px-5 py-3.5">Instructor</th>
                <th class="px-5 py-3.5">Capacidad Sala</th>
                <th class="px-5 py-3.5">Reservas Activas</th>
                <th class="px-5 py-3.5">Check-Ins Reales</th>
                <th class="px-5 py-3.5">Cancelaciones</th>
                <th class="px-5 py-3.5">Nivel de Ocupación</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="row in occupancyBySchedule" :key="row.id" class="hover:bg-slate-50/60">
                <td class="px-5 py-4">
                  <p class="font-bold text-slate-900">{{ row.className }}</p>
                  <p class="text-xs text-indigo-600 font-semibold">
                    {{ row.dayName }} · {{ row.timeRange }}
                  </p>
                </td>
                <td class="px-5 py-4 text-slate-700 font-medium">
                  👩‍🏫 {{ row.instructorName }}
                </td>
                <td class="px-5 py-4 font-mono text-xs text-slate-600">
                  {{ row.capacity }} mats/cupos
                </td>
                <td class="px-5 py-4 font-bold text-slate-900">
                  {{ row.totalConfirmedBookings }}
                </td>
                <td class="px-5 py-4 font-bold text-emerald-700">
                  {{ row.totalAttendances }}
                </td>
                <td class="px-5 py-4 text-rose-600 font-semibold">
                  {{ row.cancelledCount }}
                </td>
                <td class="px-5 py-4 w-56">
                  <div class="flex items-center justify-between text-xs font-bold mb-1">
                    <span>{{ row.occupancyPct }}%</span>
                    <span
                      :class="
                        row.occupancyPct >= 75
                          ? 'text-emerald-700'
                          : row.occupancyPct >= 40
                            ? 'text-indigo-600'
                            : 'text-amber-600'
                      "
                    >
                      {{
                        row.occupancyPct >= 75
                          ? '🔥 Horario Estrella'
                          : row.occupancyPct >= 40
                            ? '✅ Saludable'
                            : '❄️ Baja Ocupación'
                      }}
                    </span>
                  </div>
                  <div class="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all"
                      :class="
                        row.occupancyPct >= 75
                          ? 'bg-emerald-500'
                          : row.occupancyPct >= 40
                            ? 'bg-indigo-500'
                            : 'bg-amber-400'
                      "
                      :style="{ width: `${Math.max(6, row.occupancyPct)}%` }"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- TAB 3: RENTABILIDAD POR PLAN / TIQUETERA -->
      <section v-if="activeTab === 'financial'" class="space-y-4">
        <div class="overflow-x-auto rounded-2xl bg-white border border-slate-100 shadow-sm">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th class="px-5 py-3.5">Nombre del Plan / Paquete</th>
                <th class="px-5 py-3.5">Modalidad</th>
                <th class="px-5 py-3.5">Valor Unitario</th>
                <th class="px-5 py-3.5">Tiqueteras Vendidas</th>
                <th class="px-5 py-3.5">Alumnas Activas Hoy</th>
                <th class="px-5 py-3.5 text-right">Ingresos Generados</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="plan in plansPerformance" :key="plan.id" class="hover:bg-slate-50/60">
                <td class="px-5 py-4 font-bold text-slate-900">{{ plan.name }}</td>
                <td class="px-5 py-4">
                  <span class="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                    {{ plan.type === 'UNLIMITED' ? 'Ilimitado' : 'Paquete de Clases' }}
                  </span>
                </td>
                <td class="px-5 py-4 font-mono text-slate-700">{{ formatMoney(plan.unitPrice) }}</td>
                <td class="px-5 py-4 font-bold text-slate-900">{{ plan.soldCount }}</td>
                <td class="px-5 py-4 font-semibold text-emerald-700">{{ plan.activeCount }}</td>
                <td class="px-5 py-4 text-right font-black text-slate-900">
                  {{ formatMoney(plan.totalRevenue) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- TAB 4: CONSTANCIA DE ALUMNAS -->
      <section v-if="activeTab === 'constancy'" class="space-y-4">
        <div
          v-if="studentConstancyList.length === 0"
          class="rounded-2xl bg-white p-10 text-center border border-slate-100 text-sm text-slate-500"
        >
          Aún no hay registros de asistencia o suscripciones de alumnas.
        </div>

        <div v-else class="overflow-x-auto rounded-2xl bg-white border border-slate-100 shadow-sm">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th class="px-5 py-3.5"># / Alumna</th>
                <th class="px-5 py-3.5">Plan Activo</th>
                <th class="px-5 py-3.5">Asistencias (Check-In)</th>
                <th class="px-5 py-3.5">Reservas Activas</th>
                <th class="px-5 py-3.5">Última Actividad</th>
                <th class="px-5 py-3.5 text-right">Seguimiento</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="(st, idx) in studentConstancyList"
                :key="st.customerId"
                class="hover:bg-slate-50/60"
              >
                <td class="px-5 py-4">
                  <span class="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                    {{ idx + 1 }}
                  </span>
                  <span class="font-bold text-slate-900">{{ st.name }}</span>
                </td>
                <td class="px-5 py-4">
                  <span v-if="st.activePlanName" class="text-xs font-semibold text-indigo-700">
                    {{ st.activePlanName }}
                  </span>
                  <span v-else class="text-xs text-slate-400">Sin plan activo</span>
                </td>
                <td class="px-5 py-4 font-black text-emerald-700">
                  {{ st.attendancesCount }} clase(s)
                </td>
                <td class="px-5 py-4 font-semibold text-slate-700">
                  {{ st.bookingsCount }}
                </td>
                <td class="px-5 py-4 text-xs text-slate-500">
                  {{ formatDate(st.lastActivityDate) }}
                </td>
                <td class="px-5 py-4 text-right">
                  <button
                    type="button"
                    @click="
                      sendWhatsApp(
                        st.phone,
                        `¡Hola ${st.name}! 🧘‍♀️ Te escribimos de ${authStore.currentOrganization?.name || 'el Studio'} para saludarte y saber cómo vas con tus clases esta semana ✨.`
                      )
                    "
                    class="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                  >
                    💬 WhatsApp
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </AppLayout>
</template>
