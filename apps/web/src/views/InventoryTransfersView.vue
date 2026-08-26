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

interface Branch {
  id: string
  name: string
  code: string
}

interface Transfer {
  id: string
  quantity: number | string
  reference: string
  notes?: string | null
  createdAt: string
  product: Product
  sourceBranch: Branch
  destinationBranch: Branch
}

const activeTab = ref<'history' | 'create'>('history')
const transfers = ref<Transfer[]>([])
const products = ref<Product[]>([])
const branches = ref<Branch[]>([])
const isLoading = ref(true)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const formTransfer = ref({
  productId: '',
  sourceBranchId: authStore.user?.branchId || '',
  destinationBranchId: '',
  quantity: null as number | null,
  reference: '',
  notes: ''
})

async function loadTransfersData() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const [tRes, pRes, bRes] = await Promise.all([
      api.get('/inventory-transfers'),
      api.get('/products'),
      api.get('/branches')
    ])
    transfers.value = tRes.data
    products.value = pRes.data
    branches.value = bRes.data
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Error al conectar con la API logística de transferencias.'
  } finally {
    isLoading.value = false
  }
}

async function handleCreateTransfer() {
  if (!formTransfer.value.productId || !formTransfer.value.sourceBranchId || !formTransfer.value.destinationBranchId || !formTransfer.value.quantity || !formTransfer.value.reference) {
    errorMessage.value = 'Por favor, completa todos los campos mandatorios del traslado.'
    return
  }

  if (formTransfer.value.sourceBranchId === formTransfer.value.destinationBranchId) {
    errorMessage.value = 'La sucursal de origen y destino deben ser estrictamente diferentes.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await api.post('/inventory-transfers', {
      organizationId: authStore.user?.organizationId || '',
      productId: formTransfer.value.productId,
      sourceBranchId: formTransfer.value.sourceBranchId,
      destinationBranchId: formTransfer.value.destinationBranchId,
      quantity: Number(formTransfer.value.quantity),
      reference: formTransfer.value.reference,
      notes: formTransfer.value.notes || undefined
    })

    successMessage.value = '¡Transferencia de stock ejecutada y registrada con éxito!'

    formTransfer.value = {
      productId: '',
      sourceBranchId: authStore.user?.branchId || '',
      destinationBranchId: '',
      quantity: null,
      reference: '',
      notes: ''
    }

    activeTab.value = 'history'
    await loadTransfersData()
  } catch (err: any) {
    console.error(err)
    errorMessage.value = err.response?.data?.message || 'Error en el despacho. Verifica que la sucursal de origen tenga existencias suficientes.'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => { loadTransfersData() })
</script>
<template>
  <AppLayout>
    <header class="mb-6">
      <h1 class="text-3xl font-bold tracking-tight text-slate-900">Transferencias de Stock</h1>
      <p class="mt-1 text-sm text-slate-500">Mueve inventario de forma segura entre sucursales y audita la trazabilidad de despachos de KUNA.</p>
    </header>

    <div class="mb-6 border-b border-slate-200">
      <nav class="-mb-px flex space-x-6">
        <button type="button" @click="activeTab = 'history'" :class="[activeTab === 'history' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300', 'pb-4 text-sm font-medium border-b-2 transition-colors focus:outline-none']">
          🚚 Historial de Traslados ({{ transfers.length }})
        </button>
        <button type="button" @click="activeTab = 'create'" :class="[activeTab === 'create' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300', 'pb-4 text-sm font-medium border-b-2 transition-colors focus:outline-none']">
          📦 Registrar Nuevo Traslado
        </button>
      </nav>
    </div>

    <div v-if="errorMessage" class="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
      ⚠️ {{ errorMessage }}
    </div>
    <div v-if="successMessage" class="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 shadow-sm">
      🎉 {{ successMessage }}
    </div>

    <div v-if="isLoading" class="flex h-48 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
      <p class="text-sm font-medium text-slate-500 animate-pulse">Sincronizando operaciones logísticas con NestJS...</p>
    </div>

    <div v-else>
      <div v-if="activeTab === 'history'" class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div v-if="transfers.length === 0" class="p-8 text-center text-slate-400">No hay registros de traslados inter-sucursales en este periodo.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th class="px-6 py-3">Fecha de Envío</th>
                <th class="px-6 py-3">Producto / SKU</th>
                <th class="px-6 py-3">Ruta de Traslado</th>
                <th class="px-6 py-3 text-right">Cantidad Mover</th>
                <th class="px-6 py-3">Referencia / Observaciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-sans">
              <tr v-for="t in transfers" :key="t.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                  {{ new Date(t.createdAt).toLocaleDateString('es-CO') }}
                </td>
                <td class="px-6 py-4">
                  <div class="font-semibold text-slate-900">{{ t.product?.name }}</div>
                  <div class="text-xs font-mono text-slate-400 mt-0.5">SKU: {{ t.product?.sku }}</div>
                </td>
                <td class="px-6 py-4 text-xs">
                  <div class="flex items-center space-x-2 text-slate-700">
                    <span class="font-semibold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{{ t.sourceBranch?.code || 'ORIGEN' }}</span>
                    <span class="text-slate-400 font-bold">➔</span>
                    <span class="font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">{{ t.destinationBranch?.code || 'DESTINO' }}</span>
                  </div>
                  <div class="text-[10px] text-slate-400 mt-1 max-w-xs truncate">{{ t.sourceBranch?.name }} a {{ t.destinationBranch?.name }}</div>
                </td>
                <td class="px-6 py-4 text-right font-mono font-bold text-blue-600 whitespace-nowrap">
                  {{ parseFloat(t.quantity as string).toLocaleString('es-CO') }} uds
                </td>
                <td class="px-6 py-4 text-xs text-slate-600">
                  <div class="font-bold text-slate-800">{{ t.reference }}</div>
                  <div v-if="t.notes" class="text-slate-400 mt-0.5 italic max-w-xs truncate">"{{ t.notes }}"</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="activeTab === 'create'" class="max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 class="text-lg font-bold text-slate-900 mb-2">Despachar Mercancía</h3>
        <p class="text-xs text-slate-500 mb-6">El sistema debitará las existencias de la sede origen y las acreditará automáticamente en la sede destino mediante transacciones atómicas.</p>

        <form @submit.prevent="handleCreateTransfer" class="space-y-5">
          <div>
            <label class="block text-sm font-semibold text-slate-700">Producto Comercial</label>
            <select v-model="formTransfer.productId" class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="" disabled>Selecciona el producto a trasladar...</option>
              <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} (SKU: {{ p.sku }})</option>
            </select>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-semibold text-slate-700">Sucursal de Origen</label>
              <select v-model="formTransfer.sourceBranchId" class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-slate-50 text-slate-500 border-dashed cursor-not-allowed" disabled>
                <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }} ({{ b.code }})</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-semibold text-slate-700">Sucursal de Destino</label>
              <select v-model="formTransfer.destinationBranchId" class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="" disabled>Selecciona la sede destino...</option>
                <option v-for="b in branches.filter(br => br.id !== formTransfer.sourceBranchId)" :key="b.id" :value="b.id">{{ b.name }} ({{ b.code }})</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700">Cantidad de Unidades Físicas</label>
            <input v-model="formTransfer.quantity" type="number" step="0.001" min="0.001" placeholder="Ej: 150" class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700">Código N° Guía / Referencia del Traslado</label>
            <input v-model="formTransfer.reference" type="text" placeholder="Ej: TR-0024" class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700">Notas / Observaciones de Despacho (Opcional)</label>
            <textarea v-model="formTransfer.notes" rows="3" placeholder="Detalles sobre el transporte, transportador o motivo del traslado..." class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"></textarea>
          </div>

          <div class="pt-2">
            <button type="submit" :disabled="isSubmitting" class="w-full sm:w-auto rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 text-sm transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {{ isSubmitting ? 'Procesando Despacho...' : 'Autorizar Despacho Logístico' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>
