<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

interface PurchaseOrder {
  id: string
  number: string
  supplier?: { companyName: string }
  items?: any[]
}

interface GoodsReceiptItem {
  id?: string
  goodsReceiptId?: string
  purchaseOrderItemId: string
  productId: string
  productName?: string
  sku?: string
  quantityReceived: number
}

interface GoodsReceipt {
  id: string
  number: string
  receivedDate: string
  purchaseOrderId: string
  status: 'DRAFT' | 'PROCESSED'
  notes?: string | null
}

const activeTab = ref<'list' | 'create'>('list')
const receipts = ref<GoodsReceipt[]>([])
const purchaseOrders = ref<PurchaseOrder[]>([])

const isLoading = ref(true)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Control del estado transaccional
const createdReceiptId = ref<string | null>(null)

// Generamos un código predeterminado único para evitar el conflicto 409
const formReceipt = ref({
  number: `REC-${Date.now().toString().slice(-6)}`,
  purchaseOrderId: '',
  receivedDate: new Date().toISOString().split('T')[0],
  notes: ''
})

// Ítems traídos de la Orden de Compra para registrar la recepción
const availableOrderItems = ref<any[]>([])
const currentItem = ref({
  purchaseOrderItemId: '',
  productId: '',
  quantityReceived: 1
})

// Lista visual de ítems insertados localmente
const savedItems = ref<GoodsReceiptItem[]>([])
const products = ref<any[]>([])

async function loadData() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const [receiptsRes, ordersRes, productsRes] = await Promise.all([
      api.get<GoodsReceipt[]>('/goods-receipts'),
      api.get<PurchaseOrder[]>('/purchase-orders'),
      api.get('/products')
    ])
    receipts.value = receiptsRes.data

    // Filtramos solo órdenes de compra activas/confirmadas
    purchaseOrders.value = ordersRes.data.filter(
      o => o && (o.status === 'CONFIRMED' || o.status === 'PARTIALLY_RECEIVED')
    )

    products.value = productsRes.data
  } catch (error: any) {
    console.error(error)
    errorMessage.value = 'Error al sincronizar las recepciones de mercancía.'
  } finally {
    isLoading.value = false
  }
}

// Consulta directa al endpoint de la orden con filtrado estricto contra nulos
async function loadOrderItems(orderId: string) {
  if (!orderId) return
  try {
    // 1. Obtenemos los detalles de la orden
    const resOrder = await api.get(`/purchase-orders/${orderId}`)
    let items = resOrder.data?.items || []

    // 2. Si la orden no trae el array 'items' embebido, los traemos directamente de purchase-order-items
    if (!items || items.length === 0) {
      const resItems = await api.get('/purchase-order-items')
      const allItems = Array.isArray(resItems.data) ? resItems.data : []
      // Filtrar los items pertenecientes a esta orden de compra
      items = allItems.filter((i: any) => i.purchaseOrderId === orderId)
    }

    // 3. Mapear y garantizar que cada item tenga su nombre de producto resuelto correctamente
    availableOrderItems.value = items.map((item: any) => {
      const matchedProduct = products.value.find((p: any) => p.id === item.productId)
      return {
        ...item,
        productName: item.product?.name || item.productName || matchedProduct?.name || `Producto #${item.productId || item.id}`
      }
    })
  } catch (err) {
    console.error('Error cargando ítems de la OC:', err)
    errorMessage.value = 'No se pudieron obtener los productos de la orden seleccionada.'
  }
}

// Evento al cambiar el combo de Órdenes de Compra
async function handleOrderChange() {
  if (formReceipt.value.purchaseOrderId) {
    await loadOrderItems(formReceipt.value.purchaseOrderId)
  }
}

// Extracción segura del ID del Producto y la cantidad solicitada
function handleItemChange() {
  const target = availableOrderItems.value.find(i => i && i.id === currentItem.value.purchaseOrderItemId)
  if (target) {
    currentItem.value.productId = target.product?.id || target.productId || ''
    const qty = target.quantity ?? target.quantityOrdered ?? target.qty ?? target.orderedQuantity ?? 1
    currentItem.value.quantityReceived = Number(qty)
  }
}

// Paso 1: Crear Cabecera del Recibo
async function handleCreateHeader() {
  if (!formReceipt.value.number || !formReceipt.value.purchaseOrderId || !formReceipt.value.receivedDate) {
    errorMessage.value = 'El código de recibo, la orden de compra y la fecha son obligatorios.'
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
      notes: formReceipt.value.notes || undefined
    }

    const response = await api.post('/goods-receipts', payload)
    createdReceiptId.value = response.data.id

    // Cargar ítems de la orden explícitamente al guardar la cabecera
    await loadOrderItems(formReceipt.value.purchaseOrderId)

    successMessage.value = `Cabecera del recibo ${formReceipt.value.number} creada. Selecciona los productos abajo.`
  } catch (error: any) {
    console.error(error)
    if (error.response?.status === 409) {
      errorMessage.value = `El código de recibo "${formReceipt.value.number}" o la Orden de Compra ya están registrados en el sistema.`
    } else {
      const backendMessage = error.response?.data?.message
      errorMessage.value = Array.isArray(backendMessage) ? backendMessage.join(', ') : (backendMessage || 'Error al guardar la cabecera.')
    }
  } finally {
    isSubmitting.value = false
  }
}

// Paso 2: Agregar Ítem Individual
async function handleAddItemToReceipt() {
  if (!createdReceiptId.value) return
  if (!currentItem.value.purchaseOrderItemId || currentItem.value.quantityReceived <= 0) {
    errorMessage.value = 'Selecciona un producto e ingresa una cantidad válida.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const payload = {
      goodsReceiptId: createdReceiptId.value,
      purchaseOrderItemId: currentItem.value.purchaseOrderItemId,
      productId: currentItem.value.productId,
      quantityReceived: Number(currentItem.value.quantityReceived)
    }

    await api.post('/goods-receipt-items', payload)

    const detail = availableOrderItems.value.find(i => i && i.id === currentItem.value.purchaseOrderItemId)
    const matchedProduct = products.value.find(p => p && p.id === payload.productId)

    savedItems.value.push({
      purchaseOrderItemId: currentItem.value.purchaseOrderItemId,
      productId: currentItem.value.productId,
      productName: detail?.product?.name || detail?.productName || matchedProduct?.name || 'Producto Registrado',
      sku: detail?.product?.sku || matchedProduct?.sku || 'N/A',
      quantityReceived: payload.quantityReceived
    })

    currentItem.value = { purchaseOrderItemId: '', productId: '', quantityReceived: 1 }
    successMessage.value = 'Producto registrado en el recibo correctamente.'
  } catch (error: any) {
    console.error(error)
    errorMessage.value = error.response?.data?.message || 'Error al agregar el ítem al recibo.'
  } finally {
    isSubmitting.value = false
  }
}

// Paso 3: Procesar la Entrada y actualizar inventario
async function handleFinalizeReceipt(receiptId?: string) {
  const targetId = receiptId || createdReceiptId.value
  if (!targetId) return

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    await api.post(`/goods-receipts/${targetId}/process`)
    successMessage.value = '¡Recepción procesada exitosamente! El inventario ha sido actualizado.'

    createdReceiptId.value = null
    savedItems.value = []
    formReceipt.value = {
      number: `REC-${Date.now().toString().slice(-6)}`,
      purchaseOrderId: '',
      receivedDate: new Date().toISOString().split('T')[0],
      notes: ''
    }

    activeTab.value = 'list'
    await loadData()
  } catch (error: any) {
    console.error(error)
    errorMessage.value = error.response?.data?.message || 'Error al procesar la recepción de mercancía.'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => { loadData() })
</script>

<template>
  <AppLayout>
    <header class="mb-6">
      <h1 class="text-3xl font-bold tracking-tight text-slate-900">Recepción de Mercancía</h1>
      <p class="mt-1 text-sm text-slate-500">Registra y controla la entrada física de insumos y productos comprados a tus sucursales.</p>
    </header>

    <div class="mb-6 border-b border-slate-200">
      <nav class="-mb-px flex space-x-6">
        <button type="button" @click="activeTab = 'list'" :class="[activeTab === 'list' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700', 'pb-4 text-sm font-medium border-b-2 transition-colors']">
          📥 Ingresos a Almacén ({{ receipts.length }})
        </button>
        <button type="button" @click="activeTab = 'create'" :class="[activeTab === 'create' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700', 'pb-4 text-sm font-medium border-b-2 transition-colors']">
          ➕ Registrar Entrada Física
        </button>
      </nav>
    </div>

    <div v-if="errorMessage" class="mb-4 bg-red-50 text-red-700 p-4 border border-red-200 rounded-xl text-sm">⚠️ {{ errorMessage }}</div>
    <div v-if="successMessage" class="mb-4 bg-green-50 text-green-700 p-4 border border-green-200 rounded-xl text-sm">🎉 {{ successMessage }}</div>

    <div v-if="isLoading" class="p-8 text-center text-sm font-medium text-slate-500 animate-pulse bg-white border border-slate-200 rounded-xl">
      Cargando recepciones de mercancía...
    </div>

    <div v-else>
      <!-- TABLA DE RECEPCIONES -->
      <div v-if="activeTab === 'list'" class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div v-if="receipts.length === 0" class="p-8 text-center text-slate-400">No hay entradas de almacén registradas.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th class="px-6 py-3">Código Recibo</th>
                <th class="px-6 py-3">Fecha de Ingreso</th>
                <th class="px-6 py-3">ID Documento de Compra</th>
                <th class="px-6 py-3">Estado</th>
                <th class="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-sans">
              <tr v-for="rec in receipts" :key="rec.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4 font-mono font-bold text-slate-900">📥 {{ rec.number }}</td>
                <td class="px-6 py-4 text-xs text-slate-600">{{ new Date(rec.receivedDate).toLocaleDateString('es-CO') }}</td>
                <td class="px-6 py-4 font-mono text-xs text-slate-500">{{ rec.purchaseOrderId }}</td>
                <td class="px-6 py-4">
                  <span v-if="rec.status === 'PROCESSED'" class="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Procesado</span>
                  <span v-else class="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">Borrador / Pendiente</span>
                </td>
                <td class="px-6 py-4 text-right">
                  <button v-if="rec.status === 'DRAFT'" @click="handleFinalizeReceipt(rec.id)" :disabled="isSubmitting" class="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-1.5 rounded-lg text-xs shadow-sm transition-all disabled:opacity-50">
                    ⚙️ Procesar Entrada
                  </button>
                  <span v-else class="text-xs text-slate-400 italic">Completado</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- FORMULARIO MAESTRO-DETALLE DOS PASOS -->
      <div v-if="activeTab === 'create'" class="space-y-6 max-w-4xl">
        <!-- PASO 1: CABECERA -->
        <div class="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
          <h3 class="text-lg font-bold text-slate-900 mb-4">1. Cabecera del Recibo de Entrada</h3>
          <form @submit.prevent="handleCreateHeader" class="space-y-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="block text-sm font-semibold text-slate-700">Número de Recibo / Acta</label>
                <input v-model="formReceipt.number" :disabled="!!createdReceiptId" type="text" placeholder="Ej: REC-2026-001" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700">Orden de Compra Asociada</label>
                <select v-model="formReceipt.purchaseOrderId" @change="handleOrderChange" :disabled="!!createdReceiptId" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400">
                  <option value="" disabled>Selecciona la orden de compra...</option>
                  <option v-for="po in purchaseOrders" :key="po.id" :value="po.id">
                    {{ po.number }} - {{ po.supplier?.companyName || 'Proveedor' }}
                  </option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700">Fecha de Recepción Física</label>
              <input v-model="formReceipt.receivedDate" :disabled="!!createdReceiptId" type="date" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700">Notas / Observaciones de Entrega</label>
              <textarea v-model="formReceipt.notes" :disabled="!!createdReceiptId" rows="2" placeholder="Estado del empaque, transportadora..." class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50"></textarea>
            </div>
            <button v-if="!createdReceiptId" type="submit" :disabled="isSubmitting" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm shadow-sm">
              Guardar Cabecera e Ir a Ítems
            </button>
          </form>
        </div>

        <!-- PASO 2: AGREGAR ÍTEMS -->
        <div v-if="createdReceiptId" class="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-6">
          <h3 class="text-lg font-bold text-slate-900">2. Cargar Ítems Recibidos al Almacén</h3>

          <div class="grid gap-4 sm:grid-cols-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div class="sm:col-span-2">
              <label class="block text-sm font-semibold text-slate-700">Producto de la Orden</label>
              <select
                v-model="currentItem.purchaseOrderItemId"
                @change="handleItemChange"
                class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
              >
                <option value="" disabled>Selecciona un ítem de la orden...</option>
                <template v-for="(item, index) in availableOrderItems" :key="item?.id || index">
                  <option v-if="item" :value="item.id">
                    {{ item.product?.name || item.productName || products.find(p => p.id === item.productId)?.name || 'Producto #' + (item.productId || item.id) }}
                    (Cant. Solicitada: {{ item.quantity ?? item.quantityOrdered ?? item.qty ?? item.orderedQuantity ?? 'N/A' }})
                  </option>
                </template>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700">Cantidad Recibida</label>
              <input v-model.number="currentItem.quantityReceived" type="number" min="1" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm bg-white" />
            </div>
            <div class="sm:col-span-3 flex justify-end pt-2 border-t border-slate-200 mt-2">
              <button type="button" @click="handleAddItemToReceipt" :disabled="isSubmitting" class="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg text-sm shadow-sm">
                ➕ Insertar Ítem al Recibo
              </button>
            </div>
          </div>

          <!-- GRILLA TEMPORAL DE ÍTEMS -->
          <div class="border rounded-lg overflow-hidden">
            <table class="w-full text-left text-sm">
              <thead class="bg-slate-50 text-slate-500 text-xs font-semibold uppercase">
                <tr>
                  <th class="px-6 py-2.5">Producto / SKU</th>
                  <th class="px-6 py-2.5 text-right">Cantidad Recibida</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="(item, index) in savedItems" :key="index" class="bg-white">
                  <td class="px-6 py-3 font-semibold text-slate-900">{{ item.productName }}</td>
                  <td class="px-6 py-3 text-right font-mono font-bold text-slate-800">{{ item.quantityReceived }} uds</td>
                </tr>
                <tr v-if="savedItems.length === 0">
                  <td colspan="2" class="p-6 text-center text-slate-400 italic">No has insertado productos a este recibo todavía.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- PROCESAR ENTRADA -->
          <div class="flex justify-end pt-4 border-t border-slate-200">
            <button
              type="button"
              @click="handleFinalizeReceipt()"
              :disabled="savedItems.length === 0 || isSubmitting"
              class="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-3 rounded-xl text-sm shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⚙️ Procesar y Cargar al Inventario
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
