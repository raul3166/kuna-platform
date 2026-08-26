<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'

// Interfaz 1:1 con OrganizationsController
interface Organization {
  id: string
  name: string
  slug: string
  country: string
  timezone: string
  isActive: boolean
  createdAt: string
}

// Interfaz 1:1 con BranchesController (incluye la relación anidada)
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

// Control del estado de la vista
const activeTab = ref<'organizations' | 'branches'>('organizations')
const organizations = ref<Organization[]>([])
const branches = ref<Branch[]>([])
const isLoading = ref(true)
const errorMessage = ref('')

async function loadData() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    // Consumimos ambos endpoints en paralelo para optimizar la carga
    const [orgResponse, branchResponse] = await Promise.all([
      api.get<Organization[]>('/organizations'),
      api.get<Branch[]>('/branches')
    ])

    organizations.value = orgResponse.data
    branches.value = branchResponse.data
  } catch (error: any) {
    console.error(error)
    errorMessage.value = 'Error al conectar con la base de datos de infraestructura corporativa.'
  } finally {
    isLoading.value = false
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
    <header class="mb-6">
      <h1 class="text-3xl font-bold tracking-tight text-slate-900">Estructura Corporativa</h1>
      <p class="mt-1 text-sm text-slate-500">
        Gestión unificada de empresas registradas y sucursales transaccionales operativas de KUNA.
      </p>
    </header>

    <!-- Selectores de Pestañas (Tabs) -->
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
      </nav>
    </div>

    <!-- Estado de Carga -->
    <div v-if="isLoading" class="flex h-48 items-center justify-center rounded-xl border border-slate-200 bg-white">
      <p class="text-sm font-medium text-slate-500 animate-pulse">Sincronizando catálogos de NestJS...</p>
    </div>

    <!-- Alerta de Error -->
    <div v-else-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <!-- Contenido Reactivo según Pestaña -->
    <div v-else class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

      <!-- VISTA: ORGANIZACIONES -->
      <div v-if="activeTab === 'organizations'">
        <div v-if="organizations.length === 0" class="p-8 text-center text-slate-500">
          No hay organizaciones dadas de alta en el sistema.
        </div>
        <div v-else class="overflow-x-auto">
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
                <td class="px-6 py-4">
                  <div class="font-semibold text-slate-900">{{ org.name }}</div>
                  <div class="text-xs font-mono text-slate-400 mt-0.5">{{ org.id }}</div>
                </td>
                <td class="px-6 py-4 font-mono text-xs text-slate-600">{{ org.slug }}</td>
                <td class="px-6 py-4"><span class="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">🌎 {{ org.country }}</span></td>
                <td class="px-6 py-4 text-slate-500 text-xs">{{ formatDate(org.createdAt) }}</td>
                <td class="px-6 py-4">
                  <span class="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Activa</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- VISTA: SUCURSALES (BRANCHES) -->
      <div v-if="activeTab === 'branches'">
        <div v-if="branches.length === 0" class="p-8 text-center text-slate-500">
          No hay sucursales operativas vinculadas actualmente.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th class="px-6 py-3">Código / Sucursal</th>
                <th class="px-6 py-3">Organización Vinculada</th>
                <th class="px-6 py-3">Dirección y Contacto</th>
                <th class="px-6 py-3">Zona Horaria</th>
                <th class="px-6 py-3">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="branch in branches" :key="branch.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <div class="font-semibold text-slate-900">{{ branch.name }}</div>
                  <div class="text-xs font-mono text-blue-600 font-bold mt-0.5">🆔 {{ branch.code }}</div>
                </td>
                <td class="px-6 py-4">
                  <div class="font-medium text-slate-800">{{ branch.organization?.name }}</div>
                  <div class="text-xs font-mono text-slate-400 mt-0.5">slug: {{ branch.organization?.slug }}</div>
                </td>
                <td class="px-6 py-4">
                  <div class="text-slate-700">{{ branch.address }}</div>
                  <div class="text-xs text-slate-400 mt-0.5">{{ branch.city }}, {{ branch.country }} <span v-if="branch.phoneNumber">— 📞 {{ branch.phoneNumber }}</span></div>
                </td>
                <td class="px-6 py-4 font-mono text-xs text-slate-500">{{ branch.timezone }}</td>
                <td class="px-6 py-4">
                  <span class="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Operando</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </AppLayout>
</template>
