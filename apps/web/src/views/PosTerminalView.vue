<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

interface Product { id: string; name: string; sku: string; salePrice: number; barcode?: string }
interface Customer { id: string; firstName: string; lastName: string; email?: string }
interface CartItem {
  product: Product
  quantity: number
  unitPrice: number
  discount: number
}

const activeStep = ref<'header' | 'checkout'>('header')
const products = ref<Product[]>([])
const customers = ref<Customer[]>([])
const searchQuery = ref('')
const selectedCustomerId = ref('')
const notes = ref('')

const createdSaleId = ref<string | null>(null)
const assignedSaleNumber = ref('')
const cart = ref<CartItem[]>([])

const isLoading = ref(true)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Modal de Cierre de Caja / Pago
const showPaymentModal = ref(false)
const paymentMethod = ref<'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'TRANSFER'>('CASH')
const amountPaid = ref(0)

async function loadPosData() {
  isLoading.value = true
  try {
    const [prodRes, custRes] = await Promise.all([
      api.get<Product[]>('/products'),
      api.get<Customer[]>('/customers')
    ])
    products.value = prodRes.data
    customers.value = custRes.data
  } catch (error) {
    errorMessage.value = 'Error al sincronizar el catálogo comercial del POS.'
  } finally {
    isLoading.value = false
  }
}

const filteredProducts = computed(() => {
  if (!searchQuery.value) return products.value
  const query = searchQuery.value.toLowerCase()
  return products.value.filter(p => p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query))
})

const cartSubtotal = computed(() => {
  return cart.value.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0)
})

const cartDiscount = computed(() => {
  return cart.value.reduce((acc, item) => acc + Number(item.discount), 0)
})
const cartTotal = computed(() => cartSubtotal.value - cartDiscount.value)
const cashChange = computed(() => Math.max(0, amountPaid.value - cartTotal.value))

async function handleInitializeSale() {
  isSubmitting.value = true
  errorMessage.value = ''
  try {
    const payload = {
      organizationId: authStore.user?.organizationId || '',
      branchId: authStore.user?.branchId || '',
      customerId: selectedCustomerId.value || undefined,
      notes: notes.value || undefined
    }

    const res = await api.post('/sales', payload)
    createdSaleId.value = res.data.id
    assignedSaleNumber.value = res.data.saleNumber
    activeStep.value = 'checkout'
    amountPaid.value = 0
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message || 'Falta la resolución de facturación activa para esta sucursal.'
  } finally {
    isSubmitting.value = false
  }
}

// 1. Modificar la función addToCart existente para que refleje los totales en la grilla local al insertar
async function addToCart(product: Product) {
  if (!createdSaleId.value) return

  const existing = cart.value.find(item => item.product.id === product.id)
  const quantity = existing ? existing.quantity + 1 : 1
  const discount = existing ? existing.discount : 0

  try {
    const payload = {
      saleId: createdSaleId.value,
      productId: product.id,
      quantity,
      unitPrice: Number(product.salePrice),
      discount
    }

    // Tu backend responde con el id único del SaleItem creado/actualizado
    const res = await api.post('/sale-items', payload)

    if (existing) {
      existing.quantity++
    } else {
      // Guardamos el ID que retorna tu API para poder hacer PATCH o DELETE individual después
      cart.value.push({
        id: res.data.id, // ID relacional de la tabla de la base de datos
        product,
        quantity: 1,
        unitPrice: Number(product.salePrice),
        discount: 0
      })
    }
    // Refrescar totales de cabecera llamando a tu GET /sales/:id
    await refreshSaleTotals()
  } catch (error: any) {
    alert(error.response?.data?.message || 'Error al cargar el producto al checkout.')
  }
}

// 2. NUEVA: Función para aplicar descuentos en dinero sobre la línea (KNA-054 Backend / DTO)
async function applyLineDiscount(item: any, amount: number) {
  if (!item.id) return
  try {
    const payload = {
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: Number(amount)
    }
    await api.patch(`/sale-items/${item.id}`, payload)
    item.discount = Number(amount)
    await refreshSaleTotals()
  } catch (error: any) {
    alert(error.response?.data?.message || 'No se pudo aplicar el descuento.')
  }
}

// 3. NUEVA: Función para remover o decrementar un ítem completo de la grilla (sale-items.delete)
// Reemplaza estas dos funciones en tu sección <script> de PosTerminalView.vue

async function removeLineItem(item: any, index: number) {
  if (!item.id) return
  try {
    // 1. Elimina físicamente el ítem de la base de datos de NestJS
    await api.delete(`/sale-items/${item.id}`)

    // 2. Lo remueve del arreglo local de Vue
    cart.value.splice(index, 1)

    // 3. Forzar el refresco de totales sincronizando con la respuesta del servidor
    await refreshSaleTotals()

    console.log('Ítem eliminado y totales del carrito recalculados.')
  } catch (error: any) {
    console.error(error)
    alert(error.response?.data?.message || 'Error al remover el producto de la lista.')
  }
}

async function refreshSaleTotals() {
  if (!createdSaleId.value) return
  try {
    // Consultamos la cabecera actualizada que calcula tu backend
    const res = await api.get(`/sales/${createdSaleId.value}`)

    // Si tu API retorna la cabecera pero el computed local necesita reactividad forzada,
    // re-mapeamos el arreglo del carrito para disparar el renderizador de Vue
    cart.value = [...cart.value]

  } catch (error) {
    console.error('Error al sincronizar totales con la cabecera:', error)
  }
}



async function handleFinalizeSale() {
  if (amountPaid.value < cartTotal.value && paymentMethod.value === 'CASH') {
    alert('El dinero recibido no cubre el monto neto total de la compra.')
    return
  }

  isSubmitting.value = true
  try {
    await api.post('/payments', {
      organizationId: authStore.user?.organizationId || '',
      saleId: createdSaleId.value,
      method: paymentMethod.value,
      amount: cartTotal.value
    })

    await api.patch(`/sales/${createdSaleId.value}/confirm`)

    successMessage.value = `¡Venta ${assignedSaleNumber.value} cobrada y stock descontado con éxito!`

    createdSaleId.value = null
    assignedSaleNumber.value = ''
    cart.value = []
    selectedCustomerId.value = ''
    notes.value = ''
    showPaymentModal.value = false
    activeStep.value = 'header'
  } catch (error: any) {
    alert(error.response?.data?.message || 'Error crítico de inventario en el checkout.')
  } finally {
    isSubmitting.value = false
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
}

onMounted(() => { loadPosData() })
</script>
<template>
  <AppLayout>
    <!-- Alertas Flotantes Globales -->
    <div v-if="errorMessage" class="mb-4 bg-red-50 text-red-700 p-4 border border-red-200 rounded-xl text-sm">⚠️ {{ errorMessage }}</div>
    <div v-if="successMessage" class="mb-4 bg-green-50 text-green-700 p-4 border border-green-200 rounded-xl text-sm">🎉 {{ successMessage }}</div>

    <!-- PASO A: CONFIGURACIÓN INICIAL / APERTURA FACTURA -->
    <div v-if="activeStep === 'header'" class="max-w-md mx-auto bg-white border border-slate-200 p-6 rounded-2xl shadow-sm mt-8">
      <div class="text-center mb-6">
        <span class="text-3xl">🎛️</span>
        <h2 class="text-xl font-black text-slate-900 mt-2">Apertura Terminal POS</h2>
        <p class="text-xs text-slate-400 mt-1">Sincroniza la resolución fiscal activa y prepara un carro de compras en caliente.</p>
      </div>

      <form @submit.prevent="handleInitializeSale" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase">Vincular Cliente (Opcional)</label>
          <select v-model="selectedCustomerId" class="mt-1 w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-slate-50 focus:border-blue-500 focus:outline-none">
            <option value="">👤 Venta de Mostrador / Cliente Anónimo</option>
            <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.firstName }} {{ c.lastName || '' }}</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase">Observación General de Venta</label>
          <input v-model="notes" type="text" placeholder="Ej: Despacho para llevar..." class="mt-1 w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-slate-50 focus:border-blue-500 focus:outline-none" />
        </div>

        <button type="submit" :disabled="isSubmitting" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm shadow-md transition-colors disabled:opacity-50">
          {{ isSubmitting ? 'Validando Resolución...' : '⚡ Inicializar Caja / Venta' }}
        </button>
      </form>
    </div>

    <!-- PASO B: CARRITO MAESTRO-DETALLE ACTIVO -->
    <div v-if="activeStep === 'checkout'" class="grid gap-6 lg:grid-cols-3 h-[calc(100vh-12rem)]">
      <!-- Catálogo de Artículos (Izquierda) -->
      <div class="lg:col-span-2 flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden p-4 shadow-sm">
        <div class="mb-4">
          <input v-model="searchQuery" type="text" placeholder="🔍 Buscar por nombre de insumo o SKU de catálogo..." class="w-full border border-slate-300 rounded-xl p-3 text-sm focus:border-blue-500 focus:outline-none bg-slate-50" />
        </div>

        <div class="flex-1 overflow-y-auto grid gap-3 sm:grid-cols-2 lg:grid-cols-3 h-full pr-1">
          <div v-for="p in filteredProducts" :key="p.id" class="border border-slate-100 rounded-xl p-3 bg-slate-50/50 hover:bg-blue-50/30 transition-colors flex flex-col justify-between items-start">
            <div>
              <div class="text-xs font-mono font-bold text-slate-400">SKU: {{ p.sku }}</div>
              <div class="text-sm font-bold text-slate-900 mt-0.5">{{ p.name }}</div>
            </div>
            <div class="w-full flex justify-between items-center mt-4 pt-2 border-t border-slate-100">
              <span class="font-mono font-black text-slate-950 text-sm">{{ formatCurrency(Number(p.salePrice)) }}</span>
              <button @click="addToCart(p)" type="button" class="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-lg text-xs font-bold transition-all shadow-sm">
                ➕ Añadir
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Renglones Factura / Checkout Side (Derecha) -->
      <div class="bg-slate-900 text-white rounded-2xl p-4 flex flex-col justify-between shadow-lg relative border border-slate-950">
        <div>
          <div class="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 class="text-sm font-black tracking-wide text-slate-200">Factura Activa</h3>
              <p class="text-[10px] font-mono text-blue-400 font-bold mt-0.5">Consecutivo: {{ assignedSaleNumber }}</p>
            </div>
            <span class="text-xs bg-blue-950 text-blue-400 border border-blue-900 font-black px-2 py-0.5 rounded uppercase">DRAFT</span>
          </div>

          <!-- Tabla de Renglones -->
          <!-- REEMPLAZO EN EL PANEL NEGRO DE POSTERMINALVIEW.VUE -->
<div class="mt-4 space-y-2 overflow-y-auto max-h-[calc(100vh-28rem)] pr-1">
  <div v-for="(item, index) in cart" :key="index" class="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
    <div class="flex justify-between items-start">
      <div>
        <div class="text-xs font-bold text-slate-100">{{ item.product.name }}</div>
        <div class="text-[10px] font-mono text-slate-400 mt-0.5">{{ item.quantity }} uds x {{ formatCurrency(item.unitPrice) }}</div>
      </div>

      <!-- BOTÓN REVOLUCIONARIO DE ELIMINAR LÍNEA -->
      <button @click="removeLineItem(item, index)" type="button" class="text-slate-500 hover:text-rose-400 text-xs font-bold p-1 transition-colors" title="Remover del carrito">
        🗑️
      </button>
    </div>

    <!-- CONTROLES INFERIORES DE DESCUENTOS EN CALIENTE -->
    <div class="flex items-center justify-between pt-1.5 border-t border-slate-900/60 text-[11px]">
      <div class="flex items-center space-x-1">
        <span class="text-slate-500">Desc ($):</span>
        <input
          :value="item.discount"
          @change="applyLineDiscount(item, ($event.target as HTMLInputElement).value)"
          type="number"
          min="0"
          class="w-16 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-right font-mono text-xs text-rose-400 focus:outline-none focus:border-rose-500"
        />
      </div>
      <div class="text-right font-mono font-bold text-slate-200">
        {{ formatCurrency((item.quantity * item.unitPrice) - item.discount) }}
      </div>
    </div>
  </div>
  <div v-if="cart.length === 0" class="text-center text-xs text-slate-500 italic pt-8">El carro de cobro se encuentra vacío.</div>
</div>

        </div>

        <!-- Bloque de Totales -->
        <div class="border-t border-slate-800 pt-4 bg-slate-900 z-10">
          <div class="space-y-1.5 text-xs text-slate-400">
            <div class="flex justify-between"><span>Subtotal Bruto:</span><span class="font-mono text-slate-200">{{ formatCurrency(cartSubtotal) }}</span></div>
            <div class="flex justify-between text-rose-400"><span>Descuentos Aplicados:</span><span class="font-mono">- {{ formatCurrency(cartDiscount) }}</span></div>
            <div class="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
              <span>TOTAL NETO:</span>
              <span class="font-mono text-xl text-green-400">{{ formatCurrency(cartTotal) }}</span>
            </div>
          </div>

          <button @click="showPaymentModal = true" :disabled="cart.length === 0" type="button" class="w-full bg-green-500 hover:bg-green-600 text-slate-950 font-black py-3.5 rounded-xl text-sm mt-4 shadow-md transition-all uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed">
            ✓ Procesar Cobro Factura
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL DE COBRO TRANSACCIONAL -->
    <div v-if="showPaymentModal" class="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div class="bg-white rounded-2xl border p-6 max-w-md w-full shadow-2xl space-y-4">
        <div class="flex justify-between items-center border-b pb-2">
          <h3 class="text-base font-black text-slate-900">Pasarela de Pago Terminal POS</h3>
          <button @click="showPaymentModal = false" type="button" class="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
        </div>

        <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total a Recibir</span>
          <div class="text-2xl font-mono font-black text-slate-950 mt-0.5">{{ formatCurrency(cartTotal) }}</div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase">Método de Dispersión</label>
          <select v-model="paymentMethod" class="mt-1 w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-slate-50 font-semibold focus:outline-none">
            <option value="CASH">💵 Dinero en Efectivo</option>
            <option value="CREDIT_CARD">💳 Tarjeta de Crédito</option>
            <option value="DEBIT_CARD">🏦 Tarjeta de Débito</option>
            <option value="TRANSFER">📱 Transferencia Digital (Nequi/Daviplata)</option>
          </select>
        </div>

        <div v-if="paymentMethod === 'CASH'">
          <label class="block text-xs font-bold text-slate-700 uppercase">Efectivo Recibido ($)</label>
          <input v-model.number="amountPaid" type="number" min="0" placeholder="Ej: 50000" class="mt-1 w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:border-blue-500 focus:outline-none bg-slate-50 font-mono font-bold" />

          <div class="mt-3 flex justify-between items-center bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-xs font-semibold text-blue-700">
            <span>Cambio / Vueltas:</span>
            <span class="font-mono text-sm font-black">{{ formatCurrency(cashChange) }}</span>
          </div>
        </div>

        <button @click="handleFinalizeSale" :disabled="isSubmitting" type="button" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl text-xs transition-colors shadow-md uppercase tracking-wider">
          {{ isSubmitting ? 'Egresando Inventario...' : 'Sellar y Emitir Factura POS' }}
        </button>
      </div>
    </div>
  </AppLayout>
</template>
