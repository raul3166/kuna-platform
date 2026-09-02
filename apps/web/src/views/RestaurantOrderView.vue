<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

interface Product {
  id: string
  name: string
  description?: string
  salePrice: number
  categoryId?: string
}

interface Category {
  id: string
  name: string
}

interface Table {
  id: string
  tableNumber: string
  capacity: number
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'BILL_PRINTED'
}

interface SaleItem {
  id: string
  productId: string
  quantity: number
  unitPrice: number
  subtotal: number
  total: number
  description?: string
  product?: Product
}

interface Sale {
  id: string
  saleNumber: string
  status: string
  subtotal: number
  discount: number
  total: number
  items: SaleItem[]
  table?: Table
}

interface CartItem {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  notes: string
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// ESTADOS PRINCIPALES
const tableId = ref<string>((route.query.tableId as string) || '')
const currentTable = ref<Table | null>(null)
const currentOrder = ref<Sale | null>(null)

const tables = ref<Table[]>([])
const categories = ref<Category[]>([])
const products = ref<Product[]>([])
const selectedCategoryId = ref<string>('')

const cart = ref<CartItem[]>([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

// COMPUTED
const filteredProducts = computed(() => {
  if (!selectedCategoryId.value) return products.value
  return products.value.filter(p => p.categoryId === selectedCategoryId.value)
})

const savedItems = computed(() => currentOrder.value?.items || [])

const cartTotal = computed(() => {
  return cart.value.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0)
})

const grandTotal = computed(() => {
  const savedTotal = Number(currentOrder.value?.total || 0)
  return savedTotal + cartTotal.value
})

// REACCIONAR A CAMBIOS DE URL
watch(
  () => route.query.tableId,
  (newTableId) => {
    tableId.value = (newTableId as string) || ''
    if (tableId.value) {
      fetchTableAndOrder()
    } else {
      currentTable.value = null
      currentOrder.value = null
    }
  }
)

// MÉTODOS DE INICIALIZACIÓN Y CARGA DE DATOS
async function loadData() {
  const orgId = authStore.user?.organizationId
  const branchId = authStore.currentBranch?.id
  if (!orgId || !branchId) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    const [categoriesRes, productsRes, tablesRes] = await Promise.all([
      api.get<Category[]>('/categories', { params: { organizationId: orgId } }).catch(() => ({ data: [] })),
      api.get<Product[]>('/products', { params: { organizationId: orgId, branchId } }).catch(() => ({ data: [] })),
      api.get<Table[]>('/restaurants/tables', { params: { organizationId: orgId, branchId } }).catch(() => ({ data: [] }))
    ])

    categories.value = categoriesRes.data ?? []
    products.value = productsRes.data ?? []
    tables.value = tablesRes.data ?? []

    if (tableId.value) {
      await fetchTableAndOrder()
    }
  } catch (err: any) {
    errorMessage.value = err.response?.data?.message || 'Error al cargar datos del comandante.'
  } finally {
    isLoading.value = false
  }
}

async function fetchTableAndOrder() {
  if (!tableId.value) return

  // Limpiamos el carrito local al cambiar de mesa para evitar arrastrar productos previos
  cart.value = []

  try {
    const [tableRes, orderRes] = await Promise.all([
      api.get<Table>(`/restaurants/tables/${tableId.value}`),
      api.get<Sale>(`/restaurant-orders/tables/${tableId.value}/current`).catch(() => ({ data: null }))
    ])

    currentTable.value = tableRes.data

    // Validamos si la orden devuelta realmente está abierta o activa
    // (Si tu backend devuelve órdenes cerradas, aquí puedes filtrar por su status, ej: orderRes.data?.status === 'OPEN')
    currentOrder.value = orderRes.data
  } catch (err: any) {
    console.error('Error al cargar detalle de mesa u orden:', err)
    currentTable.value = null
    currentOrder.value = null
  }
}

// CARRITO LOCAL DE NUEVA COMANDA
function addToCart(product: Product) {
  if (!tableId.value) {
    alert('Selecciona una mesa en el desplegable superior antes de agregar productos.')
    return
  }

  const existing = cart.value.find(item => item.productId === product.id)
  if (existing) {
    existing.quantity++
  } else {
    cart.value.push({
      productId: product.id,
      productName: product.name,
      unitPrice: Number(product.salePrice),
      quantity: 1,
      notes: ''
    })
  }
}

function incrementQty(index: number) {
  cart.value[index].quantity++
}

function decrementQty(index: number) {
  if (cart.value[index].quantity > 1) {
    cart.value[index].quantity--
  } else {
    cart.value.splice(index, 1)
  }
}

function removeFromCart(index: number) {
  cart.value.splice(index, 1)
}

// COMUNICACIÓN CON RESTAURANT-ORDERS BACKEND
async function submitOrder() {
  if (!tableId.value || cart.value.length === 0) return

  const orgId = authStore.user?.organizationId
  const branchId = authStore.currentBranch?.id

  if (!orgId || !branchId) return

  isSubmitting.value = true
  try {
    const payload = {
      organizationId: orgId,
      branchId,
      items: cart.value.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes.trim() || undefined
      }))
    }

    const res = await api.post<Sale>(`/restaurant-orders/tables/${tableId.value}`, payload)
    currentOrder.value = res.data

    // Actualiza el estado en el objeto local y dentro del arreglo 'tables'
    if (currentTable.value) {
      currentTable.value.status = 'OCCUPIED'
    }
    const tableInList = tables.value.find(t => t.id === tableId.value)
    if (tableInList) {
      tableInList.status = 'OCCUPIED'
    }

    cart.value = []
  } catch (err: any) {
    alert(err.response?.data?.message || 'Error al enviar la comanda a cocina')
  } finally {
    isSubmitting.value = false
  }
}

async function removeSavedItem(itemId: string) {
  if (!confirm('¿Deseas eliminar este ítem de la comanda?')) return

  try {
    const res = await api.delete<Sale>(`/restaurant-orders/items/${itemId}`)
    currentOrder.value = res.data
  } catch (err: any) {
    alert(err.response?.data?.message || 'Error al eliminar ítem')
  }
}

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(value || 0))
}

function goBackToRooms() {
  router.push('/rooms')
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <AppLayout>
    <div class="flex flex-col h-[calc(100vh-6.5rem)] gap-4">
      <!-- HEADER UNIFICADO -->
      <div class="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
        <div class="flex items-center gap-3">
          <button
            @click="goBackToRooms"
            class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            ⬅️ Volver a Mesas
          </button>

          <div>
            <h1 class="text-xl font-bold tracking-tight text-slate-900">Comandero de Restaurante</h1>

            <div class="flex items-center gap-2 mt-1">
              <span class="text-xs text-slate-500">Mesa Activa:</span>
              <select
                v-model="tableId"
                @change="fetchTableAndOrder"
                class="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-1 focus:outline-none cursor-pointer"
              >
                <option value="" disabled>-- Seleccionar Mesa --</option>
                <option v-for="t in tables" :key="t.id" :value="t.id">
                  Mesa {{ t.tableNumber }} ({{ t.status }})
                </option>
              </select>
            </div>
          </div>
        </div>

        <div v-if="currentOrder" class="text-right">
          <span class="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
            Orden {{ currentOrder.saleNumber }}
          </span>
        </div>
      </div>

      <!-- ALERTA DE ERROR -->
      <div v-if="errorMessage" class="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
        {{ errorMessage }}
      </div>

      <!-- CARGANDO -->
      <div v-if="isLoading" class="p-8 text-center text-sm text-slate-500 bg-white rounded-xl border border-slate-200">
        Cargando menú y detalles de mesa...
      </div>

      <!-- ÁREA DE COMANDERO -->
      <div v-else class="flex-1 flex gap-4 overflow-hidden">

        <!-- SECCIÓN IZQUIERDA: CATÁLOGO Y PRODUCTOS -->
        <div class="flex-1 flex flex-col gap-3 min-w-0">

          <!-- FILTRO DE CATEGORÍAS -->
          <div class="flex gap-2 overflow-x-auto pb-1 shrink-0">
            <button
              @click="selectedCategoryId = ''"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap',
                selectedCategoryId === ''
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              ]"
            >
              🔥 Todos
            </button>
            <button
              v-for="cat in categories"
              :key="cat.id"
              @click="selectedCategoryId = cat.id"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap',
                selectedCategoryId === cat.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              ]"
            >
              {{ cat.name }}
            </button>
          </div>

          <!-- GRID DE PRODUCTOS -->
          <div class="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <div
              v-for="product in filteredProducts"
              :key="product.id"
              @click="addToCart(product)"
              class="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <h3 class="font-bold text-xs text-slate-800 line-clamp-2">{{ product.name }}</h3>
                <p v-if="product.description" class="text-[10px] text-slate-400 line-clamp-2 mt-1">
                  {{ product.description }}
                </p>
              </div>

              <div class="mt-3 flex items-center justify-between">
                <span class="font-extrabold text-xs text-blue-600">
                  {{ formatCurrency(product.salePrice) }}
                </span>
                <span class="px-2 py-0.5 bg-blue-50 text-blue-600 font-bold text-[10px] rounded border border-blue-100">
                  + Agregar
                </span>
              </div>
            </div>

            <div
              v-if="filteredProducts.length === 0"
              class="col-span-full p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-300"
            >
              No hay productos registrados en esta categoría.
            </div>
          </div>
        </div>

        <!-- SECCIÓN DERECHA: RESUMEN DE LA COMANDA -->
        <div class="w-80 md:w-96 bg-white border border-slate-200 rounded-xl flex flex-col shadow-sm shrink-0 overflow-hidden">

          <div class="p-3.5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h2 class="font-bold text-xs uppercase tracking-wider text-slate-700">Comanda Mesa</h2>
            <span v-if="currentTable" class="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              {{ currentTable.status }}
            </span>
          </div>

          <!-- LISTA DE ÍTEMS (GUARDADOS Y NUEVOS) -->
          <div class="flex-1 overflow-y-auto p-3.5 space-y-3">

            <!-- Guardados previamente -->
            <div v-if="savedItems.length > 0">
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                👨‍🍳 Marchando / Enviados a Cocina
              </p>
              <div class="space-y-1.5">
                <div
                  v-for="item in savedItems"
                  :key="item.id"
                  class="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-start text-xs"
                >
                  <div class="flex-1 pr-2">
                    <p class="font-bold text-slate-800">{{ item.product?.name || 'Producto' }}</p>
                    <p class="text-[11px] text-slate-500">
                      {{ item.quantity }} x {{ formatCurrency(item.unitPrice) }}
                    </p>
                    <p v-if="item.description" class="text-[10px] italic text-amber-600 mt-0.5">
                      Nota: {{ item.description }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="font-extrabold text-slate-800">{{ formatCurrency(item.total) }}</span>
                    <button
                      @click="removeSavedItem(item.id)"
                      class="text-rose-500 hover:text-rose-700 font-bold text-xs"
                      title="Eliminar ítem"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Nuevos en el carrito -->
            <div v-if="cart.length > 0">
              <p class="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1.5 mt-2">
                ✏️ Nuevos ítems por enviar
              </p>
              <div class="space-y-2">
                <div
                  v-for="(item, index) in cart"
                  :key="index"
                  class="p-2.5 bg-blue-50/60 rounded-lg border border-blue-200 text-xs"
                >
                  <div class="flex justify-between items-start">
                    <span class="font-bold text-slate-800">{{ item.productName }}</span>
                    <button @click="removeFromCart(index)" class="text-rose-500 font-bold text-xs">✕</button>
                  </div>

                  <div class="flex items-center justify-between mt-2">
                    <div class="flex items-center border border-blue-300 rounded bg-white">
                      <button @click="decrementQty(index)" class="px-2 py-0.5 text-blue-600 font-bold text-xs hover:bg-blue-50">-</button>
                      <span class="px-2 font-bold text-slate-700 text-xs">{{ item.quantity }}</span>
                      <button @click="incrementQty(index)" class="px-2 py-0.5 text-blue-600 font-bold text-xs hover:bg-blue-50">+</button>
                    </div>
                    <span class="font-extrabold text-blue-700">
                      {{ formatCurrency(item.unitPrice * item.quantity) }}
                    </span>
                  </div>

                  <input
                    v-model="item.notes"
                    placeholder="Escribir observaciones (ej: Sin cebolla)..."
                    class="w-full mt-2 text-[11px] p-1.5 border border-blue-200 rounded bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div
              v-if="savedItems.length === 0 && cart.length === 0"
              class="text-center text-xs text-slate-400 py-12"
            >
              No hay ítems registrados en la comanda de esta mesa.
            </div>
          </div>

          <!-- FOOTER / TOTAL Y ENVIAR -->
          <div class="p-3.5 border-t border-slate-200 bg-slate-50 space-y-3">
            <div class="flex justify-between items-center text-sm">
              <span class="font-semibold text-slate-600">Total Comanda:</span>
              <span class="text-lg font-black text-slate-900">{{ formatCurrency(grandTotal) }}</span>
            </div>

            <button
              @click="submitOrder"
              :disabled="!tableId || cart.length === 0 || isSubmitting"
              class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <span v-if="isSubmitting">Marchando a Cocina...</span>
              <span v-else>🚀 Enviar Pedido a Cocina</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  </AppLayout>
</template>
