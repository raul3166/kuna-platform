<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

interface Customer { id: string; firstName: string; lastName?: string | null; phoneNumber?: string | null; email?: string | null }
interface Worker { id: string; firstName: string; lastName?: string | null }
interface Note { id: string; title: string; content: string; createdAt: string; worker?: Worker | null }
interface HistAppt {
  id: string; appointmentNumber: string; startAt: string; status: string
  totalEstimated: number | string; worker?: Worker | null
  items: { id: string; serviceItem: { name: string } }[]
}
interface History {
  customer: Customer
  stats: { visits: number; noShows: number; totalSpent: number; lastVisit: string | null }
  notes: Note[]
  appointments: HistAppt[]
}

const customers = ref<Customer[]>([])
const workers = ref<Worker[]>([])
const search = ref('')
const selectedId = ref('')
const history = ref<History | null>(null)
const isLoading = ref(true)
const isLoadingHistory = ref(false)
const message = ref('')
const isError = ref(false)
const noteForm = ref({ title: '', content: '', workerId: '' })

const fullName = (p?: { firstName: string; lastName?: string | null } | null) =>
  p ? `${p.firstName} ${p.lastName ?? ''}`.trim() : ''
const money = (v: number | string) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v || 0))
const fmt = (iso: string) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

const STATUS: Record<string, string> = {
  SCHEDULED: 'Agendada', CONFIRMED: 'Confirmada', IN_SERVICE: 'En servicio',
  COMPLETED: 'Finalizada', CANCELLED: 'Cancelada', NO_SHOW: 'No asistió',
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return customers.value
  return customers.value.filter((c) =>
    `${fullName(c)} ${c.phoneNumber ?? ''} ${c.email ?? ''}`.toLowerCase().includes(q),
  )
})

function flash(msg: string, err = false) {
  message.value = msg
  isError.value = err
  setTimeout(() => (message.value = ''), 5000)
}
const apiError = (e: any, fb: string) => {
  const m = e?.response?.data?.message
  return Array.isArray(m) ? m.join(' · ') : m || fb
}

async function loadBase() {
  const id = authStore.user?.organizationId || authStore.currentOrganization?.id
  if (!id) return
  try {
    const [c, w] = await Promise.all([
      api.get('/customers', { params: { organizationId: id } }),
      api.get('/service-workers', { params: { organizationId: id, isActive: true } }),
    ])
    customers.value = Array.isArray(c.data) ? c.data : c.data?.items || []
    workers.value = (Array.isArray(w.data) ? w.data : w.data?.items || []).filter((x: any) => x.isActive !== false)
  } catch (e: any) {
    flash(apiError(e, 'No se pudo cargar la información.'), true)
  } finally {
    isLoading.value = false
  }
}

async function selectCustomer(id: string) {
  selectedId.value = id
  isLoadingHistory.value = true
  try {
    const { data } = await api.get<History>(`/beauty/customers/${id}/history`)
    history.value = data
  } catch (e: any) {
    flash(apiError(e, 'No se pudo cargar el historial.'), true)
  } finally {
    isLoadingHistory.value = false
  }
}

async function addNote() {
  if (!noteForm.value.title.trim() || !noteForm.value.content.trim()) {
    flash('Título y contenido son obligatorios.', true)
    return
  }
  try {
    await api.post('/beauty/notes', {
      customerId: selectedId.value,
      title: noteForm.value.title,
      content: noteForm.value.content,
      workerId: noteForm.value.workerId || undefined,
    })
    noteForm.value = { title: '', content: '', workerId: '' }
    await selectCustomer(selectedId.value)
    flash('Nota guardada.')
  } catch (e: any) {
    flash(apiError(e, 'No se pudo guardar la nota.'), true)
  }
}

async function removeNote(id: string) {
  if (!window.confirm('¿Eliminar esta nota?')) return
  try {
    await api.delete(`/beauty/notes/${id}`)
    await selectCustomer(selectedId.value)
  } catch (e: any) {
    flash(apiError(e, 'No se pudo eliminar.'), true)
  }
}

onMounted(loadBase)
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-3xl">📒</span>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight">Clientes y Fórmulas</h1>
          </div>
          <p class="text-xs text-slate-500 mt-1">
            Historial de visitas, gasto y notas técnicas (fórmulas de color, preferencias, alergias).
            Los datos de contacto se administran en el CRM de Clientes.
          </p>
        </div>
        <router-link to="/beauty-agenda" class="px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 self-start">← Agenda</router-link>
      </header>

      <div v-if="message" :class="['p-3 rounded-xl border text-xs font-bold', isError ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-green-50 border-green-200 text-green-800']">{{ message }}</div>

      <div v-if="isLoading" class="text-center py-12 text-sm text-slate-400 font-bold">Cargando…</div>

      <div v-else class="grid lg:grid-cols-[300px_1fr] gap-4">
        <aside class="bg-white border border-slate-200 rounded-2xl p-3 space-y-2 h-fit">
          <input v-model="search" type="text" placeholder="Buscar cliente…" class="w-full border border-slate-300 rounded-xl p-2 text-xs font-bold" />
          <div class="max-h-[60vh] overflow-y-auto space-y-1">
            <button
              v-for="c in filtered" :key="c.id" @click="selectCustomer(c.id)"
              :class="['w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition', selectedId === c.id ? 'bg-pink-50 text-pink-700 border border-pink-200' : 'text-slate-700 hover:bg-slate-50']"
            >
              {{ fullName(c) }}
              <span v-if="c.phoneNumber" class="block text-[11px] font-medium text-slate-500">{{ c.phoneNumber }}</span>
            </button>
            <p v-if="filtered.length === 0" class="text-xs text-slate-400 p-2">Sin resultados.</p>
          </div>
        </aside>

        <div v-if="!selectedId" class="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center text-sm font-bold text-slate-500">
          Selecciona un cliente para ver su historial.
        </div>
        <div v-else-if="isLoadingHistory" class="text-center py-12 text-sm text-slate-400 font-bold">Cargando historial…</div>

        <div v-else-if="history" class="space-y-4">
          <section class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div class="bg-white border border-slate-200 rounded-2xl p-4">
              <p class="text-[10px] font-black uppercase text-slate-400">Visitas</p>
              <p class="text-2xl font-black text-slate-900">{{ history.stats.visits }}</p>
            </div>
            <div class="bg-white border border-slate-200 rounded-2xl p-4">
              <p class="text-[10px] font-black uppercase text-slate-400">Gasto total</p>
              <p class="text-lg font-black text-green-700">{{ money(history.stats.totalSpent) }}</p>
            </div>
            <div class="bg-white border border-slate-200 rounded-2xl p-4">
              <p class="text-[10px] font-black uppercase text-slate-400">Última visita</p>
              <p class="text-xs font-black text-slate-900">{{ history.stats.lastVisit ? fmt(history.stats.lastVisit) : '—' }}</p>
            </div>
            <div class="bg-white border border-slate-200 rounded-2xl p-4">
              <p class="text-[10px] font-black uppercase text-slate-400">No asistió</p>
              <p class="text-2xl font-black text-orange-600">{{ history.stats.noShows }}</p>
            </div>
          </section>

          <section class="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <h2 class="text-sm font-black text-slate-900">Notas y fórmulas</h2>
            <div class="grid md:grid-cols-[1fr_1fr] gap-2">
              <input v-model="noteForm.title" type="text" placeholder="Título (ej. Fórmula de color)" class="border border-slate-300 rounded-xl p-2 text-xs" />
              <select v-model="noteForm.workerId" class="border border-slate-300 rounded-xl p-2 text-xs">
                <option value="">Profesional (opcional)</option>
                <option v-for="w in workers" :key="w.id" :value="w.id">{{ fullName(w) }}</option>
              </select>
              <textarea v-model="noteForm.content" rows="2" placeholder="Detalle: tintes, oxidante, tiempos, alergias, preferencias…" class="md:col-span-2 border border-slate-300 rounded-xl p-2 text-xs"></textarea>
            </div>
            <button @click="addNote" class="px-4 py-2 rounded-xl text-xs font-black bg-pink-600 text-white hover:bg-pink-700">Guardar nota</button>

            <p v-if="history.notes.length === 0" class="text-xs text-slate-400">Aún no hay notas.</p>
            <ul v-else class="space-y-2">
              <li v-for="n in history.notes" :key="n.id" class="border border-slate-100 rounded-xl p-3 bg-slate-50">
                <div class="flex items-start justify-between gap-2">
                  <p class="text-xs font-black text-slate-800">{{ n.title }}</p>
                  <button @click="removeNote(n.id)" class="text-[11px] text-rose-600 font-bold hover:underline">Eliminar</button>
                </div>
                <p class="text-xs text-slate-700 whitespace-pre-line mt-1">{{ n.content }}</p>
                <p class="text-[10px] text-slate-400 mt-1">{{ fmt(n.createdAt) }}<span v-if="n.worker"> · {{ fullName(n.worker) }}</span></p>
              </li>
            </ul>
          </section>

          <section class="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
            <h2 class="text-sm font-black text-slate-900">Historial de citas</h2>
            <p v-if="history.appointments.length === 0" class="text-xs text-slate-400">Sin citas.</p>
            <ul v-else class="divide-y divide-slate-100">
              <li v-for="a in history.appointments" :key="a.id" class="py-2 flex items-start justify-between gap-3 text-xs">
                <div>
                  <p class="font-bold text-slate-800">{{ fmt(a.startAt) }} · {{ a.appointmentNumber }}</p>
                  <p class="text-slate-500">{{ a.items.map((i) => i.serviceItem.name).join(', ') }}<span v-if="a.worker"> · {{ fullName(a.worker) }}</span></p>
                </div>
                <div class="text-right">
                  <p class="font-black text-slate-900">{{ money(a.totalEstimated) }}</p>
                  <p class="text-[10px] font-bold text-slate-500">{{ STATUS[a.status] || a.status }}</p>
                </div>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

