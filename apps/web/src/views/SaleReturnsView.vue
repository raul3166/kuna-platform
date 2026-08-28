<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'

interface Branch { id: string; name: string; code: string }
interface Sale { id: string; saleNumber: string }
interface Customer { id: string; firstName: string; lastName: string }
interface SaleReturn {
  id: string
  returnNumber: string
  status: 'DRAFT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  returnDate: string
  subtotal: number | string
  total: number | string
  reason?: string | null
  notes?: string | null
  branch: Branch
  sale: Sale
  customer?: Customer | null
}

const saleReturns = ref<SaleReturn[]>([])
const isLoading = ref(true)
const errorMessage = ref('')

async function fetchSaleReturns() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    // Llama directamente a tu endpoint GET /sale-returns del backend
    const response = await api.get<SaleReturn[]>('/sale-returns')
    saleReturns.value = response.data
  } catch (error: any) {
    console.error(error)
    errorMessage.value = 'No se pudo sincronizar la bitácora auxiliar de devoluciones.'
  } finally {
    isLoading.value = false
  }
}

function getStatusBadgeClass(status: string) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
    CONFIRMED: 'bg-amber-50 text-amber-700 border-amber-200',
    COMPLETED: 'bg-green-50 text-green-700 border-green-200',
    CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200'
  }
  return styles[status] || 'bg-slate-50 text-slate-700 border-slate-200'
}

function formatCurrency(value: number | string) {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(num)
}
// --- INYECCIÓN SPRINT 12: LOGICA DEL WIZARD DE DEVOLUCIONES ---
const showCreateModal = ref(false)
const salesList = ref<any[]>([]) // Almacena facturas elegibles para devolver
const originalSaleItems = ref<any[]>([]) // Renglones de la factura seleccionada

// Campos del Formulario
const selectedSaleId = ref('')
const returnNumberInput = ref('')
const returnReason = ref('')
const returnNotes = ref('')
const selectedItemsToReturn = ref<Array<{ saleItemId: string; productId: string; name: string; maxQty: number; quantity: number; unitCost: number }>>([])

const isSubmittingWizard = ref(false)

// Cargar facturas y datos iniciales para el Wizard
async function openCreateWizard() {
  errorMessage.value = ''
  try {
    // 1. Consultar facturas del sistema para vincular la nota de crédito
    const res = await api.get('/sales')
    // Opcional: Filtrar solo por facturas CONFIRMED si tu negocio lo exige
    salesList.value = res.data

    // Auto-generar un correlativo provisional para la nota de crédito
    returnNumberInput.value = `NC-${Math.floor(100000 + Math.random() * 900000)}`

    showCreateModal.value = true
  } catch (error) {
    alert('Error al sincronizar los documentos de venta elegibles.')
  }
}

// Escuchar cuando el usuario cambia de factura para traer sus renglones originales
// --- CORRECCIÓN INTEGRAL DE NOMBRES Y VALORES NETOS CON DESCUENTO (KNA-073) ---
// --- CORRECCIÓN INTEGRAL ANTI-FRAUDE: DESCUENTO DE DEVOLUCIONES PREVIAS (KNA-073) ---
// 1. Añade esta variable reactiva arriba junto a las demás
const totalAlreadyReturnedMoney = ref(0)

// 2. Busca tu función handleSaleChange y actualízala para que sume el dinero devuelto:
async function handleSaleChange() {
  if (!selectedSaleId.value) {
    originalSaleItems.value = []
    selectedItemsToReturn.value = []
    totalAlreadyReturnedMoney.value = 0 // Reset
    return
  }

  try {
    const res = await api.get(`/sales/${selectedSaleId.value}`)
    originalSaleItems.value = res.data.items || []

    const returnsRes = await api.get('/sale-returns')
    const allCompletedReturns = returnsRes.data.filter((r: any) => r.status === 'COMPLETED' && r.saleId === selectedSaleId.value)

    // CORREGIDO: Calculamos el total de dinero que ya se le regresó al cliente en notas de crédito previas
    totalAlreadyReturnedMoney.value = allCompletedReturns.reduce((acc: number, r: any) => acc + Number(r.total || 0), 0)

    const alreadyReturnedMap = new Map<string, number>()
    for (const ret of allCompletedReturns) {
      if (ret.items) {
        for (const retItem of ret.items) {
          const currentQty = alreadyReturnedMap.get(retItem.productId) || 0
          alreadyReturnedMap.set(retItem.productId, currentQty + Number(retItem.quantity))
        }
      }
    }

    const groupedMap = new Map<string, any>()
    for (const item of originalSaleItems.value) {
      const pId = item.productId
      const productName = item.product?.name || 'Insumo Comercial'
      const qty = Number(item.quantity)
      const basePrice = Number(item.unitPrice)
      const discountApplied = Number(item.discount || 0)

      const totalLineNet = (qty * basePrice) - discountApplied
      const unitNetCost = qty > 0 ? (totalLineNet / qty) : basePrice

      if (groupedMap.has(pId)) {
        const existing = groupedMap.get(pId)
        existing.maxQty += qty
      } else {
        groupedMap.set(pId, {
          saleItemId: item.id,
          productId: pId,
          name: productName,
          maxQty: qty,
          quantity: 0,
          unitCost: unitNetCost
        })
      }
    }

    const finalItems = Array.from(groupedMap.values()).map(item => {
      const unitsAlreadyReturned = alreadyReturnedMap.get(item.productId) || 0
      item.maxQty = Math.max(0, item.maxQty - unitsAlreadyReturned)
      return item
    }).filter(item => item.maxQty > 0)

    selectedItemsToReturn.value = finalItems

  } catch (error) {
    console.error(error)
    alert('Error al recuperar el desglose financiero cruzado de la factura.')
  }
}

// KNA-074: Procesar y Enviar la Nota de Crédito atómica a NestJS
async function handleProcessReturn() {
  // Filtrar solo los renglones donde el usuario digitó una cantidad mayor a cero para devolver
  const itemsToSubmit = selectedItemsToReturn.value.filter(i => i.quantity > 0)

  if (itemsToSubmit.length === 0) {
    alert('Debes ingresar al menos una unidad a devolver en algún producto de la lista.')
    return
  }

  // KNA-073: Validación reactiva estricta de topes máximos
  for (const item of itemsToSubmit) {
    if (item.quantity > item.maxQty) {
      alert(`Error en [${item.name}]: No puedes devolver más unidades de las facturadas originalmente (${item.maxQty} uds).`)
      return
    }
  }

  isSubmittingWizard.value = true
  try {
    // Paso 1: Crear la Cabecera de la Devolución (SaleReturn)
    const headerPayload = {
      organizationId: saleReturns.value[0]?.organizationId || 'cmrxzuv8g0000e76onfchrz1e', // Fallback multi-tenant
      branchId: salesList.value.find(s => s.id === selectedSaleId.value)?.branchId || '',
      saleId: selectedSaleId.value,
      returnNumber: returnNumberInput.value,
      returnDate: new Date().toISOString(),
      reason: returnReason.value || undefined,
      notes: returnNotes.value || undefined
    }

    const headerRes = await api.post('/sale-returns', headerPayload)
    const createdReturnId = headerRes.data.id

    // Paso 2: Inyectar cada renglón validado a la tabla intermedia plana (sale-return-items)
    for (const item of itemsToSubmit) {
      await api.post('/sale-return-items', {
        saleReturnId: createdReturnId,
        saleItemId: item.saleItemId,
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        notes: `Devolución parcial de item.`
      })
    }

    // Paso 3: Confirmar Nota de Crédito
    await api.patch(`/sale-returns/${createdReturnId}/confirm`)

    // Paso 4: Sellar y Reingresar el Stock físicamente (KNA-074 - ACID Transaction en NestJS)
    await api.patch(`/sale-returns/${createdReturnId}/complete`)

    alert(`¡Nota de Crédito ${returnNumberInput.value} procesada con éxito! Inventario reingresado a la sucursal.`);

    // Resetear variables y refrescar bitácora
    showCreateModal.value = false
    selectedSaleId.value = ''
    returnReason.value = ''
    returnNotes.value = ''
    selectedItemsToReturn.value = []
    await fetchSaleReturns()

  } catch (error: any) {
    alert(error.response?.data?.message || 'Error en la consistencia de datos de la nota de crédito.')
  } finally {
    isSubmittingWizard.value = false
  }
}


onMounted(() => { fetchSaleReturns() })
</script>
<template>
  <AppLayout>
    <header class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-900">Devoluciones de Clientes</h1>
        <p class="mt-1 text-sm text-slate-500">Historial y auditoría de notas de crédito, mermas por garantía y reingreso de stock de KUNA.</p>
      </div>
      <!-- Próxima KNA: Botón preparado para disparar el Wizard de creación -->
      <button @click="openCreateWizard" type="button" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-md transition-colors whitespace-nowrap">
  ➕ Crear Devolución / Nota de Crédito
</button>

    </header>

    <div v-if="errorMessage" class="mb-4 bg-red-50 text-red-700 p-4 border border-red-200 rounded-xl text-sm">⚠️ {{ errorMessage }}</div>

    <div v-if="isLoading" class="p-8 text-center text-sm font-medium text-slate-500 animate-pulse bg-white border border-slate-200 rounded-xl">
      Consultando bitácora de notas de crédito con NestJS...
    </div>

    <div v-else>
      <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div v-if="saleReturns.length === 0" class="p-8 text-center text-slate-400 italic">No hay notas de crédito ni devoluciones procesadas en el sistema.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th class="px-6 py-3">Código Devolución</th>
                <th class="px-6 py-3">Factura Original</th>
                <th class="px-6 py-3">Sucursal Receptora</th>
                <th class="px-6 py-3">Cliente / Tercero</th>
                <th class="px-6 py-3">Motivo / Causa</th>
                <th class="px-6 py-3">Estado</th>
                <th class="px-6 py-3 text-right">Total Reintegrado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-sans">
              <tr v-for="item in saleReturns" :key="item.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4 font-mono font-bold text-slate-900">↩️ {{ item.returnNumber }}</td>
                <td class="px-6 py-4 font-mono text-slate-500">🧾 {{ item.sale?.saleNumber }}</td>
                <td class="px-6 py-4 font-semibold text-slate-700">📍 {{ item.branch?.name }}</td>
                <td class="px-6 py-4 text-slate-800">
                  <span v-if="item.customer">{{ item.customer.firstName }} {{ item.customer.lastName || '' }}</span>
                  <span v-else class="text-slate-400 italic">Cliente Genérico</span>
                </td>
                <td class="px-6 py-4 text-slate-600 max-w-xs truncate" :title="item.reason || ''">
                  {{ item.reason || 'No especificado' }}
                </td>
                <td class="px-6 py-4">
                  <span :class="[getStatusBadgeClass(item.status), 'inline-block px-2.5 py-0.5 text-xs font-bold border rounded-md uppercase']">
                    {{ item.status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right font-mono font-bold text-slate-950">
                  {{ formatCurrency(item.total) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
        <!-- MODAL INTEGRADO: WIZARD DE CREACIÓN DE NOTAS DE CRÉDITO (KNA-072 / KNA-073) -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div class="bg-white rounded-2xl border p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center border-b pb-2">
          <h3 class="text-base font-black text-slate-900">Nueva Nota de Crédito / Devolución</h3>
          <button @click="showCreateModal = false" type="button" class="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
        </div>

        <form @submit.prevent="handleProcessReturn" class="space-y-4 font-sans">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase">N° Nota de Crédito (Auto)</label>
              <input v-model="returnNumberInput" type="text" class="mt-1 w-full border border-slate-300 rounded-xl p-2 text-xs font-mono font-bold bg-slate-100 cursor-not-allowed" readonly required />
            </div>

                        <!-- BLOQUE ACTUALIZADO CON ALERTA DE SEGURIDAD VISUAL (UX) -->
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase">Seleccionar Factura Original *</label>
              <select v-model="selectedSaleId" @change="handleSaleChange" class="mt-1 w-full border border-slate-300 rounded-xl p-2 text-xs bg-slate-50 font-semibold focus:outline-none focus:border-blue-500" required>
                <option value="">🔍 Vincular Folio de Factura...</option>
                <option v-for="s in salesList" :key="s.id" :value="s.id">🧾 Folio: {{ s.saleNumber }} (Total: {{ formatCurrency(s.total) }})</option>
              </select>

              <!-- INYECCIÓN CONDICIONAL DE AYUDA AL CAJERO -->
              <div v-if="selectedSaleId" class="mt-2 text-[11px] font-medium">
                <div v-if="totalAlreadyReturnedMoney > 0" class="text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-2 flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
                  <span>⚠️ Nota: Esta factura tiene devoluciones previas.</span>
                  <span class="font-mono font-bold">Ya devuelto: {{ formatCurrency(totalAlreadyReturnedMoney) }}</span>
                </div>
                <div v-else class="text-green-600 bg-green-50 border border-green-100 rounded-lg p-2">
                  ✓ Factura limpia. Sin notas de crédito anteriores.
                </div>
              </div>
            </div>

          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase">Causa / Motivo del Reingreso *</label>
              <input v-model="returnReason" type="text" placeholder="Ej: Mercancía defectuosa o averiada" class="mt-1 w-full border border-slate-300 rounded-xl p-2 text-xs bg-slate-50 focus:outline-none" required />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase">Notas Adicionales de Auditoría</label>
              <input v-model="returnNotes" type="text" placeholder="Ej: Se autoriza cambio físico de inmediato" class="mt-1 w-full border border-slate-300 rounded-xl p-2 text-xs bg-slate-50 focus:outline-none" />
            </div>
          </div>

          <!-- GRILLA INTERACTIVA MAESTRO-DETALLE DE PRODUCTOS A DEVOLVER (KNA-073) -->
          <div v-if="selectedItemsToReturn.length > 0" class="border rounded-xl overflow-hidden mt-4">
            <div class="bg-slate-50 p-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b">Detalle de Productos Vendidos</div>
            <div class="divide-y max-h-48 overflow-y-auto">
              <div v-for="(item, index) in selectedItemsToReturn" :key="index" class="p-3 flex items-center justify-between gap-4 text-xs bg-slate-50/30 hover:bg-slate-50/80 transition-colors">
                <div class="flex-1">
                  <div class="font-bold text-slate-900">{{ item.name }}</div>
                  <div class="text-[10px] text-slate-400 font-mono mt-0.5">Precio pactado: {{ formatCurrency(item.unitCost) }} | Comprado: {{ item.maxQty }} uds</div>
                </div>

                <!-- CONTROL INPUT DE DEVOLUCIÓN CON LIMITE DE SEGURIDAD -->
                <div class="flex items-center space-x-2">
                  <span class="text-slate-500 text-[10px]">Devolver:</span>
                  <input
                    v-model.number="item.quantity"
                    type="number"
                    min="0"
                    :max="item.maxQty"
                    class="w-16 border rounded-lg p-1 text-center font-mono font-bold text-slate-950 bg-white focus:outline-none focus:border-blue-500"
                  />
                  <span class="text-slate-400 font-mono text-[10px]">/ {{ item.maxQty }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else-if="selectedSaleId" class="text-center p-4 text-xs text-slate-400 italic">Esta factura no contiene líneas de detalle registradas.</div>

          <button type="submit" :disabled="isSubmittingWizard || selectedItemsToReturn.length === 0" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow-md disabled:opacity-40">
            {{ isSubmittingWizard ? 'Procesando Reingreso y Kardex ACID...' : '🚀 Procesar y Reingresar Mercancía' }}
          </button>
        </form>
      </div>
    </div>

  </AppLayout>
</template>
