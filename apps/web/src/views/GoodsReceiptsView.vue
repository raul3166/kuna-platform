<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

interface PurchaseOrder { id: string; number: string; status: string }
interface GoodsReceipt {
  id: string
  number: string
  receivedDate: string
  notes?: string | null
  purchaseOrderId: string
}

const activeTab = ref<'list' | 'create'>('list')
const receipts = ref<GoodsReceipt[]>([])
const confirmedOrders = ref<PurchaseOrder[]>([])
const isLoading = ref(true)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// ID de la recepción generada para habilitar los ítems
const createdReceiptId = ref<string | null>(null)

// Formulario basado en CreateGoodsReceiptDto
const formReceipt = ref({
  number: '',
  purchaseOrderId: '',
  receivedDate: new Date().toISOString().split('T')[0],
  notes: ''
})

async function loadReceiptsModuleData() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const [receiptsRes, ordersRes] = await Promise.all([
      api.get<GoodsReceipt[]>('/goods-receipts'),
      api.get<PurchaseOrder[]>('/purchase-orders')
    ])
    receipts.value = receiptsRes.data
    // Filtramos para mostrar solo las órdenes confirmadas listas para recibir
    confirmedOrders.value = ordersRes.data.filter(o => o.status === 'CONFIRMED' || o.status === 'PARTIALLY_RECEIVED')
  } catch (error: any) {
    console.error(error)
    errorMessage.value = 'Error al sincronizar el módulo de recepciones físicas.'
  } finally {
    isLoading.value = false
  }
}

async function handleCreateReceiptHeader() {
  if (!formReceipt.value.number || !formReceipt.value.purchaseOrderId || !formReceipt.value.receivedDate) {
    errorMessage.value = 'El número de recepción, orden de compra y fecha son obligatorios.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const payload = {
      organizationId: authStore.user?.organizationId || '',
      purchaseOrderId: formReceipt.value.purchaseOrderId,
      number: formReceipt.value.number,
      receivedDate: new Date(formReceipt.value.receivedDate).toISOString(),
      receivedById: authStore.user?.id || undefined,
      notes: formReceipt.value.notes || undefined
    }

    const response = await api.post('/goods-receipts', payload)
    createdReceiptId.value = response.data.id
    successMessage.value = 'Cabecera de recepción generada. El stock ingresará al almacén tras asociar las cantidades físicas.'

    // Forzamos actualización de estados
    await loadReceiptsModuleData()
    activeTab.value = 'list'
  } catch (error: any) {
    console.error(error)
    errorMessage.value = error.response?.data?.message || 'Error al procesar el ingreso de almacén.'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => { loadReceiptsModuleData() })
</script>
<template>
  <AppLayout>
    <header class="mb-6">
      <h1 class="text-3xl font-bold tracking-tight text-slate-900">Recepción de Mercancía</h1>
      <p class="mt-1 text-sm text-slate-500">Registra y controla la entrada física de insumos y productos comprados a tus sucursales.</p>
    </header>

    <div class="mb-6 border-b border-slate-200">
      <nav class="-mb-px flex space-x-6">
        <button type="button" @click="activeTab = 'list'" :class="[activeTab === 'list' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300', 'pb-4 text-sm font-medium border-b-2 transition-colors focus:outline-none']">
          📥 Ingresos a Almacén ({{ receipts.length }})
        </button>
        <button type="button" @click="activeTab = 'create'" :class="[activeTab === 'create' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300', 'pb-4 text-sm font-medium border-b-2 transition-colors focus:outline-none']">
          ➕ Registrar Entrada Física
        </button>
      </nav>
    </div>

    <div v-if="errorMessage" class="mb-4 bg-red-50 text-red-700 p-4 border border-red-200 rounded-xl text-sm">⚠️ {{ errorMessage }}</div>
    <div v-if="successMessage" class="mb-4 bg-green-50 text-green-700 p-4 border border-green-200 rounded-xl text-sm">🎉 {{ successMessage }}</div>

    <div v-if="isLoading" class="p-8 text-center text-sm font-medium text-slate-500 animate-pulse bg-white border border-slate-200 rounded-xl">
      Sincronizando registros logísticos con la API...
    </div>

    <div v-else>
      <!-- TABLA GENERAL -->
      <div v-if="activeTab === 'list'" class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div v-if="receipts.length === 0" class="p-8 text-center text-slate-400">No hay entradas físicas a almacén registradas en este periodo.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th class="px-6 py-3">Código Recibo</th>
                <th class="px-6 py-3">Fecha de Ingreso</th>
                <th class="px-6 py-3">ID Documento de Compra</th>
                <th class="px-6 py-3">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-sans">
              <tr v-for="rec in receipts" :key="rec.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4 font-mono font-bold text-slate-900">📥 {{ rec.number }}</td>
                <td class="px-6 py-4 text-xs text-slate-600">{{ new Date(rec.receivedDate).toLocaleDateString('es-CO') }}</td>
                <td class="px-6 py-4 font-mono text-xs text-slate-500">{{ rec.purchaseOrderId }}</td>
                <td class="px-6 py-4">
                  <span class="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Procesado</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- FORMULARIO ENTRADA -->
      <div v-if="activeTab === 'create'" class="bg-white border border-slate-200 p-6 rounded-xl shadow-sm max-w-2xl">
        <h3 class="text-lg font-bold text-slate-900 mb-2">Ingresar Acta de Recepción</h3>
        <p class="text-xs text-slate-500 mb-6">Vincula un documento formal de compra aprobado para ingresar físicamente el stock de mercancía.</p>

        <form @submit.prevent="handleCreateReceiptHeader" class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-semibold text-slate-700">N° Remisión / Consecutivo Recibo</label>
              <input v-model="formReceipt.number" type="text" placeholder="Ej: REC-0001" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700">Orden de Compra Asociada</label>
              <select v-model="formReceipt.purchaseOrderId" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none">
                <option value="" disabled>Selecciona el documento confirmado...</option>
                <option v-for="o in confirmedOrders" :key="o.id" :value="o.id">Orden N°: {{ o.number }}</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700">Fecha de Recepción en Almacén</label>
            <input v-model="formReceipt.receivedDate" type="date" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700">Notas u Observaciones del Estado Físico (Opcional)</label>
            <textarea v-model="formReceipt.notes" rows="3" placeholder="Ej: Se recibe mercancía completa en buen estado. Cajas selladas..." class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none"></textarea>
          </div>

          <div class="pt-2">
            <button type="submit" :disabled="isSubmitting" class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition-all shadow-sm disabled:opacity-50">
              {{ isSubmitting ? 'Registrando Entrada...' : 'Procesar Ingreso Físico' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>
