<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

interface Product {
  id: string
  name: string
  sku: string
}

interface InventoryMovement {
  id: string
  movementType: string
  quantity: string | number
  reference?: string | null
  notes?: string | null
  createdAt: string
  product: Product
}

const activeTab = ref<'history' | 'adjust'>('history')
const movements = ref<InventoryMovement[]>([])
const products = ref<Product[]>([])
const isLoading = ref(true)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const formAdjustment = ref({
  productId: '',
  quantity: '',
  reference: '',
  notes: ''
})

async function loadMovementsData() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const [movRes, prodRes] = await Promise.all([
      api.get('/inventory-movements'),
      api.get('/products')
    ])
    movements.value = movRes.data
    products.value = prodRes.data
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Error al sincronizar la bitácora transaccional de movimientos.'
  } finally {
    isLoading.value = false
  }
}

async function handleCreateAdjustment() {
  if (!formAdjustment.value.productId || !formAdjustment.value.quantity) {
    errorMessage.value = 'Por favor, especifica el producto y la cantidad física.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await api.post('/inventory-movements/adjustment', {
      organizationId: authStore.user?.organizationId || '',
      branchId: authStore.user?.branchId || undefined,
      productId: formAdjustment.value.productId,
      quantity: formAdjustment.value.quantity.toString(),
      reference: formAdjustment.value.reference || undefined,
      notes: formAdjustment.value.notes || undefined
    })

    successMessage.value = '¡Ajuste de inventario procesado y reflejado en el stock con éxito!'
    formAdjustment.value = { productId: '', quantity: '', reference: '', notes: '' }
    await loadMovementsData()
    activeTab.value = 'history'
  } catch (err: any) {
    console.error(err)
    errorMessage.value = err.response?.data?.message || 'No fue posible registrar el ajuste.'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => { loadMovementsData() })
</script>
<template>
  <AppLayout>
    <header class="mb-6">
      <h1 class="text-3xl font-bold text-slate-900">Operaciones de Stock</h1>
      <p class="text-sm text-slate-500">Audita la bitácora general de movimientos o ejecuta ajustes por conteo físico.</p>
    </header>

    <div class="mb-6 border-b border-slate-200">
      <nav class="-mb-px flex space-x-6">
        <button type="button" @click="activeTab = 'history'" :class="[activeTab === 'history' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300', 'pb-4 text-sm font-medium border-b-2 transition-colors focus:outline-none']">
          📋 Historial de Movimientos ({{ movements.length }})
        </button>
        <button type="button" @click="activeTab = 'adjust'" :class="[activeTab === 'adjust' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300', 'pb-4 text-sm font-medium border-b-2 transition-colors focus:outline-none']">
          🔧 Registrar Ajuste Manual
        </button>
      </nav>
    </div>

    <div v-if="errorMessage" class="mb-4 bg-red-50 text-red-700 p-4 border border-red-200 rounded-xl text-sm">⚠️ {{ errorMessage }}</div>
    <div v-if="successMessage" class="mb-4 bg-green-50 text-green-700 p-4 border border-green-200 rounded-xl text-sm">🎉 {{ successMessage }}</div>

    <div v-if="isLoading" class="p-8 text-center text-sm font-medium text-slate-500 animate-pulse bg-white border border-slate-200 rounded-xl">
      Sincronizando bitácora de existencias con NestJS...
    </div>

    <div v-else>
      <div v-if="activeTab === 'history'" class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div v-if="movements.length === 0" class="p-8 text-center text-slate-400">No hay movimientos registrados en la base de datos actualmente.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th class="px-6 py-3">Fecha y Hora</th>
                <th class="px-6 py-3">Producto / SKU</th>
                <th class="px-6 py-3">Tipo Movimiento</th>
                <th class="px-6 py-3 text-right">Cantidad</th>
                <th class="px-6 py-3">Referencia / Nota</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-sans">
              <tr v-for="mov in movements" :key="mov.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                  {{ new Date(mov.createdAt).toLocaleString('es-CO') }}
                </td>
                <td class="px-6 py-4">
                  <div class="font-semibold text-slate-900">{{ mov.product?.name }}</div>
                  <div class="text-xs font-mono text-slate-400 mt-0.5">SKU: {{ mov.product?.sku }}</div>
                </td>
                <td class="px-6 py-4">
                  <span class="px-2 py-0.5 text-xs font-bold border rounded bg-slate-50 border-slate-200 text-slate-700">{{ mov.movementType }}</span>
                </td>
                <td class="px-6 py-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                  {{ parseFloat(mov.quantity as string).toLocaleString('es-CO') }} uds
                </td>
                <td class="px-6 py-4 text-xs text-slate-600 max-w-xs">
                  <div class="font-bold text-slate-800">{{ mov.reference || '—' }}</div>
                  <div v-if="mov.notes" class="text-slate-400 mt-0.5 italic truncate" :title="mov.notes">"{{ mov.notes }}"</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- CORREGIDO: Eliminado el atributo v-slot:create erróneo -->
      <div v-if="activeTab === 'adjust'" class="max-w-2xl bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <h3 class="text-lg font-bold text-slate-900 mb-2">Ingresar Ajuste de Inventario</h3>
        <p class="text-xs text-slate-500 mb-6">Esta acción creará un registro de ajuste inmediato, recalculando las existencias globales de la organización y el stock de sucursal mediante transacciones atómicas.</p>

        <form @submit.prevent="handleCreateAdjustment" class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-slate-700">Producto Comercial</label>
            <select v-model="formAdjustment.productId" class="mt-1 block w-full border border-slate-300 rounded-lg p-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="" disabled>Selecciona el producto a ajustar...</option>
              <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} (SKU: {{ p.sku }})</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700">Cantidad del Ajuste</label>
            <input v-model="formAdjustment.quantity" type="number" step="0.001" placeholder="Ej: 10 o -5 para mermas" class="mt-1 block w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700">Documento / Código de Referencia</label>
            <input v-model="formAdjustment.reference" type="text" placeholder="Ej: CONTEO-FISICO-2026" class="mt-1 block w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700">Notas / Justificación del Ajuste</label>
            <textarea v-model="formAdjustment.notes" rows="3" placeholder="Ej: Mercancía dañada en pasillo..." class="mt-1 block w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"></textarea>
          </div>
          <div class="pt-2">
            <button type="submit" :disabled="isSubmitting" class="w-full sm:w-auto rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 text-sm transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {{ isSubmitting ? 'Procesando Ajuste...' : 'Aplicar Ajuste de Stock' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>
