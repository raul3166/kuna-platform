<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

interface Category {
  id: string
  name: string
  trackStock?: boolean
}

interface Product {
  id: string
  name: string
  description?: string
  salePrice: number
  categoryId?: string
  stock?: number
  trackStock?: boolean
  category?: Category
}

interface Table {
  id: string
  tableNumber: string
  capacity: number
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'BILL_PRINTED'
  currentOrderId?: string
}

interface OrderItem {
  id: string
  productId: string
  quantity: number
  unitPrice: number
  notes?: string
  product?: Product
}

interface RestaurantOrder {
  id: string
  orderNumber: string
  status: string
  items: OrderItem[]
  table?: Table
}

interface CartItem {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  notes: string
  stockAvailable?: number
  tracksStock: boolean
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// ESTADOS PRINCIPALES
const tableId = ref<string>((route.query.tableId as string) || '')
const currentTable = ref<Table | null>(null)
const currentOrder = ref<RestaurantOrder | null>(null)

const tables = ref<Table[]>([])
const categories = ref<Category[]>([])
const products = ref<Product[]>([])
const selectedCategoryId = ref<string>('')

const cart = ref<CartItem[]>([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

// HELPER CONTROL DE STOCK
function productTracksStock(product: Product): boolean {
  return product.category?.trackStock ?? false
}

function isProductDisabled(product: Product): boolean {
  if (!productTracksStock(product)) return false
  return (product.stock ?? 0) <= 0
}

// COMPUTED
const filteredProducts = computed(() => {
  if (!selectedCategoryId.value) return products.value
  return products.value.filter(p => p.categoryId === selectedCategoryId.value)
})

const savedItems = computed(() => currentOrder.value?.items || [])

const cartTotal = computed(() => {
  return cart.value.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0)
})

const savedItemsTotal = computed(() => {
  return savedItems.value.reduce((acc, item) => acc + Number(item.unitPrice) * item.quantity, 0)
})

const grandTotal = computed(() => {
  return savedItemsTotal.value + cartTotal.value
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
      api.get<Category[]>('/product-categories', { params: { organizationId: orgId } }).catch(() => ({ data: [] })),
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

  cart.value = []

  try {
    const [tableRes, orderRes] = await Promise.all([
      api.get<Table>(`/restaurants/tables/${tableId.value}`),
      api.get<RestaurantOrder>(`/restaurant-orders/tables/${tableId.value}/current`).catch(() => ({ data: null }))
    ])

    currentTable.value = tableRes.data
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

  if (isProductDisabled(product)) return

  const tracks = productTracksStock(product)
  const availableStock = product.stock ?? 0
  const existing = cart.value.find(item => item.productId === product.id)

  if (existing) {
    if (tracks && existing.quantity >= availableStock) {
      alert(`No hay suficiente stock disponible. Unidades en inventario: ${availableStock}`)
      return
    }
    existing.quantity++
  } else {
    cart.value.push({
      productId: product.id,
      productName: product.name,
      unitPrice: Number(product.salePrice),
      quantity: 1,
      notes: '',
      stockAvailable: availableStock,
      tracksStock: tracks
    })
  }
}

function incrementQty(index: number) {
  const item = cart.value[index]
  if (item.tracksStock && item.stockAvailable !== undefined && item.quantity >= item.stockAvailable) {
    alert(`Límite alcanzado. Solo hay ${item.stockAvailable} unidades disponibles.`)
    return
  }
  item.quantity++
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

    const res = await api.post<RestaurantOrder>(`/restaurant-orders/tables/${tableId.value}`, payload)
    currentOrder.value = res.data

    if (currentTable.value) {
      currentTable.value.status = 'OCCUPIED'
    }
    const tableInList = tables.value.find(t => t.id === tableId.value)
    if (tableInList) {
      tableInList.status = 'OCCUPIED'
    }

    cart.value = []
    await loadData() // Recargar productos para refrescar inventario actualizado
  } catch (err: any) {
    alert(err.response?.data?.message || 'Error al enviar la comanda a cocina')
  } finally {
    isSubmitting.value = false
  }
}

async function removeSavedItem(itemId: string) {
  if (!confirm('¿Deseas eliminar este ítem de la comanda?')) return

  try {
    const res = await api.delete<RestaurantOrder>(`/restaurant-orders/items/${itemId}`)
    currentOrder.value = res.data
    await loadData()
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
            Comanda #{{ currentOrder.orderNumber || currentOrder.id.slice(0, 8) }}
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
              :class="[
                'bg-white p-3.5 rounded-xl border transition-all flex flex-col justify-between',
                isProductDisabled(product)
                  ? 'opacity-60 bg-slate-50 border-slate-200 cursor-not-allowed'
                  : 'border-slate-200 hover:border-blue-500 hover:shadow-md cursor-pointer'
              ]"
            >
              <div>
                <div class="flex items-start justify-between gap-1">
                  <h3 class="font-bold text-xs text-slate-800 line-clamp-2">{{ product.name }}</h3>

                  <!-- INDICADOR DE STOCK -->
                  <template v-if="productTracksStock(product)">
                    <span
                      v-if="(product.stock ?? 0) > 0"
                      class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap"
                    >
                      {{ product.stock }} disp.
                    </span>
                    <span
                      v-else
                      class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 whitespace-nowrap"
                    >
                      Agotado
                    </span>
                  </template>
                </div>

                <p v-if="product.description" class="text-[10px] text-slate-400 line-clamp-2 mt-1">
                  {{ product.description }}
                </p>
              </div>

              <div class="mt-3 flex items-center justify-between">
                <span class="font-extrabold text-xs text-blue-600">
                  {{ formatCurrency(product.salePrice) }}
                </span>

                <span
                  :class="[
                    'px-2 py-0.5 font-bold text-[10px] rounded border',
                    isProductDisabled(product)
                      ? 'bg-slate-200 text-slate-500 border-slate-300'
                      : 'bg-blue-50 text-blue-600 border-blue-100'
                  ]"
                >
                  {{ isProductDisabled(product) ? 'Sin stock' : '+ Agregar' }}
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

          <!-- LISTA DE ÍTEMS -->
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
                    <p v-if="item.notes" class="text-[10px] italic text-amber-600 mt-0.5">
                      Nota: {{ item.notes }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="font-extrabold text-slate-800">{{ formatCurrency(item.quantity * item.unitPrice) }}</span>
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
