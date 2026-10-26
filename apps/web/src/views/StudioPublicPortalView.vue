<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../services/api'

const route = useRoute()
const slug = computed(() => String(route.params.slug || 'empresa-demo'))

const loadingCatalog = ref(true)
const catalogError = ref('')
const organization = ref<any>(null)
const branches = ref<any[]>([])
const plans = ref<any[]>([])
const schedules = ref<any[]>([])

const selectedDate = ref<string>(new Date().toISOString().split('T')[0] || '')
const showAllWeek = ref(false)
const activeTab = ref<'classes' | 'plans' | 'my-bookings'>('classes')

// Estado del Alumno identificado
const studentIdentifier = ref(localStorage.getItem('kuna_portal_student_id') || '')
const loadingStudent = ref(false)
const studentError = ref('')
const studentData = ref<any>(null)
const actionMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)
const bookingInProgressId = ref<string | null>(null)

const daysOfWeekNames: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
}

const selectedDayOfWeek = computed(() => {
  if (!selectedDate.value) return new Date().getDay()
  const [y, m, d] = selectedDate.value.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1).getDay()
})

const filteredSchedules = computed(() => {
  if (showAllWeek.value) return schedules.value
  return schedules.value.filter((s) => Number(s.dayOfWeek) === selectedDayOfWeek.value)
})

const activeSubscriptions = computed(() => {
  if (!studentData.value?.subscriptions) return []
  return studentData.value.subscriptions.filter((sub: any) => sub.status === 'ACTIVE')
})

const hasValidTiquetera = computed(() => {
  return activeSubscriptions.value.some(
    (sub: any) => sub.remainingClasses === null || Number(sub.remainingClasses) > 0
  )
})

const confirmedBookings = computed(() => {
  if (!studentData.value?.bookings) return []
  return studentData.value.bookings.filter((b: any) => b.status === 'CONFIRMED')
})

function isAlreadyBooked(scheduleId: string): boolean {
  if (!studentData.value?.bookings) return false
  return studentData.value.bookings.some((b: any) => {
    const bDate = String(b.bookingDate || '').slice(0, 10)
    return (
      b.studioScheduleId === scheduleId &&
      bDate === selectedDate.value &&
      b.status === 'CONFIRMED'
    )
  })
}

function formatPrice(value: number | string) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const clean = String(dateStr).slice(0, 10)
  const [y, m, d] = clean.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

async function loadCatalog() {
  loadingCatalog.value = true
  catalogError.value = ''
  try {
    const { data } = await api.get(`/studio-bookings/public/catalog/${slug.value}`, {
      params: { date: selectedDate.value },
    })
    organization.value = data.organization
    branches.value = data.branches || []
    plans.value = data.plans || []
    schedules.value = data.schedules || []
  } catch (err: any) {
    catalogError.value =
      err.response?.data?.message || 'No fue posible cargar la información del estudio.'
  } finally {
    loadingCatalog.value = false
  }
}

async function lookupStudent(silent = false) {
  if (!studentIdentifier.value.trim()) {
    if (!silent) studentError.value = 'Ingresa tu número de documento, teléfono o correo.'
    return
  }

  loadingStudent.value = true
  studentError.value = ''
  if (!silent) actionMessage.value = null

  try {
    const { data } = await api.get(`/studio-bookings/public/student/${slug.value}`, {
      params: { identifier: studentIdentifier.value.trim() },
    })
    studentData.value = data
    localStorage.setItem('kuna_portal_student_id', studentIdentifier.value.trim())
  } catch (err: any) {
    studentData.value = null
    if (!silent) {
      studentError.value =
        err.response?.data?.message ||
        'No encontramos un alumno registrado con ese documento o correo.'
    }
  } finally {
    loadingStudent.value = false
  }
}

function logoutStudent() {
  studentData.value = null
  studentIdentifier.value = ''
  studentError.value = ''
  actionMessage.value = null
  localStorage.removeItem('kuna_portal_student_id')
}

async function handleBookClass(schedule: any) {
  actionMessage.value = null

  if (!studentData.value?.customer?.id) {
    actionMessage.value = {
      type: 'error',
      text: 'Primero ingresa tu número de documento o correo arriba en "Mi Tiquetera" para poder reservar.',
    }
    return
  }

  if (!hasValidTiquetera.value) {
    actionMessage.value = {
      type: 'error',
      text: 'No cuentas con una tiquetera activa o con clases disponibles. Acércate a recepción para adquirir o renovar tu paquete.',
    }
    return
  }

  bookingInProgressId.value = schedule.id
  try {
    await api.post(`/studio-bookings/public/book/${slug.value}`, {
      customerId: studentData.value.customer.id,
      studioScheduleId: schedule.id,
      bookingDate: selectedDate.value,
    })

    actionMessage.value = {
      type: 'success',
      text: `¡Tu cupo para ${schedule.className} (${schedule.startTime}) el ${formatDate(selectedDate.value)} quedó reservado con éxito!`,
    }

    await Promise.all([loadCatalog(), lookupStudent(true)])
  } catch (err: any) {
    actionMessage.value = {
      type: 'error',
      text: err.response?.data?.message || 'No fue posible registrar tu reserva.',
    }
  } finally {
    bookingInProgressId.value = null
  }
}

async function handleCancelBooking(booking: any) {
  if (!studentData.value?.customer?.id) return
  if (!confirm(`¿Deseas cancelar tu reserva para ${booking.schedule?.className || 'esta clase'}?`)) {
    return
  }

  try {
    await api.patch(`/studio-bookings/public/cancel/${slug.value}/${booking.id}`, {
      customerId: studentData.value.customer.id,
    })
    actionMessage.value = {
      type: 'success',
      text: 'Tu reserva ha sido cancelada y el cupo fue liberado.',
    }
    await Promise.all([loadCatalog(), lookupStudent(true)])
  } catch (err: any) {
    actionMessage.value = {
      type: 'error',
      text: err.response?.data?.message || 'No se pudo cancelar la reserva.',
    }
  }
}

watch(selectedDate, () => {
  loadCatalog()
})

onMounted(async () => {
  await loadCatalog()
  if (studentIdentifier.value.trim()) {
    await lookupStudent(true)
  }
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
    <!-- HEADER DEL PORTAL DE ALUMNOS -->
    <header class="bg-slate-900 text-white shadow-lg border-b border-slate-800">
      <div class="mx-auto max-w-5xl px-4 py-6 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span class="inline-flex items-center rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-300 border border-indigo-400/30">
            🧘‍♀️ Portal de Alumnos & Reservas Online
          </span>
          <h1 class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-white">
            {{ organization?.name || 'Cargando Estudio...' }}
          </h1>
          <p v-if="branches.length > 0" class="mt-1 text-xs sm:text-sm text-slate-400">
            📍 {{ branches[0].name }} — {{ branches[0].address }}, {{ branches[0].city }}
          </p>
        </div>

        <!-- Estado rápido del alumno si ya se identificó -->
        <div
          v-if="studentData?.customer"
          class="rounded-2xl bg-slate-800/90 border border-slate-700 p-4 text-left sm:text-right"
        >
          <p class="text-xs text-slate-400">Alumno identificado</p>
          <p class="text-sm font-bold text-white">
            {{ studentData.customer.firstName }} {{ studentData.customer.lastName }}
          </p>
          <p class="text-xs text-indigo-300 font-mono">
            ID: {{ studentData.customer.identificationNumber }}
          </p>
          <button
            @click="logoutStudent"
            type="button"
            class="mt-2 text-xs font-semibold text-rose-400 hover:text-rose-300 underline"
          >
            Cambiar de alumno
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-5xl px-4 pt-6 sm:px-6 space-y-6">
      <!-- TARJETA DE IDENTIFICACIÓN DEL ALUMNO Y ESTADO DE TIQUETERA -->
      <section class="rounded-2xl bg-white p-5 sm:p-6 shadow-sm border border-slate-200">
        <div v-if="!studentData?.customer">
          <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div class="flex-1">
              <h2 class="text-base font-bold text-slate-900">
                🎟️ Consulta tu Tiquetera y Reserva tu Clase
              </h2>
              <p class="text-xs text-slate-500 mt-1">
                Ingresa tu número de documento (cédula), teléfono o correo registrado en el estudio para ver tus clases disponibles y reservar cupo.
              </p>
            </div>

            <form @submit.prevent="lookupStudent(false)" class="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <input
                v-model="studentIdentifier"
                type="text"
                placeholder="Tu cédula, teléfono o correo..."
                class="w-full sm:w-72 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
              <button
                type="submit"
                :disabled="loadingStudent"
                class="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {{ loadingStudent ? 'Consultando...' : 'Consultar mi Tiquetera' }}
              </button>
            </form>
          </div>

          <p v-if="studentError" class="mt-3 rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-xs font-medium text-rose-700">
            ⚠️ {{ studentError }}
          </p>
        </div>

        <!-- RESUMEN DE TIQUETERA ACTIVA DEL ALUMNO -->
        <div v-else class="space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 class="text-base font-bold text-slate-900">
                Hola, {{ studentData.customer.firstName }} 👋
              </h2>
              <p class="text-xs text-slate-500">
                Estado actual de tus paquetes/tiqueteras y reservas en {{ organization?.name }}.
              </p>
            </div>
            <span
              v-if="hasValidTiquetera"
              class="inline-flex items-center self-start sm:self-auto rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200"
            >
              ● Tiquetera Habilitada para Reservar
            </span>
            <span
              v-else
              class="inline-flex items-center self-start sm:self-auto rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200"
            >
              ⚠️ Sin tiquetera activa / Sin clases disponibles
            </span>
          </div>

          <div v-if="activeSubscriptions.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              v-for="sub in activeSubscriptions"
              :key="sub.id"
              class="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 flex items-center justify-between"
            >
              <div>
                <span class="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                  {{ sub.plan?.type === 'UNLIMITED' ? 'Plan Ilimitado' : 'Paquete / Tiquetera' }}
                </span>
                <h3 class="text-sm font-black text-slate-900 mt-0.5">
                  {{ sub.plan?.name || 'Suscripción Activa' }}
                </h3>
                <p class="text-xs text-slate-500 mt-1">
                  Vence: <strong>{{ formatDate(sub.endDate) }}</strong>
                </p>
              </div>

              <div class="text-right">
                <span class="block text-2xl font-black text-indigo-700">
                  {{ sub.remainingClasses === null ? '∞' : sub.remainingClasses }}
                </span>
                <span class="text-[11px] font-semibold text-slate-500">
                  {{ sub.remainingClasses === null ? 'Clases ilimitadas' : 'Clases restantes' }}
                </span>
              </div>
            </div>
          </div>
          <div v-else class="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800">
            No tienes una tiquetera activa en este momento. Puedes revisar los <strong>Planes y Paquetes</strong> abajo y solicitar tu activación en la recepción del estudio.
          </div>
        </div>
      </section>

      <!-- ALERTA DE ACCIÓN (RESERVA / CANCELACIÓN) -->
      <div
        v-if="actionMessage"
        class="rounded-2xl p-4 text-sm font-medium border flex items-center justify-between"
        :class="
          actionMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        "
      >
        <span>{{ actionMessage.text }}</span>
        <button @click="actionMessage = null" class="ml-4 text-xs font-bold underline">Cerrar</button>
      </div>

      <!-- PESTAÑAS DE NAVEGACIÓN DEL PORTAL -->
      <div class="border-b border-slate-200">
        <nav class="-mb-px flex space-x-6 overflow-x-auto">
          <button
            type="button"
            @click="activeTab = 'classes'"
            :class="[
              activeTab === 'classes'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700',
              'whitespace-nowrap border-b-2 pb-3 text-sm transition-colors',
            ]"
          >
            📅 Horarios y Clases ({{ filteredSchedules.length }})
          </button>

          <button
            type="button"
            @click="activeTab = 'plans'"
            :class="[
              activeTab === 'plans'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700',
              'whitespace-nowrap border-b-2 pb-3 text-sm transition-colors',
            ]"
          >
            🧘‍♀️ Planes y Paquetes ({{ plans.length }})
          </button>

          <button
            v-if="studentData?.customer"
            type="button"
            @click="activeTab = 'my-bookings'"
            :class="[
              activeTab === 'my-bookings'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700',
              'whitespace-nowrap border-b-2 pb-3 text-sm transition-colors',
            ]"
          >
            📌 Mis Reservas Activas ({{ confirmedBookings.length }})
          </button>
        </nav>
      </div>

      <!-- TAB 1: HORARIOS Y RESERVA DE CLASES -->
      <section v-if="activeTab === 'classes'" class="space-y-4">
        <div class="rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex flex-wrap items-center gap-3">
            <div>
              <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Fecha para reservar
              </label>
              <input
                v-model="selectedDate"
                type="date"
                class="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-indigo-600 focus:outline-none"
              />
            </div>

            <div class="pt-4 sm:pt-5">
              <span class="inline-flex items-center rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                📆 {{ daysOfWeekNames[selectedDayOfWeek] }}
              </span>
            </div>
          </div>

          <label class="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
            <input v-model="showAllWeek" type="checkbox" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            <span>Ver todos los horarios de la semana</span>
          </label>
        </div>

        <div v-if="loadingCatalog" class="rounded-2xl bg-white p-12 text-center text-sm text-slate-500 border border-slate-200">
          Cargando clases y cupos disponibles...
        </div>

        <div
          v-else-if="filteredSchedules.length === 0"
          class="rounded-2xl bg-white p-10 text-center border border-slate-200 space-y-2"
        >
          <p class="text-base font-bold text-slate-700">
            No hay clases programadas para {{ daysOfWeekNames[selectedDayOfWeek] }}.
          </p>
          <p class="text-xs text-slate-500">
            Cambia la fecha arriba o activa "Ver todos los horarios de la semana".
          </p>
          <button
            @click="showAllWeek = true"
            type="button"
            class="mt-2 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white"
          >
            Ver toda la semana
          </button>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <article
            v-for="sched in filteredSchedules"
            :key="sched.id"
            class="rounded-2xl bg-white p-5 shadow-sm border border-slate-200 flex flex-col justify-between gap-4 hover:border-indigo-200 transition-colors"
          >
            <div>
              <div class="flex items-start justify-between gap-2">
                <div>
                  <span class="inline-block rounded-md bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-100">
                    {{ daysOfWeekNames[sched.dayOfWeek] }} · {{ sched.startTime }} - {{ sched.endTime }}
                  </span>
                  <h3 class="mt-2 text-lg font-black text-slate-900">
                    {{ sched.className }}
                  </h3>
                </div>

                <span
                  class="shrink-0 rounded-full px-3 py-1 text-xs font-bold"
                  :class="
                    sched.availableSpots > 0
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  "
                >
                  {{
                    sched.availableSpots > 0
                      ? `${sched.availableSpots} de ${sched.capacity} cupos libres`
                      : 'Clase Llena'
                  }}
                </span>
              </div>

              <p class="mt-2 text-xs text-slate-600">
                👩‍🏫 <strong>Instructor:</strong>
                {{
                  sched.instructor
                    ? `${sched.instructor.firstName} ${sched.instructor.lastName || ''}`
                    : sched.instructorName || 'Por asignar'
                }}
              </p>
              <p v-if="sched.notes" class="mt-1 text-xs text-slate-500">
                {{ sched.notes }}
              </p>
            </div>

            <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span class="text-xs text-slate-400">
                Fecha reserva: <strong>{{ formatDate(selectedDate) }}</strong>
              </span>

              <span
                v-if="isAlreadyBooked(sched.id)"
                class="inline-flex items-center rounded-xl bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-800"
              >
                ✓ Ya tienes cupo reservado
              </span>

              <button
                v-else
                type="button"
                @click="handleBookClass(sched)"
                :disabled="sched.availableSpots <= 0 || bookingInProgressId === sched.id"
                class="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-500 transition-colors"
              >
                {{
                  bookingInProgressId === sched.id
                    ? 'Reservando...'
                    : sched.availableSpots <= 0
                      ? 'Sin Cupos'
                      : '📌 Reservar mi Cupo'
                }}
              </button>
            </div>
          </article>
        </div>
      </section>

      <!-- TAB 2: PLANES Y PAQUETES DEL STUDIO -->
      <section v-if="activeTab === 'plans'" class="space-y-4">
        <div v-if="plans.length === 0" class="rounded-2xl bg-white p-10 text-center text-sm text-slate-500 border border-slate-200">
          Este estudio aún no ha publicado paquetes o tiqueteras activas.
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <article
            v-for="plan in plans"
            :key="plan.id"
            class="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 flex flex-col justify-between"
          >
            <div>
              <div class="flex items-center justify-between">
                <span class="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-100">
                  {{ plan.type === 'UNLIMITED' ? 'Acceso Ilimitado' : `${plan.totalClasses} Clases` }}
                </span>
                <span v-if="plan.isNewStudentOnly" class="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                  Alumnos Nuevos
                </span>
              </div>

              <h3 class="mt-3 text-lg font-black text-slate-900">{{ plan.name }}</h3>
              <p class="mt-1 text-xs text-slate-500">
                {{ plan.description || 'Paquete de clases para prácticas de estudio.' }}
              </p>
            </div>

            <div class="mt-6 pt-4 border-t border-slate-100">
              <p class="text-2xl font-black text-slate-900">{{ formatPrice(plan.price) }}</p>
              <p class="text-xs text-slate-500 mt-0.5">
                Vigencia: <strong>{{ plan.durationDays }} días</strong>
              </p>
            </div>
          </article>
        </div>
      </section>

      <!-- TAB 3: MIS RESERVAS ACTIVAS -->
      <section v-if="activeTab === 'my-bookings' && studentData?.customer" class="space-y-4">
        <div
          v-if="confirmedBookings.length === 0"
          class="rounded-2xl bg-white p-10 text-center text-sm text-slate-500 border border-slate-200"
        >
          No tienes reservas pendientes en este momento. Ve a la pestaña <strong>Horarios y Clases</strong> para apartar tu cupo.
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="booking in confirmedBookings"
            :key="booking.id"
            class="rounded-2xl bg-white p-5 shadow-sm border border-slate-200 flex items-center justify-between gap-4"
          >
            <div>
              <span class="inline-block rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                Confirmada · {{ formatDate(booking.bookingDate) }}
              </span>
              <h3 class="mt-2 text-base font-black text-slate-900">
                {{ booking.schedule?.className || 'Clase de Estudio' }}
              </h3>
              <p class="text-xs text-slate-500 mt-0.5">
                ⏰ {{ booking.schedule?.startTime }} - {{ booking.schedule?.endTime }}
              </p>
            </div>

            <button
              type="button"
              @click="handleCancelBooking(booking)"
              class="shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
            >
              Cancelar Reserva
            </button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

