<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'

// Interfaces
interface Organization {
  id: string
  name: string
  slug: string
  country: string
  timezone: string
  isActive: boolean
  createdAt: string
}

interface Branch {
  id: string
  organizationId: string
  name: string
  code: string
  address: string
  city: string
  country: string
  phoneNumber?: string | null
  timezone: string
  isActive: boolean
  createdAt: string
  organization: {
    id: string
    name: string
    slug: string
  }
}

interface BillingResolution {
  id: string
  organizationId: string
  branchId: string
  prefix: string
  resolutionNumber: string
  fromNumber: number
  toNumber: number
  currentNumber: number
  expiryDate: string
  isActive: boolean
  createdAt: string
  branch?: { name: string; code: string }
  organization?: { name: string }
}

// Estados
const activeTab = ref<'organizations' | 'branches' | 'resolutions'>('organizations')
const organizations = ref<Organization[]>([])
const branches = ref<Branch[]>([])
const resolutions = ref<BillingResolution[]>([])
const isLoading = ref(true)
const errorMessage = ref('')

// Modal y Formulario
const isModalOpen = ref(false)
const isSaving = ref(false)
const formError = ref('')
const form = ref({
  branchId: '',
  prefix: 'POS',
  resolutionNumber: '',
  fromNumber: 1,
  toNumber: 10000,
  currentNumber: 1,
  expiryDate: ''
})

async function loadData() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const [orgResponse, branchResponse, resResponse] = await Promise.all([
      api.get<Organization[]>('/organizations'),
      api.get<Branch[]>('/branches'),
      api.get<BillingResolution[]>('/billing-resolutions')
    ])

    organizations.value = orgResponse.data
    branches.value = branchResponse.data
    resolutions.value = resResponse.data
  } catch (error: any) {
    console.error(error)
    errorMessage.value = 'Error al conectar con la base de datos de infraestructura corporativa.'
  } finally {
    isLoading.value = false
  }
}

function openModal() {
  formError.value = ''
  form.value = {
    branchId: branches.value[0]?.id || '',
    prefix: 'POS',
    resolutionNumber: '',
    fromNumber: 1,
    toNumber: 10000,
    currentNumber: 1,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }
  isModalOpen.value = true
}

async function handleSaveResolution() {
  formError.value = ''
  const selectedBranch = branches.value.find(b => b.id === form.value.branchId)

  if (!selectedBranch) {
    formError.value = 'Debes seleccionar una sucursal válida.'
    return
  }

  try {
    isSaving.value = true
    await api.post('/billing-resolutions', {
      organizationId: selectedBranch.organizationId,
      branchId: form.value.branchId,
      prefix: form.value.prefix,
      resolutionNumber: form.value.resolutionNumber,
      fromNumber: Number(form.value.fromNumber),
      toNumber: Number(form.value.toNumber),
      currentNumber: Number(form.value.currentNumber),
      expiryDate: new Date(form.value.expiryDate).toISOString(),
      isActive: true
    })

    isModalOpen.value = false
    await loadData()
  } catch (error: any) {
    formError.value = error.response?.data?.message || 'Error al guardar la resolución de facturación.'
  } finally {
    isSaving.value = false
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-LA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <AppLayout>
    <!-- Encabezado -->
    <header class="mb-6 flex items-start justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-900">Estructura Corporativa</h1>
        <p class="mt-1 text-sm text-slate-500">
          Gestión unificada de empresas, sucursales y resoluciones fiscales de KUNA.
        </p>
      </div>

      <button
        v-if="activeTab === 'resolutions'"
        @click="openModal"
        class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
      >
        <span>+ Nueva Resolución</span>
      </button>
    </header>

    <!-- Pestañas -->
    <div class="mb-6 border-b border-slate-200">
      <nav class="-mb-px flex space-x-6" aria-label="Tabs">
        <button
          type="button"
          @click="activeTab = 'organizations'"
          :class="[
            activeTab === 'organizations'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700',
            'whitespace-nowrap border-b-2 px-1 pb-4 text-sm transition-colors'
          ]"
        >
          🏢 Organizaciones ({{ organizations.length }})
        </button>
        <button
          type="button"
          @click="activeTab = 'branches'"
          :class="[
            activeTab === 'branches'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700',
            'whitespace-nowrap border-b-2 px-1 pb-4 text-sm transition-colors'
          ]"
        >
          📍 Sucursales / Branches ({{ branches.length }})
        </button>
        <button
          type="button"
          @click="activeTab = 'resolutions'"
          :class="[
            activeTab === 'resolutions'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700',
            'whitespace-nowrap border-b-2 px-1 pb-4 text-sm transition-colors'
          ]"
        >
          📄 Resoluciones DIAN ({{ resolutions.length }})
        </button>
      </nav>
    </div>

    <!-- Carga / Error -->
    <div v-if="isLoading" class="flex h-48 items-center justify-center rounded-xl border border-slate-200 bg-white">
      <p class="text-sm font-medium text-slate-500 animate-pulse">Sincronizando catálogos de NestJS...</p>
    </div>
    <div v-else-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <!-- Contenido -->
    <div v-else class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <!-- ORGANIZACIONES -->
      <div v-if="activeTab === 'organizations'">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th class="px-6 py-3">Razón Social</th>
              <th class="px-6 py-3">Slug Único</th>
              <th class="px-6 py-3">País</th>
              <th class="px-6 py-3">Fecha de Creación</th>
              <th class="px-6 py-3">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="org in organizations" :key="org.id" class="hover:bg-slate-50/50 transition-colors">
              <td class="px-6 py-4 font-semibold text-slate-900">{{ org.name }}</td>
              <td class="px-6 py-4 font-mono text-xs text-slate-600">{{ org.slug }}</td>
              <td class="px-6 py-4"><span class="rounded bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">🌎 {{ org.country }}</span></td>
              <td class="px-6 py-4 text-slate-500 text-xs">{{ formatDate(org.createdAt) }}</td>
              <td class="px-6 py-4"><span class="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Activa</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- SUCURSALES -->
      <div v-if="activeTab === 'branches'">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th class="px-6 py-3">Código / Sucursal</th>
              <th class="px-6 py-3">Organización Vinculada</th>
              <th class="px-6 py-3">Dirección</th>
              <th class="px-6 py-3">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="branch in branches" :key="branch.id" class="hover:bg-slate-50/50 transition-colors">
              <td class="px-6 py-4 font-semibold text-slate-900">{{ branch.name }} <span class="block text-xs font-mono text-blue-600">🆔 {{ branch.code }}</span></td>
              <td class="px-6 py-4 text-slate-800">{{ branch.organization?.name }}</td>
              <td class="px-6 py-4 text-slate-700">{{ branch.address }}, {{ branch.city }}</td>
              <td class="px-6 py-4"><span class="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Operando</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- RESOLUCIONES DIAN -->
      <div v-if="activeTab === 'resolutions'">
        <div v-if="resolutions.length === 0" class="p-8 text-center text-slate-500">
          No hay resoluciones de facturación autorizadas.Haz clic en "+ Nueva Resolución" para agregar una.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th class="px-6 py-3">Sucursal / Org</th>
                <th class="px-6 py-3">Prefijo & N° Resolución</th>
                <th class="px-6 py-3">Rango Autorizado</th>
                <th class="px-6 py-3">Consecutivo Actual</th>
                <th class="px-6 py-3">Vencimiento</th>
                <th class="px-6 py-3">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="res in resolutions" :key="res.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <div class="font-semibold text-slate-900">{{ res.branch?.name || res.branchId }}</div>
                  <div class="text-xs text-slate-400">{{ res.organization?.name }}</div>
                </td>
                <td class="px-6 py-4">
                  <span class="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-mono font-bold text-slate-700 border border-slate-200 mr-2">{{ res.prefix }}</span>
                  <span class="font-mono text-xs text-slate-600">{{ res.resolutionNumber }}</span>
                </td>
                <td class="px-6 py-4 font-mono text-xs text-slate-600">
                  {{ res.fromNumber }} — {{ res.toNumber }}
                </td>
                <td class="px-6 py-4">
                  <span class="font-mono font-bold text-blue-600"># {{ res.currentNumber }}</span>
                </td>
                <td class="px-6 py-4 text-xs text-slate-500">
                  {{ formatDate(res.expiryDate) }}
                </td>
                <td class="px-6 py-4">
                  <span v-if="res.isActive" class="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Vigente</span>
                  <span v-else class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">Inactiva</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- MODAL CREACIÓN RESOLUCIÓN -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-100">
        <h2 class="text-lg font-bold text-slate-900 mb-1">Registrar Resolución DIAN</h2>
        <p class="text-xs text-slate-500 mb-4">Configura la numeración consecutiva autorizada para la facturación POS.</p>

        <div v-if="formError" class="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-200">
          {{ formError }}
        </div>

        <form @submit.prevent="handleSaveResolution" class="space-y-4 text-sm">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Sucursal</label>
            <select v-model="form.branchId" class="w-full rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-500 focus:outline-none" required>
              <option v-for="branch in branches" :key="branch.id" :value="branch.id">
                {{ branch.name }} ({{ branch.organization?.name }})
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Prefijo</label>
              <input v-model="form.prefix" type="text" placeholder="POS" class="w-full rounded-lg border border-slate-300 p-2.5 uppercase font-mono focus:border-blue-500 focus:outline-none" required />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">N° Resolución DIAN</label>
              <input v-model="form.resolutionNumber" type="text" placeholder="18760000001" class="w-full rounded-lg border border-slate-300 p-2.5 font-mono focus:border-blue-500 focus:outline-none" required />
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Rango Desde</label>
              <input v-model.number="form.fromNumber" type="number" min="1" class="w-full rounded-lg border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none" required />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Rango Hasta</label>
              <input v-model.number="form.toNumber" type="number" min="1" class="w-full rounded-lg border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none" required />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Consecutivo Inicial</label>
              <input v-model.number="form.currentNumber" type="number" min="1" class="w-full rounded-lg border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none" required />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Fecha de Expiración</label>
            <input v-model="form.expiryDate" type="date" class="w-full rounded-lg border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none" required />
          </div>

          <div class="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" @click="isModalOpen = false" class="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
              Cancelar
            </button>
            <button type="submit" :disabled="isSaving" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
              {{ isSaving ? 'Guardando...' : 'Guardar Resolución' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>
