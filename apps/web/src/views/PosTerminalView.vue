<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

interface Product { id: string; name: string; sku: string; salePrice: number; barcode?: string }
interface Customer { id: string; firstName: string; lastName: string; email?: string }
interface CartItem { id?: string; product: Product; quantity: number; unitPrice: number; discount: number }
interface CashSession { id: string; status: 'OPEN' | 'CLOSED'; openingBalance: number }

// Control de flujos extendido para el Sprint 11
const hasActiveCashSession = ref(false)
const currentCashSessionId = ref<string | null>(null)
const openingBalanceInput = ref(200000) // Base por defecto sugerida (COP)

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

const showPaymentModal = ref(false)
const paymentMethod = ref<'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'TRANSFER'>('CASH')
const amountPaid = ref(0)

// KNA-069: Consultar si el cajero logueado ya cuenta con un turno abierto en NestJS
async function checkCashSessionStatus() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const userId = authStore.user?.id || ''
    const res = await api.get<CashSession | null>(`/cash-sessions/active?userId=${userId}`)

    if (res.data && res.data.status === 'OPEN') {
      hasActiveCashSession.value = true
      currentCashSessionId.value = res.data.id
    } else {
      hasActiveCashSession.value = false
      currentCashSessionId.value = null
    }
  } catch (error) {
    console.error('Error validando sesión de tesorería:', error)
  } finally {
    isLoading.value = false
  }
}

// KNA-068: Disparar la apertura formal del turno inyectando dinero en efectivo a la DB
// Reemplaza esta función exacta en tu sección <script> de PosTerminalView.vue
async function handleOpenCashRegister() {
  isSubmitting.value = true
  errorMessage.value = ''
  try {
    const payload = {
      organizationId: authStore.user?.organizationId || '',
      branchId: authStore.user?.branchId || '',
      userId: authStore.user?.id || '',
      openingBalance: Number(openingBalanceInput.value)
    }

    const res = await api.post('/cash-sessions/open', payload)
    currentCashSessionId.value = res.data.id
    hasActiveCashSession.value = true

    // CORREGIDO: Dispara la carga inmediata del catálogo al abrir la caja en el mismo instante
    await loadPosData()

    successMessage.value = '¡Caja abierta de forma exitosa! Terminal POS liberada para ventas.'
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message || 'Error abriendo el turno de caja.'
  } finally {
    isSubmitting.value = false
  }
}


async function loadPosData() {
  try {
    const [prodRes, custRes] = await Promise.all([
      api.get<Product[]>('/products'),
      api.get<Customer[]>('/customers')
    ])
    products.value = prodRes.data
    customers.value = custRes.data
  } catch (error) {
    errorMessage.value = 'Error al sincronizar el catálogo comercial del POS.'
  }
}

const filteredProducts = computed(() => {
  if (!searchQuery.value) return products.value
  const query = searchQuery.value.toLowerCase()
  return products.value.filter(p => p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query))
})

const cartSubtotal = computed(() => cart.value.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0))
const cartDiscount = computed(() => cart.value.reduce((acc, item) => acc + Number(item.discount), 0))
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

async function addToCart(product: Product) {
  if (!createdSaleId.value) return
  const existing = cart.value.find(item => item.product.id === product.id)
  const quantity = existing ? existing.quantity + 1 : 1
  const discount = existing ? existing.discount : 0

  try {
    const payload = { saleId: createdSaleId.value, productId: product.id, quantity, unitPrice: Number(product.salePrice), discount }
    const res = await api.post('/sale-items', payload)

    if (existing) {
      existing.quantity++
    } else {
      cart.value.push({ id: res.data.id, product, quantity: 1, unitPrice: Number(product.salePrice), discount: 0 })
    }
  } catch (error: any) {
    alert(error.response?.data?.message || 'Error al cargar el producto al checkout.')
  }
}

async function applyLineDiscount(item: any, amount: number) {
  if (!item.id) return
  try {
    await api.patch(`/sale-items/${item.id}`, { quantity: item.quantity, unitPrice: item.unitPrice, discount: Number(amount) })
    item.discount = Number(amount)
  } catch (error: any) {
    alert(error.response?.data?.message || 'No se pudo aplicar el descuento.')
  }
}

async function removeLineItem(item: any, index: number) {
  if (!item.id) return
  try {
    await api.delete(`/sale-items/${item.id}`)
    cart.value.splice(index, 1)
  } catch (error: any) {
    alert(error.response?.data?.message || 'Error al remover el producto.')
  }
}

async function handleFinalizeSale() {
  if (amountPaid.value < cartTotal.value && paymentMethod.value === 'CASH') {
    alert('El dinero recibido no cubre el monto neto total de la compra.')
    return
  }

  isSubmitting.value = true
  try {
    await api.post('/payments', { organizationId: authStore.user?.organizationId || '', saleId: createdSaleId.value, method: paymentMethod.value, amount: cartTotal.value })
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

onMounted(() => {
  checkCashSessionStatus().then(() => {
    if (hasActiveCashSession.value) loadPosData()
  })
})
</script>
<template>
  <AppLayout>
    <!-- Alertas Flotantes Globales -->
    <div v-if="errorMessage" class="mb-4 bg-red-50 text-red-700 p-4 border border-red-200 rounded-xl text-sm">⚠️ {{ errorMessage }}</div>
    <div v-if="successMessage" class="mb-4 bg-green-50 text-green-700 p-4 border border-green-200 rounded-xl text-sm">🎉 {{ successMessage }}</div>

    <!-- ESTADO DE CARGA MAESTRO -->
    <div v-if="isLoading" class="p-8 text-center text-sm font-medium text-slate-500 bg-white border border-slate-200 rounded-xl animate-pulse">
      Validando estado de turnos y tesorería en KUNA...
    </div>

    <div v-else>
      <!-- INTERFAZ CON CANDADO DE SEGURIDAD: SI NO HAY CAJA ABIERTA (KNA-069) -->
      <div v-if="!hasActiveCashSession" class="max-w-md mx-auto bg-white border border-slate-200 p-6 rounded-2xl shadow-xl mt-12 border-t-4 border-t-amber-500">
        <div class="text-center mb-6">
          <span class="text-4xl">🔒</span>
          <h2 class="text-lg font-black text-slate-900 mt-2">Terminal POS Bloqueada</h2>
          <p class="text-xs text-slate-400 mt-1">El sistema exige la apertura formal del turno antes de procesar transacciones.</p>
        </div>

        <form @submit.prevent="handleOpenCashRegister" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase">Monto Inicial en Efectivo (Base de Caja) *</label>
            <input v-model.number="openingBalanceInput" type="number" min="0" class="mt-1 w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-slate-50 font-mono font-bold focus:border-blue-500 focus:outline-none" required />
          </div>

          <button type="submit" :disabled="isSubmitting" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-xl text-xs shadow-md transition-colors uppercase tracking-wider">
            {{ isSubmitting ? 'Abriendo Turno...' : '🔓 Registrar Base y Habilitar POS' }}
          </button>
        </form>
      </div>

      <!-- INTERFAZ LIBERADA: SI HAY SESIÓN DE CAJA OPERANDO -->
      <div v-else>
        <!-- PASO A: CONFIGURACIÓN INICIAL / APERTURA FACTURA -->
        <div v-if="activeStep === 'header'" class="max-w-md mx-auto bg-white border border-slate-200 p-6 rounded-2xl shadow-sm mt-8">
          <div class="text-center mb-6">
            <span class="text-3xl">🎛️</span>
            <h2 class="text-xl font-black text-slate-900 mt-2">Apertura Factura</h2>
            <p class="text-xs text-slate-400 mt-1">Sincroniza la resolución fiscal activa y prepara un carro de compras.</p>
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

            <button type="submit" :disabled="isSubmitting" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm shadow-md transition-colors">
              {{ isSubmitting ? 'Validando...' : '⚡ Inicializar Carrito' }}
            </button>
          </form>
        </div>
        <!-- PASO B: CARRITO MAESTRO-DETALLE ACTIVO -->
        <div v-if="activeStep === 'checkout'" class="grid gap-6 lg:grid-cols-3 h-[calc(100vh-12rem)]">
          <!-- Catálogo de Artículos (Izquierda) -->
          <div class="lg:col-span-2 flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden p-4 shadow-sm">
            <div class="mb-4">
              <input v-model="searchQuery" type="text" placeholder="🔍 Buscar por nombre de insumo o SKU..." class="w-full border border-slate-300 rounded-xl p-3 text-sm focus:border-blue-500 focus:outline-none bg-slate-50" />
            </div>

            <div class="flex-1 overflow-y-auto grid gap-3 sm:grid-cols-2 lg:grid-cols-3 h-full pr-1">
              <div v-for="p in filteredProducts" :key="p.id" class="border border-slate-100 rounded-xl p-3 bg-slate-50/50 hover:bg-blue-50/30 transition-colors flex flex-col justify-between items-start">
                <div>
                  <div class="text-xs font-mono font-bold text-slate-400">SKU: {{ p.sku }}</div>
                  <div class="text-sm font-bold text-slate-900 mt-0.5">{{ p.name }}</div>
                </div>
                <div class="w-full flex justify-between items-center mt-4 pt-2 border-t border-slate-100">
                  <span class="font-mono font-black text-slate-950 text-sm">{{ formatCurrency(Number(p.salePrice)) }}</span>
                  <button @click="addToCart(p)" type="button" class="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-lg text-xs font-bold transition-all shadow-sm">➕ Añadir</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Bolsa Factura / Checkout Side (Derecha) -->
          <div class="bg-slate-900 text-white rounded-2xl p-4 flex flex-col justify-between shadow-lg relative border border-slate-950">
            <div>
              <div class="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                  <h3 class="text-sm font-black tracking-wide text-slate-200">Factura Activa</h3>
                  <p class="text-[10px] font-mono text-blue-400 font-bold mt-0.5">Consecutivo: {{ assignedSaleNumber }}</p>
                </div>
                <span class="text-xs bg-blue-950 text-blue-400 border border-blue-900 font-black px-2 py-0.5 rounded uppercase">DRAFT</span>
              </div>

              <!-- Renglones Factura -->
              <div class="mt-4 space-y-2 overflow-y-auto max-h-[calc(100vh-28rem)] pr-1">
                <div v-for="(item, index) in cart" :key="index" class="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div class="flex justify-between items-start">
                    <div>
                      <div class="text-xs font-bold text-slate-100">{{ item.product.name }}</div>
                      <div class="text-[10px] font-mono text-slate-400 mt-0.5">{{ item.quantity }} uds x {{ formatCurrency(item.unitPrice) }}</div>
                    </div>
                    <button @click="removeLineItem(item, index)" type="button" class="text-slate-500 hover:text-rose-400 text-xs">🗑️</button>
                  </div>
                  <div class="flex items-center justify-between pt-1 border-t border-slate-900/60 text-[11px]">
                    <div class="flex items-center space-x-1">
                      <span class="text-slate-500">Desc:</span>
                      <input :value="item.discount" @change="applyLineDiscount(item, ($event.target as HTMLInputElement).value)" type="number" class="w-16 bg-slate-900 border border-slate-700 rounded text-right font-mono text-xs text-rose-400 focus:outline-none" />
                    </div>
                    <div class="font-mono font-bold text-slate-200">{{ formatCurrency((item.quantity * item.unitPrice) - item.discount) }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bloque de Totales -->
            <div class="border-t border-slate-800 pt-4 bg-slate-900 z-10">
              <div class="space-y-1.5 text-xs text-slate-400">
                <div class="flex justify-between"><span>Subtotal Bruto:</span><span>{{ formatCurrency(cartSubtotal) }}</span></div>
                <div class="flex justify-between text-rose-400"><span>Descuentos:</span><span>- {{ formatCurrency(cartDiscount) }}</span></div>
                <div class="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                  <span>TOTAL NETO:</span><span class="font-mono text-green-400">{{ formatCurrency(cartTotal) }}</span>
                </div>
              </div>
              <button @click="showPaymentModal = true" :disabled="cart.length === 0" type="button" class="w-full bg-green-500 hover:bg-green-600 text-slate-950 font-black py-3.5 rounded-xl text-sm mt-4 shadow-md transition-all uppercase">✓ Procesar Cobro</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL DE COBRO PASARELA -->
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
            <option value="TRANSFER">📱 Transferencia Digital</option>
          </select>
        </div>

        <div v-if="paymentMethod === 'CASH'">
          <label class="block text-xs font-bold text-slate-700 uppercase">Efectivo Recibido ($)</label>
          <input v-model.number="amountPaid" type="number" class="mt-1 w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-slate-50 font-mono font-bold focus:outline-none" />
          <div class="mt-3 flex justify-between items-center bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-xs font-semibold text-blue-700">
            <span>Cambio / Vueltas:</span><span class="font-mono text-sm font-black">{{ formatCurrency(cashChange) }}</span>
          </div>
        </div>

        <button @click="handleFinalizeSale" :disabled="isSubmitting" type="button" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl text-xs uppercase">
          {{ isSubmitting ? 'Egresando...' : 'Sellar y Emitir Factura POS' }}
        </button>
      </div>
    </div>
  </AppLayout>
</template>
