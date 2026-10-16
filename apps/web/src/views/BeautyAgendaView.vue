<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

interface Customer { id: string; firstName: string; lastName?: string | null }
interface Worker { id: string; firstName: string; lastName?: string | null; specialty?: string | null }
interface ServiceItem { id: string; name: string; basePrice: number | string; estimatedMinutes: number; category?: string | null }
interface ApptItem { id: string; price: number | string; serviceItem: { name: string } }
interface Appointment {
  id: string
  appointmentNumber: string
  startAt: string
  endAt: string
  status: string
  totalEstimated: number | string
  notes?: string | null
  customerId: string
  workerId?: string | null
  customer: Customer
  worker?: Worker | null
  items: ApptItem[]
  serviceOrder?: { id: string; status: string; saleId?: string | null } | null
}
interface Dashboard {
  kpis: {
    total: number; scheduled: number; confirmed: number; inService: number
    completed: number; cancelled: number; noShow: number
    projectedRevenue: number; realizedRevenue: number
  }
}

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const selectedDate = ref(todayStr())
const appointments = ref<Appointment[]>([])
const dashboard = ref<Dashboard | null>(null)
const workers = ref<Worker[]>([])
const customers = ref<Customer[]>([])
const services = ref<ServiceItem[]>([])
const isLoading = ref(true)
const busyId = ref<string | null>(null)
const errorMessage = ref('')
const successMessage = ref('')

const orgId = () => authStore.user?.organizationId || authStore.currentOrganization?.id

function flash(kind: 'ok' | 'err', msg: string) {
  if (kind === 'ok') { successMessage.value = msg; errorMessage.value = '' }
  else { errorMessage.value = msg; successMessage.value = '' }
  setTimeout(() => { successMessage.value = ''; errorMessage.value = '' }, 5000)
}

function apiError(e: any, fallback: string) {
  const m = e?.response?.data?.message
  return Array.isArray(m) ? m.join(' · ') : m || fallback
}

async function loadAgenda() {
  isLoading.value = true
  try {
    const [list, dash] = await Promise.all([
      api.get<Appointment[]>('/beauty/appointments', {
        params: { from: selectedDate.value, to: selectedDate.value },
      }),
      api.get<Dashboard>('/beauty/dashboard', { params: { date: selectedDate.value } }),
    ])
    appointments.value = list.data
    dashboard.value = dash.data
  } catch (e: any) {
    flash('err', apiError(e, 'No se pudo cargar la agenda.'))
  } finally {
    isLoading.value = false
  }
}

async function loadCatalogs() {
  const id = orgId()
  if (!id) return
  try {
    const [w, c, s] = await Promise.all([
      api.get('/service-workers', { params: { organizationId: id, isActive: true } }),
      api.get('/customers', { params: { organizationId: id } }),
      api.get('/service-items', { params: { organizationId: id } }),
    ])
    workers.value = (Array.isArray(w.data) ? w.data : w.data?.items || []).filter((x: any) => x.isActive !== false)
    customers.value = Array.isArray(c.data) ? c.data : c.data?.items || []
    services.value = (Array.isArray(s.data) ? s.data : s.data?.items || []).filter((x: any) => x.isActive !== false)
  } catch (e: any) {
    flash('err', apiError(e, 'No se pudieron cargar los catálogos.'))
  }
}

function shiftDay(delta: number) {
  const [y, m, d] = selectedDate.value.split('-').map(Number)
  const dt = new Date(y, m - 1, d + delta)
  selectedDate.value = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

watch(selectedDate, loadAgenda)

// ---------------- Presentación ----------------
const money = (v: number | string) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v || 0))
const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
const fullName = (p?: { firstName: string; lastName?: string | null } | null) =>
  p ? `${p.firstName} ${p.lastName ?? ''}`.trim() : 'Sin asignar'

const STATUS: Record<string, { label: string; cls: string }> = {
  SCHEDULED: { label: 'Agendada', cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  CONFIRMED: { label: 'Confirmada', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  IN_SERVICE: { label: 'En servicio', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  COMPLETED: { label: 'Finalizada', cls: 'bg-green-50 text-green-700 border-green-200' },
  CANCELLED: { label: 'Cancelada', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  NO_SHOW: { label: 'No asistió', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
}

// Columnas por profesional
const columns = computed(() => {
  const map = new Map<string, { key: string; name: string; items: Appointment[] }>()
  for (const a of appointments.value) {
    const key = a.workerId || 'none'
    if (!map.has(key)) map.set(key, { key, name: fullName(a.worker), items: [] })
    map.get(key)!.items.push(a)
  }
  return Array.from(map.values())
})

// ---------------- Acciones de estado ----------------
async function run(id: string, fn: () => Promise<any>, okMsg: string) {
  busyId.value = id
  try {
    await fn()
    flash('ok', okMsg)
    await loadAgenda()
  } catch (e: any) {
    flash('err', apiError(e, 'La operación falló.'))
  } finally {
    busyId.value = null
  }
}

const confirmAppt = (a: Appointment) =>
  run(a.id, () => api.patch(`/beauty/appointments/${a.id}/status`, { status: 'CONFIRMED' }), 'Cita confirmada.')
const startAppt = (a: Appointment) =>
  run(a.id, () => api.post(`/beauty/appointments/${a.id}/start`), 'Servicio iniciado. Se generó la orden de servicio.')
const completeAppt = (a: Appointment) =>
  run(a.id, () => api.post(`/beauty/appointments/${a.id}/complete`), 'Servicio finalizado. Ya puede cobrarse en el POS.')
const noShowAppt = (a: Appointment) =>
  run(a.id, () => api.patch(`/beauty/appointments/${a.id}/status`, { status: 'NO_SHOW' }), 'Marcada como no asistió.')

function cancelAppt(a: Appointment) {
  const reason = window.prompt('Motivo de la cancelación (opcional):')
  if (reason === null) return
  run(a.id, () => api.patch(`/beauty/appointments/${a.id}/status`, { status: 'CANCELLED', reason: reason || undefined }), 'Cita cancelada.')
}

function goToPos(a: Appointment) {
  if (!a.serviceOrder) return
  router.push({ path: '/pos', query: { serviceOrderId: a.serviceOrder.id, customerId: a.customerId } })
}

// ---------------- Modal: nueva cita ----------------
const isModalOpen = ref(false)
const isSaving = ref(false)
const form = ref({
  customerId: '',
  workerId: '',
  date: todayStr(),
  time: '',
  notes: '',
  serviceIds: [] as string[],
})
const slots = ref<{ start: string; end: string }[]>([])
const isLoadingSlots = ref(false)

const selectedServices = computed(() => services.value.filter((s) => form.value.serviceIds.includes(s.id)))
const totalMinutes = computed(() => selectedServices.value.reduce((a, s) => a + (s.estimatedMinutes || 30), 0))
const totalPrice = computed(() => selectedServices.value.reduce((a, s) => a + Number(s.basePrice || 0), 0))

function openModal() {
  form.value = { customerId: '', workerId: '', date: selectedDate.value, time: '', notes: '', serviceIds: [] }
  slots.value = []
  isModalOpen.value = true
}

async function loadSlots() {
  slots.value = []
  form.value.time = ''
  if (!form.value.workerId || !form.value.date || totalMinutes.value <= 0) return
  isLoadingSlots.value = true
  try {
    const { data } = await api.get('/beauty/availability', {
      params: { workerId: form.value.workerId, date: form.value.date, durationMinutes: totalMinutes.value },
    })
    slots.value = data.slots || []
  } catch (e: any) {
    flash('err', apiError(e, 'No se pudo consultar la disponibilidad.'))
  } finally {
    isLoadingSlots.value = false
  }
}

watch(() => [form.value.workerId, form.value.date, totalMinutes.value], loadSlots)

async function saveAppointment() {
  const f = form.value
  if (!f.customerId || !f.date || !f.time || f.serviceIds.length === 0) {
    flash('err', 'Cliente, servicios, fecha y hora son obligatorios.')
    return
  }
  isSaving.value = true
  try {
    await api.post('/beauty/appointments', {
      customerId: f.customerId,
      workerId: f.workerId || undefined,
      startAt: new Date(`${f.date}T${f.time}:00`).toISOString(),
      notes: f.notes || undefined,
      items: f.serviceIds.map((serviceItemId) => ({ serviceItemId })),
    })
    isModalOpen.value = false
    flash('ok', 'Cita agendada.')
    selectedDate.value = f.date
    await loadAgenda()
  } catch (e: any) {
    flash('err', apiError(e, 'No se pudo agendar la cita.'))
  } finally {
    isSaving.value = false
  }
}

// ---------------- Modal: reprogramar ----------------
const reschedule = ref<{ appt: Appointment; date: string; time: string; workerId: string } | null>(null)

function openReschedule(a: Appointment) {
  const d = new Date(a.startAt)
  reschedule.value = {
    appt: a,
    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    time: hhmm(a.startAt),
    workerId: a.workerId || '',
  }
}

async function saveReschedule() {
  const r = reschedule.value
  if (!r) return
  await run(
    r.appt.id,
    () =>
      api.patch(`/beauty/appointments/${r.appt.id}/reschedule`, {
        startAt: new Date(`${r.date}T${r.time}:00`).toISOString(),
        workerId: r.workerId || undefined,
      }),
    'Cita reprogramada.',
  )
  reschedule.value = null
}

onMounted(async () => {
  await loadCatalogs()
  await loadAgenda()
})
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-3xl">💇</span>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight">Agenda de Belleza</h1>
          </div>
          <p class="text-xs text-slate-500 mt-1">
            Citas por profesional, control de servicio y cobro integrado con el POS.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button @click="shiftDay(-1)" class="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50">←</button>
          <input v-model="selectedDate" type="date" class="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold" />
          <button @click="shiftDay(1)" class="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50">→</button>
          <button @click="selectedDate = todayStr()" class="px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200">Hoy</button>
          <router-link to="/beauty-staff" class="px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200">👥 Equipo</router-link>
          <router-link to="/beauty-clients" class="px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200">📒 Clientes</router-link>
          <button @click="openModal" class="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-black shadow-md">＋ Nueva cita</button>
        </div>
      </header>

      <div v-if="successMessage" class="p-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs font-bold">{{ successMessage }}</div>
      <div v-if="errorMessage" class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">{{ errorMessage }}</div>

      <!-- KPIs -->
      <section v-if="dashboard" class="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div class="bg-white border border-slate-200 rounded-2xl p-4">
          <p class="text-[10px] font-black uppercase text-slate-400">Citas del día</p>
          <p class="text-2xl font-black text-slate-900">{{ dashboard.kpis.total }}</p>
        </div>
        <div class="bg-white border border-slate-200 rounded-2xl p-4">
          <p class="text-[10px] font-black uppercase text-slate-400">Por atender</p>
          <p class="text-2xl font-black text-blue-600">{{ dashboard.kpis.scheduled + dashboard.kpis.confirmed }}</p>
        </div>
        <div class="bg-white border border-slate-200 rounded-2xl p-4">
          <p class="text-[10px] font-black uppercase text-slate-400">En servicio</p>
          <p class="text-2xl font-black text-amber-600">{{ dashboard.kpis.inService }}</p>
        </div>
        <div class="bg-white border border-slate-200 rounded-2xl p-4">
          <p class="text-[10px] font-black uppercase text-slate-400">Finalizadas</p>
          <p class="text-2xl font-black text-green-600">{{ dashboard.kpis.completed }}</p>
        </div>
        <div class="bg-white border border-slate-200 rounded-2xl p-4">
          <p class="text-[10px] font-black uppercase text-slate-400">Ingreso proyectado</p>
          <p class="text-lg font-black text-slate-900">{{ money(dashboard.kpis.projectedRevenue) }}</p>
        </div>
        <div class="bg-white border border-slate-200 rounded-2xl p-4">
          <p class="text-[10px] font-black uppercase text-slate-400">Ingreso realizado</p>
          <p class="text-lg font-black text-green-700">{{ money(dashboard.kpis.realizedRevenue) }}</p>
        </div>
      </section>

      <div v-if="isLoading" class="text-center py-12 text-sm text-slate-400 font-bold">Cargando agenda…</div>

      <div v-else-if="appointments.length === 0" class="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
        <p class="text-4xl mb-2">📅</p>
        <p class="text-sm font-bold text-slate-600">No hay citas para este día.</p>
      </div>

      <!-- Columnas por profesional -->
      <section v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div v-for="col in columns" :key="col.key" class="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3">
          <h3 class="text-sm font-black text-slate-800 px-1">
            {{ col.name }}
            <span class="text-[10px] font-black bg-slate-200 text-slate-600 rounded-full px-2 py-0.5 ml-1">{{ col.items.length }}</span>
          </h3>

          <article v-for="a in col.items" :key="a.id" class="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-2xs">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-xs font-black text-slate-900">{{ hhmm(a.startAt) }} – {{ hhmm(a.endAt) }}</p>
                <p class="text-sm font-bold text-slate-800">{{ fullName(a.customer) }}</p>
              </div>
              <span :class="['text-[10px] font-black border rounded-full px-2 py-0.5 whitespace-nowrap', STATUS[a.status]?.cls]">
                {{ STATUS[a.status]?.label || a.status }}
              </span>
            </div>

            <ul class="text-[11px] text-slate-600 space-y-0.5">
              <li v-for="i in a.items" :key="i.id" class="flex justify-between">
                <span>{{ i.serviceItem.name }}</span><span class="font-bold">{{ money(i.price) }}</span>
              </li>
            </ul>
            <p v-if="a.notes" class="text-[11px] italic text-slate-500">“{{ a.notes }}”</p>
            <p class="text-xs font-black text-slate-900 text-right">{{ money(a.totalEstimated) }}</p>

            <div class="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
              <template v-if="a.status === 'SCHEDULED' || a.status === 'CONFIRMED'">
                <button v-if="a.status === 'SCHEDULED'" :disabled="busyId === a.id" @click="confirmAppt(a)" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">Confirmar</button>
                <button :disabled="busyId === a.id" @click="startAppt(a)" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-pink-600 text-white hover:bg-pink-700">Iniciar</button>
                <button :disabled="busyId === a.id" @click="openReschedule(a)" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200">Reprogramar</button>
                <button :disabled="busyId === a.id" @click="noShowAppt(a)" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100">No asistió</button>
                <button :disabled="busyId === a.id" @click="cancelAppt(a)" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100">Cancelar</button>
              </template>
              <button v-else-if="a.status === 'IN_SERVICE'" :disabled="busyId === a.id" @click="completeAppt(a)" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-green-600 text-white hover:bg-green-700">Finalizar servicio</button>
              <template v-else-if="a.status === 'COMPLETED'">
                <span v-if="a.serviceOrder?.saleId || a.serviceOrder?.status === 'BILLED'" class="text-[11px] font-bold text-green-700">✔ Facturada</span>
                <button v-else @click="goToPos(a)" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-900 text-white hover:bg-slate-700">💳 Cobrar en POS</button>
              </template>
            </div>
          </article>
        </div>
      </section>
    </div>

    <!-- Modal nueva cita -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" @click.self="isModalOpen = false">
      <div class="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <h2 class="text-lg font-black text-slate-900">Nueva cita</h2>

        <div class="grid md:grid-cols-2 gap-3">
          <label class="text-xs font-bold text-slate-600">Cliente
            <select v-model="form.customerId" class="mt-1 w-full border border-slate-300 rounded-xl p-2 text-sm">
              <option value="" disabled>Selecciona…</option>
              <option v-for="c in customers" :key="c.id" :value="c.id">{{ fullName(c) }}</option>
            </select>
          </label>
          <label class="text-xs font-bold text-slate-600">Profesional
            <select v-model="form.workerId" class="mt-1 w-full border border-slate-300 rounded-xl p-2 text-sm">
              <option value="">Sin asignar</option>
              <option v-for="w in workers" :key="w.id" :value="w.id">{{ fullName(w) }}{{ w.specialty ? ' · ' + w.specialty : '' }}</option>
            </select>
          </label>
        </div>

        <div>
          <p class="text-xs font-bold text-slate-600 mb-1">Servicios</p>
          <div class="grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            <label v-for="s in services" :key="s.id" class="flex items-center gap-2 border border-slate-200 rounded-xl p-2 text-xs cursor-pointer hover:bg-slate-50">
              <input v-model="form.serviceIds" type="checkbox" :value="s.id" />
              <span class="flex-1 font-bold text-slate-800">{{ s.name }}</span>
              <span class="text-slate-500">{{ s.estimatedMinutes }} min · {{ money(s.basePrice) }}</span>
            </label>
          </div>
          <p v-if="selectedServices.length" class="text-xs font-black text-slate-700 mt-2">
            Total: {{ totalMinutes }} min · {{ money(totalPrice) }}
          </p>
        </div>

        <div class="grid md:grid-cols-2 gap-3">
          <label class="text-xs font-bold text-slate-600">Fecha
            <input v-model="form.date" type="date" class="mt-1 w-full border border-slate-300 rounded-xl p-2 text-sm" />
          </label>
          <label class="text-xs font-bold text-slate-600">Hora
            <input v-model="form.time" type="time" class="mt-1 w-full border border-slate-300 rounded-xl p-2 text-sm" />
          </label>
        </div>

        <div v-if="form.workerId && totalMinutes > 0">
          <p class="text-xs font-bold text-slate-600 mb-1">Horarios disponibles</p>
          <p v-if="isLoadingSlots" class="text-xs text-slate-400">Consultando…</p>
          <p v-else-if="slots.length === 0" class="text-xs text-rose-600 font-bold">Sin disponibilidad ese día para este profesional.</p>
          <div v-else class="flex flex-wrap gap-1.5">
            <button
              v-for="s in slots" :key="s.start" type="button" @click="form.time = hhmm(s.start)"
              :class="['px-2.5 py-1 rounded-lg text-[11px] font-bold border', form.time === hhmm(s.start) ? 'bg-pink-600 text-white border-pink-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50']"
            >{{ hhmm(s.start) }}</button>
          </div>
        </div>

        <label class="block text-xs font-bold text-slate-600">Notas
          <textarea v-model="form.notes" rows="2" class="mt-1 w-full border border-slate-300 rounded-xl p-2 text-sm"></textarea>
        </label>

        <div class="flex justify-end gap-2 pt-2">
          <button @click="isModalOpen = false" class="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 border border-slate-300">Cancelar</button>
          <button @click="saveAppointment" :disabled="isSaving" class="px-4 py-2 rounded-xl text-xs font-black bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-50">
            {{ isSaving ? 'Guardando…' : 'Agendar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal reprogramar -->
    <div v-if="reschedule" class="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" @click.self="reschedule = null">
      <div class="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
        <h2 class="text-lg font-black text-slate-900">Reprogramar cita</h2>
        <p class="text-xs text-slate-500">{{ fullName(reschedule.appt.customer) }} · {{ reschedule.appt.appointmentNumber }}</p>
        <div class="grid grid-cols-2 gap-3">
          <label class="text-xs font-bold text-slate-600">Fecha
            <input v-model="reschedule.date" type="date" class="mt-1 w-full border border-slate-300 rounded-xl p-2 text-sm" />
          </label>
          <label class="text-xs font-bold text-slate-600">Hora
            <input v-model="reschedule.time" type="time" class="mt-1 w-full border border-slate-300 rounded-xl p-2 text-sm" />
          </label>
        </div>
        <label class="block text-xs font-bold text-slate-600">Profesional
          <select v-model="reschedule.workerId" class="mt-1 w-full border border-slate-300 rounded-xl p-2 text-sm">
            <option value="">Sin asignar</option>
            <option v-for="w in workers" :key="w.id" :value="w.id">{{ fullName(w) }}</option>
          </select>
        </label>
        <div class="flex justify-end gap-2">
          <button @click="reschedule = null" class="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 border border-slate-300">Cancelar</button>
          <button @click="saveReschedule" class="px-4 py-2 rounded-xl text-xs font-black bg-pink-600 text-white hover:bg-pink-700">Guardar</button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

