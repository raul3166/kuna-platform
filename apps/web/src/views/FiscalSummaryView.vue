<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

interface Branch {
  id: string
  name: string
  code: string
}

interface TaxBreakdownItem {
  taxRate: number
  baseAmount: number
  taxAmount: number
  totalAmount: number
}

interface PaymentBreakdownItem {
  paymentMethod: string
  totalAmount: number
  transactionCount: number
}

interface FiscalSummaryResponse {
  summary: {
    totalTransactions: number
    totalBase: number
    totalTax: number
    totalDiscount: number
    grandTotal: number
  }
  taxBreakdown: TaxBreakdownItem[]
  paymentBreakdown: PaymentBreakdownItem[]
}

const isLoading = ref(true)
const errorMessage = ref('')
const fiscalData = ref<FiscalSummaryResponse | null>(null)

// Filtros
const branches = ref<Branch[]>([])
const selectedBranchId = ref<string>('')
const startDate = ref('')
const endDate = ref('')

function formatCurrency(val: number): string {
  return (val || 0).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

async function fetchBranches() {
  try {
    const response = await api.get<Branch[]>('/branches')
    branches.value = response.data
  } catch (error) {
    console.error('Error al cargar sucursales:', error)
  }
}

async function fetchFiscalReport() {
  if (!authStore.user?.organizationId) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    const params: Record<string, string> = {
      organizationId: authStore.user.organizationId,
    }

    const activeBranch = selectedBranchId.value || authStore.currentBranch?.id
    if (activeBranch) {
      params.branchId = activeBranch
    }

    if (startDate.value && startDate.value.trim() !== '') {
      params.startDate = startDate.value
    }
    if (endDate.value && endDate.value.trim() !== '') {
      params.endDate = endDate.value
    }

    const response = await api.get<FiscalSummaryResponse>('/analytics/fiscal-summary', { params })
    fiscalData.value = response.data
  } catch (error: any) {
    console.error(error)
    errorMessage.value = error.response?.data?.message || 'Error al cargar el reporte fiscal y de caja.'
  } finally {
    isLoading.value = false
  }
}

function exportToCSV() {
  if (!fiscalData.value) return

  let csvContent = 'data:text/csv;charset=utf-8,'
  csvContent += 'INFORME FISCAL DE IMPUESTOS Y CIERRE DE CAJA (ARQUEO Z)\n\n'

  // Sección 1: Resumen General
  csvContent += 'RESUMEN GENERAL\n'
  csvContent += 'Transacciones,Base Gravable,Descuentos,Impuestos (IVA/INC),Total Neto\n'
  const s = fiscalData.value.summary
  csvContent += `${s.totalTransactions},${s.totalBase},${s.totalDiscount},${s.totalTax},${s.grandTotal}\n\n`

  // Sección 2: Desglose Tributario
  csvContent += 'DESGLOSE DE IMPUESTOS POR TARIFA\n'
  csvContent += 'Tarifa IVA %,Base Imponible,Valor Impuesto,Total Facturado\n'
  fiscalData.value.taxBreakdown.forEach((t) => {
    csvContent += `"${t.taxRate}%",${t.baseAmount},${t.taxAmount},${t.totalAmount}\n`
  })

  // Sección 3: Recaudo por Medio de Pago
  csvContent += '\nRECAUDO POR MEDIO DE PAGO (ARQUEO Z)\n'
  csvContent += 'Medio de Pago,Transacciones,Monto Recaudado\n'
  fiscalData.value.paymentBreakdown.forEach((p) => {
    csvContent += `"${p.paymentMethod}",${p.transactionCount},${p.totalAmount}\n`
  })

  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', `reporte_fiscal_caja_${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

onMounted(async () => {
  await fetchBranches()
  if (authStore.currentBranch?.id) {
    selectedBranchId.value = authStore.currentBranch.id
  }
  fetchFiscalReport()
})
</script>

<template>
  <AppLayout>
    <header class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-900">Informe Fiscal y Cierre de Caja</h1>
        <p class="mt-1 text-sm text-slate-500">
          Consolidado tributario para contabilidad y arqueo de caja (Reporte Z) por tarifa de IVA y medio de pago.
        </p>
      </div>

      <!-- BARRA DE FILTROS -->
      <div class="flex flex-wrap items-end gap-3 bg-white p-3 border border-slate-200 rounded-xl shadow-sm">
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Sucursal</label>
          <select
            v-model="selectedBranchId"
            @change="fetchFiscalReport"
            class="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white"
          >
            <option value="">🏢 Todas las Sedes (Consolidado)</option>
            <option v-for="branch in branches" :key="branch.id" :value="branch.id">
              📍 {{ branch.name }} ({{ branch.code }})
            </option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Desde</label>
          <input
            v-model="startDate"
            type="date"
            @change="fetchFiscalReport"
            class="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Hasta</label>
          <input
            v-model="endDate"
            type="date"
            @change="fetchFiscalReport"
            class="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          @click="fetchFiscalReport"
          class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Filtrar
        </button>
        <button
          @click="exportToCSV"
          :disabled="isLoading || !fiscalData"
          class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
        >
          📥 Exportar CSV
        </button>
      </div>
    </header>

    <!-- MENSAJE DE ERROR -->
    <div
      v-if="errorMessage"
      class="mb-6 bg-red-50 text-red-700 p-4 border border-red-200 rounded-xl text-sm flex items-center justify-between"
    >
      <span>⚠️ {{ errorMessage }}</span>
      <button @click="errorMessage = ''" class="text-red-500 hover:text-red-700 font-bold">✕</button>
    </div>

    <!-- CARGA -->
    <div
      v-if="isLoading"
      class="p-12 text-center text-sm font-medium text-slate-500 animate-pulse bg-white border border-slate-200 rounded-xl shadow-sm"
    >
      Procesando informe fiscal y arqueo tributario...
    </div>

    <!-- CONTENIDO -->
    <div v-else-if="fiscalData" class="space-y-6">
      <!-- TARJETAS DE RESUMEN EJECUTIVO (KPIS FISCALES) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p class="text-xs font-semibold text-slate-500 uppercase">Base Imponible Total</p>
          <p class="text-2xl font-extrabold text-slate-900 mt-1">
            {{ formatCurrency(fiscalData.summary.totalBase) }}
          </p>
          <p class="text-xs text-slate-400 mt-1">{{ fiscalData.summary.totalTransactions }} facturas emitidas</p>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p class="text-xs font-semibold text-slate-500 uppercase">Impuestos Generados (IVA/INC)</p>
          <p class="text-2xl font-extrabold text-amber-600 mt-1">
            {{ formatCurrency(fiscalData.summary.totalTax) }}
          </p>
          <p class="text-xs text-slate-400 mt-1">Recaudado para la DIAN</p>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p class="text-xs font-semibold text-slate-500 uppercase">Descuentos Aplicados</p>
          <p class="text-2xl font-extrabold text-slate-700 mt-1">
            -{{ formatCurrency(fiscalData.summary.totalDiscount) }}
          </p>
          <p class="text-xs text-slate-400 mt-1">Deducciones en venta</p>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p class="text-xs font-semibold text-slate-500 uppercase">Total Neto Recaudado</p>
          <p class="text-2xl font-extrabold text-emerald-600 mt-1">
            {{ formatCurrency(fiscalData.summary.grandTotal) }}
          </p>
          <p class="text-xs text-slate-400 mt-1">Venta total del período</p>
        </div>
      </div>

      <!-- DESGLOSE FISCAL TRIBUTARIO -->
      <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 class="text-base font-bold text-slate-900 mb-4">Desglose Tributario de Impuestos (DIAN)</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th class="py-3 px-4">Tarifa de Impuesto</th>
                <th class="py-3 px-4 text-right">Base Imponible</th>
                <th class="py-3 px-4 text-right">Monto Impuesto</th>
                <th class="py-3 px-4 text-right">Total Facturado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="tax in fiscalData.taxBreakdown" :key="tax.taxRate" class="hover:bg-slate-50">
                <td class="py-3 px-4 font-bold text-slate-800">
                  <span
                    :class="tax.taxRate === 0 ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'"
                    class="px-2 py-0.5 rounded text-xs"
                  >
                    IVA {{ tax.taxRate }}%
                  </span>
                </td>
                <td class="py-3 px-4 text-right font-medium text-slate-700">
                  {{ formatCurrency(tax.baseAmount) }}
                </td>
                <td class="py-3 px-4 text-right font-semibold text-amber-600">
                  +{{ formatCurrency(tax.taxAmount) }}
                </td>
                <td class="py-3 px-4 text-right font-bold text-blue-600">
                  {{ formatCurrency(tax.totalAmount) }}
                </td>
              </tr>
              <tr v-if="!fiscalData.taxBreakdown.length">
                <td colspan="4" class="py-6 text-center text-slate-400">No hay transacciones registradas en este período.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ARQUEO Y CIERRE DE CAJA (MEDIOS DE PAGO) -->
      <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 class="text-base font-bold text-slate-900 mb-4">Arqueo de Cierre de Caja (Reporte Z)</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            v-for="pm in fiscalData.paymentBreakdown"
            :key="pm.paymentMethod"
            class="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold uppercase text-slate-500 tracking-wider">
                {{ pm.paymentMethod }}
              </span>
              <span class="text-xs bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                {{ pm.transactionCount }} pagos
              </span>
            </div>
            <span class="text-xl font-black text-slate-900">{{ formatCurrency(pm.totalAmount) }}</span>
          </div>
          <div v-if="!fiscalData.paymentBreakdown.length" class="col-span-3 text-sm text-slate-400 text-center py-4">
            Sin movimientos de caja registrados.
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
