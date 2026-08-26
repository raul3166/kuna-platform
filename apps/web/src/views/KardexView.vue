<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'

interface Product { id: string; name: string; sku: string }

// Contrato alineado 1:1 con la respuesta real de tu NestJS
interface HistoryMovement {
  id: string
  date: string        // Sincronizado
  movementType: string
  movementName: string // Sincronizado
  reference?: string | null
  notes?: string | null
  unitCost: number
  totalCost: number
  quantity: number
  entry: number
  exit: number
  balance: number
}

interface KardexResponse {
  product: Product
  summary: {
    totalMovements: number
    currentStock: number
    kardexStock: number
    isConsistent: boolean
  }
  movements: HistoryMovement[]
}

const products = ref<Product[]>([])
const selectedProductId = ref('')
const kardexMovements = ref<HistoryMovement[]>([])
const summaryData = ref<KardexResponse['summary'] | null>(null)
const isLoadingMovements = ref(false)

async function loadProducts() {
  try {
    const response = await api.get('/products')
    products.value = response.data
  } catch (error) {
    console.error('Error al cargar productos para el Kardex:', error)
  }
}

async function fetchKardex() {
  if (!selectedProductId.value) return
  isLoadingMovements.value = true
  kardexMovements.value = []
  summaryData.value = null
  try {
    // GET a tu endpoint real de NestJS
    const response = await api.get<KardexResponse>(`/inventory-movements/product/${selectedProductId.value}`)

    // Inyectamos las propiedades mapeadas de la respuesta anidada
    kardexMovements.value = response.data.movements
    summaryData.value = response.data.summary
  } catch (error) {
    console.error('Error al consultar transacciones del producto:', error)
  } finally {
    isLoadingMovements.value = false
  }
}

function getMovementClass(type: string) {
  if (type.includes('PURCHASE') || type.includes('IN')) return 'bg-green-50 text-green-700 border-green-200'
  if (type.includes('SALE') || type.includes('OUT')) return 'bg-blue-50 text-blue-700 border-blue-200'
  return 'bg-amber-50 text-amber-700 border-amber-200'
}

watch(selectedProductId, () => { fetchKardex() })
onMounted(() => { loadProducts() })
</script>

<template>
  <AppLayout>
    <header class="mb-6">
      <h1 class="text-3xl font-bold tracking-tight text-slate-900">Kardex de Inventario</h1>
      <p class="text-sm text-slate-500">Consulta la tarjeta analítica e historial cronológico por artículo individual.</p>
    </header>

    <!-- Selector Maestro -->
    <div class="mb-6 max-w-md bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
      <label class="block text-sm font-semibold text-slate-700 mb-1">Filtrar por Artículo Maestro</label>
      <select v-model="selectedProductId" class="w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
        <option value="" disabled>Selecciona un artículo para auditar...</option>
        <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} (SKU: {{ p.sku }})</option>
      </select>
    </div>

    <!-- Banner Informativo de Consistencia Financiera -->
    <div v-if="summaryData" class="mb-6 grid gap-4 sm:grid-cols-3">
      <div class="bg-white border p-4 rounded-xl shadow-sm text-center">
        <p class="text-xs text-slate-400 font-semibold uppercase">Total Transacciones</p>
        <p class="text-xl font-bold text-slate-800 mt-1">{{ summaryData.totalMovements }}</p>
      </div>
      <div class="bg-white border p-4 rounded-xl shadow-sm text-center">
        <p class="text-xs text-slate-400 font-semibold uppercase">Stock Actual</p>
        <p class="text-xl font-bold text-blue-600 mt-1">{{ summaryData.currentStock }} uds</p>
      </div>
      <div class="bg-white border p-4 rounded-xl shadow-sm text-center">
        <p class="text-xs text-slate-400 font-semibold uppercase">Auditoría del Kardex</p>
        <span :class="[summaryData.isConsistent ? 'text-green-600 bg-green-50 border-green-200' : 'text-rose-600 bg-rose-50 border-rose-200', 'inline-block text-xs font-bold px-2 py-0.5 rounded border mt-1.5']">
          {{ summaryData.isConsistent ? '✓ Consistente' : '⚠️ Desfase en Traza' }}
        </span>
      </div>
    </div>

    <!-- Estado de Carga -->
    <div v-if="isLoadingMovements" class="text-slate-500 text-sm animate-pulse p-4">Analizando traza del Kardex...</div>

    <!-- TABLA CALIBRADA CON LA RESPUESTA REAL -->
    <div v-else-if="selectedProductId" class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div v-if="kardexMovements.length === 0" class="p-8 text-center text-slate-400">Este producto no registra movimientos de stock históricos.</div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <th class="px-6 py-3">Fecha y Hora</th>
              <th class="px-6 py-3">Concepto Operativo</th>
              <th class="px-6 py-3 text-right">Entradas</th>
              <th class="px-6 py-3 text-right">Salidas</th>
              <th class="px-6 py-3 text-right bg-slate-100/50">Saldo Final</th>
              <th class="px-6 py-3">Documento / Justificación</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-sans">
            <tr v-for="k in kardexMovements" :key="k.id" class="hover:bg-slate-50/50 transition-colors">
              <!-- Fecha calibrada a 'k.date' -->
              <td class="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                {{ new Date(k.date).toLocaleString('es-CO') }}
              </td>
              <!-- Tipo mapeado a 'k.movementName' -->
              <td class="px-6 py-4">
                <span :class="[getMovementClass(k.movementType), 'inline-block px-2.5 py-0.5 border rounded-md text-xs font-bold']">
                  {{ k.movementName }}
                </span>
              </td>
              <!-- Entradas -->
              <td class="px-6 py-4 text-right font-mono font-medium text-green-600">
                {{ k.entry > 0 ? `+${k.entry}` : '—' }}
              </td>
              <!-- Salidas -->
              <td class="px-6 py-4 text-right font-mono font-medium text-rose-600">
                {{ k.exit > 0 ? `-${k.exit}` : '—' }}
              </td>
              <!-- Saldo / Balance acumulado -->
              <td class="px-6 py-4 text-right font-mono font-bold text-slate-900 bg-slate-50/40">
                {{ k.balance }} uds
              </td>
              <!-- Referencia y Notas -->
              <td class="px-6 py-4 text-xs text-slate-600 max-w-xs">
                <div class="font-bold text-slate-800">{{ k.reference || 'Sin Ref' }}</div>
                <div v-if="k.notes" class="text-slate-400 mt-0.5 italic truncate" :title="k.notes">"{{ k.notes }}"</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AppLayout>
</template>
