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
const activeTab = ref<'classes' | 'plans' | 'my-bookings' | 'feedback'>('classes')

// Estado del formulario de Feedback de Clases
const feedbackScheduleId = ref('')
const feedbackDate = ref<string>(new Date().toISOString().split('T')[0] || '')
const feedbackRating = ref<number>(5)
const feedbackComment = ref('')
const feedbackAnonymous = ref(false)
const submittingFeedback = ref(false)

// Estado del Alumno identificado
const studentIdentifier = ref(localStorage.getItem('kuna_portal_student_id') || '')
const loadingStudent = ref(false)
const studentError = ref('')
const studentData = ref<any>(null)
const actionMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)
const bookingInProgressId = ref<string | null>(null)

// Estado para Solicitud de Renovación / Compra de Paquete desde el Portal
const selectedPlanForRequest = ref<any>(null)
const packageRequestForm = ref({
  paymentMethod: 'TRANSFERENCIA_BANCOLOMBIA',
  amountPaid: 0,
  reference: '',
  notes: '',
})
const submittingPackageRequest = ref(false)

// Estado para Alerta Médica / Lesión del Alumno
const editingMedicalAlert = ref(false)
const medicalAlertInput = ref('')
const savingMedicalAlert = ref(false)

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
  return studentData.value.subscriptions.filter(
    (sub: any) => sub.status === 'ACTIVE' || sub.status === 'PAUSED'
  )
})

const hasValidTiquetera = computed(() => {
  return activeSubscriptions.value.some(
    (sub: any) =>
      sub.status === 'ACTIVE' &&
      (sub.remainingClasses === null || Number(sub.remainingClasses) > 0)
  )
})

const confirmedBookings = computed(() => {
  if (!studentData.value?.bookings) return []
  return studentData.value.bookings.filter(
    (b: any) => b.status === 'CONFIRMED' || b.status === 'WAITLISTED'
  )
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

function isAlreadyWaitlisted(scheduleId: string): boolean {
  if (!studentData.value?.bookings) return false
  return studentData.value.bookings.some((b: any) => {
    const bDate = String(b.bookingDate || '').slice(0, 10)
    return (
      b.studioScheduleId === scheduleId &&
      bDate === selectedDate.value &&
      b.status === 'WAITLISTED'
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

function getInstructorName(sch: any): string {
  if (sch?.instructor) {
    return [sch.instructor.firstName, sch.instructor.lastName].filter(Boolean).join(' ')
  }
  return sch?.instructorName || 'Instructora del estudio'
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
    const { data: created } = await api.post(`/studio-bookings/public/book/${slug.value}`, {
      customerId: studentData.value.customer.id,
      studioScheduleId: schedule.id,
      bookingDate: selectedDate.value,
      allowWaitlist: true,
    })

    actionMessage.value = {
      type: 'success',
      text:
        created?.status === 'WAITLISTED'
          ? `⏳ La clase estaba llena y quedaste anotada(o) en la Lista de Espera para ${schedule.className} (${schedule.startTime}). Si se libera un cupo, pasarás a Confirmada automáticamente.`
          : `¡Tu cupo para ${schedule.className} (${schedule.startTime}) el ${formatDate(selectedDate.value)} quedó reservado con éxito!`,
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

function openFeedbackForSchedule(scheduleId: string, dateStr?: string) {
  feedbackScheduleId.value = scheduleId
  if (dateStr) {
    feedbackDate.value = String(dateStr).slice(0, 10)
  }
  activeTab.value = 'feedback'
}

function openPackageRenewalModal(plan: any) {
  if (!studentData.value?.customer?.id) {
    actionMessage.value = {
      type: 'error',
      text: 'Primero ingresa tu cédula, teléfono o correo arriba en "Consulta tu Tiquetera" para solicitar o renovar tu paquete.',
    }
    return
  }
  selectedPlanForRequest.value = plan
  packageRequestForm.value = {
    paymentMethod: 'TRANSFERENCIA_BANCOLOMBIA',
    amountPaid: Number(plan.price || 0),
    reference: '',
    notes: '',
  }
}

async function submitPackageRenewalRequest() {
  if (!studentData.value?.customer?.id || !selectedPlanForRequest.value) return
  submittingPackageRequest.value = true
  actionMessage.value = null
  try {
    await api.post(`/studio-bookings/public/package-request/${slug.value}`, {
      customerId: studentData.value.customer.id,
      studioPlanId: selectedPlanForRequest.value.id,
      paymentMethod: packageRequestForm.value.paymentMethod,
      amountPaid: Number(packageRequestForm.value.amountPaid || 0),
      reference: packageRequestForm.value.reference,
      notes: packageRequestForm.value.notes,
    })
    actionMessage.value = {
      type: 'success',
      text: `✅ ¡Solicitud de "${selectedPlanForRequest.value.name}" enviada! El estudio verificará tu pago y activará tu paquete.`,
    }
    selectedPlanForRequest.value = null
    await lookupStudent(true)
  } catch (err: any) {
    actionMessage.value = {
      type: 'error',
      text: err?.response?.data?.message || 'No fue posible enviar la solicitud del paquete.',
    }
  } finally {
    submittingPackageRequest.value = false
  }
}

function startEditingMedicalAlert() {
  medicalAlertInput.value = studentData.value?.customer?.medicalAlerts || ''
  editingMedicalAlert.value = true
}

async function saveStudentMedicalAlert() {
  if (!studentData.value?.customer?.id) return
  savingMedicalAlert.value = true
  try {
    await api.patch(`/studio-bookings/public/medical-alerts/${slug.value}`, {
      customerId: studentData.value.customer.id,
      medicalAlerts: medicalAlertInput.value,
    })
    editingMedicalAlert.value = false
    await lookupStudent(true)
    actionMessage.value = {
      type: 'success',
      text: '🩺 Tu condición física / alerta de salud quedó actualizada para tus instructoras.',
    }
  } catch (err: any) {
    actionMessage.value = {
      type: 'error',
      text: err?.response?.data?.message || 'No se pudo actualizar la nota de salud.',
    }
  } finally {
    savingMedicalAlert.value = false
  }
}

async function handleSubmitFeedback() {
  actionMessage.value = null
  if (!studentData.value?.customer?.id) {
    actionMessage.value = {
      type: 'error',
      text: 'Primero ingresa tu cédula, teléfono o correo arriba en "Consulta tu Tiquetera" para enviar tu calificación.',
    }
    return
  }
  if (!feedbackScheduleId.value) {
    actionMessage.value = {
      type: 'error',
      text: 'Selecciona la clase que deseas calificar.',
    }
    return
  }

  submittingFeedback.value = true
  try {
    await api.post(`/studio-bookings/public/feedback/${slug.value}`, {
      customerId: studentData.value.customer.id,
      studioScheduleId: feedbackScheduleId.value,
      classDate: feedbackDate.value,
      rating: feedbackRating.value,
      comment: feedbackComment.value,
      isAnonymous: feedbackAnonymous.value,
    })

    actionMessage.value = {
      type: 'success',
      text: '¡Gracias por tu feedback! Los administradores del estudio ya pueden leer tus comentarios.',
    }
    feedbackComment.value = ''
    feedbackRating.value = 5
    feedbackAnonymous.value = false
    await lookupStudent(true)
  } catch (err: any) {
    actionMessage.value = {
      type: 'error',
      text: err?.response?.data?.message || 'No se pudo enviar tu calificación.',
    }
  } finally {
    submittingFeedback.value = false
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
        <div class="flex items-center gap-4">
          <img
            v-if="(organization?.name || slug || '').toLowerCase().includes('uma')"
            src="/uma-logo.png"
            alt="UMA Movimiento Consciente"
            class="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover border-2 border-teal-400/40 shadow-md shrink-0 bg-[#edf3e2]"
          />
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
              :class="sub.status === 'PAUSED' ? 'border-sky-200 bg-sky-50/60' : 'border-indigo-100 bg-indigo-50/50'"
              class="rounded-xl border p-4 flex items-center justify-between"
            >
              <div>
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                    {{ sub.plan?.type === 'UNLIMITED' ? 'Plan Ilimitado' : 'Paquete / Tiquetera' }}
                  </span>
                  <span
                    v-if="sub.status === 'PAUSED'"
                    class="rounded-full bg-sky-100 text-sky-800 px-2 py-0.5 text-[10px] font-bold"
                  >
                    ❄️ Congelado
                  </span>
                  <span
                    v-if="Number(sub.balanceAmount || 0) > 0"
                    class="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold"
                  >
                    💰 Saldo pendiente: {{ formatPrice(sub.balanceAmount) }}
                  </span>
                </div>
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
            No tienes una tiquetera activa en este momento. Puedes revisar los <strong>Planes y Paquetes</strong> abajo y solicitar tu activación o reportar tu pago aquí mismo.
          </div>

          <!-- Bloque de Alerta Médica / Lesiones para la Instructora -->
          <div class="rounded-xl border border-rose-100 bg-rose-50/50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="text-xs">
              <span class="font-bold text-rose-800">🩺 Condición física o lesión para tener en cuenta en clase:</span>
              <span v-if="studentData.customer.medicalAlerts" class="ml-1.5 font-semibold text-slate-800">
                {{ studentData.customer.medicalAlerts }}
              </span>
              <span v-else class="ml-1.5 text-slate-500 italic">
                Sin observaciones registradas (ej. lesión de rodilla, espalda, embarazo...)
              </span>
            </div>
            <button
              v-if="!editingMedicalAlert"
              type="button"
              @click="startEditingMedicalAlert"
              class="self-start sm:self-auto rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors shrink-0"
            >
              {{ studentData.customer.medicalAlerts ? '✏️ Actualizar nota' : '➕ Informar condición / lesión' }}
            </button>
          </div>

          <form
            v-if="editingMedicalAlert"
            @submit.prevent="saveStudentMedicalAlert"
            class="rounded-xl border border-rose-200 bg-white p-3.5 flex flex-col sm:flex-row gap-2"
          >
            <input
              v-model="medicalAlertInput"
              type="text"
              placeholder="Ej: Molestia en rodilla derecha, embarazo 14 semanas..."
              class="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
            />
            <div class="flex gap-2">
              <button
                type="button"
                @click="editingMedicalAlert = false"
                class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="savingMedicalAlert"
                class="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold"
              >
                {{ savingMedicalAlert ? 'Guardando...' : 'Guardar para mi Instructora' }}
              </button>
            </div>
          </form>
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

          <button
            type="button"
            @click="activeTab = 'feedback'"
            :class="[
              activeTab === 'feedback'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700',
              'whitespace-nowrap border-b-2 pb-3 text-sm transition-colors',
            ]"
          >
            ⭐ Calificar Clases / Feedback
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
                <span v-if="sched.waitlistCount > 0" class="ml-1 text-amber-700 font-semibold">
                  ({{ sched.waitlistCount }} en espera)
                </span>
              </span>

              <span
                v-if="isAlreadyBooked(sched.id)"
                class="inline-flex items-center rounded-xl bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-800"
              >
                ✓ Ya tienes cupo reservado
              </span>

              <span
                v-else-if="isAlreadyWaitlisted(sched.id)"
                class="inline-flex items-center rounded-xl bg-amber-100 px-4 py-2 text-xs font-bold text-amber-900"
              >
                ⏳ En Lista de Espera
              </span>

              <button
                v-else
                type="button"
                @click="handleBookClass(sched)"
                :disabled="bookingInProgressId === sched.id"
                :class="
                  sched.availableSpots <= 0
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                "
                class="inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-bold shadow-sm disabled:bg-slate-200 disabled:text-slate-500 transition-colors"
              >
                {{
                  bookingInProgressId === sched.id
                    ? 'Procesando...'
                    : sched.availableSpots <= 0
                      ? '⏳ Unirme a Lista de Espera'
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

            <div class="mt-6 pt-4 border-t border-slate-100 space-y-3">
              <div>
                <p class="text-2xl font-black text-slate-900">{{ formatPrice(plan.price) }}</p>
                <p class="text-xs text-slate-500 mt-0.5">
                  Vigencia: <strong>{{ plan.durationDays }} días</strong> (desde tu 1ª clase)
                </p>
              </div>
              <button
                type="button"
                @click="openPackageRenewalModal(plan)"
                class="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-bold shadow-sm transition-colors"
              >
                🔄 Solicitar / Reportar Pago de este Paquete
              </button>
            </div>
          </article>
        </div>

        <!-- Modal de Solicitud de Renovación / Compra de Paquete -->
        <div
          v-if="selectedPlanForRequest"
          class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <div class="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-indigo-50/60">
              <h3 class="text-base font-bold text-slate-900">
                🔄 Renovar / Adquirir Paquete
              </h3>
              <button
                type="button"
                @click="selectedPlanForRequest = null"
                class="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form @submit.prevent="submitPackageRenewalRequest" class="p-6 space-y-4">
              <div class="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs space-y-1">
                <p class="font-black text-slate-900 text-sm">{{ selectedPlanForRequest.name }}</p>
                <p class="text-indigo-700 font-bold">
                  Valor del paquete: {{ formatPrice(selectedPlanForRequest.price) }}
                </p>
              </div>

              <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Medio de Pago Utilizado
                </label>
                <select
                  v-model="packageRequestForm.paymentMethod"
                  class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm bg-white"
                >
                  <option value="TRANSFERENCIA_BANCOLOMBIA">Transferencia Bancolombia</option>
                  <option value="NEQUI">Nequi</option>
                  <option value="EFECTIVO_SEDE">Efectivo en Sede</option>
                  <option value="TARJETA">Tarjeta / Datáfono</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Valor Pagado o Abonado (COP)
                </label>
                <input
                  v-model.number="packageRequestForm.amountPaid"
                  type="number"
                  min="0"
                  required
                  class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-bold"
                />
                <p class="text-[11px] text-slate-400 mt-0.5">
                  Si realizaste un abono parcial, escribe el monto abonado.
                </p>
              </div>

              <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Número de Comprobante / Referencia de Transferencia
                </label>
                <input
                  v-model="packageRequestForm.reference"
                  type="text"
                  placeholder="Ej: Comprobante #84920 o fecha/hora del envío"
                  class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Nota adicional (Opcional)
                </label>
                <input
                  v-model="packageRequestForm.notes"
                  type="text"
                  placeholder="Ej: Envié pantallazo por WhatsApp"
                  class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>

              <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  @click="selectedPlanForRequest = null"
                  class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  :disabled="submittingPackageRequest"
                  class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm"
                >
                  {{ submittingPackageRequest ? 'Enviando...' : '✅ Enviar Solicitud de Activación' }}
                </button>
              </div>
            </form>
          </div>
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
              <span
                :class="
                  booking.status === 'WAITLISTED'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                "
                class="inline-block rounded-md px-2.5 py-0.5 text-xs font-bold border"
              >
                {{ booking.status === 'WAITLISTED' ? '⏳ En Lista de Espera' : 'Confirmada' }} · {{ formatDate(booking.bookingDate) }}
              </span>
              <h3 class="mt-2 text-base font-black text-slate-900">
                {{ booking.schedule?.className || 'Clase de Estudio' }}
              </h3>
              <p class="text-xs text-slate-500 mt-0.5">
                ⏰ {{ booking.schedule?.startTime }} - {{ booking.schedule?.endTime }}
              </p>
            </div>

            <div class="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
              <button
                type="button"
                @click="openFeedbackForSchedule(booking.studioScheduleId, booking.bookingDate)"
                class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors"
              >
                ⭐ Calificar
              </button>
              <button
                type="button"
                @click="handleCancelBooking(booking)"
                class="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
              >
                Cancelar Reserva
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- TAB 4: CALIFICAR CLASES Y ENVIAR FEEDBACK AL ESTUDIO -->
      <section v-if="activeTab === 'feedback'" class="space-y-6">
        <div class="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 space-y-5">
          <div>
            <h2 class="text-lg font-black text-slate-900">
              ⭐ Califica tu Experiencia en Clase
            </h2>
            <p class="text-xs text-slate-500 mt-1">
              Tu opinión nos ayuda a mejorar cada día. Selecciona la clase, califícala de 1 a 5 estrellas y déjanos tus comentarios o sugerencias para el equipo del estudio.
            </p>
          </div>

          <div
            v-if="!studentData?.customer"
            class="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900"
          >
            ⚠️ Primero ingresa tu <strong>cédula, teléfono o correo</strong> en el recuadro superior <strong>"Consulta tu Tiquetera"</strong> para poder enviar tu calificación.
          </div>

          <form v-else @submit.prevent="handleSubmitFeedback" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                  Clase que deseas calificar
                </label>
                <select
                  v-model="feedbackScheduleId"
                  required
                  class="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white text-slate-900 focus:border-indigo-600 focus:outline-none"
                >
                  <option value="" disabled>-- Selecciona una clase --</option>
                  <option v-for="sch in schedules" :key="sch.id" :value="sch.id">
                    {{ daysOfWeekNames[sch.dayOfWeek] }} · {{ sch.className }} ({{ sch.startTime }}) — {{ getInstructorName(sch) }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                  Fecha aproximada de la clase
                </label>
                <input
                  v-model="feedbackDate"
                  type="date"
                  class="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-2">
                Calificación de la Clase (1 a 5 Estrellas)
              </label>
              <div class="flex items-center gap-2">
                <button
                  v-for="star in [1, 2, 3, 4, 5]"
                  :key="star"
                  type="button"
                  @click="feedbackRating = star"
                  class="px-3.5 py-2 rounded-xl border text-base font-black transition-all flex items-center gap-1"
                  :class="
                    star <= feedbackRating
                      ? 'bg-amber-50 border-amber-300 text-amber-500 shadow-2xs scale-105'
                      : 'bg-slate-50 border-slate-200 text-slate-300 hover:text-amber-300'
                  "
                >
                  <span>★</span>
                  <span class="text-xs font-bold text-slate-700">{{ star }}</span>
                </button>
                <span class="ml-2 text-xs font-bold text-slate-600">
                  {{
                    feedbackRating === 5
                      ? '¡Excelente! (5/5)'
                      : feedbackRating === 4
                        ? 'Muy buena (4/5)'
                        : feedbackRating === 3
                          ? 'Buena (3/5)'
                          : feedbackRating === 2
                            ? 'Regular (2/5)'
                            : 'Por mejorar (1/5)'
                  }}
                </span>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                Comentarios o Sugerencias
              </label>
              <textarea
                v-model="feedbackComment"
                rows="3"
                placeholder="¿Qué fue lo que más te gustó de la clase o de la profesora? ¿Tienes alguna sugerencia para el estudio?"
                class="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
              ></textarea>
            </div>

            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <label class="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                <input
                  v-model="feedbackAnonymous"
                  type="checkbox"
                  class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>🕵️ Enviar mi comentario de forma anónima</span>
              </label>

              <button
                type="submit"
                :disabled="submittingFeedback"
                class="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {{ submittingFeedback ? 'Enviando...' : '💬 Enviar Feedback al Estudio' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Historial de calificaciones enviadas por este alumno -->
        <div
          v-if="studentData?.feedbacks?.length"
          class="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 space-y-4"
        >
          <h3 class="text-sm font-black uppercase tracking-wider text-slate-700">
            Mis Calificaciones Enviadas ({{ studentData.feedbacks.length }})
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              v-for="fb in studentData.feedbacks"
              :key="fb.id"
              class="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-1.5"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-900">
                  {{ fb.className }} · <span class="text-slate-500">{{ fb.instructorName }}</span>
                </span>
                <span class="text-amber-500 font-black text-sm">
                  {{ '★'.repeat(Number(fb.rating || 5)) }}{{ '☆'.repeat(5 - Number(fb.rating || 5)) }}
                </span>
              </div>
              <p v-if="fb.comment" class="text-xs text-slate-700 italic">"{{ fb.comment }}"</p>
              <p class="text-[11px] text-slate-400">
                Fecha clase: {{ fb.classDate }} {{ fb.isAnonymous ? '· Enviado como anónimo' : '' }}
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

