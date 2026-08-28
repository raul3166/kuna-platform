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

// Control de Caja (Sprint 11)
const hasActiveCashSession = ref(false)
const currentCashSessionId = ref<string | null>(null)
const openingBalanceInput = ref(200000)

const products = ref<Product[]>([])
const customers = ref<Customer[]>([])
const searchQuery = ref('')
const selectedCustomerId = ref('')
const notes = ref('')

// El Carrito de compras ahora opera 100% EN MEMORAL LOCAL
const cart = ref<CartItem[]>([])

const isLoading = ref(true)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Modal de Cierre de Caja / Pago
const showPaymentModal = ref(false)
const showCloseBoxModal = ref(false)
const actualBalanceInput = ref(0)
const closeNotes = ref('')
const paymentMethod = ref<'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'TRANSFER'>('CASH')
const amountPaid = ref(0)

// Consultar sesión de caja activa
// --- CORRECCIÓN INTEGRAL DE FLUJO DE CAJA (KNA-069) ---
async function checkCashSessionStatus() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const userId = authStore.user?.id || ''
    // Consultamos si el cajero ya cuenta con un turno OPEN en la base de datos
    const res = await api.get(`/cash-sessions/active?userId=${userId}`)

    // CORREGIDO: Validamos con total precisión si el registro existe físicamente
    if (res.data && res.data.id) {
      hasActiveCashSession.value = true
      currentCashSessionId.value = res.data.id
      await loadPosData() // Cargamos el catálogo automáticamente
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


// Registrar apertura de caja
async function handleOpenCashRegister() {
  isSubmitting.value = true
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
    await loadPosData()
    successMessage.value = '¡Caja abierta de forma exitosa! Terminal POS liberada.'
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message || 'Error abriendo el turno de caja.'
  } finally {
    isSubmitting.value = false
  }
}

// Cargar catálogo maestro
async function loadPosData() {
  try {
    const [prodRes, custRes] = await Promise.all([
      api.get<Product[]>('/products'),
      api.get<Customer[]>('/customers')
    ])
    products.value = prodRes.data
    customers.value = custRes.data
  } catch (error) {
    errorMessage.value = 'Error al sincronizar el catálogo comercial.'
  }
}

const filteredProducts = computed(() => {
  if (!searchQuery.value) return products.value
  const query = searchQuery.value.toLowerCase()
  return products.value.filter(p => p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query))
})

// Totales locales reactivos ultrarápidos
const cartSubtotal = computed(() => cart.value.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0))
const cartDiscount = computed(() => cart.value.reduce((acc, item) => acc + Number(item.discount), 0))
const cartTotal = computed(() => cartSubtotal.value - cartDiscount.value)
const cashChange = computed(() => Math.max(0, amountPaid.value - cartTotal.value))

// AGREGAR AL CARRITO LOCALMENTE (No toca la base de datos)
function addToCart(product: Product) {
  const existing = cart.value.find(item => item.product.id === product.id)
  if (existing) {
    existing.quantity++
  } else {
    cart.value.push({ product, quantity: 1, unitPrice: Number(product.salePrice), discount: 0 })
  }
}

// MODIFICAR DESCUENTO LOCALMENTE
function updateLineDiscount(item: CartItem, discountValue: string) {
  item.discount = Number(discountValue) || 0
}

// REMOVER DEL CARRITO LOCALMENTE
function removeLineItem(index: number) {
  cart.value.splice(index, 1)
}

// PROCESAR COBRO: SE CONSOLIDA Y PERSISTE EN LA DB TODO EN UN SOLO CLIC
// --- INYECCIÓN SPRINT 13: METADATOS DE IMPRESIÓN TÉRMICA ---
const showInvoiceSuccessModal = ref(false)
const lastPrintedInvoice = ref<any>(null) // Almacena el JSON de la última factura confirmada

// Driver nativo del navegador para lanzar el cuadro de diálogo de impresión de la tirilla
function triggerNativePrint() {
  setTimeout(() => {
    window.print()
  }, 300)
}

// NUEVA COMPLEMENTADA: Modificaremos handleFinalizeSale para que capture los datos del ticket antes de limpiar el carro
async function handleFinalizeSale() {
  if (amountPaid.value < cartTotal.value && paymentMethod.value === 'CASH') {
    alert('El dinero recibido no cubre el monto neto total de la compra.')
    return
  }

  isSubmitting.value = true
  try {
    // 1. Persistir Cabecera
    const salePayload = {
      organizationId: authStore.user?.organizationId || '',
      branchId: authStore.user?.branchId || '',
      customerId: selectedCustomerId.value || undefined,
      notes: notes.value || undefined
    }
    const saleRes = await api.post('/sales', salePayload)
    const saleId = saleRes.data.id

    // 2. Persistir Ítems de forma síncrona encadenada
    for (const item of cart.value) {
      await api.post('/sale-items', {
        saleId,
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount
      })
    }

    // 3. Persistir Pago
    await api.post('/payments', {
      organizationId: authStore.user?.organizationId || '',
      saleId,
      method: paymentMethod.value,
      amount: cartTotal.value
    })

    // 4. Confirmar y Sellar (Esto genera los totales finales en el backend)
    const confirmRes = await api.patch(`/sales/${saleId}/confirm`)

    // 5. CAPTURA CRÍTICA: Traemos la factura completa procesada con sus relaciones profundas para el ticket
    const invoiceDetail = await api.get(`/sales/${saleId}`)

    // Almacenamos el JSON enriquecido listo para el render térmico
    lastPrintedInvoice.value = {
      ...invoiceDetail.data,
      paymentMethod: paymentMethod.value,
      amountPaid: amountPaid.value,
      cashChange: cashChange.value,
      cashierName: `${authStore.user?.firstName || 'Operador'} ${authStore.user?.lastName || ''}`
    }

    // Levantamos la ventana de éxito de facturación
    showInvoiceSuccessModal.value = true

    // Resetear el carro de compras local de forma segura para la siguiente venta
    cart.value = []
    selectedCustomerId.value = ''
    notes.value = ''
    showPaymentModal.value = false
    amountPaid.value = 0
  } catch (error: any) {
    alert(error.response?.data?.message || 'Error crítico procesando la transacción de venta.')
  } finally {
    isSubmitting.value = false
  }
}


// Arqueo y Cierre de caja
async function handleCloseCashRegister() {
  if (!currentCashSessionId.value) return
  isSubmitting.value = true
  try {
    const res = await api.patch(`/cash-sessions/${currentCashSessionId.value}/close`, {
      actualBalance: Number(actualBalanceInput.value),
      notes: closeNotes.value || undefined
    })
    const diff = Number(res.data.difference)
    alert(diff === 0 ? '¡Caja cerrada! Turno cuadrado perfectamente.' : `Caja cerrada. Descuadre: ${formatCurrency(diff)}`)
    hasActiveCashSession.value = false
    currentCashSessionId.value = null
    showCloseBoxModal.value = false
    cart.value = []
  } catch (error: any) {
    alert(error.response?.data?.message || 'Error en el arqueo.')
  } finally {
    isSubmitting.value = false
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
}

onMounted(() => { checkCashSessionStatus() })
</script>
<template>
  <AppLayout>
    <!-- Alertas Flotantes Globales -->
    <div v-if="errorMessage" class="mb-4 bg-red-50 text-red-700 p-4 border border-red-200 rounded-xl text-sm">⚠️ {{ errorMessage }}</div>
    <div v-if="successMessage" class="mb-4 bg-green-50 text-green-700 p-4 border border-green-200 rounded-xl text-sm">🎉 {{ successMessage }}</div>

    <!-- CARGA DE DATOS -->
    <div v-if="isLoading" class="p-8 text-center text-sm font-medium text-slate-500 bg-white border border-slate-200 rounded-xl animate-pulse">
      Validando estado de turnos y tesorería en KUNA...
    </div>

    <div v-else>
      <!-- INTERFAZ CON CANDADO DE CAJA CERRADA -->
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
          <button type="submit" :disabled="isSubmitting" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow-md">
            {{ isSubmitting ? 'Abriendo Turno...' : '🔓 Registrar Base y Habilitar POS' }}
          </button>
        </form>
      </div>

      <!-- INTERFAZ DE PUNTO DE VENTA LIBERADA -->
      <div v-else class="grid gap-6 lg:grid-cols-3 h-[calc(100vh-10rem)]">
        <!-- Panel del Catálogo de Productos (Izquierda) -->
        <div class="lg:col-span-2 flex flex-col bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div class="mb-4 flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div class="flex items-center space-x-2">
              <span class="inline-block w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></span>
              <span class="text-xs font-bold text-slate-700">Caja Operativa Habilitada</span>
            </div>
            <button @click="showCloseBoxModal = true" type="button" class="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs tracking-wide transition-colors">
              🔒 Hacer Arqueo / Cerrar Caja
            </button>
          </div>

          <div class="mb-4">
            <input v-model="searchQuery" type="text" placeholder="🔍 Buscar por nombre de insumo o SKU de catálogo..." class="w-full border border-slate-300 rounded-xl p-3 text-sm focus:border-blue-500 focus:outline-none bg-slate-50" />
          </div>

          <div class="flex-1 overflow-y-auto grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pr-1">
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
        <!-- Panel Lateral del Carrito de Compras (Derecha) -->
        <div class="bg-slate-900 text-white rounded-2xl p-4 flex flex-col justify-between shadow-lg border border-slate-950">
          <div class="space-y-4">
            <div class="border-b border-slate-800 pb-3">
              <h3 class="text-sm font-black tracking-wide text-slate-200">Carrito de Cobro POS</h3>
              <p class="text-[10px] text-slate-400 mt-0.5">Agrega productos e indexa los metadatos comerciales.</p>
            </div>

            <div class="space-y-2 text-slate-900">
              <select v-model="selectedCustomerId" class="w-full border border-slate-700 rounded-xl p-2 text-xs bg-slate-800 text-slate-200 focus:outline-none">
                <option value="">👤 Venta de Mostrador / Cliente Anónimo</option>
                <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.firstName }} {{ c.lastName || '' }}</option>
              </select>
              <input v-model="notes" type="text" placeholder="📝 Notas de factura (Ej: Mesa 3, Para llevar...)" class="w-full border border-slate-700 rounded-xl p-2 text-xs bg-slate-800 text-slate-200 focus:outline-none placeholder-slate-500" />
            </div>

            <div class="mt-4 space-y-2 overflow-y-auto max-h-[calc(100vh-28rem)] pr-1">
              <div v-for="(item, index) in cart" :key="index" class="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
                <div class="flex justify-between items-start">
                  <div>
                    <div class="text-xs font-bold text-slate-100">{{ item.product.name }}</div>
                    <div class="text-[10px] font-mono text-slate-400 mt-0.5">{{ item.quantity }} uds x {{ formatCurrency(item.unitPrice) }}</div>
                  </div>
                  <button @click="removeLineItem(index)" type="button" class="text-slate-500 hover:text-rose-400 text-xs transition-colors">🗑️</button>
                </div>
                <div class="flex items-center justify-between pt-1.5 border-t border-slate-900/60 text-[11px]">
                  <div class="flex items-center space-x-1">
                    <span class="text-slate-500">Desc ($):</span>
                    <input :value="item.discount" @input="updateLineDiscount(item, ($event.target as HTMLInputElement).value)" type="number" min="0" class="w-16 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-right font-mono text-xs text-rose-400 focus:outline-none" />
                  </div>
                  <div class="font-mono font-bold text-slate-200">
                    {{ formatCurrency((item.quantity * item.unitPrice) - item.discount) }}
                  </div>
                </div>
              </div>
              <div v-if="cart.length === 0" class="text-center text-xs text-slate-500 italic pt-8">El carro de cobro se encuentra vacío.</div>
            </div>
          </div>

          <div class="border-t border-slate-800 pt-4 bg-slate-900 z-10">
            <div class="space-y-1.5 text-xs text-slate-400">
              <div class="flex justify-between"><span>Subtotal Bruto:</span><span class="font-mono text-slate-200">{{ formatCurrency(cartSubtotal) }}</span></div>
              <div class="flex justify-between text-rose-400"><span>Descuentos:</span><span class="font-mono">- {{ formatCurrency(cartDiscount) }}</span></div>
              <div class="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                <span>TOTAL NETO:</span>
                <span class="font-mono text-xl text-green-400">{{ formatCurrency(cartTotal) }}</span>
              </div>
            </div>

            <button @click="showPaymentModal = true" :disabled="cart.length === 0" type="button" class="w-full bg-green-500 hover:bg-green-600 text-slate-950 font-black py-3.5 rounded-xl text-sm mt-4 shadow-md transition-all uppercase tracking-wider disabled:opacity-40">
              ✓ Procesar Cobro
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- MODAL DE PASARELA DE PAGO -->
    <div v-if="showPaymentModal" class="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-2xl border p-6 max-w-md w-full shadow-2xl space-y-4">
        <div class="flex justify-between items-center border-b pb-2">
          <h3 class="text-base font-black text-slate-900">Pasarela de Pago Terminal</h3>
          <button @click="showPaymentModal = false" type="button" class="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
        </div>

        <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total a Recibir</span>
          <div class="text-2xl font-mono font-black text-slate-950 mt-0.5">{{ formatCurrency(cartTotal) }}</div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase">Método de Dispersión</label>
          <select v-model="paymentMethod" class="mt-1 w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-slate-50 font-semibold focus:outline-none text-slate-900">
            <option value="CASH">💵 Dinero en Efectivo</option>
            <option value="CREDIT_CARD">💳 Tarjeta de Crédito</option>
            <option value="DEBIT_CARD">🏦 Tarjeta de Débito</option>
            <option value="TRANSFER">📱 Transferencia Digital</option>
          </select>
        </div>

        <div v-if="paymentMethod === 'CASH'" class="space-y-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase">Efectivo Recibido ($) *</label>
            <input v-model.number="amountPaid" type="number" min="0" placeholder="Ej: 70000" class="mt-1 w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:border-blue-500 focus:outline-none bg-slate-50 font-mono font-bold text-slate-900" required />
          </div>
          <div class="flex justify-between items-center bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-xs font-semibold text-blue-700">
            <span>Cambio / Vueltas:</span>
            <span class="font-mono text-sm font-black">{{ formatCurrency(cashChange) }}</span>
          </div>
        </div>

        <button @click="handleFinalizeSale" :disabled="isSubmitting" type="button" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-colors mt-2">
          {{ isSubmitting ? 'Egresando Inventario...' : 'Sellar y Emitir Factura POS' }}
        </button>
      </div>
    </div>

    <!-- MODAL DE ÉXITO DE VENTA E IMPRESIÓN -->
    <div v-if="showInvoiceSuccessModal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-2xl border p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
        <span class="text-4xl">🎉</span>
        <h3 class="text-lg font-black text-slate-900">¡Factura Emitida con Éxito!</h3>
        <p class="text-xs text-slate-500">El consecutivo fiscal ha sido sellado y los inventarios se redujeron correctamente.</p>

        <div class="grid gap-2 pt-2">
          <button @click="triggerNativePrint" type="button" class="w-full bg-green-500 hover:bg-green-600 text-slate-950 font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow-md">
            🖨️ Imprimir Recibo Térmico (80mm)
          </button>
          <button @click="showInvoiceSuccessModal = false" type="button" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider">
            ✕ Cerrar y Nueva Venta
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL DE ARQUEO Y CIERRE DE CAJA -->
    <div v-if="showCloseBoxModal" class="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-2xl border p-6 max-w-md w-full shadow-2xl space-y-4">
        <div class="flex justify-between items-center border-b pb-2">
          <h3 class="text-base font-black text-slate-900">Arqueo General de Caja (Cierre)</h3>
          <button @click="showCloseBoxModal = false" type="button" class="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
        </div>

        <form @submit.prevent="handleCloseCashRegister" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase">Efectivo Físico Contado ($) *</label>
            <input v-model.number="actualBalanceInput" type="number" min="0" placeholder="Ej: 250000" class="mt-1 w-full border border-slate-300 rounded-xl p-2.5 text-sm font-mono font-bold focus:border-blue-500 focus:outline-none bg-slate-50 text-slate-900" required />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase">Novedades / Observaciones de Cierre</label>
            <textarea v-model="closeNotes" rows="2" placeholder="Ej: Turno en orden..." class="mt-1 w-full border border-slate-300 rounded-xl p-2 text-sm focus:border-blue-500 focus:outline-none bg-slate-50 text-slate-900"></textarea>
          </div>
          <button type="submit" :disabled="isSubmitting" class="w-full bg-slate-950 hover:bg-slate-900 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow-md">
            {{ isSubmitting ? 'Procesando Conciliación...' : '🏁 Consolidar Arqueo y Cerrar Caja' }}
          </button>
        </form>
      </div>
    </div>
    <!-- LAYOUT DE LA TIRILLA TÉRMICA LEGAL (OCULTO EN PANTALLA) -->
    <div v-if="lastPrintedInvoice" class="print-ticket-area font-mono text-black">
      <div style="text-align: center; margin-bottom: 4mm;">
        <div style="font-size: 16px; font-weight: bold;">*** KUNA ERP ***</div>
        <div style="font-size: 11px; margin-top: 1mm;">NIT: 901.432.887-1</div>
        <div style="font-size: 11px;">📍 Sucursal: {{ lastPrintedInvoice.branch?.name }}</div>
        <div style="font-size: 10px; color: #555;">Sede Code: {{ lastPrintedInvoice.branch?.code }}</div>
      </div>

      <div style="border-bottom: 1px dashed black; margin-bottom: 3mm; padding-bottom: 2mm; font-size: 11px; line-height: 1.4;">
        <div><b>FACTURA POS:</b> {{ lastPrintedInvoice.saleNumber }}</div>
        <div><b>FECHA:</b> {{ new Date(lastPrintedInvoice.createdAt).toLocaleString('es-CO') }}</div>
        <div><b>CAJERO:</b> {{ lastPrintedInvoice.cashierName }}</div>
        <div><b>CLIENTE:</b> {{ lastPrintedInvoice.customer ? `${lastPrintedInvoice.customer.firstName} ${lastPrintedInvoice.customer.lastName || ''}` : 'Venta de Mostrador' }}</div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 3mm;">
        <thead>
          <tr style="border-bottom: 1px dashed black; text-align: left;">
            <th style="padding-bottom: 1mm;">CONCEPTO</th>
            <th style="text-align: center; padding-bottom: 1mm;">CANT</th>
            <th style="text-align: right; padding-bottom: 1mm;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in lastPrintedInvoice.items" :key="item.id">
            <td style="padding: 1mm 0; max-width: 40mm; word-wrap: break-word;">{{ item.product?.name || 'Insumo comercial' }}</td>
            <td style="text-align: center; padding: 1mm 0;">{{ item.quantity }}</td>
            <td style="text-align: right; padding: 1mm 0;">{{ formatCurrency((item.quantity * item.unitPrice) - item.discount) }}</td>
          </tr>
        </tbody>
      </table>

      <div style="border-top: 1px dashed black; padding-top: 2mm; font-size: 11px; line-height: 1.5; text-align: right; margin-bottom: 4mm;">
        <div>SUBTOTAL BRUTO: {{ formatCurrency(lastPrintedInvoice.subtotal) }}</div>
        <div v-if="Number(lastPrintedInvoice.discount) > 0">DESCUENTOS: - {{ formatCurrency(lastPrintedInvoice.discount) }}</div>
        <div style="font-size: 13px; font-weight: bold; margin-top: 1mm; border-top: 1px solid black; padding-top: 1mm;">
          TOTAL NETO: {{ formatCurrency(lastPrintedInvoice.total) }}
        </div>
        <div style="margin-top: 2mm; font-size: 10px; color: #333;">
          <div>MÉTODO: {{ lastPrintedInvoice.paymentMethod }}</div>
          <div v-if="lastPrintedInvoice.paymentMethod === 'CASH'">RECIBIDO: {{ formatCurrency(lastPrintedInvoice.amountPaid) }}</div>
          <div v-if="lastPrintedInvoice.paymentMethod === 'CASH'">CAMBIO: {{ formatCurrency(lastPrintedInvoice.cashChange) }}</div>
        </div>
      </div>

      <div style="text-align: center; font-size: 10px; margin-top: 6mm; font-style: italic; border-top: 1px dashed black; padding-top: 3mm;">
        ¡Gracias por tu compra en KUNA!<br>
        Resolución DIAN Autorizada N° RES-2026-POS<br>
        Rango del 1 al 10000 v0.9.0
      </div>
    </div>
  </AppLayout>

</template>
