<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

interface Worker { id: string; firstName: string; lastName?: string | null; specialty?: string | null; commissionPercentage?: number | string }
interface Block { dayOfWeek: number; enabled: boolean; startTime: string; endTime: string }
interface TimeOff { id: string; workerId: string; startAt: string; endAt: string; reason?: string | null; worker?: Worker }

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const workers = ref<Worker[]>([])
const selectedId = ref('')
const blocks = ref<Block[]>([])
const timeOffs = ref<TimeOff[]>([])
const isLoading = ref(true)
const isSaving = ref(false)
const message = ref('')
const isError = ref(false)

const toff = ref({ startAt: '', endAt: '', reason: '' })

const fullName = (w?: { firstName: string; lastName?: string | null } | null) =>
  w ? `${w.firstName} ${w.lastName ?? ''}`.trim() : ''
const selectedWorker = computed(() => workers.value.find((w) => w.id === selectedId.value))
const fmt = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

function flash(msg: string, err = false) {
  message.value = msg
  isError.value = err
  setTimeout(() => (message.value = ''), 5000)
}
const apiError = (e: any, fb: string) => {
  const m = e?.response?.data?.message
  return Array.isArray(m) ? m.join(' · ') : m || fb
}

function emptyBlocks(): Block[] {
  return DAYS.map((_, i) => ({
    dayOfWeek: i,
    enabled: i >= 1 && i <= 6,
    startTime: '09:00',
    endTime: '18:00',
  }))
}

async function loadWorkers() {
  const id = authStore.user?.organizationId || authStore.currentOrganization?.id
  if (!id) return
  try {
    const { data } = await api.get('/service-workers', { params: { organizationId: id, isActive: true } })
    workers.value = (Array.isArray(data) ? data : data?.items || []).filter((w: any) => w.isActive !== false)
    if (workers.value.length && !selectedId.value) selectedId.value = workers.value[0].id
  } catch (e: any) {
    flash(apiError(e, 'No se pudo cargar el equipo.'), true)
  } finally {
    isLoading.value = false
  }
}

async function loadWorkerData() {
  if (!selectedId.value) return
  try {
    const [sch, off] = await Promise.all([
      api.get(`/beauty/workers/${selectedId.value}/schedule`),
      api.get('/beauty/time-off', { params: { workerId: selectedId.value } }),
    ])
    const base = emptyBlocks()
    if ((sch.data as any[]).length > 0) {
      base.forEach((b) => (b.enabled = false))
      for (const s of sch.data as any[]) {
        const b = base[s.dayOfWeek]
        b.enabled = s.isActive
        b.startTime = s.startTime
        b.endTime = s.endTime
      }
    }
    blocks.value = base
    timeOffs.value = off.data
  } catch (e: any) {
    flash(apiError(e, 'No se pudo cargar el horario.'), true)
  }
}

async function saveSchedule() {
  isSaving.value = true
  try {
    await api.put(`/beauty/workers/${selectedId.value}/schedule`, {
      blocks: blocks.value
        .filter((b) => b.enabled)
        .map((b) => ({ dayOfWeek: b.dayOfWeek, startTime: b.startTime, endTime: b.endTime })),
    })
    flash('Horario guardado.')
    await loadWorkerData()
  } catch (e: any) {
    flash(apiError(e, 'No se pudo guardar el horario.'), true)
  } finally {
    isSaving.value = false
  }
}

async function addTimeOff() {
  if (!toff.value.startAt || !toff.value.endAt) {
    flash('Indica inicio y fin de la ausencia.', true)
    return
  }
  try {
    await api.post('/beauty/time-off', {
      workerId: selectedId.value,
      startAt: new Date(toff.value.startAt).toISOString(),
      endAt: new Date(toff.value.endAt).toISOString(),
      reason: toff.value.reason || undefined,
    })
    toff.value = { startAt: '', endAt: '', reason: '' }
    flash('Ausencia registrada.')
    await loadWorkerData()
  } catch (e: any) {
    flash(apiError(e, 'No se pudo registrar la ausencia.'), true)
  }
}

async function removeTimeOff(id: string) {
  if (!window.confirm('¿Eliminar esta ausencia?')) return
  try {
    await api.delete(`/beauty/time-off/${id}`)
    await loadWorkerData()
  } catch (e: any) {
    flash(apiError(e, 'No se pudo eliminar.'), true)
  }
}

onMounted(async () => {
  await loadWorkers()
  await loadWorkerData()
})
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-3xl">👥</span>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight">Equipo y Horarios</h1>
          </div>
          <p class="text-xs text-slate-500 mt-1">
            Define la jornada semanal y ausencias de cada profesional. La agenda solo ofrece huecos dentro de estos horarios.
            El alta de profesionales y sus comisiones se gestiona en <router-link to="/service-workers" class="text-pink-600 font-bold underline">Técnicos / Personal</router-link>.
          </p>
        </div>
        <router-link to="/beauty-agenda" class="px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 self-start">← Agenda</router-link>
      </header>

      <div v-if="message" :class="['p-3 rounded-xl border text-xs font-bold', isError ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-green-50 border-green-200 text-green-800']">{{ message }}</div>

      <div v-if="isLoading" class="text-center py-12 text-sm text-slate-400 font-bold">Cargando…</div>
      <div v-else-if="workers.length === 0" class="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center text-sm font-bold text-slate-600">
        No hay profesionales registrados. Crea el personal en Técnicos / Personal.
      </div>

      <div v-else class="grid lg:grid-cols-[260px_1fr] gap-4">
        <aside class="bg-white border border-slate-200 rounded-2xl p-2 space-y-1 h-fit">
          <button
            v-for="w in workers" :key="w.id"
            @click="selectedId = w.id; loadWorkerData()"
            :class="['w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition', selectedId === w.id ? 'bg-pink-50 text-pink-700 border border-pink-200' : 'text-slate-700 hover:bg-slate-50']"
          >
            {{ fullName(w) }}
            <span v-if="w.specialty" class="block text-[11px] font-medium text-slate-500">{{ w.specialty }}</span>
          </button>
        </aside>

        <div class="space-y-4">
          <section class="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-black text-slate-900">Jornada semanal · {{ fullName(selectedWorker) }}</h2>
              <button @click="saveSchedule" :disabled="isSaving" class="px-4 py-2 rounded-xl text-xs font-black bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-50">
                {{ isSaving ? 'Guardando…' : 'Guardar horario' }}
              </button>
            </div>
            <p class="text-[11px] text-slate-500">Sin días activos, el profesional usa el horario general de la agenda.</p>

            <div v-for="b in blocks" :key="b.dayOfWeek" class="flex items-center gap-3 border border-slate-100 rounded-xl px-3 py-2">
              <label class="flex items-center gap-2 w-36 text-xs font-bold text-slate-700">
                <input v-model="b.enabled" type="checkbox" /> {{ DAYS[b.dayOfWeek] }}
              </label>
              <input v-model="b.startTime" :disabled="!b.enabled" type="time" class="border border-slate-300 rounded-lg p-1.5 text-xs disabled:bg-slate-50 disabled:text-slate-300" />
              <span class="text-xs text-slate-400">a</span>
              <input v-model="b.endTime" :disabled="!b.enabled" type="time" class="border border-slate-300 rounded-lg p-1.5 text-xs disabled:bg-slate-50 disabled:text-slate-300" />
            </div>
          </section>

          <section class="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <h2 class="text-sm font-black text-slate-900">Ausencias (vacaciones, permisos, incapacidades)</h2>
            <div class="grid md:grid-cols-[1fr_1fr_1.2fr_auto] gap-2 items-end">
              <label class="text-[11px] font-bold text-slate-600">Desde
                <input v-model="toff.startAt" type="datetime-local" class="mt-1 w-full border border-slate-300 rounded-lg p-1.5 text-xs" />
              </label>
              <label class="text-[11px] font-bold text-slate-600">Hasta
                <input v-model="toff.endAt" type="datetime-local" class="mt-1 w-full border border-slate-300 rounded-lg p-1.5 text-xs" />
              </label>
              <label class="text-[11px] font-bold text-slate-600">Motivo
                <input v-model="toff.reason" type="text" placeholder="Opcional" class="mt-1 w-full border border-slate-300 rounded-lg p-1.5 text-xs" />
              </label>
              <button @click="addTimeOff" class="px-3 py-2 rounded-xl text-xs font-black bg-slate-900 text-white hover:bg-slate-700">Agregar</button>
            </div>

            <p v-if="timeOffs.length === 0" class="text-xs text-slate-400">Sin ausencias registradas.</p>
            <ul v-else class="divide-y divide-slate-100">
              <li v-for="t in timeOffs" :key="t.id" class="flex items-center justify-between py-2 text-xs">
                <span class="text-slate-700"><b>{{ fmt(t.startAt) }}</b> → <b>{{ fmt(t.endAt) }}</b><span v-if="t.reason" class="text-slate-500"> · {{ t.reason }}</span></span>
                <button @click="removeTimeOff(t.id)" class="text-rose-600 font-bold hover:underline">Eliminar</button>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

