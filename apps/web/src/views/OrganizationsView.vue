<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'
import { useVerticalsStore } from '../stores/verticals'

const authStore = useAuthStore()
const verticalsStore = useVerticalsStore()

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
const activeTab = ref<'organizations' | 'branches' | 'resolutions' | 'verticals'>('organizations')
const organizations = ref<Organization[]>([])
const branches = ref<Branch[]>([])
const resolutions = ref<BillingResolution[]>([])
const isLoading = ref(true)
const errorMessage = ref('')

// Estados de Verticales
const selectedOrgForVerticals = ref<string>('')
const togglingCode = ref<string | null>(null)

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

    if (organizations.value.length > 0 && !selectedOrgForVerticals.value) {
      selectedOrgForVerticals.value = authStore.currentOrganization?.id || organizations.value[0].id
      verticalsStore.loadOrganizationVerticals(selectedOrgForVerticals.value)
    }
  } catch (error: any) {
    console.error(error)
    errorMessage.value = 'Error al conectar con la base de datos de infraestructura corporativa.'
  } finally {
    isLoading.value = false
  }
}

watch(selectedOrgForVerticals, (newOrgId) => {
  if (newOrgId) {
    verticalsStore.loadOrganizationVerticals(newOrgId, true)
  }
})

async function handleToggleVertical(verticalCode: string, currentActive: boolean) {
  if (!selectedOrgForVerticals.value) return
  togglingCode.value = verticalCode
  try {
    await verticalsStore.toggleVertical(selectedOrgForVerticals.value, verticalCode, !currentActive)
  } catch (error: any) {
    alert(error.response?.data?.message || 'Error al actualizar el estado del vertical.')
  } finally {
    togglingCode.value = null
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
        <button
          type="button"
          @click="activeTab = 'verticals'"
          :class="[
            activeTab === 'verticals'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700',
            'whitespace-nowrap border-b-2 px-1 pb-4 text-sm transition-colors'
          ]"
        >
          🧩 Verticales de Negocio ({{ verticalsStore.verticals.length }})
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

      <!-- VERTICALES DE NEGOCIO -->
      <div v-if="activeTab === 'verticals'" class="p-6">
        <!-- Selector de Organización y Explicación -->
        <div class="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <h3 class="text-base font-bold text-slate-900">Activar o Desactivar Tipos de Negocio</h3>
            <p class="text-xs text-slate-500 mt-0.5">
              KUNA adaptará dinámicamente el menú lateral, permisos y rutas según los verticales activados para esta empresa.
            </p>
          </div>

          <div class="flex items-center gap-3">
            <label class="text-xs font-semibold text-slate-700 whitespace-nowrap">Empresa seleccionada:</label>
            <select
              v-model="selectedOrgForVerticals"
              class="rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm font-semibold text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none"
            >
              <option v-for="org in organizations" :key="org.id" :value="org.id">
                🏢 {{ org.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Indicador de carga -->
        <div v-if="verticalsStore.isLoading" class="p-12 text-center text-sm font-medium text-slate-500 animate-pulse">
          Cargando configuración de verticales...
        </div>

        <!-- Grid de Verticales -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="vert in verticalsStore.verticals"
            :key="vert.id"
            class="flex flex-col justify-between rounded-xl border p-5 transition-all shadow-sm"
            :class="[
              vert.isActiveForOrg
                ? 'border-blue-200 bg-gradient-to-br from-blue-50/40 via-white to-white'
                : 'border-slate-200 bg-slate-50/40 opacity-75'
            ]"
          >
            <div>
              <!-- Header de la tarjeta -->
              <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-2.5">
                  <span
                    class="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
                    :class="vert.isActiveForOrg ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'"
                  >
                    {{ vert.icon === 'shopping-bag' ? '🛍️' :
                       vert.icon === 'utensils' ? '🍽️' :
                       vert.icon === 'pill' ? '💊' :
                       vert.icon === 'dumbbell' ? '🏋️' :
                       vert.icon === 'heart' ? '🧘' :
                       vert.icon === 'wrench' ? '🔧' :
                       vert.icon === 'bed' ? '🛏️' :
                       vert.icon === 'car' ? '🚗' :
                       vert.icon === 'scissors' ? '✂️' :
                       vert.icon === 'paw' ? '🐾' :
                       vert.icon === 'shirt' ? '👔' :
                       vert.icon === 'cake' ? '🍰' :
                       vert.icon === 'graduation-cap' ? '🎓' :
                       vert.icon === 'building' ? '🏢' : '📦' }}
                  </span>
                  <div>
                    <h4 class="font-bold text-sm text-slate-900">{{ vert.name }}</h4>
                    <span
                      class="font-mono text-[10px] tracking-wider uppercase px-1.5 py-0.5 rounded"
                      :class="vert.isActiveForOrg ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-slate-200 text-slate-600'"
                    >
                      {{ vert.code }}
                    </span>
                  </div>
                </div>

                <span
                  class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  :class="vert.isActiveForOrg ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'"
                >
                  {{ vert.isActiveForOrg ? 'Activo' : 'Inactivo' }}
                </span>
              </div>

              <!-- Descripción -->
              <p class="text-xs text-slate-600 mt-2 mb-4 leading-relaxed">
                {{ vert.description || 'Módulo especializado para la operación de este tipo de negocio.' }}
              </p>
            </div>

            <!-- Footer / Botón de Acción -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span class="text-[11px] text-slate-400">
                {{ vert.isActiveForOrg ? 'Visible en menú' : 'Oculto en menú' }}
              </span>

              <button
                type="button"
                @click="handleToggleVertical(vert.code, vert.isActiveForOrg)"
                :disabled="togglingCode === vert.code"
                class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
                :class="[
                  vert.isActiveForOrg
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                ]"
              >
                <span v-if="togglingCode === vert.code" class="inline-block animate-spin">⏳</span>
                <span>{{ vert.isActiveForOrg ? 'Desactivar' : 'Activar Vertical' }}</span>
              </button>
            </div>
          </div>
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
