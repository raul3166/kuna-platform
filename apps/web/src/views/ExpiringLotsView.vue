<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

interface ExpiringLot {
  id: string
  lotNumber: string
  expirationDate: string
  stock: number | string
  branchId: string
  product?: {
    id: string
    sku: string
    name: string
    pharmaDetail?: {
      activeIngredient?: string
      laboratory?: string
      invimaCode?: string
      concentration?: string
      requiresPrescription?: boolean
    } | null
  } | null
}

const expiringLots = ref<ExpiringLot[]>([])
const daysThreshold = ref<number>(60)
const isLoading = ref(true)
const errorMessage = ref('')

async function loadExpiringLots() {
  isLoading.value = true
  errorMessage.value = ''

  const branchId = authStore.user?.organizationId

  if (!branchId) {
    errorMessage.value = 'No se encontró la sucursal o organización activa.'
    isLoading.value = false
    return
  }

  try {
    const response = await api.get<ExpiringLot[]>(
      `/product-lots/expiring/${branchId}?days=${daysThreshold.value}`
    )
    expiringLots.value = response.data || []
  } catch (error: any) {
    console.error('Error al cargar lotes próximos a vencer:', error)
    errorMessage.value = 'No fue posible obtener el reporte de caducidades.'
  } finally {
    isLoading.value = false
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-CO')
}

function formatStock(value: number | string) {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(num || 0)
}

onMounted(() => {
  loadExpiringLots()
})
</script>

<template>
  <AppLayout>
    <div class="p-6 space-y-6 max-w-[1400px] mx-auto">

      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">
            Control de Lotes y Vencimientos (FEFO)
          </h1>
          <p class="text-sm text-slate-500">
            Monitoreo estricto de caducidades para rotación de inventario farmacéutico.
          </p>
        </div>

        <div class="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <span class="text-xs font-semibold text-slate-600">
            Umbral de Alerta:
          </span>
          <select
            v-model="daysThreshold"
            @change="loadExpiringLots"
            class="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option :value="30">30 días</option>
            <option :value="60">60 días</option>
            <option :value="90">90 días</option>
            <option :value="180">180 días</option>
          </select>
        </div>
      </div>

      <!-- Mensaje de Error -->
      <div
        v-if="errorMessage"
        class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm"
      >
        {{ errorMessage }}
      </div>

      <!-- Tabla de Vencimientos -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
              <tr>
                <th class="px-4 py-3">Medicamento / Producto</th>
                <th class="px-4 py-3">Número de Lote</th>
                <th class="px-4 py-3">Fecha de Vencimiento</th>
                <th class="px-4 py-3 text-right">Stock Disponible</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="isLoading">
                <td colspan="4" class="py-8 text-center text-slate-400">
                  Cargando lotes próximos a vencer...
                </td>
              </tr>
              <tr v-else-if="expiringLots.length === 0">
                <td colspan="4" class="py-8 text-center text-slate-400">
                  No hay lotes próximos a vencer en los próximos {{ daysThreshold }} días.
                </td>
              </tr>
              <tr
                v-for="lot in expiringLots"
                :key="lot.id"
                class="hover:bg-red-50/20 transition-colors"
              >
                <td class="px-4 py-3">
                  <div class="font-medium text-slate-800">
                    {{ lot.product?.name || '—' }}
                  </div>
                  <div class="text-xs text-slate-400">
                    SKU: {{ lot.product?.sku || '—' }}
                  </div>
                  <div
                    v-if="lot.product?.pharmaDetail"
                    class="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 w-fit"
                  >
                    <span>💊 {{ lot.product.pharmaDetail.activeIngredient || 'Sin principio' }}</span>
                    <span v-if="lot.product.pharmaDetail.concentration">({{ lot.product.pharmaDetail.concentration }})</span>
                    <span v-if="lot.product.pharmaDetail.laboratory">• {{ lot.product.pharmaDetail.laboratory }}</span>
                  </div>
                </td>

                <td class="px-4 py-3 font-mono text-xs font-semibold text-slate-700">
                  {{ lot.lotNumber }}
                </td>

                <td class="px-4 py-3 font-medium text-red-600">
                  {{ formatDate(lot.expirationDate) }}
                </td>

                <td class="px-4 py-3 text-right font-bold text-slate-800">
                  {{ formatStock(lot.stock) }} uds
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </AppLayout>
</template>
