<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

interface Supplier { id: string; companyName: string }
interface PurchaseOrder { id: string; number: string }
interface Product { id: string; name: string; sku: string; costPrice: number }

interface ReturnItem {
  id?: string
  productId: string
  productName?: string
  sku?: string
  quantity: string | number
  unitCost: string | number
  notes?: string
}

interface PurchaseReturn {
  id: string
  number: string
  returnDate: string
  status: 'DRAFT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  reason?: string | null
  supplier: Supplier
  purchaseOrder: PurchaseOrder
}

const activeTab = ref<'list' | 'create'>('list')
const returns = ref<PurchaseReturn[]>([])
const suppliers = ref<Supplier[]>([])
const orders = ref<PurchaseOrder[]>([])
const products = ref<Product[]>([])

const isLoading = ref(true)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// ID de la devolución generada para habilitar los ítems
const createdReturnId = ref<string | null>(null)

// Formulario basado en CreatePurchaseReturnDto
const formReturn = ref({
  number: '',
  supplierId: '',
  purchaseOrderId: '',
  goodsReceiptId: '',
  returnDate: new Date().toISOString().split('T')[0],
  reason: '',
  notes: ''
})

// Estado dinámico para el ítem que se está agregando en la grilla en caliente
const currentItem = ref<ReturnItem>({
  productId: '',
  quantity: '',
  unitCost: '',
  notes: ''
})

// Lista visual temporal de ítems cargados con éxito en la base de datos
const savedItems = ref<ReturnItem[]>([])

async function loadReturnsModuleData() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const [returnsRes, suppliersRes, ordersRes, productsRes] = await Promise.all([
      api.get<PurchaseReturn[]>('/purchase-returns'),
      api.get<Supplier[]>('/suppliers'),
      api.get<PurchaseOrder[]>('/purchase-orders'),
      api.get<Product[]>('/products')
    ])
    returns.value = returnsRes.data
    suppliers.value = suppliersRes.data
    orders.value = ordersRes.data
    products.value = productsRes.data
  } catch (error: any) {
    console.error(error)
    errorMessage.value = 'No fue posible sincronizar el módulo de devoluciones.'
  } finally {
    isLoading.value = false
  }
}

function handleProductChange() {
  const target = products.value.find(p => p.id === currentItem.value.productId)
  if (target) {
    currentItem.value.unitCost = Number(target.costPrice).toString()
  }
}

// Paso 1: Guardar la cabecera (CreatePurchaseReturnDto)
async function handleCreateReturnHeader() {
  if (!formReturn.value.number || !formReturn.value.supplierId || !formReturn.value.purchaseOrderId) {
    errorMessage.value = 'Número de devolución, proveedor y orden de compra son campos mandatorios.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const payload = {
      organizationId: authStore.user?.organizationId || '',
      supplierId: formReturn.value.supplierId,
      purchaseOrderId: formReturn.value.purchaseOrderId,
      goodsReceiptId: formReturn.value.goodsReceiptId || undefined,
      number: formReturn.value.number,
      returnDate: new Date(formReturn.value.returnDate).toISOString(),
      reason: formReturn.value.reason || undefined,
      notes: formReturn.value.notes || undefined
    }

    const response = await api.post('/purchase-returns', payload)
    createdReturnId.value = response.data.id
    successMessage.value = `Cabecera de devolución ${formReturn.value.number} guardada. Procede a asociar los productos en la grilla inferior.`
  } catch (error: any) {
    console.error(error)
    errorMessage.value = error.response?.data?.message || 'Error al procesar la devolución. Consecutivo duplicado.'
  } finally {
    isSubmitting.value = false
  }
}

// Paso 2: Asociar ítem individual a la devolución (CreatePurchaseReturnItemDto)
async function handleAddItemToReturn() {
  if (!createdReturnId.value) return
  if (!currentItem.value.productId || !currentItem.value.quantity || !currentItem.value.unitCost) {
    errorMessage.value = 'Valores de producto, cantidades o costos inválidos.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const payload = {
      purchaseReturnId: createdReturnId.value,
      goodsReceiptItemId: 'cmr_receipt_item_placeholder', // Reemplazo dinámico según tu flujo lógico
      productId: currentItem.value.productId,
      quantity: currentItem.value.quantity.toString(), // IsNumberString
      unitCost: currentItem.value.unitCost.toString(), // IsNumberString
      notes: currentItem.value.notes || undefined
    }

    await api.post('/purchase-return-items', payload)

    const prodDetails = products.value.find(p => p.id === currentItem.value.productId)

    savedItems.value.push({
      productId: currentItem.value.productId,
      productName: prodDetails?.name || 'Producto',
      sku: prodDetails?.sku || 'SKU',
      quantity: payload.quantity,
      unitCost: payload.unitCost,
      notes: payload.notes
    })

    currentItem.value = { productId: '', quantity: '', unitCost: '', notes: '' }
    successMessage.value = 'Producto asociado a la nota de devolución con éxito.'
  } catch (error: any) {
    console.error(error)
    errorMessage.value = error.response?.data?.message || 'Error al agregar el artículo a la devolución.'
  } finally {
    isSubmitting.value = false
  }
}

// Paso 3: Confirmar Nota de Devolución
async function handleConfirmReturn(id: string) {
  try {
    await api.patch(`/purchase-returns/${id}/confirm`)
    await loadReturnsModuleData()
  } catch (error: any) {
    alert(error.response?.data?.message || 'Error al confirmar.')
  }
}

// Paso 4: Completar Salida (Descuenta el stock físico)
async function handleCompleteReturn(id: string) {
  try {
    await api.patch(`/purchase-returns/${id}/complete`)
    await loadReturnsModuleData()
  } catch (error: any) {
    alert(error.response?.data?.message || 'Error al completar la salida física de stock.')
  }
}

// Cierre y reset desde el asistente maestro-detalle
async function handleFinalizeReturnFlow() {
  createdReturnId.value = null
  savedItems.value = []
  formReturn.value = { number: '', supplierId: '', purchaseOrderId: '', goodsReceiptId: '', returnDate: new Date().toISOString().split('T')[0], reason: '', notes: '' }
  activeTab.value = 'list'
  await loadReturnsModuleData()
}

function getStatusBadgeClass(status: string) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
    CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
    COMPLETED: 'bg-green-50 text-green-700 border-green-200',
    CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200'
  }
  return styles[status] || 'bg-slate-50 text-slate-700 border-slate-200'
}

function formatCurrency(value: number | string) {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(num)
}

onMounted(() => { loadReturnsModuleData() })
</script>
<template>
  <AppLayout>
    <header class="mb-6">
      <h1 class="text-3xl font-bold tracking-tight text-slate-900">Devoluciones a Proveedores</h1>
      <p class="mt-1 text-sm text-slate-500">Administra las notas de crédito, mermas de insumos defectuosos y egresos documentados de mercancía.</p>
    </header>

    <!-- Pestañas -->
    <div class="mb-6 border-b border-slate-200">
      <nav class="-mb-px flex space-x-6">
        <button type="button" @click="activeTab = 'list'" :class="[activeTab === 'list' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300', 'pb-4 text-sm font-medium border-b-2 transition-colors focus:outline-none']">
          📋 Historial de Devoluciones ({{ returns.length }})
        </button>
        <button type="button" @click="activeTab = 'create'" :class="[activeTab === 'create' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300', 'pb-4 text-sm font-medium border-b-2 transition-colors focus:outline-none']">
          ➕ Crear Nota de Devolución
        </button>
      </nav>
    </div>

    <!-- Alertas -->
    <div v-if="errorMessage" class="mb-4 bg-red-50 text-red-700 p-4 border border-red-200 rounded-xl text-sm">⚠️ {{ errorMessage }}</div>
    <div v-if="successMessage" class="mb-4 bg-green-50 text-green-700 p-4 border border-green-200 rounded-xl text-sm">🎉 {{ successMessage }}</div>

    <!-- Spinner -->
    <div v-if="isLoading" class="p-8 text-center text-sm font-medium text-slate-500 animate-pulse bg-white border border-slate-200 rounded-xl">
      Sincronizando devoluciones con NestJS...
    </div>

    <div v-else>
      <!-- TABLA DE CONTROL -->
      <div v-if="activeTab === 'list'" class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div v-if="returns.length === 0" class="p-8 text-center text-slate-400">No hay devoluciones radicadas en este periodo.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th class="px-6 py-3">Código Devolución</th>
                <th class="px-6 py-3">Proveedor</th>
                <th class="px-6 py-3">Documento Compra</th>
                <th class="px-6 py-3">Fecha / Motivo</th>
                <th class="px-6 py-3">Estado Workflow</th>
                <th class="px-6 py-3 text-center">Acciones Flujo</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-sans">
              <tr v-for="ret in returns" :key="ret.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4 font-mono font-bold text-slate-900">↩️ {{ ret.number }}</td>
                <td class="px-6 py-4 font-semibold text-slate-800">{{ ret.supplier?.companyName }}</td>
                <td class="px-6 py-4 font-mono text-xs text-blue-600 font-bold">📄 {{ ret.purchaseOrder?.number || 'Ref. Orden' }}</td>
                <td class="px-6 py-4 text-xs text-slate-600">
                  <div>📆 {{ new Date(ret.returnDate).toLocaleDateString('es-CO') }}</div>
                  <div v-if="ret.reason" class="text-slate-400 italic mt-0.5">"{{ ret.reason }}"</div>
                </td>
                <td class="px-6 py-4">
                  <span :class="[getStatusBadgeClass(ret.status), 'inline-block px-2.5 py-0.5 text-xs font-bold border rounded-md uppercase']">
                    {{ ret.status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-center whitespace-nowrap">
                  <div class="flex items-center justify-center space-x-2">
                    <button v-if="ret.status === 'DRAFT'" @click="handleConfirmReturn(ret.id)" type="button" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-2 py-1 rounded transition">
                      ✓ Confirmar
                    </button>
                    <button v-if="ret.status === 'CONFIRMED'" @click="handleCompleteReturn(ret.id)" type="button" class="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-2 py-1 rounded transition">
                      ⚡ Completar Salida
                    </button>
                    <span v-if="ret.status === 'COMPLETED'" class="text-xs text-slate-400 italic">Inventario Egresado</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- FORMULARIO MAESTRO-DETALLE (CORREGIDO) -->
      <div v-if="activeTab === 'create'" class="space-y-6 max-w-4xl">
        <!-- BLOQUE A: ENCABEZADO -->
        <div class="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
          <h3 class="text-lg font-bold text-slate-900 mb-4">1. Encabezado de la Nota de Devolución</h3>
          <form @submit.prevent="handleCreateReturnHeader" class="space-y-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="block text-sm font-semibold text-slate-700">Número Interno Devolución</label>
                <input v-model="formReturn.number" :disabled="!!createdReturnId" type="text" placeholder="Ej: DEV-2026-001" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700">Proveedor</label>
                <select v-model="formReturn.supplierId" :disabled="!!createdReturnId" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50">
                  <option value="" disabled>Selecciona el proveedor...</option>
                  <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.companyName }}</option>
                </select>
              </div>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="block text-sm font-semibold text-slate-700">Orden de Compra Relacionada</label>
                <select v-model="formReturn.purchaseOrderId" :disabled="!!createdReturnId" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50">
                  <option value="" disabled>Selecciona la orden...</option>
                  <option v-for="o in orders" :key="o.id" :value="o.id">Orden N°: {{ o.number }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700">ID del Recibo Físico (Opcional)</label>
                <input v-model="formReturn.goodsReceiptId" :disabled="!!createdReturnId" type="text" placeholder="UUID del Recibo..." class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none font-mono text-xs disabled:bg-slate-50" />
              </div>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="block text-sm font-semibold text-slate-700">Fecha de Devolución</label>
                <input v-model="formReturn.returnDate" :disabled="!!createdReturnId" type="date" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700">Motivo del Egreso</label>
                <input v-model="formReturn.reason" :disabled="!!createdReturnId" type="text" placeholder="Ej: Producto defectuoso..." class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50" />
              </div>
            </div>
            <button v-if="!createdReturnId" type="submit" :disabled="isSubmitting" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm shadow-sm">
              Guardar Nota e Ir a Ítems
            </button>
          </form>
        </div>

        <!-- BLOQUE B: CARGA DE ÍTEMS EN CALIENTE -->
        <div v-if="createdReturnId" class="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-6">
          <h3 class="text-lg font-bold text-slate-900">2. Desglosar Productos a Devolver</h3>

          <form @submit.prevent="handleAddItemToReturn" class="grid gap-4 sm:grid-cols-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label class="block text-sm font-semibold text-slate-700">Producto / Insumo</label>
              <select v-model="currentItem.productId" @change="handleProductChange" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm bg-white">
                <option value="" disabled>Selecciona un artículo...</option>
                <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} (SKU: {{ p.sku }})</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700">Cantidad Devuelta</label>
              <input v-model="currentItem.quantity" type="number" min="1" placeholder="Ej: 5" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm bg-white" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700">Costo Unitario ($)</label>
              <input v-model="currentItem.unitCost" type="number" min="0" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm bg-white" />
            </div>
                        <div class="sm:col-span-3 flex justify-between items-center pt-2 border-t border-slate-200 mt-2">
              <input v-model="currentItem.notes" type="text" placeholder="Observación específica de este artículo (Opcional)..." class="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white mr-4" />
              <button type="submit" :disabled="isSubmitting" class="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg text-sm whitespace-nowrap shadow-sm">
                ➕ Insertar Producto
              </button>
            </div>
          </form>

          <!-- TABLA TEMPORAL LOCAL -->
          <div class="border border-slate-200 rounded-lg overflow-hidden">
            <table class="w-full text-left text-sm">
              <thead class="bg-slate-50 text-slate-500 text-xs font-semibold uppercase">
                <tr>
                  <th class="px-6 py-2.5">SKU / Artículo</th>
                  <th class="px-6 py-2.5 text-right">Cantidad Egresada</th>
                  <th class="px-6 py-2.5 text-right">Costo Promedio</th>
                  <th class="px-6 py-3 text-right">Total Reversado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="(item, index) in savedItems" :key="index" class="bg-white">
                  <td class="px-6 py-3">
                    <div class="font-semibold text-slate-900">{{ item.productName }}</div>
                    <div class="text-xs font-mono text-slate-400">SKU: {{ item.sku }}</div>
                  </td>
                  <td class="px-6 py-3 text-right font-mono text-slate-700">{{ item.quantity }} uds</td>
                  <td class="px-6 py-3 text-right font-mono text-slate-500">{{ formatCurrency(item.unitCost) }}</td>
                  <td class="px-6 py-3 text-right font-mono font-bold text-rose-600">{{ formatCurrency(Number(item.quantity) * Number(item.unitCost)) }}</td>
                </tr>
                <tr v-if="savedItems.length === 0">
                  <td colspan="4" class="p-6 text-center text-slate-400 italic">No has insertado productos a esta nota de devolución todavía.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- BOTÓN FINALIZAR -->
          <div class="flex justify-end pt-4 border-t border-slate-200">
            <button type="button" @click="handleFinalizeReturnFlow" :disabled="savedItems.length === 0" class="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-3 rounded-xl text-sm shadow-md transition-colors">
              ✓ Finalizar Carga e Ir al Historial
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

