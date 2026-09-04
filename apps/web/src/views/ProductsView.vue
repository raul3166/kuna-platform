<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

interface TaxRule {
  id: string
  name: string
  percentage: number | string
  type: string
}

interface Category {
  id: string
  name: string
  description?: string | null
  isActive: boolean
}

interface Product {
  id: string
  sku: string
  name: string
  description?: string | null
  barcode?: string | null
  salePrice: number | string
  costPrice: number | string
  stock: number | string
  isActive: boolean
  categoryId?: string | null
  category?: Category | null
  taxRuleId?: string | null
  taxRule?: TaxRule | null
}

const activeTab = ref<'products' | 'categories'>('products')
const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const taxRules = ref<TaxRule[]>([])
const isLoading = ref(true)
const errorMessage = ref('')

// Filtros de búsqueda
const searchQuery = ref('')
const selectedCategoryFilter = ref('')

// Estados de Modales y Submisiones
const isProductModalOpen = ref(false)
const isCategoryModalOpen = ref(false)
const isSubmitting = ref(false)
const editingProductId = ref<string | null>(null)

// Formularios
const productForm = ref({
  sku: '',
  name: '',
  description: '',
  costPrice: 0,
  salePrice: 0,
  categoryId: '',
  taxRuleId: ''
})

const categoryForm = ref({
  name: '',
  description: ''
})

// Cargar datos principales
async function loadInventoryData() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const [productRes, categoryRes, taxRes] = await Promise.allSettled([
      api.get<Product[]>('/products'),
      api.get<Category[]>('/product-categories'),
      api.get<TaxRule[]>('/taxes')
    ])

    if (categoryRes.status === 'fulfilled') {
      categories.value = categoryRes.value.data
    }

    if (taxRes.status === 'fulfilled') {
      taxRules.value = taxRes.value.data.filter((tax) => tax.isActive)
    }

    if (productRes.status === 'fulfilled') {
      products.value = productRes.value.data
    } else {
      throw productRes.reason
    }
  } catch (error: any) {
    console.error(error)
    errorMessage.value = 'No tienes permisos o no fue posible conectar con el catálogo de productos.'
  } finally {
    isLoading.value = false
  }
}

// Productos filtrados según la búsqueda y categoría seleccionada
const filteredProducts = computed(() => {
  return products.value.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.value.toLowerCase())

    const catId = product.categoryId || product.category?.id || ''
    const matchesCategory = selectedCategoryFilter.value
      ? catId === selectedCategoryFilter.value
      : true

    return matchesSearch && matchesCategory
  })
})

// Modal Producto (Crear / Editar)
function openCreateProductModal() {
  editingProductId.value = null
  productForm.value = {
    sku: '',
    name: '',
    description: '',
    costPrice: 0,
    salePrice: 0,
    categoryId: '',
    taxRuleId: ''
  }
  isProductModalOpen.value = true
}

function openEditProductModal(product: Product) {
  editingProductId.value = product.id
  productForm.value = {
    sku: product.sku,
    name: product.name,
    description: product.description || '',
    costPrice: typeof product.costPrice === 'string' ? parseFloat(product.costPrice) : product.costPrice,
    salePrice: typeof product.salePrice === 'string' ? parseFloat(product.salePrice) : product.salePrice,
    categoryId: product.categoryId || product.category?.id || '',
    taxRuleId: product.taxRuleId || ''
  }
  isProductModalOpen.value = true
}

function closeProductModal() {
  isProductModalOpen.value = false
  editingProductId.value = null
}

async function handleSaveProduct() {
  if (!productForm.value.name || !productForm.value.sku) return

  const organizationId = authStore.user?.organizationId
  if (!organizationId) {
    alert('No se identificó la organización activa.')
    return
  }

  isSubmitting.value = true

  const payload: Record<string, any> = {
    sku: productForm.value.sku.trim(),
    name: productForm.value.name.trim(),
    description: productForm.value.description.trim() || undefined,
    costPrice: Number(productForm.value.costPrice),
    salePrice: Number(productForm.value.salePrice),
    categoryId: productForm.value.categoryId || null,
    taxRuleId: productForm.value.taxRuleId || null
  }

  try {
    if (editingProductId.value) {
      await api.patch(`/products/${editingProductId.value}`, payload)
    } else {
      payload.organizationId = organizationId
      await api.post('/products', payload)
    }
    closeProductModal()
    await loadInventoryData()
  } catch (error: any) {
    console.error(error)
    const msg = Array.isArray(error.response?.data?.message)
      ? error.response.data.message.join(', ')
      : error.response?.data?.message
    alert(msg || 'Error al guardar el producto')
  } finally {
    isSubmitting.value = false
  }
}

// Inactivar / Desactivar Producto
async function handleDeleteProduct(product: Product) {
  if (!confirm(`¿Estás seguro de desactivar el producto "${product.name}"?`)) return

  try {
    await api.delete(`/products/${product.id}`)
    await loadInventoryData()
  } catch (error: any) {
    console.error(error)
    alert('No se pudo desactivar el producto.')
  }
}

// Modal Categoría
function openCategoryModal() {
  categoryForm.value = { name: '', description: '' }
  isCategoryModalOpen.value = true
}

function closeCategoryModal() {
  isCategoryModalOpen.value = false
}

async function handleCreateCategory() {
  if (!categoryForm.value.name.trim()) return

  const organizationId = authStore.user?.organizationId
  if (!organizationId) {
    alert('No se identificó la organización activa.')
    return
  }

  isSubmitting.value = true
  const payload = {
    name: categoryForm.value.name.trim(),
    description: categoryForm.value.description.trim() || undefined,
    organizationId
  }

  try {
    await api.post('/product-categories', payload)
    closeCategoryModal()
    await loadInventoryData()
  } catch (error: any) {
    console.error(error)
    const msg = Array.isArray(error.response?.data?.message)
      ? error.response.data.message.join(', ')
      : error.response?.data?.message
    alert(msg || 'Error al crear la categoría')
  } finally {
    isSubmitting.value = false
  }
}

async function updateProductTax(product: Product, taxRuleId: string | null) {
  try {
    await api.patch(`/products/${product.id}`, { taxRuleId: taxRuleId || null })
    product.taxRuleId = taxRuleId
    const selected = taxRules.value.find((t) => t.id === taxRuleId)
    product.taxRule = selected || null
  } catch (error) {
    console.error(error)
    alert('No se pudo actualizar el impuesto asignado al producto.')
  }
}

function getCategoryName(product: any): string {
  if (product.category?.name) return product.category.name
  const categoryId = product.categoryId || product.productCategoryId
  if (categoryId) {
    const found = categories.value.find((c) => c.id === categoryId)
    if (found) return found.name
  }
  return '—'
}

function formatCurrency(value: number | string) {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(num)
}

function formatStock(value: number | string) {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(num)
}

onMounted(() => {
  loadInventoryData()
})
</script>

<template>
  <AppLayout>
    <!-- Header dinámico -->
    <header class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-900">Catálogo de Inventario</h1>
        <p class="mt-1 text-sm text-slate-500">
          Control maestro de productos comerciales, costos, stock y asignación fiscal de impuestos.
        </p>
      </div>
      <div>
        <button
          v-if="activeTab === 'products'"
          type="button"
          @click="openCreateProductModal"
          class="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
        >
          ➕ Nuevo Producto
        </button>
        <button
          v-else
          type="button"
          @click="openCategoryModal"
          class="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
        >
          📁 Nueva Categoría
        </button>
      </div>
    </header>

    <!-- Pestañas -->
    <div class="mb-4 border-b border-slate-200">
      <nav class="-mb-px flex space-x-6">
        <button
          type="button"
          @click="activeTab = 'products'"
          :class="[
            activeTab === 'products'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700',
            'whitespace-nowrap border-b-2 px-1 pb-4 text-sm transition-colors'
          ]"
        >
          📦 Productos Activos ({{ products.length }})
        </button>
        <button
          type="button"
          @click="activeTab = 'categories'"
          :class="[
            activeTab === 'categories'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700',
            'whitespace-nowrap border-b-2 px-1 pb-4 text-sm transition-colors'
          ]"
        >
          📁 Categorías ({{ categories.length }})
        </button>
      </nav>
    </div>

    <!-- Filtros de Búsqueda y Categoría (Solo visibles en pestaña de Productos) -->
    <div v-if="activeTab === 'products'" class="mb-6 flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
          🔍
        </span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por SKU o Nombre..."
          class="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div class="w-full sm:w-56">
        <select
          v-model="selectedCategoryFilter"
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Todas las Categorías</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Indicador de Carga / Error -->
    <div v-if="isLoading" class="flex h-48 items-center justify-center rounded-xl border border-slate-200 bg-white">
      <p class="text-sm font-medium text-slate-500 animate-pulse">Sincronizando inventario con la API...</p>
    </div>

    <div v-else-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <!-- Contenido Tabla -->
    <div v-else class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <!-- TABLA PRODUCTOS -->
      <div v-if="activeTab === 'products'">
        <div v-if="filteredProducts.length === 0" class="p-8 text-center text-slate-500">
          No se encontraron productos que coincidan con la búsqueda.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th class="px-6 py-3">SKU / Nombre</th>
                <th class="px-6 py-3">Categoría</th>
                <th class="px-6 py-3">Impuesto Asignado</th>
                <th class="px-6 py-3 text-right">Costo Base</th>
                <th class="px-6 py-3 text-right">Precio Venta</th>
                <th class="px-6 py-3 text-center">Existencia</th>
                <th class="px-6 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="product in filteredProducts" :key="product.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <div class="font-semibold text-slate-900">{{ product.name }}</div>
                  <div class="text-xs font-mono text-blue-600 font-bold mt-0.5">SKU: {{ product.sku }}</div>
                </td>
                <td class="px-6 py-4">
                  <span class="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {{ getCategoryName(product) }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <select
                    :value="product.taxRuleId || ''"
                    @change="(e) => updateProductTax(product, (e.target as HTMLSelectElement).value || null)"
                    class="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                  >
                    <option value="">Sin Impuesto (0%)</option>
                    <option v-for="tax in taxRules" :key="tax.id" :value="tax.id">
                      {{ tax.name }} ({{ tax.percentage }}%)
                    </option>
                  </select>
                </td>
                <td class="px-6 py-4 text-right text-slate-600 font-medium">
                  {{ formatCurrency(product.costPrice) }}
                </td>
                <td class="px-6 py-4 text-right font-bold text-slate-950">
                  {{ formatCurrency(product.salePrice) }}
                </td>
                <td class="px-6 py-4 text-center">
                  <span
                    :class="[
                      parseFloat(product.stock as string) > 0
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200',
                      'inline-block px-2.5 py-0.5 rounded font-mono text-xs font-bold border'
                    ]"
                  >
                    {{ formatStock(product.stock) }} uds
                  </span>
                </td>
                <td class="px-6 py-4 text-center">
                  <div class="flex items-center justify-center space-x-2">
                    <button
                      type="button"
                      @click="openEditProductModal(product)"
                      title="Editar Producto"
                      class="rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      type="button"
                      @click="handleDeleteProduct(product)"
                      title="Inactivar Producto"
                      class="rounded bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TABLA CATEGORÍAS -->
      <div v-if="activeTab === 'categories'">
        <div v-if="categories.length === 0" class="p-8 text-center text-slate-500">
          No hay categorías creadas para la gestión de productos.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th class="px-6 py-3">Nombre de Categoría</th>
                <th class="px-6 py-3">Descripción</th>
                <th class="px-6 py-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="cat in categories" :key="cat.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4 font-semibold text-slate-900">{{ cat.name }}</td>
                <td class="px-6 py-4 text-slate-500 max-w-xs truncate">{{ cat.description || '—' }}</td>
                <td class="px-6 py-4 text-center">
                  <span class="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                    Activa
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Formulario de Producto -->
    <div v-if="isProductModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 class="text-xl font-bold text-slate-900 mb-4">
          {{ editingProductId ? 'Editar Producto' : 'Registrar Nuevo Producto' }}
        </h2>

        <form @submit.prevent="handleSaveProduct" class="space-y-4">
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">SKU</label>
              <input
                v-model="productForm.sku"
                type="text"
                required
                placeholder="PROD-001"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div class="col-span-2">
              <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">Nombre</label>
              <input
                v-model="productForm.name"
                type="text"
                required
                placeholder="Ej. Silla de Oficina"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">Costo Base</label>
              <input
                v-model.number="productForm.costPrice"
                type="number"
                min="0"
                step="0.01"
                required
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">Precio Venta</label>
              <input
                v-model.number="productForm.salePrice"
                type="number"
                min="0"
                step="0.01"
                required
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">Categoría</label>
              <select
                v-model="productForm.categoryId"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white"
              >
                <option value="">Sin Categoría</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">Impuesto</label>
              <select
                v-model="productForm.taxRuleId"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white"
              >
                <option value="">Sin Impuesto (0%)</option>
                <option v-for="tax in taxRules" :key="tax.id" :value="tax.id">
                  {{ tax.name }} ({{ tax.percentage }}%)
                </option>
              </select>
            </div>
          </div>

          <div class="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              @click="closeProductModal"
              class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {{ isSubmitting ? 'Guardando...' : editingProductId ? 'Actualizar Producto' : 'Crear Producto' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Formulario de Categoría -->
    <div v-if="isCategoryModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 class="text-xl font-bold text-slate-900 mb-4">Nueva Categoría de Producto</h2>

        <form @submit.prevent="handleCreateCategory" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">Nombre</label>
            <input
              v-model="categoryForm.name"
              type="text"
              required
              placeholder="Ej. Electrónica, Servicios, Alimentos"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">Descripción (Opcional)</label>
            <textarea
              v-model="categoryForm.description"
              rows="3"
              placeholder="Breve detalle sobre la categoría..."
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            ></textarea>
          </div>

          <div class="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              @click="closeCategoryModal"
              class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {{ isSubmitting ? 'Guardando...' : 'Crear Categoría' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>
