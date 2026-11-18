<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

interface Supplier { id: string; companyName: string }
interface PurchaseInvoice {
  id: string
  number: string
  invoiceNumber: string
  invoiceDate: string
  dueDate?: string | null
  status: 'DRAFT' | 'POSTED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED'
  total: number | string
  paidAmount?: number | string
  balanceAmount?: number | string
  supplier: Supplier
}

const selectedInvoiceForPay = ref<PurchaseInvoice | null>(null)
const payAmount = ref<number>(0)
const payNotes = ref('')

function openPayInvoiceModal(inv: PurchaseInvoice) {
  selectedInvoiceForPay.value = inv
  const total = Number(inv.total || 0)
  const paid = Number(inv.paidAmount || 0)
  payAmount.value = Math.max(0, total - paid)
  payNotes.value = ''
}

async function submitInvoicePayment() {
  if (!selectedInvoiceForPay.value) return
  isSubmitting.value = true
  try {
    await api.post('/accounts-portfolio/payables/pay', {
      organizationId: authStore.currentOrganization?.id || authStore.user?.organizationId || '',
      sourceType: 'PURCHASE_INVOICE',
      sourceId: selectedInvoiceForPay.value.id,
      amount: Number(payAmount.value),
      paymentMethod: 'TRANSFER',
      notes: payNotes.value || undefined,
    })
    selectedInvoiceForPay.value = null
    successMessage.value = 'Pago registrado exitosamente en la factura del proveedor.'
    await loadInvoicesModuleData()
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'No se pudo registrar el pago.'
  } finally {
    isSubmitting.value = false
  }
}

const activeTab = ref<'list' | 'create'>('list')
const invoices = ref<PurchaseInvoice[]>([])
const suppliers = ref<Supplier[]>([])
const isLoading = ref(true)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Formulario basado en CreatePurchaseInvoiceDto
const formInvoice = ref({
  number: '',
  invoiceNumber: '',
  supplierId: '',
  invoiceDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  notes: ''
})

async function loadInvoicesModuleData() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const [invoicesRes, suppliersRes] = await Promise.all([
      api.get<PurchaseInvoice[]>('/purchase-invoices'),
      api.get<Supplier[]>('/suppliers')
    ])
    invoices.value = invoicesRes.data
    suppliers.value = suppliersRes.data
  } catch (error: any) {
    console.error(error)
    errorMessage.value = 'No fue posible sincronizar el registro de facturas de proveedores.'
  } finally {
    isLoading.value = false
  }
}

async function handleCreateInvoiceHeader() {
  if (!formInvoice.value.number || !formInvoice.value.invoiceNumber || !formInvoice.value.supplierId) {
    errorMessage.value = 'El número de control interno, número de factura y proveedor son mandatorios.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const payload = {
      organizationId: authStore.user?.organizationId || '',
      supplierId: formInvoice.value.supplierId,
      number: formInvoice.value.number,
      invoiceNumber: formInvoice.value.invoiceNumber,
      invoiceDate: new Date(formInvoice.value.invoiceDate).toISOString(),
      dueDate: formInvoice.value.dueDate ? new Date(formInvoice.value.dueDate).toISOString() : undefined,
      notes: formInvoice.value.notes || undefined
    }

    await api.post('/purchase-invoices', payload)
    successMessage.value = `¡Factura de proveedor ${formInvoice.value.invoiceNumber} registrada en estado DRAFT con éxito!`

    formInvoice.value = {
      number: '', invoiceNumber: '', supplierId: '',
      invoiceDate: new Date().toISOString().split('T')[0], dueDate: '', notes: ''
    }

    activeTab.value = 'list'
    await loadInvoicesModuleData()
  } catch (error: any) {
    console.error(error)
    errorMessage.value = error.response?.data?.message || 'Error al procesar la factura. Verifica si el número de documento ya existe.'
  } finally {
    isSubmitting.value = false
  }
}

function getStatusBadgeClass(status: string) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
    POSTED: 'bg-blue-50 text-blue-700 border-blue-200',
    PARTIALLY_PAID: 'bg-amber-50 text-amber-700 border-amber-200',
    PAID: 'bg-green-50 text-green-700 border-green-200',
    CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200'
  }
  return styles[status] || 'bg-slate-50 text-slate-700 border-slate-200'
}

function formatCurrency(value: number | string) {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(num)
}

onMounted(() => { loadInvoicesModuleData() })
</script>
<template>
  <AppLayout>
    <header class="mb-6">
      <h1 class="text-3xl font-bold tracking-tight text-slate-900">Facturas de Proveedores</h1>
      <p class="mt-1 text-sm text-slate-500">Módulo de auditoría contable, cuentas por pagar y registro fiscal de facturación de compras.</p>
    </header>

    <!-- Barra de Pestañas -->
    <div class="mb-6 border-b border-slate-200">
      <nav class="-mb-px flex space-x-6">
        <button type="button" @click="activeTab = 'list'" :class="[activeTab === 'list' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300', 'pb-4 text-sm font-medium border-b-2 transition-colors focus:outline-none']">
          🧾 Facturas Registradas ({{ invoices.length }})
        </button>
        <button type="button" @click="activeTab = 'create'" :class="[activeTab === 'create' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300', 'pb-4 text-sm font-medium border-b-2 transition-colors focus:outline-none']">
          ➕ Radicar Factura Recibida
        </button>
      </nav>
    </div>

    <!-- Alertas -->
    <div v-if="errorMessage" class="mb-4 bg-red-50 text-red-700 p-4 border border-red-200 rounded-xl text-sm">⚠️ {{ errorMessage }}</div>
    <div v-if="successMessage" class="mb-4 bg-green-50 text-green-700 p-4 border border-green-200 rounded-xl text-sm">🎉 {{ successMessage }}</div>

    <!-- Carga -->
    <div v-if="isLoading" class="p-8 text-center text-sm font-medium text-slate-500 animate-pulse bg-white border border-slate-200 rounded-xl">
      Sincronizando cuentas por pagar con NestJS...
    </div>

    <div v-else>
      <!-- TABLA GENERAL -->
      <div v-if="activeTab === 'list'" class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div v-if="invoices.length === 0" class="p-8 text-center text-slate-400">No hay facturas fiscales dadas de alta en este periodo.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th class="px-6 py-3">N° Factura Proveedor</th>
                <th class="px-6 py-3">Razón Social / Entidad</th>
                <th class="px-6 py-3">Fechas (Emisión / Vence)</th>
                <th class="px-6 py-3">Estado de Pago</th>
                <th class="px-6 py-3 text-right">Valor Total / Saldo CxP</th>
                <th class="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-sans">
              <tr v-for="inv in invoices" :key="inv.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <div class="font-bold text-slate-900">🧾 {{ inv.invoiceNumber }}</div>
                  <div class="text-[10px] font-mono text-slate-400 mt-0.5">Control Interno: {{ inv.number }}</div>
                </td>
                <td class="px-6 py-4 font-semibold text-slate-800">{{ inv.supplier?.companyName }}</td>
                <td class="px-6 py-4 text-xs text-slate-600">
                  <div>📅 {{ new Date(inv.invoiceDate).toLocaleDateString('es-CO') }}</div>
                  <div v-if="inv.dueDate" class="text-rose-600 mt-0.5 font-medium">⏳ Vence: {{ new Date(inv.dueDate).toLocaleDateString('es-CO') }}</div>
                </td>
                <td class="px-6 py-4">
                  <span :class="[getStatusBadgeClass(inv.status), 'inline-block px-2.5 py-0.5 text-xs font-bold border rounded-md uppercase']">
                    {{ inv.status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right font-mono">
                  <div class="font-bold text-slate-950">{{ formatCurrency(inv.total) }}</div>
                  <div v-if="Number(inv.paidAmount || 0) > 0" class="text-[11px] text-emerald-700">
                    Abonado: {{ formatCurrency(inv.paidAmount || 0) }}
                  </div>
                </td>
                <td class="px-6 py-4 text-right">
                  <button
                    v-if="inv.status !== 'PAID' && inv.status !== 'CANCELLED' && Number(inv.total || 0) > Number(inv.paidAmount || 0)"
                    type="button"
                    @click="openPayInvoiceModal(inv)"
                    class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                  >
                    💸 Abonar CxP
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- FORMULARIO DE REGISTRO CORREGIDO (Removido v-slot) -->
      <div v-if="activeTab === 'create'" class="max-w-2xl bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <h3 class="text-lg font-bold text-slate-900 mb-4">Radicar Cuenta de Cobro / Factura</h3>

        <form @submit.prevent="handleCreateInvoiceHeader" class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-semibold text-slate-700">Consecutivo Interno KUNA</label>
              <input v-model="formInvoice.number" type="text" placeholder="Ej: FAC-INT-001" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700">Número de Factura Física (Proveedor)</label>
              <input v-model="formInvoice.invoiceNumber" type="text" placeholder="Ej: FE-98754" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700">Proveedor</label>
            <select v-model="formInvoice.supplierId" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none">
              <option value="" disabled>Selecciona el emisor...</option>
              <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.companyName }}</option>
            </select>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-semibold text-slate-700">Fecha de Factura</label>
              <input v-model="formInvoice.invoiceDate" type="date" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700">Fecha de Vencimiento</label>
              <input v-model="formInvoice.dueDate" type="date" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700">Observaciones contables o Notas de pago (Opcional)</label>
            <textarea v-model="formInvoice.notes" rows="3" placeholder="Ej: Radicado para revisión contable. Aplica retención en la fuente del 2.5%..." class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none"></textarea>
          </div>

          <div class="pt-2">
            <button type="submit" :disabled="isSubmitting" class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition-all shadow-sm disabled:opacity-50">
              {{ isSubmitting ? 'Radicando...' : 'Radicar Factura Recibida' }}
            </button>
          </div>
        </form>
      </div>

      <!-- MODAL DE ABONO / PAGO A PROVEEDOR (CxP) -->
      <div v-if="selectedInvoiceForPay" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-100 overflow-hidden">
          <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h3 id="modal-cxp-inv-title" class="text-base font-bold text-slate-900">
              💸 Registrar Pago a Proveedor (CxP)
            </h3>
            <button type="button" @click="selectedInvoiceForPay = null" class="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
          </div>
          <form @submit.prevent="submitInvoicePayment" aria-labelledby="modal-cxp-inv-title" class="p-6 space-y-4">
            <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
              <p class="font-bold text-slate-900">{{ selectedInvoiceForPay.supplier?.companyName }}</p>
              <p class="text-slate-600">Factura: {{ selectedInvoiceForPay.invoiceNumber }} — Total: {{ formatCurrency(selectedInvoiceForPay.total) }}</p>
            </div>
            <div>
              <label for="cxp-pay-amt" class="block text-xs font-bold uppercase text-slate-500 mb-1">Valor a Pagar / Abonar (COP)</label>
              <input id="cxp-pay-amt" v-model.number="payAmount" type="number" min="1" required class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-bold" />
            </div>
            <div>
              <label for="cxp-pay-notes" class="block text-xs font-bold uppercase text-slate-500 mb-1">Comprobante / Referencia</label>
              <input id="cxp-pay-notes" v-model="payNotes" type="text" placeholder="Ej: Transferencia Bancolombia #1129..." class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm" />
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" @click="selectedInvoiceForPay = null" class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer">Cancelar</button>
              <button type="submit" :disabled="isSubmitting" class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer">
                {{ isSubmitting ? 'Guardando...' : 'Confirmar Pago' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
