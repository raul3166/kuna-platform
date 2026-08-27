<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'

interface Branch { id: string; name: string; code: string }
interface Customer { id: string; firstName: string; lastName: string }
interface Sale {
  id: string
  saleNumber: string
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED'
  subtotal: number | string
  discount: number | string
  total: number | string
  notes?: string | null
  createdAt: string
  branch: Branch
  customer?: Customer | null
}

const sales = ref<Sale[]>([])
const isLoading = ref(true)
const errorMessage = ref('')

async function fetchSalesLedger() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const response = await api.get<Sale[]>('/sales')
    sales.value = response.data
  } catch (error: any) {
    console.error(error)
    errorMessage.value = 'No se pudo sincronizar el historial contable de facturación.'
  } finally {
    isLoading.value = false
  }
}

function getStatusBadgeClass(status: string) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
    CONFIRMED: 'bg-green-50 text-green-700 border-green-200',
    CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200'
  }
  return styles[status] || 'bg-slate-50 text-slate-700 border-slate-200'
}

function formatCurrency(value: number | string) {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(num)
}

onMounted(() => { fetchSalesLedger() })
</script>
<template>
  <AppLayout>
    <header class="mb-6">
      <h1 class="text-3xl font-bold tracking-tight text-slate-900">Historial de Ventas</h1>
      <p class="mt-1 text-sm text-slate-500">Auditoría contable de comprobantes POS, estados de cobro y registro de ingresos de KUNA.</p>
    </header>

    <div v-if="errorMessage" class="mb-4 bg-red-50 text-red-700 p-4 border border-red-200 rounded-xl text-sm">⚠️ {{ errorMessage }}</div>

    <div v-if="isLoading" class="p-8 text-center text-sm font-medium text-slate-500 animate-pulse bg-white border border-slate-200 rounded-xl">
      Consultando el libro auxiliar de ventas con NestJS...
    </div>

    <div v-else>
      <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div v-if="sales.length === 0" class="p-8 text-center text-slate-400">No hay transacciones comerciales registradas en este periodo.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th class="px-6 py-3">Código Factura</th>
                <th class="px-6 py-3">Sucursal Emisora</th>
                <th class="px-6 py-3">Cliente / Adquiriente</th>
                <th class="px-6 py-3">Fecha Emisión</th>
                <th class="px-6 py-3">Estado</th>
                <th class="px-6 py-3 text-right">Monto Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-sans">
              <tr v-for="sale in sales" :key="sale.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4 font-mono font-bold text-slate-900">🧾 {{ sale.saleNumber }}</td>
                <td class="px-6 py-4 font-semibold text-slate-700">📍 {{ sale.branch?.name }}</td>
                <td class="px-6 py-4 text-slate-800">
                  <span v-if="sale.customer">{{ sale.customer.firstName }} {{ sale.customer.lastName || '' }}</span>
                  <span v-else class="text-slate-400 italic">Venta de Mostrador</span>
                </td>
                <td class="px-6 py-4 text-xs text-slate-500">
                  {{ new Date(sale.createdAt).toLocaleString('es-CO') }}
                </td>
                <td class="px-6 py-4">
                  <span :class="[getStatusBadgeClass(sale.status), 'inline-block px-2.5 py-0.5 text-xs font-bold border rounded-md uppercase']">
                    {{ sale.status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right font-mono font-bold text-slate-950">
                  {{ formatCurrency(sale.total) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
