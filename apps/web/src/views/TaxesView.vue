<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

export interface TaxRule {
  id: string
  name: string
  code: string
  type: 'VAT' | 'CONSUMPTION' | 'WITHHOLDING'
  percentage: number | string
  isRetention: boolean
  isActive: boolean
}

interface CreateTaxPayload {
  name: string
  code: string
  type: 'VAT' | 'CONSUMPTION' | 'WITHHOLDING'
  percentage: number
  isRetention: boolean
  organizationId: string
}

const taxRules = ref<TaxRule[]>([])
const isLoading = ref(true)
const errorMessage = ref('')
const isModalOpen = ref(false)
const isSubmitting = ref(false)

const form = ref({
  name: '',
  type: 'VAT' as 'VAT' | 'CONSUMPTION' | 'WITHHOLDING',
  percentage: 19,
  isRetention: false
})

const taxTypeLabels: Record<string, string> = {
  VAT: 'IVA',
  CONSUMPTION: 'INC',
  WITHHOLDING: 'RETENCIÓN'
}

async function loadTaxRules() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const response = await api.get<TaxRule[]>('/taxes')
    taxRules.value = response.data
  } catch (error: any) {
    console.error(error)
    errorMessage.value = 'No se pudieron cargar las reglas de impuestos.'
  } finally {
    isLoading.value = false
  }
}

function openModal() {
  form.value = {
    name: '',
    type: 'VAT',
    percentage: 19,
    isRetention: false
  }
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
}

async function handleCreateTaxRule() {
  if (!form.value.name || form.value.percentage < 0) return

  // Obtener el ID dinámicamente desde el Auth Store de Pinia
  const organizationId = authStore.user?.organizationId

  if (!organizationId) {
    alert('No se identificó una organización válida en la sesión actual.')
    return
  }

  isSubmitting.value = true
  const generatedCode = form.value.name.trim().toUpperCase().replace(/\s+/g, '_')

  const payload: CreateTaxPayload = {
    name: form.value.name,
    code: generatedCode,
    type: form.value.type,
    percentage: Number(form.value.percentage),
    isRetention: form.value.isRetention,
    organizationId
  }

  try {
    await api.post('/taxes', payload)
    closeModal()
    await loadTaxRules()
  } catch (error: any) {
    console.error(error)
    const msg = Array.isArray(error.response?.data?.message)
      ? error.response.data.message.join(', ')
      : error.response?.data?.message
    alert(msg || 'Error al guardar la regla de impuesto')
  } finally {
    isSubmitting.value = false
  }
}

function formatPercentage(value: number | string) {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return `${num.toFixed(2)}%`
}

onMounted(() => {
  loadTaxRules()
})
</script>

<template>
  <AppLayout>
    <header class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-900">Motor de Impuestos</h1>
        <p class="mt-1 text-sm text-slate-500">
          Configuración de reglas fiscales Latam (IVA, INC, Retenciones) aplicables a productos y servicios.
        </p>
      </div>
      <button
        type="button"
        @click="openModal"
        class="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
      >
        ➕ Nueva Regla Fiscal
      </button>
    </header>

    <div v-if="isLoading" class="flex h-48 items-center justify-center rounded-xl border border-slate-200 bg-white">
      <p class="text-sm font-medium text-slate-500 animate-pulse">Sincronizando reglas fiscales con el backend...</p>
    </div>

    <div v-else-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <div v-else class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div v-if="taxRules.length === 0" class="p-8 text-center text-slate-500">
        No hay reglas fiscales registradas para esta organización.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th class="px-6 py-3">Nombre</th>
              <th class="px-6 py-3">Tipo</th>
              <th class="px-6 py-3 text-right">Tarifa (%)</th>
              <th class="px-6 py-3 text-center">Naturaleza</th>
              <th class="px-6 py-3 text-center">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="rule in taxRules" :key="rule.id" class="hover:bg-slate-50/50 transition-colors">
              <td class="px-6 py-4 font-semibold text-slate-900">{{ rule.name }}</td>
              <td class="px-6 py-4">
                <span class="inline-block font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {{ taxTypeLabels[rule.type] || rule.type }}
                </span>
              </td>
              <td class="px-6 py-4 text-right font-mono font-bold text-slate-950">
                {{ formatPercentage(rule.percentage) }}
              </td>
              <td class="px-6 py-4 text-center">
                <span
                  :class="[
                    rule.isRetention
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200',
                    'inline-block px-2.5 py-0.5 rounded font-mono text-xs font-bold border'
                  ]"
                >
                  {{ rule.isRetention ? 'Retención (-)' : 'Impuesto Generado (+)' }}
                </span>
              </td>
              <td class="px-6 py-4 text-center">
                <span
                  :class="[
                    rule.isActive
                      ? 'bg-green-50 text-green-700 ring-green-600/20'
                      : 'bg-slate-50 text-slate-600 ring-slate-500/10',
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset'
                  ]"
                >
                  {{ rule.isActive ? 'Activa' : 'Inactiva' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Formulario Creación -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 class="text-xl font-bold text-slate-900 mb-4">Nueva Regla de Impuesto</h2>

        <form @submit.prevent="handleCreateTaxRule" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">Nombre</label>
            <input
              v-model="form.name"
              type="text"
              required
              placeholder="Ej. IVA General 19%"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">Tipo Fiscal</label>
              <select
                v-model="form.type"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white"
              >
                <option value="VAT">IVA</option>
                <option value="CONSUMPTION">INC (Consumo)</option>
                <option value="WITHHOLDING">Retención</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">Tarifa (%)</label>
              <input
                v-model.number="form.percentage"
                type="number"
                step="0.01"
                min="0"
                required
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div class="flex items-center space-x-2 pt-1">
            <input
              id="isRetention"
              v-model="form.isRetention"
              type="checkbox"
              class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label for="isRetention" class="text-sm font-medium text-slate-700">
              Es una retención en la fuente (Descuento)
            </label>
          </div>

          <div class="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              @click="closeModal"
              class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {{ isSubmitting ? 'Guardando...' : 'Guardar Regla' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>
