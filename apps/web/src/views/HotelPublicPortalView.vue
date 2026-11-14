<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../services/api'

const route = useRoute()
const slug = computed(() => String(route.params.slug || 'empresa-demo'))

const today = new Date()
const tomorrow = new Date(today)
tomorrow.setDate(today.getDate() + 1)

const checkInDate = ref<string>(today.toISOString().split('T')[0] || '')
const checkOutDate = ref<string>(tomorrow.toISOString().split('T')[0] || '')
const guestsCount = ref<number>(2)
const filterRoomType = ref<string>('ALL')

const loadingCatalog = ref(true)
const catalogError = ref('')
const organization = ref<any>(null)
const branches = ref<any[]>([])
const rooms = ref<any[]>([])
const nightsCount = ref<number>(1)

const activeTab = ref<'rooms' | 'my-reservations'>('rooms')
const actionMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)

// Estado del Huésped identificado
const guestIdentifier = ref(localStorage.getItem('kuna_portal_guest_id') || '')
const loadingGuest = ref(false)
const guestError = ref('')
const guestData = ref<any>(null)

// Modal de Reserva de Habitación
const selectedRoomForBooking = ref<any>(null)
const submittingBooking = ref(false)
const bookingForm = ref({
  fullName: '',
  identificationType: 'CC',
  identificationNumber: '',
  email: '',
  phoneNumber: '',
  paymentMethod: 'PAGO_RECEPCION',
  paymentReference: '',
  notes: '',
})

const roomTypeLabels: Record<string, string> = {
  SINGLE: 'Habitación Sencilla',
  STANDARD: 'Habitación Estándar',
  DOUBLE: 'Habitación Doble',
  SUITE: 'Suite Ejecutiva',
  PENTHOUSE: 'Penthouse',
}

const roomTypeIcons: Record<string, string> = {
  SINGLE: '🛏️',
  STANDARD: '🏨',
  DOUBLE: '🛌',
  SUITE: '✨',
  PENTHOUSE: '👑',
}

const filteredRooms = computed(() => {
  if (filterRoomType.value === 'ALL') return rooms.value
  return rooms.value.filter((r) => r.roomType === filterRoomType.value)
})

const availableRoomsCount = computed(() => {
  return rooms.value.filter((r) => r.canBook).length
})

const activeReservationsCount = computed(() => {
  if (!guestData.value?.reservations) return 0
  return guestData.value.reservations.filter((r: any) =>
    ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(r.status)
  ).length
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
  const datePart = String(d).split('T')[0]
  return new Date(`${datePart}T00:00:00`).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getRoomTypeName(type: string): string {
  return roomTypeLabels[type] || type
}

function getRoomTypeIcon(type: string): string {
  return roomTypeIcons[type] || '🏨'
}

function getReservationStatusBadge(status: string) {
  switch (status) {
    case 'PENDING':
      return {
        label: '⏳ Pendiente de Confirmación en Recepción',
        classes: 'bg-amber-50 text-amber-800 border-amber-300',
      }
    case 'CONFIRMED':
      return {
        label: '✅ Confirmada por el Hotel',
        classes: 'bg-blue-50 text-blue-700 border-blue-200',
      }
    case 'CHECKED_IN':
      return {
        label: '🛎️ En Estadía (Check-In Activo)',
        classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      }
    case 'CHECKED_OUT':
      return {
        label: '🏁 Estadía Finalizada (Check-Out)',
        classes: 'bg-slate-100 text-slate-600 border-slate-200',
      }
    case 'CANCELLED':
      return {
        label: '✕ Cancelada',
        classes: 'bg-rose-50 text-rose-700 border-rose-200',
      }
    case 'NO_SHOW':
      return {
        label: '👻 No-Show',
        classes: 'bg-orange-50 text-orange-700 border-orange-200',
      }
    default:
      return {
        label: status,
        classes: 'bg-slate-50 text-slate-700 border-slate-200',
      }
  }
}

async function fetchHotelCatalog() {
  loadingCatalog.value = true
  catalogError.value = ''
  try {
    const res = await api.get(`/hotel-reservations/public/catalog/${slug.value}`, {
      params: {
        checkInDate: checkInDate.value,
        checkOutDate: checkOutDate.value,
        guests: guestsCount.value,
      },
    })
    organization.value = res.data?.organization || null
    branches.value = res.data?.branches || []
    rooms.value = res.data?.rooms || []
    if (res.data?.search) {
      checkInDate.value = res.data.search.checkInDate || checkInDate.value
      checkOutDate.value = res.data.search.checkOutDate || checkOutDate.value
      nightsCount.value = Number(res.data.search.nights || 1)
    }
  } catch (err: any) {
    catalogError.value =
      err?.response?.data?.message || 'No se pudo cargar la disponibilidad del hotel.'
  } finally {
    loadingCatalog.value = false
  }
}

async function lookupGuest(silent = false) {
  const clean = guestIdentifier.value.trim()
  if (!clean) {
    if (!silent) guestError.value = 'Ingresa tu documento, pasaporte, celular o correo'
    return
  }
  loadingGuest.value = true
  guestError.value = ''
  if (!silent) actionMessage.value = null
  try {
    const res = await api.get(`/hotel-reservations/public/guest/${slug.value}`, {
      params: { identifier: clean },
    })
    guestData.value = res.data
    localStorage.setItem('kuna_portal_guest_id', clean)
  } catch (err: any) {
    guestData.value = null
    if (!silent) {
      guestError.value =
        err?.response?.data?.message ||
        'No encontramos reservas previas con ese documento. Puedes reservar directamente eligiendo una habitación abajo.'
    }
  } finally {
    loadingGuest.value = false
  }
}

function logoutGuest() {
  guestData.value = null
  guestIdentifier.value = ''
  guestError.value = ''
  localStorage.removeItem('kuna_portal_guest_id')
}

function openBookingModal(room: any) {
  selectedRoomForBooking.value = room
  actionMessage.value = null

  if (guestData.value?.customer) {
    const c = guestData.value.customer
    bookingForm.value = {
      fullName: [c.firstName, c.lastName].filter(Boolean).join(' '),
      identificationType: c.identificationType || 'CC',
      identificationNumber: c.identificationNumber || '',
      email: c.email || '',
      phoneNumber: c.phoneNumber || '',
      paymentMethod: 'PAGO_RECEPCION',
      paymentReference: '',
      notes: '',
    }
  } else {
    bookingForm.value = {
      fullName: '',
      identificationType: 'CC',
      identificationNumber: guestIdentifier.value.trim() || '',
      email: '',
      phoneNumber: '',
      paymentMethod: 'PAGO_RECEPCION',
      paymentReference: '',
      notes: '',
    }
  }
}

async function submitRoomBooking() {
  if (!selectedRoomForBooking.value) return
  submittingBooking.value = true
  actionMessage.value = null

  try {
    const nameParts = bookingForm.value.fullName.trim().split(/\s+/)
    const firstName = nameParts[0] || 'Huésped'
    const lastName = nameParts.slice(1).join(' ')

    const res = await api.post(`/hotel-reservations/public/book/${slug.value}`, {
      hotelRoomId: selectedRoomForBooking.value.id,
      checkInDate: checkInDate.value,
      checkOutDate: checkOutDate.value,
      guests: guestsCount.value,
      customerId: guestData.value?.customer?.id || undefined,
      firstName,
      lastName,
      identificationType: bookingForm.value.identificationType,
      identificationNumber: bookingForm.value.identificationNumber.trim(),
      email: bookingForm.value.email.trim() || undefined,
      phoneNumber: bookingForm.value.phoneNumber.trim() || undefined,
      paymentMethod: bookingForm.value.paymentMethod,
      paymentReference: bookingForm.value.paymentReference.trim() || undefined,
      notes: bookingForm.value.notes.trim() || undefined,
    })

    const createdCustomer = res.data?.customer
    const roomNum = selectedRoomForBooking.value.roomNumber
    selectedRoomForBooking.value = null

    actionMessage.value = {
      type: 'success',
      text: `🎉 ¡Solicitud de reserva enviada para la Habitación ${roomNum}! Estado: Pendiente de confirmación por recepción.`,
    }

    if (createdCustomer?.identificationNumber) {
      guestIdentifier.value = createdCustomer.identificationNumber
      await lookupGuest(true)
    } else if (guestData.value) {
      await lookupGuest(true)
    }

    await fetchHotelCatalog()
    activeTab.value = 'my-reservations'
  } catch (err: any) {
    actionMessage.value = {
      type: 'error',
      text: err?.response?.data?.message || 'No se pudo procesar la reserva de la habitación.',
    }
  } finally {
    submittingBooking.value = false
  }
}

async function cancelGuestReservation(reservation: any) {
  if (!guestData.value?.customer?.id) return
  if (
    !confirm(
      `¿Deseas cancelar tu reserva en la Habitación ${reservation.hotelRoom?.roomNumber} del ${formatDate(reservation.checkInDate)}?`
    )
  ) {
    return
  }

  try {
    await api.patch(`/hotel-reservations/public/cancel/${slug.value}/${reservation.id}`, {
      customerId: guestData.value.customer.id,
      reason: 'Cancelada por el huésped desde el Portal Público',
    })
    actionMessage.value = {
      type: 'success',
      text: 'Reserva cancelada correctamente.',
    }
    await Promise.all([lookupGuest(true), fetchHotelCatalog()])
  } catch (err: any) {
    actionMessage.value = {
      type: 'error',
      text: err?.response?.data?.message || 'No se pudo cancelar la reserva.',
    }
  }
}

function getReservationChargesTotal(reservation: any): number {
  if (!Array.isArray(reservation?.charges)) return 0
  return reservation.charges.reduce(
    (sum: number, c: any) => sum + Number(c.amount || 0) * Number(c.quantity || 1),
    0
  )
}

function getWhatsAppHotelLink(room?: any): string {
  const rawPhone = branches.value[0]?.phoneNumber || ''
  const cleanPhone = rawPhone.replace(/\D/g, '')
  const targetPhone =
    cleanPhone.length >= 10
      ? cleanPhone.startsWith('57')
        ? cleanPhone
        : `57${cleanPhone}`
      : ''
  const msg = room
    ? `Hola ${organization.value?.name || 'Hotel'}, quiero consultar por la Habitación ${room.roomNumber} (${getRoomTypeName(room.roomType)}) del ${checkInDate.value} al ${checkOutDate.value}.`
    : `Hola ${organization.value?.name || 'Hotel'}, tengo una consulta sobre mi reserva.`
  const encoded = encodeURIComponent(msg)
  return targetPhone ? `https://wa.me/${targetPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`
}

onMounted(async () => {
  await fetchHotelCatalog()
  if (guestIdentifier.value) {
    await lookupGuest(true)
  }
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-800 pb-16">
    <!-- Hero Header del Hotel -->
    <header class="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shadow-lg">
      <div class="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-2xl shadow-inner">
              🛎️
            </div>
            <div>
              <span class="inline-block text-[11px] font-bold uppercase tracking-widest text-blue-300 bg-blue-500/20 px-2.5 py-0.5 rounded-full border border-blue-400/20 mb-1">
                Portal Oficial de Reservas y Huéspedes
              </span>
              <h1 class="text-2xl sm:text-3xl font-black tracking-tight">
                {{ organization?.name || 'Hotel & Hospedaje' }}
              </h1>
              <p v-if="branches.length > 0" class="text-xs sm:text-sm text-slate-300 mt-0.5">
                📍 {{ branches[0]?.name }}
                <span v-if="branches[0]?.address"> • {{ branches[0]?.address }}</span>
                <span v-if="branches[0]?.city"> ({{ branches[0]?.city }})</span>
              </p>
            </div>
          </div>

          <a
            :href="getWhatsAppHotelLink()"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition"
          >
            <span>💬</span> Contactar Recepción
          </a>
        </div>

        <!-- Tarjeta de Identificación de Huésped -->
        <div class="mt-6 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5">
          <div v-if="!guestData">
            <search>
              <form @submit.prevent="lookupGuest(false)" aria-labelledby="guest-lookup-heading">
                <p id="guest-lookup-heading" class="text-xs sm:text-sm font-semibold text-blue-100 mb-2.5">
                  🔑 ¿Ya tienes una reserva o te has hospedado con nosotros? Consulta tu estadía y folio con tu documento o correo:
                </p>
                <div class="flex flex-col sm:flex-row gap-2.5">
                  <div class="flex-1">
                    <label for="guest-lookup-input" class="sr-only">Número de documento, pasaporte, celular o correo</label>
                    <input
                      id="guest-lookup-input"
                      v-model="guestIdentifier"
                      name="identifier"
                      type="text"
                      autocorrect="off"
                      autocapitalize="none"
                      spellcheck="false"
                      enterkeyhint="search"
                      placeholder="Ej: Cédula, Pasaporte, Celular o Correo electrónico..."
                      class="w-full px-4 py-2.5 rounded-xl bg-white text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <button
                    type="submit"
                    :disabled="loadingGuest"
                    class="px-6 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm shadow transition cursor-pointer disabled:opacity-50"
                  >
                    {{ loadingGuest ? 'Buscando...' : 'Consultar Mis Reservas' }}
                  </button>
                </div>
                <p v-if="guestError" role="status" class="text-xs text-amber-200 mt-2 font-medium">
                  ⚠️ {{ guestError }}
                </p>
              </form>
            </search>
          </div>

          <!-- Perfil del Huésped Identificado -->
          <div v-else class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <p class="text-sm sm:text-base font-bold text-white">
                  ¡Hola, {{ guestData.customer.firstName }} {{ guestData.customer.lastName || '' }}!
                </p>
                <span class="text-xs bg-white/15 px-2.5 py-0.5 rounded-full text-blue-100">
                  Doc: {{ guestData.customer.identificationNumber }}
                </span>
              </div>
              <p class="text-xs text-blue-200 mt-1">
                Tienes <strong>{{ activeReservationsCount }}</strong> reserva(s) activa(s) o pendiente(s) de confirmación.
              </p>
            </div>
            <div class="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                @click="activeTab = 'my-reservations'"
                class="px-3.5 py-1.5 rounded-xl bg-blue-500/30 hover:bg-blue-500/40 text-xs font-bold text-white border border-blue-300/30 transition cursor-pointer"
              >
                🧳 Ver Mis Reservas ({{ guestData.reservations?.length || 0 }})
              </button>
              <button
                type="button"
                @click="logoutGuest"
                class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 transition cursor-pointer"
              >
                Cambiar huésped
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Contenido Principal -->
    <main class="max-w-5xl mx-auto px-4 mt-6">
      <!-- Notificación de acción -->
      <div
        v-if="actionMessage"
        role="status"
        class="mb-5 p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-sm"
        :class="
          actionMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        "
      >
        <p class="text-sm font-semibold">{{ actionMessage.text }}</p>
        <button type="button" @click="actionMessage = null" class="text-xs font-bold underline cursor-pointer">
          Cerrar
        </button>
      </div>

      <!-- Pestañas de Navegación -->
      <div class="flex flex-wrap gap-2 border-b border-slate-200 pb-3 mb-6">
        <button
          type="button"
          @click="activeTab = 'rooms'"
          class="px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer"
          :class="
            activeTab === 'rooms'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          "
        >
          🛏️ Buscar y Reservar Habitación
        </button>
        <button
          type="button"
          @click="activeTab = 'my-reservations'"
          class="px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer flex items-center gap-1.5"
          :class="
            activeTab === 'my-reservations'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          "
        >
          🧳 Mis Reservas y Folio
          <span
            v-if="activeReservationsCount > 0"
            class="px-2 py-0.5 text-xs rounded-full"
            :class="activeTab === 'my-reservations' ? 'bg-white text-blue-700' : 'bg-blue-100 text-blue-700'"
          >
            {{ activeReservationsCount }}
          </span>
        </button>
      </div>

      <!-- TAB 1: BUSCADOR DE DISPONIBILIDAD Y CATÁLOGO DE HABITACIONES -->
      <section v-if="activeTab === 'rooms'">
        <!-- Barra de búsqueda por fechas y huéspedes -->
        <search>
          <form
            @submit.prevent="fetchHotelCatalog"
            aria-labelledby="availability-search-heading"
            class="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 mb-6 shadow-sm"
          >
            <h2 id="availability-search-heading" class="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              📅 Selecciona tus fechas de estadía para verificar disponibilidad en tiempo real
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label for="checkin-date" class="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Llegada (Check-In) <span aria-hidden="true">*</span>
                </label>
                <input
                  id="checkin-date"
                  v-model="checkInDate"
                  name="checkInDate"
                  type="date"
                  required
                  class="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label for="checkout-date" class="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Salida (Check-Out) <span aria-hidden="true">*</span>
                </label>
                <input
                  id="checkout-date"
                  v-model="checkOutDate"
                  name="checkOutDate"
                  type="date"
                  :min="checkInDate"
                  required
                  class="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label for="guests-count" class="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Huéspedes
                </label>
                <select
                  id="guests-count"
                  v-model.number="guestsCount"
                  name="guests"
                  class="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option :value="1">1 Adulto</option>
                  <option :value="2">2 Huéspedes</option>
                  <option :value="3">3 Huéspedes</option>
                  <option :value="4">4 Huéspedes</option>
                  <option :value="5">5+ Huéspedes</option>
                </select>
              </div>
              <div>
                <button
                  type="submit"
                  :disabled="loadingCatalog"
                  class="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {{ loadingCatalog ? 'Consultando...' : '🔍 Buscar Habitaciones' }}
                </button>
              </div>
            </div>

            <!-- Resumen de noches y filtro rápido de tipo -->
            <div class="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p class="text-xs text-slate-600">
                 Estadía seleccionada: <strong>{{ nightsCount }} noche{{ nightsCount > 1 ? 's' : '' }}</strong> ({{ formatDate(checkInDate) }} → {{ formatDate(checkOutDate) }}) •
                <span class="text-emerald-700 font-bold">{{ availableRoomsCount }} habitación(es) disponible(s)</span>
              </p>
              <div class="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  @click="filterRoomType = 'ALL'"
                  class="px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer"
                  :class="filterRoomType === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'"
                >
                  Todas
                </button>
                <button
                  v-for="(label, key) in roomTypeLabels"
                  :key="key"
                  type="button"
                  @click="filterRoomType = key"
                  class="px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer"
                  :class="filterRoomType === key ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'"
                >
                  {{ label }}
                </button>
              </div>
            </div>
          </form>
        </search>

        <!-- Estado de carga o vacío -->
        <div v-if="loadingCatalog" class="text-center py-12 text-slate-500">
          Verificando habitaciones disponibles...
        </div>
        <div v-else-if="catalogError" class="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-2xl text-center">
          {{ catalogError }}
        </div>
        <div
          v-else-if="filteredRooms.length === 0"
          class="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500"
        >
          No hay habitaciones registradas con este filtro.
        </div>

        <!-- Grid de Habitaciones -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="room in filteredRooms"
            :key="room.id"
            class="bg-white rounded-2xl border p-5 shadow-sm flex flex-col justify-between transition"
            :class="room.canBook ? 'border-slate-200 hover:border-blue-300 hover:shadow-md' : 'border-slate-200 opacity-75 bg-slate-50/60'"
          >
            <div>
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2.5">
                  <span class="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-xl">
                    {{ getRoomTypeIcon(room.roomType) }}
                  </span>
                  <div>
                    <span class="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
                      {{ getRoomTypeName(room.roomType) }}
                    </span>
                    <h3 class="text-lg font-black text-slate-900">
                      Habitación {{ room.roomNumber }}
                    </h3>
                  </div>
                </div>

                <!-- Badge de Disponibilidad en esas fechas -->
                <span
                  class="px-2.5 py-1 rounded-full text-xs font-bold border"
                  :class="
                    !room.isDateAvailable
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : !room.meetsCapacity
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  "
                >
                  {{
                    !room.isDateAvailable
                      ? 'Ocupada en estas fechas'
                      : !room.meetsCapacity
                      ? `Capacidad máx: ${room.capacity} pers.`
                      : '✅ Disponible'
                  }}
                </span>
              </div>

              <p v-if="room.description" class="text-xs text-slate-600 mt-3 leading-relaxed">
                {{ room.description }}
              </p>
              <p v-else class="text-xs text-slate-400 mt-3 italic">
                Habitación confortable equipada para hasta {{ room.capacity }} huésped(es).
              </p>

              <div class="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                <span class="bg-slate-100 px-2.5 py-1 rounded-lg font-medium">
                  👥 Hasta {{ room.capacity }} persona(s)
                </span>
                <span v-if="room.branch?.name" class="bg-slate-100 px-2.5 py-1 rounded-lg font-medium">
                  📍 {{ room.branch.name }}
                </span>
              </div>
            </div>

            <!-- Tarifa y Botón de Reserva -->
            <div class="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <div>
                <p class="text-xs text-slate-400">
                  {{ formatCurrency(room.nightlyRate) }} / noche
                </p>
                <p class="text-lg font-black text-slate-900">
                  {{ formatCurrency(room.estimatedTotal) }}
                  <span class="text-xs font-normal text-slate-500">
                    total ({{ room.nights }} noche{{ room.nights > 1 ? 's' : '' }})
                  </span>
                </p>
              </div>

              <div class="flex items-center gap-2">
                <button
                  v-if="room.canBook"
                  type="button"
                  @click="openBookingModal(room)"
                  class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  🛎️ Reservar Habitación
                </button>
                <a
                  v-else
                  :href="getWhatsAppHotelLink(room)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition"
                >
                  Consultar otra fecha
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- TAB 2: MIS RESERVAS Y ESTADO DE FOLIO -->
      <section v-if="activeTab === 'my-reservations'">
        <div v-if="!guestData" class="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <p class="text-base font-bold text-slate-800 mb-2">
            Identifícate arriba con tu número de documento o correo
          </p>
          <p class="text-xs text-slate-500">
            Así podrás consultar el estado de confirmación de tu reserva, tu habitación asignada y el detalle de tu folio.
          </p>
        </div>

        <div
          v-else-if="!guestData.reservations || guestData.reservations.length === 0"
          class="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500"
        >
          No tienes reservas registradas todavía. Ve a la pestaña <strong>🛏️ Buscar y Reservar Habitación</strong> para solicitar tu estadía.
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="res in guestData.reservations"
            :key="res.id"
            class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-base font-black text-slate-900">
                    Habitación {{ res.hotelRoom?.roomNumber }} — {{ getRoomTypeName(res.hotelRoom?.roomType) }}
                  </span>
                  <span
                    class="px-2.5 py-0.5 rounded-full text-xs font-bold border"
                    :class="getReservationStatusBadge(res.status).classes"
                  >
                    {{ getReservationStatusBadge(res.status).label }}
                  </span>
                </div>
                <p class="text-xs text-slate-500 mt-1">
                  📅 Check-In: <strong>{{ formatDate(res.checkInDate) }}</strong> → Check-Out: <strong>{{ formatDate(res.checkOutDate) }}</strong>
                </p>
              </div>

              <div class="flex items-center gap-2">
                <button
                  v-if="['PENDING', 'CONFIRMED'].includes(res.status)"
                  type="button"
                  @click="cancelGuestReservation(res)"
                  class="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer"
                >
                  Cancelar Reserva
                </button>
              </div>
            </div>

            <!-- Resumen de Folio del Huésped -->
            <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div class="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span class="text-slate-400 font-bold uppercase block">Hospedaje</span>
                <span class="text-sm font-black text-slate-800">{{ formatCurrency(res.totalAmount) }}</span>
                <span class="text-slate-400 block mt-0.5">{{ formatCurrency(res.nightlyRate) }} / noche</span>
              </div>
              <div class="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span class="text-slate-400 font-bold uppercase block">Consumos / Cargos Extra</span>
                <span class="text-sm font-black text-slate-800">{{ formatCurrency(getReservationChargesTotal(res)) }}</span>
                <span class="text-slate-400 block mt-0.5">{{ res.charges?.length || 0 }} cargo(s) a la habitación</span>
              </div>
              <div class="bg-blue-50 rounded-xl p-3 border border-blue-100">
                <span class="text-blue-600 font-bold uppercase block">Total Estimado Folio</span>
                <span class="text-base font-black text-blue-900">
                  {{ formatCurrency(Number(res.totalAmount || 0) + getReservationChargesTotal(res)) }}
                </span>
                <span v-if="res.status === 'PENDING'" class="text-[11px] text-amber-700 font-semibold block mt-0.5">
                  El hotel confirmará tu solicitud en breve
                </span>
              </div>
            </div>

            <p v-if="res.notes" class="mt-3 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
              📝 <strong>Detalles:</strong> {{ res.notes }}
            </p>
          </div>
        </div>
      </section>
    </main>

    <!-- MODAL DE CONFIRMACIÓN DE RESERVA POR EL HUÉSPED -->
    <div
      v-if="selectedRoomForBooking"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
    >
      <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden my-8">
        <div class="px-6 py-4 bg-gradient-to-r from-slate-900 to-blue-900 text-white flex items-center justify-between">
          <div>
            <span class="text-[11px] uppercase tracking-wider text-blue-300 font-bold block">
              Solicitud de Reserva Online
            </span>
            <h3 id="modal-booking-title" class="text-lg font-black">
              Habitación {{ selectedRoomForBooking.roomNumber }} — {{ getRoomTypeName(selectedRoomForBooking.roomType) }}
            </h3>
          </div>
          <button
            type="button"
            @click="selectedRoomForBooking = null"
            class="text-slate-300 hover:text-white font-bold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="submitRoomBooking" aria-labelledby="modal-booking-title" class="p-6 space-y-4">
          <!-- Resumen de fechas y valor -->
          <div class="bg-blue-50 border border-blue-100 rounded-xl p-3.5 flex items-center justify-between text-xs">
            <div>
              <p class="font-bold text-blue-900">
                📅 {{ formatDate(checkInDate) }} → {{ formatDate(checkOutDate) }}
              </p>
              <p class="text-blue-700 mt-0.5">
                {{ selectedRoomForBooking.nights }} noche(s) • {{ guestsCount }} huésped(es)
              </p>
            </div>
            <div class="text-right">
              <span class="text-[11px] text-blue-600 block">Total Estadía</span>
              <span class="text-base font-black text-blue-900">
                {{ formatCurrency(selectedRoomForBooking.estimatedTotal) }}
              </span>
            </div>
          </div>

          <!-- Datos del Huésped (Single full name input as recommended by autofill-sign-up-form) -->
          <div>
            <label for="guest-full-name" class="block text-xs font-bold uppercase text-slate-600 mb-1">
              Nombre completo del huésped titular <span aria-hidden="true">*</span>
            </label>
            <input
              id="guest-full-name"
              v-model="bookingForm.fullName"
              name="name"
              type="text"
              autocomplete="name"
              required
              placeholder="Ej: Ana María Gómez"
              class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label for="guest-id-type" class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Tipo Doc.
              </label>
              <select
                id="guest-id-type"
                v-model="bookingForm.identificationType"
                name="identificationType"
                class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                <option value="CC">Cédula (CC)</option>
                <option value="CE">Cédula Extranjería</option>
                <option value="PASSPORT">Pasaporte</option>
                <option value="NIT">NIT</option>
              </select>
            </div>
            <div class="sm:col-span-2">
              <label for="guest-id-number" class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Número de Documento / Pasaporte <span aria-hidden="true">*</span>
              </label>
              <input
                id="guest-id-number"
                v-model="bookingForm.identificationNumber"
                name="identificationNumber"
                type="text"
                autocorrect="off"
                autocapitalize="none"
                spellcheck="false"
                required
                placeholder="Ej: 1020304050"
                class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="guest-phone" class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Teléfono / WhatsApp <span aria-hidden="true">*</span>
              </label>
              <input
                id="guest-phone"
                v-model="bookingForm.phoneNumber"
                name="phone"
                type="tel"
                autocomplete="tel"
                required
                placeholder="Ej: 3001234567"
                class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label for="guest-email" class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Correo Electrónico
              </label>
              <input
                id="guest-email"
                v-model="bookingForm.email"
                name="email"
                type="email"
                autocomplete="email"
                spellcheck="false"
                placeholder="tu@correo.com"
                class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <!-- Modalidad de Pago / Garantía (3 opciones mutuamente excluyentes -> radio buttons en fieldset) -->
          <fieldset class="border border-slate-200 rounded-xl p-3.5">
            <legend class="text-xs font-bold uppercase text-slate-600 px-1">
              Modalidad de Pago o Garantía
            </legend>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
              <div class="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                <input
                  id="pay-reception"
                  v-model="bookingForm.paymentMethod"
                  type="radio"
                  name="paymentMethod"
                  value="PAGO_RECEPCION"
                  class="accent-blue-600"
                />
                <label for="pay-reception" class="text-xs font-semibold text-slate-700 cursor-pointer">
                  Pago en Recepción
                </label>
              </div>
              <div class="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                <input
                  id="pay-transfer"
                  v-model="bookingForm.paymentMethod"
                  type="radio"
                  name="paymentMethod"
                  value="TRANSFERENCIA_ANTICIPO"
                  class="accent-blue-600"
                />
                <label for="pay-transfer" class="text-xs font-semibold text-slate-700 cursor-pointer">
                  Transferencia / Nequi
                </label>
              </div>
              <div class="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                <input
                  id="pay-card"
                  v-model="bookingForm.paymentMethod"
                  type="radio"
                  name="paymentMethod"
                  value="TARJETA"
                  class="accent-blue-600"
                />
                <label for="pay-card" class="text-xs font-semibold text-slate-700 cursor-pointer">
                  Tarjeta al llegar
                </label>
              </div>
            </div>
          </fieldset>

          <div v-if="bookingForm.paymentMethod === 'TRANSFERENCIA_ANTICIPO'">
            <label for="guest-payment-ref" class="block text-xs font-bold uppercase text-slate-600 mb-1">
              Referencia de Comprobante / Anticipo (Opcional)
            </label>
            <input
              id="guest-payment-ref"
              v-model="bookingForm.paymentReference"
              name="paymentReference"
              type="text"
              autocorrect="off"
              spellcheck="false"
              placeholder="Ej: Comprobante Nequi / Bancolombia #12345"
              class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
            />
          </div>

          <div>
            <label for="guest-notes" class="block text-xs font-bold uppercase text-slate-600 mb-1">
              Solicitudes Especiales / Hora estimada de llegada
            </label>
            <textarea
              id="guest-notes"
              v-model="bookingForm.notes"
              name="notes"
              rows="2"
              placeholder="Ej: Llegada a las 4:00 PM, piso alto, cuna adicional..."
              class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
            ></textarea>
          </div>

          <div class="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              @click="selectedRoomForBooking = null"
              class="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="submittingBooking"
              class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
            >
              {{ submittingBooking ? 'Enviando solicitud...' : `Solicitar Reserva (${formatCurrency(selectedRoomForBooking.estimatedTotal)})` }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

