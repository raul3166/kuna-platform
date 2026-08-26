<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

interface Supplier { id: string; companyName: string }
interface Product { id: string; name: string; sku: string; costPrice: number }

interface PurchaseOrderItem {
  id?: string
  productId: string
  productName?: string
  sku?: string
  quantity: number
  unitCost: number
  notes?: string
}

interface PurchaseOrder {
  id: string
  number: string
  status: 'DRAFT' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
  orderDate: string
  expectedDate?: string | null
  subtotal: number | string
  tax: number | string
  total: number | string
  notes?: string | null
  supplier: Supplier
  items?: any[]
}

const activeTab = ref<'list' | 'create'>('list')
const purchaseOrders = ref<PurchaseOrder[]>([])
const suppliers = ref<Supplier[]>([])
const products = ref<Product[]>([])

const isLoading = ref(true)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Control de flujo transaccional del formulario
const createdOrderId = ref<string | null>(null) // Almacena el ID tras emitir la cabecera

const formOrder = ref({
  number: '',
  supplierId: '',
  orderDate: new Date().toISOString().split('T')[0],
  expectedDate: '',
  notes: ''
})

// Estado dinámico para el ítem que se está agregando en la grilla en caliente
const currentItem = ref<PurchaseOrderItem>({
  productId: '',
  quantity: 1,
  unitCost: 0,
  notes: ''
})

// Lista visual temporal de ítems cargados con éxito en el backend para la orden activa
const savedItems = ref<PurchaseOrderItem[]>([])

async function loadPurchaseModuleData() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const [ordersRes, suppliersRes, productsRes] = await Promise.all([
      api.get<PurchaseOrder[]>('/purchase-orders'),
      api.get<Supplier[]>('/suppliers'),
      api.get<Product[]>('/products')
    ])
    purchaseOrders.value = ordersRes.data
    suppliers.value = suppliersRes.data
    products.value = productsRes.data
  } catch (error: any) {
    console.error(error)
    errorMessage.value = 'No fue posible sincronizar el registro de compras.'
  } finally {
    isLoading.value = false
  }
}

// Escucha reactiva: Cuando seleccionen un producto en el combo, precarga su costo base del catálogo
function handleProductChange() {
  const target = products.value.find(p => p.id === currentItem.value.productId)
  if (target) {
    currentItem.value.unitCost = Number(target.costPrice)
  }
}

// Paso 1: Crear la cabecera (CreatePurchaseOrderDto)
async function handleCreateHeader() {
  if (!formOrder.value.number || !formOrder.value.supplierId || !formOrder.value.orderDate) {
    errorMessage.value = 'El número de orden, proveedor y fecha son mandatorios.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const payload = {
      organizationId: authStore.user?.organizationId || '',
      supplierId: formOrder.value.supplierId,
      number: formOrder.value.number,
      orderDate: new Date(formOrder.value.orderDate).toISOString(),
      expectedDate: formOrder.value.expectedDate ? new Date(formOrder.value.expectedDate).toISOString() : undefined,
      notes: formOrder.value.notes || undefined
    }

    const response = await api.post('/purchase-orders', payload)

    // Almacenamos el ID generado por Prisma para habilitar la grilla de ítems
    createdOrderId.value = response.data.id
    successMessage.value = `Cabecera de la orden ${formOrder.value.number} guardada. Procede a asociar los productos en la grilla inferior.`
  } catch (error: any) {
    console.error(error)
    errorMessage.value = error.response?.data?.message || 'Error al emitir la cabecera.'
  } finally {
    isSubmitting.value = false
  }
}

// Paso 2: Asociar ítem individual a la orden (CreatePurchaseOrderItemDto)
async function handleAddItemToOrder() {
  if (!createdOrderId.value) return
  if (!currentItem.value.productId || currentItem.value.quantity <= 0 || currentItem.value.unitCost < 0) {
    errorMessage.value = 'Valores de producto, cantidades o costos inválidos.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const payload = {
      purchaseOrderId: createdOrderId.value,
      productId: currentItem.value.productId,
      quantity: Number(currentItem.value.quantity),
      unitCost: Number(currentItem.value.unitCost),
      notes: currentItem.value.notes || undefined
    }

    await api.post('/purchase-order-items', payload)

    // Buscamos datos visuales para renderizar la fila localmente de forma amigable
    const prodDetails = products.value.find(p => p.id === currentItem.value.productId)

    savedItems.value.push({
      productId: currentItem.value.productId,
      productName: prodDetails?.name || 'Producto',
      sku: prodDetails?.sku || 'SKU',
      quantity: payload.quantity,
      unitCost: payload.unitCost,
      notes: payload.notes
    })

    // Resetear formulario del ítem
    currentItem.value = { productId: '', quantity: 1, unitCost: 0, notes: '' }
    successMessage.value = 'Producto asociado e inyectado en el DTO de compras correctamente.'
  } catch (error: any) {
    console.error(error)
    errorMessage.value = error.response?.data?.message || 'Error al agregar el ítem a la orden.'
  } finally {
    isSubmitting.value = false
  }
}

// Paso 3: Sellar flujo de edición mandando a CONFIRMED
async function handleFinalizeOrder() {
  if (!createdOrderId.value) return
  isSubmitting.value = true
  try {
    await api.patch(`/purchase-orders/${createdOrderId.value}/confirm`)
    successMessage.value = '¡Orden de compra consolidada, sellada y confirmada con éxito!'

    // Reset general de estados
    createdOrderId.value = null
    savedItems.value = []
    formOrder.value = { number: '', supplierId: '', orderDate: new Date().toISOString().split('T')[0], expectedDate: '', notes: '' }

    activeTab.value = 'list'
    await loadPurchaseModuleData()
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message || 'Error al confirmar el cierre del documento.'
  } finally {
    isSubmitting.value = false
  }
}

async function handleConfirmOrderDirect(id: string) {
  try {
    await api.patch(`/purchase-orders/${id}/confirm`)
    await loadPurchaseModuleData()
  } catch (error: any) {
    alert(error.response?.data?.message || 'Error.')
  }
}

async function handleCancelOrderDirect(id: string) {
  if (!confirm('¿Deseas cancelar este documento?')) return
  try {
    await api.patch(`/purchase-orders/${id}/cancel`)
    await loadPurchaseModuleData()
  } catch (error: any) {
    alert(error.response?.data?.message || 'Error.')
  }
}

function getStatusBadgeClass(status: string) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
    CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
    PARTIALLY_RECEIVED: 'bg-amber-50 text-amber-700 border-amber-200',
    RECEIVED: 'bg-green-50 text-green-700 border-green-200',
    CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200'
  }
  return styles[status] || 'bg-slate-50 text-slate-700 border-slate-200'
}

function formatCurrency(value: number | string) {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(num)
}

onMounted(() => { loadPurchaseModuleData() })
</script>
<template>
  <AppLayout>
    <header class="mb-6">
      <h1 class="text-3xl font-bold tracking-tight text-slate-900">Órdenes de Compra</h1>
      <p class="mt-1 text-sm text-slate-500">Gestión de abastecimiento, contratos con proveedores y control del flujo de ingreso de mercancías.</p>
    </header>

    <div class="mb-6 border-b border-slate-200">
      <nav class="-mb-px flex space-x-6">
        <button type="button" @click="activeTab = 'list'" :class="[activeTab === 'list' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300', 'pb-4 text-sm font-medium border-b-2 transition-colors focus:outline-none']">
          📑 Órdenes Emitidas ({{ purchaseOrders.length }})
        </button>
        <button type="button" @click="activeTab = 'create'" :class="[activeTab === 'create' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300', 'pb-4 text-sm font-medium border-b-2 transition-colors focus:outline-none']">
          📝 Generar Orden de Compra
        </button>
      </nav>
    </div>

    <div v-if="errorMessage" class="mb-4 bg-red-50 text-red-700 p-4 border border-red-200 rounded-xl text-sm">⚠️ {{ errorMessage }}</div>
    <div v-if="successMessage" class="mb-4 bg-green-50 text-green-700 p-4 border border-green-200 rounded-xl text-sm">🎉 {{ successMessage }}</div>

    <div v-if="isLoading" class="p-8 text-center text-sm font-medium text-slate-500 animate-pulse bg-white border border-slate-200 rounded-xl">
      Sincronizando registros de compras con NestJS...
    </div>

    <div v-else>
      <!-- TABLA MAESTRA (KNA-045) -->
      <div v-if="activeTab === 'list'" class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div v-if="purchaseOrders.length === 0" class="p-8 text-center text-slate-400">No hay órdenes de compra registradas.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th class="px-6 py-3">Código Documento</th>
                <th class="px-6 py-3">Proveedor / Entidad</th>
                <th class="px-6 py-3">Fecha Emisión</th>
                <th class="px-6 py-3">Estado Workflow</th>
                <th class="px-6 py-3 text-right">Valor Total</th>
                <th class="px-6 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-sans">
              <tr v-for="order in purchaseOrders" :key="order.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4 font-mono font-bold text-slate-900">📄 {{ order.number }}</td>
                <td class="px-6 py-4 font-semibold text-slate-800">{{ order.supplier?.companyName }}</td>
                <td class="px-6 py-4 text-xs text-slate-500">{{ new Date(order.orderDate).toLocaleDateString('es-CO') }}</td>
                <td class="px-6 py-4">
                  <span :class="[getStatusBadgeClass(order.status), 'inline-block px-2.5 py-0.5 text-xs font-bold border rounded-md uppercase']">
                    {{ order.status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right font-mono font-bold text-slate-950">{{ formatCurrency(order.total) }}</td>
                <td class="px-6 py-4 text-center whitespace-nowrap">
                  <div class="flex items-center justify-center space-x-2">
                    <button v-if="order.status === 'DRAFT'" @click="handleConfirmOrderDirect(order.id)" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-2 py-1 rounded transition">✓ Confirmar</button>
                    <button v-if="order.status === 'DRAFT'" @click="handleCancelOrderDirect(order.id)" class="border hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs font-bold px-2 py-1 rounded transition">✕ Cancelar</button>
                    <span v-else class="text-xs text-slate-400 italic">Documento Cerrado</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- FORMULARIO AVANZADO MAESTRO-DETALLE (KNA-046) -->
      <div v-if="activeTab === 'create'" class="space-y-6 max-w-4xl">
        <!-- SECCIÓN A: CABECERA -->
        <div class="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
          <h3 class="text-lg font-bold text-slate-900 mb-4">1. Datos Generales de la Orden</h3>
          <form @submit.prevent="handleCreateHeader" class="space-y-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="block text-sm font-semibold text-slate-700">Código N° de Factura / Orden</label>
                <input v-model="formOrder.number" :disabled="!!createdOrderId" type="text" placeholder="Ej: OC-2026-001" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700">Proveedor Comercial</label>
                <select v-model="formOrder.supplierId" :disabled="!!createdOrderId" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400">
                  <option value="" disabled>Selecciona el proveedor...</option>
                  <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.companyName }}</option>
                </select>
              </div>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="block text-sm font-semibold text-slate-700">Fecha Emisión</label>
                <input v-model="formOrder.orderDate" :disabled="!!createdOrderId" type="date" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700">Fecha Estimada Recepción</label>
                <input v-model="formOrder.expectedDate" :disabled="!!createdOrderId" type="date" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700">Notas Generales</label>
              <textarea v-model="formOrder.notes" :disabled="!!createdOrderId" rows="2" placeholder="Términos de entrega..." class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50"></textarea>
            </div>
            <button v-if="!createdOrderId" type="submit" :disabled="isSubmitting" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm shadow-sm">
              Guardar Cabecera e Ir a Ítems
            </button>
          </form>
        </div>

        <!-- SECCIÓN B: DETALLE / GRILLA EN CALIENTE (Se habilita tras crear la cabecera) -->
        <div v-if="createdOrderId" class="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-6">
          <h3 class="text-lg font-bold text-slate-900">2. Cargar Ítems al Documento</h3>

          <form @submit.prevent="handleCreateOrderItem" class="grid gap-4 sm:grid-cols-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div class="sm:col-span-2">
              <label class="block text-sm font-semibold text-slate-700">Producto / Insumo</label>
              <select v-model="currentItem.productId" @change="handleProductChange" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm bg-white">
                <option value="" disabled>Selecciona un artículo...</option>
                <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} (SKU: {{ p.sku }})</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700">Cantidad</label>
              <input v-model="currentItem.quantity" type="number" min="1" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm bg-white" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700">Costo Unitario ($)</label>
              <input v-model="currentItem.unitCost" type="number" min="0" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm bg-white" />
            </div>
            <div class="sm:col-span-4 flex justify-between items-center pt-2 border-t border-slate-200 mt-2">
              <input v-model="currentItem.notes" type="text" placeholder="Observación del ítem (Opcional)..." class="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white mr-4" />
              <button type="button" @click="handleAddItemToOrder" :disabled="isSubmitting" class="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg text-sm whitespace-nowrap shadow-sm">
                ➕ Insertar Ítem
              </button>
            </div>
          </form>

          <!-- GRILLA TEMPORAL DE COMPRAS -->
          <div class="border rounded-lg overflow-hidden">
            <table class="w-full text-left text-sm">
              <thead class="bg-slate-50 text-slate-500 text-xs font-semibold uppercase">
                <tr><th class="px-6 py-2.5">SKU / Artículo</th><th class="px-6 py-2.5 text-right">Cantidad</th><th class="px-6 py-2.5 text-right">Costo Pactado</th><th class="px-6 py-2.5 text-right">Subtotal</th></tr>
                              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="(item, index) in savedItems" :key="index" class="bg-white">
                  <td class="px-6 py-3">
                    <div class="font-semibold text-slate-900">{{ item.productName }}</div>
                    <div class="text-xs font-mono text-slate-400">SKU: {{ item.sku }}</div>
                  </td>
                  <td class="px-6 py-3 text-right font-mono text-slate-700">
                    {{ item.quantity }} uds
                  </td>
                  <td class="px-6 py-3 text-right font-mono text-slate-500">
                    {{ formatCurrency(item.unitCost) }}
                  </td>
                  <td class="px-6 py-3 text-right font-mono font-bold text-slate-900">
                    {{ formatCurrency(item.quantity * item.unitCost) }}
                  </td>
                </tr>
                <tr v-if="savedItems.length === 0">
                  <td colspan="4" class="p-6 text-center text-slate-400 italic">
                    No has insertado productos a esta orden todavía.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- CIERRE DE FLUJO / SELLO DEL WORKFLOW -->
          <div class="flex justify-end pt-4 border-t border-slate-200">
            <button
              type="button"
              @click="handleFinalizeOrder"
              :disabled="savedItems.length === 0 || isSubmitting"
              class="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-3 rounded-xl text-sm shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✓ Sellar y Confirmar Orden de Compra
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

