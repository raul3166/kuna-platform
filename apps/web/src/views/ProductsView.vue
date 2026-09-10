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

  // Estos dos valores pertenecen a la CATEGORÍA
  trackStock: boolean
  trackLots?: boolean

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

  pharmaDetail?: any
}

/*
|--------------------------------------------------------------------------
| IMPORTANTE
|--------------------------------------------------------------------------
| trackStock y trackLots NO pertenecen al producto.
|
| Se obtienen desde:
|
| product.category.trackStock
| product.category.trackLots
|
|--------------------------------------------------------------------------
*/

// Determina si el producto maneja inventario físico
function productTracksStock(product: Product): boolean {
  return product.category?.trackStock ?? false
}

// Determina si el producto maneja lotes / FEFO (por categoría o por ser medicamento)
function productTracksLots(product: Product): boolean {
  const isPharma = !!product.pharmaDetail
  const categoryTracksLots = product.category?.trackLots ?? false

  return categoryTracksLots || isPharma
}

// -----------------------------------------------------------------------------
// Pestañas
// -----------------------------------------------------------------------------

const activeTab = ref<'products' | 'categories' | 'expiring'>('products')

const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const taxRules = ref<TaxRule[]>([])

// -----------------------------------------------------------------------------
// Lotes / vencimientos
// -----------------------------------------------------------------------------

const productLots = ref<any[]>([])
const selectedProductForLot = ref<Product | null>(null)

const isLotModalOpen = ref(false)
const isLotLoading = ref(false)

const onlyPharmaFilter = ref(false)

// -----------------------------------------------------------------------------
// Estado general
// -----------------------------------------------------------------------------

const isLoading = ref(true)
const errorMessage = ref('')

// -----------------------------------------------------------------------------
// Filtros
// -----------------------------------------------------------------------------

const searchQuery = ref('')
const selectedCategoryFilter = ref('')

// -----------------------------------------------------------------------------
// Modales
// -----------------------------------------------------------------------------

const isProductModalOpen = ref(false)
const isCategoryModalOpen = ref(false)

const isSubmitting = ref(false)

const editingProductId = ref<string | null>(null)

// -----------------------------------------------------------------------------
// Formulario Producto
// -----------------------------------------------------------------------------
//
// IMPORTANTE:
// Ya NO tenemos:
//
// trackStock
// trackLots
//
// porque ambos pertenecen a la categoría.
// -----------------------------------------------------------------------------

const productForm = ref({
  sku: '',
  name: '',
  description: '',
  costPrice: 0,
  salePrice: 0,
  categoryId: '',
  taxRuleId: '',

  isPharma: false,
  activeIngredient: '',
  laboratory: '',
  invimaCode: '',
  concentration: '',
  requiresPrescription: false
})

// -----------------------------------------------------------------------------
// Formulario Categoría
// -----------------------------------------------------------------------------

const categoryForm = ref({
  name: '',
  description: '',
  trackStock: true,
  trackLots: false
})

// -----------------------------------------------------------------------------
// Formulario Lote
// -----------------------------------------------------------------------------

const lotForm = ref({
  lotNumber: '',
  expirationDate: '',
  stock: 1
})

// -----------------------------------------------------------------------------
// Cargar datos
// -----------------------------------------------------------------------------

async function loadInventoryData() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const [productRes, categoryRes, taxRes] =
      await Promise.allSettled([
        api.get<Product[]>('/products'),
        api.get<Category[]>('/product-categories'),
        api.get<TaxRule[]>('/taxes')
      ])

    // Categorías
    if (categoryRes.status === 'fulfilled') {
      categories.value = categoryRes.value.data || []
    }

    // Impuestos
    if (taxRes.status === 'fulfilled') {
      taxRules.value = (taxRes.value.data || []).filter(
        (tax: any) => tax.isActive
      )
    }

    // Productos
    if (productRes.status === 'fulfilled') {
      products.value = productRes.value.data || []
    } else {
      throw productRes.reason
    }
  } catch (error: any) {
    console.error(
      'Error al cargar inventario:',
      error,
      error?.stack
    )

    errorMessage.value =
      'No tienes permisos o no fue posible conectar con el catálogo de productos.'
  } finally {
    isLoading.value = false
  }
}

// -----------------------------------------------------------------------------
// Abrir modal de lotes
// -----------------------------------------------------------------------------

function openLotModal(product: Product) {
  if (!productTracksLots(product)) {
    return
  }

  selectedProductForLot.value = product
  productLots.value = []
  isLotModalOpen.value = true

  // loadProductLots(product)
}

// -----------------------------------------------------------------------------
// Cerrar modal de lotes
// -----------------------------------------------------------------------------

function closeLotModal() {
  isLotModalOpen.value = false
  selectedProductForLot.value = null
  productLots.value = []
}

// -----------------------------------------------------------------------------
// Guardar lote
// -----------------------------------------------------------------------------

async function handleSaveLot() {
  /*
   * Se mantiene como stub mientras el endpoint real
   * de lotes no esté conectado.
   */
  closeLotModal()
}

// -----------------------------------------------------------------------------
// Productos filtrados
// -----------------------------------------------------------------------------

const filteredProducts = computed(() => {
  return (products.value || []).filter((product) => {
    const search = searchQuery.value.toLowerCase().trim()

    const matchesSearch =
      (product.name || '')
        .toLowerCase()
        .includes(search) ||
      (product.sku || '')
        .toLowerCase()
        .includes(search) ||
      (
        product.pharmaDetail?.activeIngredient || ''
      )
        .toLowerCase()
        .includes(search) ||
      (
        product.pharmaDetail?.laboratory || ''
      )
        .toLowerCase()
        .includes(search) ||
      (
        product.pharmaDetail?.invimaCode || ''
      )
        .toLowerCase()
        .includes(search)

    const catId =
      product.categoryId ||
      product.category?.id ||
      ''

    const matchesCategory =
      selectedCategoryFilter.value
        ? catId === selectedCategoryFilter.value
        : true

    const matchesPharma =
      onlyPharmaFilter.value
        ? !!product.pharmaDetail
        : true

    return (
      matchesSearch &&
      matchesCategory &&
      matchesPharma
    )
  })
})

// -----------------------------------------------------------------------------
// Crear producto
// -----------------------------------------------------------------------------

function openCreateProductModal() {
  editingProductId.value = null

  productForm.value = {
    sku: '',
    name: '',
    description: '',
    costPrice: 0,
    salePrice: 0,
    categoryId: '',
    taxRuleId: '',

    isPharma: false,
    activeIngredient: '',
    laboratory: '',
    invimaCode: '',
    concentration: '',
    requiresPrescription: false
  }

  isProductModalOpen.value = true
}

// -----------------------------------------------------------------------------
// Editar producto
// -----------------------------------------------------------------------------

function openEditProductModal(product: Product) {
  editingProductId.value = product.id

  productForm.value = {
    sku: product.sku,
    name: product.name,
    description: product.description || '',

    costPrice:
      typeof product.costPrice === 'string'
        ? parseFloat(product.costPrice)
        : product.costPrice,

    salePrice:
      typeof product.salePrice === 'string'
        ? parseFloat(product.salePrice)
        : product.salePrice,

    categoryId:
      product.categoryId ||
      product.category?.id ||
      '',

    taxRuleId:
      product.taxRuleId || '',

    isPharma:
      !!product.pharmaDetail,

    activeIngredient:
      product.pharmaDetail?.activeIngredient || '',

    laboratory:
      product.pharmaDetail?.laboratory || '',

    invimaCode:
      product.pharmaDetail?.invimaCode || '',

    concentration:
      product.pharmaDetail?.concentration || '',

    requiresPrescription:
      !!product.pharmaDetail?.requiresPrescription
  }

  isProductModalOpen.value = true
}

// -----------------------------------------------------------------------------
// Cerrar modal producto
// -----------------------------------------------------------------------------

function closeProductModal() {
  isProductModalOpen.value = false
  editingProductId.value = null
}

// -----------------------------------------------------------------------------
// Guardar producto
// -----------------------------------------------------------------------------

async function handleSaveProduct() {
  if (
    !productForm.value.name.trim() ||
    !productForm.value.sku.trim()
  ) {
    return
  }

  const organizationId =
    authStore.user?.organizationId

  if (!organizationId) {
    alert('No se identificó la organización activa.')
    return
  }

  isSubmitting.value = true

  /*
   * IMPORTANTE:
   *
   * NO enviamos:
   *
   * trackStock
   * trackLots
   *
   * porque son propiedades de Category.
   */

  const payload: Record<string, any> = {
    sku: productForm.value.sku.trim(),

    name: productForm.value.name.trim(),

    description:
      productForm.value.description.trim() ||
      undefined,

    costPrice:
      Number(productForm.value.costPrice),

    salePrice:
      Number(productForm.value.salePrice),

    categoryId:
      productForm.value.categoryId ||
      null,

    taxRuleId:
      productForm.value.taxRuleId ||
      null
  }

  try {
    if (editingProductId.value) {
      await api.patch(
        `/products/${editingProductId.value}`,
        payload
      )
    } else {
      payload.organizationId = organizationId

      await api.post(
        '/products',
        payload
      )
    }

    closeProductModal()

    await loadInventoryData()
  } catch (error: any) {
    console.error(
      'Error al guardar producto:',
      error,
      error?.stack
    )

    const msg =
      Array.isArray(error.response?.data?.message)
        ? error.response.data.message.join(', ')
        : error.response?.data?.message

    alert(
      msg ||
      'Error al guardar el producto'
    )
  } finally {
    isSubmitting.value = false
  }
}

// -----------------------------------------------------------------------------
// Desactivar producto
// -----------------------------------------------------------------------------

async function handleDeleteProduct(
  product: Product
) {
  if (
    !confirm(
      `¿Estás seguro de desactivar el producto "${product.name}"?`
    )
  ) {
    return
  }

  try {
    await api.delete(
      `/products/${product.id}`
    )

    await loadInventoryData()
  } catch (error: any) {
    console.error(
      'Error al desactivar producto:',
      error,
      error?.stack
    )

    alert(
      'No se pudo desactivar el producto.'
    )
  }
}

// -----------------------------------------------------------------------------
// Modal Categoría
// -----------------------------------------------------------------------------

function openCategoryModal() {
  categoryForm.value = {
    name: '',
    description: '',
    trackStock: true,
    trackLots: false
  }

  isCategoryModalOpen.value = true
}

// -----------------------------------------------------------------------------
// Cerrar categoría
// -----------------------------------------------------------------------------

function closeCategoryModal() {
  isCategoryModalOpen.value = false
}

// -----------------------------------------------------------------------------
// Crear categoría
// -----------------------------------------------------------------------------

async function handleCreateCategory() {
  if (
    !categoryForm.value.name.trim()
  ) {
    return
  }

  const organizationId =
    authStore.user?.organizationId

  if (!organizationId) {
    alert(
      'No se identificó la organización activa.'
    )

    return
  }

  isSubmitting.value = true

  /*
   * AQUÍ sí enviamos trackStock y trackLots
   * porque pertenecen a la categoría.
   */

  const payload = {
    name:
      categoryForm.value.name.trim(),

    description:
      categoryForm.value.description.trim() ||
      undefined,

    trackStock:
      categoryForm.value.trackStock,

    trackLots:
      categoryForm.value.trackLots,

    organizationId
  }

  try {
    await api.post(
      '/product-categories',
      payload
    )

    closeCategoryModal()

    await loadInventoryData()
  } catch (error: any) {
    console.error(
      'Error al crear categoría:',
      error
    )

    const msg =
      Array.isArray(error.response?.data?.message)
        ? error.response.data.message.join(', ')
        : error.response?.data?.message

    alert(
      msg ||
      'Error al crear la categoría'
    )
  } finally {
    isSubmitting.value = false
  }
}

// -----------------------------------------------------------------------------
// Actualizar impuesto
// -----------------------------------------------------------------------------

async function updateProductTax(
  product: Product,
  taxRuleId: string | null
) {
  try {
    await api.patch(
      `/products/${product.id}`,
      {
        taxRuleId:
          taxRuleId || null
      }
    )

    product.taxRuleId =
      taxRuleId

    const selected =
      taxRules.value.find(
        (t) => t.id === taxRuleId
      )

    product.taxRule =
      selected || null
  } catch (error: any) {
    console.error(
      'Error al actualizar impuesto:',
      error,
      error?.stack
    )

    alert(
      'No se pudo actualizar el impuesto asignado al producto.'
    )
  }
}

// -----------------------------------------------------------------------------
// Obtener nombre categoría
// -----------------------------------------------------------------------------

function getCategoryName(
  product: Product
): string {
  if (product.category?.name) {
    return product.category.name
  }

  const categoryId =
    product.categoryId

  if (categoryId) {
    const found =
      categories.value.find(
        (c) => c.id === categoryId
      )

    if (found) {
      return found.name
    }
  }

  return '—'
}

// -----------------------------------------------------------------------------
// Formatear moneda
// -----------------------------------------------------------------------------

function formatCurrency(
  value: number | string
) {
  const num =
    typeof value === 'string'
      ? parseFloat(value)
      : value

  return new Intl.NumberFormat(
    'es-CO',
    {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }
  ).format(num || 0)
}

// -----------------------------------------------------------------------------
// Formatear stock
// -----------------------------------------------------------------------------

function formatStock(
  value: number | string
) {
  const num =
    typeof value === 'string'
      ? parseFloat(value)
      : value

  return new Intl.NumberFormat(
    'es-CO',
    {
      maximumFractionDigits: 2
    }
  ).format(num || 0)
}

// -----------------------------------------------------------------------------
// Formatear fecha
// -----------------------------------------------------------------------------

function formatDate(
  dateStr: string
) {
  if (!dateStr) {
    return '—'
  }

  return new Date(
    dateStr
  ).toLocaleDateString('es-CO')
}

// -----------------------------------------------------------------------------
// Inicialización
// -----------------------------------------------------------------------------

onMounted(() => {
  loadInventoryData()
})
</script>
<template>
  <AppLayout>
    <div class="p-6 space-y-6 max-w-[1400px] mx-auto">

      <!-- ================================================================ -->
      <!-- ENCABEZADO PRINCIPAL -->
      <!-- ================================================================ -->

      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">
            Catálogo de Farmacia e Inventario
          </h1>

          <p class="text-sm text-slate-500">
            Gestión de medicamentos, principios activos, lotes FEFO, costos y stock comercial.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="openCategoryModal"
            class="px-4 py-2 border border-slate-300 text-slate-700 bg-white rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
          >
            + Nueva Categoría
          </button>

          <button
            @click="openCreateProductModal"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            + Nuevo Producto / Fármaco
          </button>
        </div>
      </div>


      <!-- ================================================================ -->
      <!-- MENSAJE DE ERROR -->
      <!-- ================================================================ -->

      <div
        v-if="errorMessage"
        class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm"
      >
        {{ errorMessage }}
      </div>


      <!-- ================================================================ -->
      <!-- PESTAÑAS -->
      <!-- ================================================================ -->

      <div class="flex items-center gap-4 border-b border-slate-200">

        <!-- Productos -->

        <button
          @click="activeTab = 'products'"
          :class="[
            'pb-3 px-1 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors',
            activeTab === 'products'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          ]"
        >
          📦 Catálogo General ({{ products.length }})
        </button>


        <!-- Categorías -->

        <button
          @click="activeTab = 'categories'"
          :class="[
            'pb-3 px-1 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors',
            activeTab === 'categories'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          ]"
        >
          📁 Categorías ({{ categories.length }})
        </button>




      </div>


      <!-- ================================================================= -->
      <!-- TAB 1: PRODUCTOS -->
      <!-- ================================================================= -->

      <div
        v-if="activeTab === 'products'"
        class="space-y-4"
      >

        <!-- =============================================================== -->
        <!-- FILTROS -->
        <!-- =============================================================== -->

        <div
          class="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
        >

          <!-- Búsqueda -->

          <div class="relative flex-1 min-w-[280px]">

            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar por SKU, nombre, principio activo, INVIMA o laboratorio..."
              class="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            <span class="absolute left-3 top-2.5 text-slate-400">
              🔍
            </span>

          </div>


          <!-- Filtros adicionales -->

          <div class="flex items-center gap-3">

            <!-- Categoría -->

            <select
              v-model="selectedCategoryFilter"
              class="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">
                Todas las Categorías
              </option>

              <option
                v-for="cat in categories"
                :key="cat.id"
                :value="cat.id"
              >
                {{ cat.name }}
              </option>
            </select>


            <!-- Solo farmacia -->

            <label
              class="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none"
            >
              <input
                v-model="onlyPharmaFilter"
                type="checkbox"
                class="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />

              💊 Solo Medicamentos
            </label>

          </div>

        </div>


        <!-- =============================================================== -->
        <!-- TABLA PRODUCTOS -->
        <!-- =============================================================== -->

        <div
          class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
        >

          <div class="overflow-x-auto">

            <table class="w-full text-left text-sm">

              <thead
                class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider"
              >

                <tr>

                  <th class="px-4 py-3">
                    Producto / Detalles Farmacéuticos
                  </th>

                  <th class="px-4 py-3">
                    Categoría
                  </th>

                  <th class="px-4 py-3">
                    Impuesto
                  </th>

                  <th class="px-4 py-3 text-right">
                    Costo Base
                  </th>

                  <th class="px-4 py-3 text-right">
                    Precio Venta
                  </th>

                  <th class="px-4 py-3 text-center">
                    Existencia
                  </th>

                  <th class="px-4 py-3 text-center">
                    Lotes (FEFO)
                  </th>

                  <th class="px-4 py-3 text-center">
                    Acciones
                  </th>

                </tr>

              </thead>


              <tbody class="divide-y divide-slate-100">

                <!-- Cargando -->

                <tr v-if="isLoading">

                  <td
                    colspan="8"
                    class="py-8 text-center text-slate-400"
                  >
                    Cargando inventario...
                  </td>

                </tr>


                <!-- Sin resultados -->

                <tr v-else-if="filteredProducts.length === 0">

                  <td
                    colspan="8"
                    class="py-8 text-center text-slate-400"
                  >
                    No se encontraron productos con los criterios ingresados.
                  </td>

                </tr>


                <!-- Productos -->

                <tr
                  v-for="product in filteredProducts"
                  :key="product.id"
                  class="hover:bg-slate-50/80 transition-colors"
                >

                  <!-- ===================================================== -->
                  <!-- PRODUCTO -->
                  <!-- ===================================================== -->

                  <td class="px-4 py-3">

                    <div class="font-medium text-slate-800">
                      {{ product.name }}
                    </div>

                    <div class="text-xs text-slate-400">
                      SKU: {{ product.sku }}
                    </div>


                    <!-- Detalle farmacéutico -->

                    <div
                      v-if="product.pharmaDetail"
                      class="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 w-fit"
                    >

                      <span>
                        💊
                        {{
                          product.pharmaDetail.activeIngredient ||
                          'Sin principio'
                        }}
                      </span>

                      <span
                        v-if="product.pharmaDetail.concentration"
                      >
                        ({{ product.pharmaDetail.concentration }})
                      </span>

                      <span
                        v-if="product.pharmaDetail.laboratory"
                      >
                        • {{ product.pharmaDetail.laboratory }}
                      </span>

                      <span
                        v-if="product.pharmaDetail.invimaCode"
                      >
                        • INVIMA:
                        {{ product.pharmaDetail.invimaCode }}
                      </span>

                      <span
                        v-if="product.pharmaDetail.requiresPrescription"
                        class="text-red-600 font-bold ml-1"
                      >
                        ⚠️ Receta
                      </span>

                    </div>

                  </td>


                  <!-- ===================================================== -->
                  <!-- CATEGORÍA -->
                  <!-- ===================================================== -->

                  <td class="px-4 py-3 text-slate-600">

                    {{ getCategoryName(product) }}

                    <!-- Indicadores -->

                    <div
                      v-if="product.category"
                      class="flex flex-wrap gap-1 mt-1"
                    >

                      <!-- Stock -->

                      <span
                        v-if="productTracksStock(product)"
                        class="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded"
                      >
                        📦 Stock
                      </span>

                      <!-- Lotes -->

                      <span
                        v-if="productTracksLots(product)"
                        class="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded"
                      >
                        🏷️ Lotes
                      </span>

                    </div>

                  </td>


                  <!-- ===================================================== -->
                  <!-- IMPUESTO -->
                  <!-- ===================================================== -->

                  <td class="px-4 py-3">

                    <select
                      :value="product.taxRuleId || ''"
                      @change="
                        updateProductTax(
                          product,
                          ($event.target as HTMLSelectElement).value
                        )
                      "
                      class="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500"
                    >

                      <option value="">
                        Sin Impuesto (0%)
                      </option>

                      <option
                        v-for="tax in taxRules"
                        :key="tax.id"
                        :value="tax.id"
                      >
                        {{ tax.name }}
                        ({{ tax.percentage }}%)
                      </option>

                    </select>

                  </td>


                  <!-- ===================================================== -->
                  <!-- COSTO -->
                  <!-- ===================================================== -->

                  <td class="px-4 py-3 text-right text-slate-600">

                    {{ formatCurrency(product.costPrice) }}

                  </td>


                  <!-- ===================================================== -->
                  <!-- PRECIO -->
                  <!-- ===================================================== -->

                  <td class="px-4 py-3 text-right font-semibold text-slate-800">

                    {{ formatCurrency(product.salePrice) }}

                  </td>


                  <!-- ===================================================== -->
                  <!-- EXISTENCIA -->
                  <!-- ===================================================== -->

                  <td class="px-4 py-3 text-center">

                    <!--
                      AQUÍ ESTÁ EL CAMBIO IMPORTANTE.

                      ANTES:
                      v-if="product.trackStock"

                      AHORA:
                      v-if="productTracksStock(product)"
                    -->

                    <span
                      v-if="productTracksStock(product)"
                      :class="[
                        'inline-block px-2.5 py-1 text-xs font-semibold rounded-full border',
                        Number(product.stock ?? 0) <= 0
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : Number(product.stock ?? 0) <= 5
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      ]"
                    >

                      {{
                        Number(product.stock ?? 0) > 0
                          ? `${formatStock(product.stock)} uds`
                          : 'Agotado'
                      }}

                    </span>


                    <!-- Producto que NO maneja stock -->

                    <span
                      v-else
                      class="px-2 py-0.5 text-[11px] bg-slate-100 text-slate-400 rounded font-medium cursor-default"
                      title="La categoría de este producto no controla inventario"
                    >
                      No rastrea stock
                    </span>

                  </td>


                  <!-- ===================================================== -->
                  <!-- LOTES -->
                  <!-- ===================================================== -->

                  <td class="px-4 py-3 text-center">

                    <!--
                      AQUÍ TAMBIÉN CAMBIAMOS:

                      ANTES:
                      v-if="product.trackLots"

                      AHORA:
                      v-if="productTracksLots(product)"
                    -->

                    <button
                      v-if="productTracksLots(product)"
                      @click="openLotModal(product)"
                      title="Gestionar Lotes / FEFO"
                      class="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors inline-flex items-center gap-1"
                    >
                      🏷️ Gestionar
                    </button>


                    <span
                      v-else
                      class="px-2 py-0.5 text-[11px] bg-slate-100 text-slate-400 rounded font-medium cursor-default"
                      title="La categoría de este producto no rastrea lotes"
                    >
                      No rastrea lotes
                    </span>

                  </td>


                  <!-- ===================================================== -->
                  <!-- ACCIONES -->
                  <!-- ===================================================== -->

                  <td class="px-4 py-3 text-center">

                    <div
                      class="flex items-center justify-center gap-2"
                    >

                      <button
                        @click="openEditProductModal(product)"
                        class="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"
                      >
                        ✏️ Editar
                      </button>

                      <button
                        @click="handleDeleteProduct(product)"
                        class="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        title="Desactivar producto"
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

      </div>


      <!-- ================================================================= -->
      <!-- TAB 2: CATEGORÍAS -->
      <!-- ================================================================= -->

      <div
        v-if="activeTab === 'categories'"
        class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      >

        <table class="w-full text-left text-sm">

          <thead
            class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]"
          >

            <tr>

              <th class="px-4 py-3">
                Nombre
              </th>

              <th class="px-4 py-3">
                Descripción
              </th>

              <th class="px-4 py-3 text-center">
                Control Stock
              </th>

              <th class="px-4 py-3 text-center">
                Control de Lotes (FEFO)
              </th>

            </tr>

          </thead>


          <tbody class="divide-y divide-slate-100">

            <tr
              v-for="cat in categories"
              :key="cat.id"
              class="hover:bg-slate-50"
            >

              <td class="px-4 py-3 font-medium text-slate-800">
                {{ cat.name }}
              </td>


              <td class="px-4 py-3 text-slate-500">
                {{ cat.description || '—' }}
              </td>


              <!-- ========================================================= -->
              <!-- TRACK STOCK DE CATEGORÍA -->
              <!-- ========================================================= -->

              <td class="px-4 py-3 text-center">

                <span
                  :class="[
                    'px-2.5 py-0.5 text-xs rounded-full font-medium border',
                    cat.trackStock
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  ]"
                >
                  {{ cat.trackStock ? 'Habilitado' : 'No rastreado' }}
                </span>

              </td>


              <!-- ========================================================= -->
              <!-- TRACK LOTS DE CATEGORÍA -->
              <!-- ========================================================= -->

              <td class="px-4 py-3 text-center">

                <span
                  :class="[
                    'px-2.5 py-0.5 text-xs rounded-full font-medium border',
                    cat.trackLots
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  ]"
                >
                  {{
                    cat.trackLots
                      ? 'Habilitado'
                      : 'No rastreado'
                  }}
                </span>

              </td>

            </tr>


            <tr v-if="categories.length === 0">

              <td
                colspan="4"
                class="py-8 text-center text-slate-400"
              >
                No hay categorías registradas.
              </td>

            </tr>

          </tbody>

        </table>

      </div>


    </div>


    <!-- =================================================================== -->
    <!-- MODAL 1: CREAR / EDITAR PRODUCTO -->
    <!-- =================================================================== -->

    <div
      v-if="isProductModalOpen"
      class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
    >

      <div
        class="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >

        <!-- Encabezado -->

        <div
          class="px-6 py-4 border-b border-slate-100 flex items-center justify-between"
        >

          <h2 class="text-lg font-bold text-slate-800">
            {{
              editingProductId
                ? 'Editar Producto / Medicamento'
                : 'Nuevo Producto / Medicamento'
            }}
          </h2>

          <button
            @click="closeProductModal"
            class="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>

        </div>


        <!-- Formulario -->

        <form
          @submit.prevent="handleSaveProduct"
          class="p-6 space-y-4 overflow-y-auto"
        >

          <!-- SKU / Nombre -->

          <div class="grid grid-cols-2 gap-4">

            <div>

              <label
                class="block text-xs font-bold uppercase text-slate-600 mb-1"
              >
                SKU *
              </label>

              <input
                v-model="productForm.sku"
                type="text"
                required
                class="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
              />

            </div>


            <div>

              <label
                class="block text-xs font-bold uppercase text-slate-600 mb-1"
              >
                Nombre Comercial *
              </label>

              <input
                v-model="productForm.name"
                type="text"
                required
                class="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
              />

            </div>

          </div>


          <!-- Costos -->

          <div class="grid grid-cols-2 gap-4">

            <div>

              <label
                class="block text-xs font-bold uppercase text-slate-600 mb-1"
              >
                Costo Base
              </label>

              <input
                v-model.number="productForm.costPrice"
                type="number"
                step="0.01"
                class="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
              />

            </div>


            <div>

              <label
                class="block text-xs font-bold uppercase text-slate-600 mb-1"
              >
                Precio Venta *
              </label>

              <input
                v-model.number="productForm.salePrice"
                type="number"
                step="0.01"
                required
                class="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
              />

            </div>

          </div>


          <!-- Categoría / Impuesto -->

          <div class="grid grid-cols-2 gap-4">

            <div>

              <label
                class="block text-xs font-bold uppercase text-slate-600 mb-1"
              >
                Categoría
              </label>

              <select
                v-model="productForm.categoryId"
                class="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white"
              >

                <option value="">
                  Sin Categoría
                </option>

                <option
                  v-for="cat in categories"
                  :key="cat.id"
                  :value="cat.id"
                >
                  {{ cat.name }}
                </option>

              </select>

            </div>


            <div>

              <label
                class="block text-xs font-bold uppercase text-slate-600 mb-1"
              >
                Impuesto
              </label>

              <select
                v-model="productForm.taxRuleId"
                class="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white"
              >

                <option value="">
                  Sin Impuesto (0%)
                </option>

                <option
                  v-for="tax in taxRules"
                  :key="tax.id"
                  :value="tax.id"
                >
                  {{ tax.name }}
                  ({{ tax.percentage }}%)
                </option>

              </select>

            </div>

          </div>


          <!-- ============================================================= -->
          <!-- INFORMACIÓN DE INVENTARIO -->
          <!-- ============================================================= -->

          <div
            v-if="productForm.categoryId"
            class="p-3 bg-slate-50 border border-slate-200 rounded-xl"
          >

            <div
              v-for="cat in categories.filter(
                c => c.id === productForm.categoryId
              )"
              :key="cat.id"
              class="space-y-2"
            >

              <div class="text-xs font-bold uppercase text-slate-600">
                Configuración de inventario de la categoría
              </div>

              <div class="flex flex-wrap gap-2">

                <span
                  :class="[
                    'px-2.5 py-1 text-xs rounded-full border font-medium',
                    cat.trackStock
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  ]"
                >
                  {{
                    cat.trackStock
                      ? '📦 Maneja inventario'
                      : '📦 No maneja inventario'
                  }}
                </span>


                <span
                  :class="[
                    'px-2.5 py-1 text-xs rounded-full border font-medium',
                    cat.trackLots
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  ]"
                >
                  {{
                    cat.trackLots
                      ? '🏷️ Controla lotes / FEFO'
                      : '🏷️ No controla lotes'
                  }}
                </span>

              </div>

              <p class="text-[11px] text-slate-400">
                Estas opciones se configuran en la categoría y aplican
                automáticamente a todos sus productos.
              </p>

            </div>

          </div>


          <div
            v-else
            class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700"
          >
            Selecciona una categoría para definir si el producto maneja
            inventario y/o lotes.
          </div>


          <!-- ============================================================= -->
          <!-- SECCIÓN FARMACÉUTICA -->
          <!-- ============================================================= -->

          <div class="pt-2 border-t border-slate-100">

            <label
              class="flex items-center gap-2 font-bold text-slate-800 cursor-pointer"
            >

              <input
                v-model="productForm.isPharma"
                type="checkbox"
                class="h-4 w-4 rounded text-blue-600 border-slate-300"
              />

              💊 ¿Es un producto farmacéutico / medicamento?

            </label>


            <div
              v-if="productForm.isPharma"
              class="mt-3 p-4 bg-purple-50/50 border border-purple-100 rounded-xl space-y-3"
            >

              <!-- Principio / Laboratorio -->

              <div class="grid grid-cols-2 gap-3">

                <div>

                  <label
                    class="block text-xs font-bold uppercase text-slate-600 mb-1"
                  >
                    Principio Activo
                  </label>

                  <input
                    v-model="productForm.activeIngredient"
                    type="text"
                    class="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                  />

                </div>


                <div>

                  <label
                    class="block text-xs font-bold uppercase text-slate-600 mb-1"
                  >
                    Laboratorio
                  </label>

                  <input
                    v-model="productForm.laboratory"
                    type="text"
                    class="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                  />

                </div>

              </div>


              <!-- INVIMA / Concentración -->

              <div class="grid grid-cols-2 gap-3">

                <div>

                  <label
                    class="block text-xs font-bold uppercase text-slate-600 mb-1"
                  >
                    Registro INVIMA
                  </label>

                  <input
                    v-model="productForm.invimaCode"
                    type="text"
                    class="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                  />

                </div>


                <div>

                  <label
                    class="block text-xs font-bold uppercase text-slate-600 mb-1"
                  >
                    Concentración
                  </label>

                  <input
                    v-model="productForm.concentration"
                    type="text"
                    placeholder="Ej: 500mg, 5ml"
                    class="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                  />

                </div>

              </div>


              <!-- Receta -->

              <label
                class="flex items-center gap-2 text-xs font-bold text-red-600 cursor-pointer pt-1"
              >

                <input
                  v-model="productForm.requiresPrescription"
                  type="checkbox"
                  class="h-4 w-4 rounded text-red-600 border-slate-300"
                />

                ⚠️ Requiere Receta / Fórmula Médica

              </label>

            </div>

          </div>


          <!-- Botones -->

          <div
            class="flex justify-end gap-2 pt-4 border-t border-slate-100"
          >

            <button
              type="button"
              @click="closeProductModal"
              class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>

            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {{
                isSubmitting
                  ? 'Guardando...'
                  : (
                      editingProductId
                        ? 'Actualizar'
                        : 'Guardar Producto'
                    )
              }}
            </button>

          </div>

        </form>

      </div>

    </div>


    <!-- =================================================================== -->
    <!-- MODAL 2: CREAR CATEGORÍA -->
    <!-- =================================================================== -->

    <div
      v-if="isCategoryModalOpen"
      class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
    >

      <div
        class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
      >

        <h2 class="text-lg font-bold text-slate-800">
          Nueva Categoría
        </h2>


        <form
          @submit.prevent="handleCreateCategory"
          class="space-y-4"
        >

          <!-- Nombre -->

          <div>

            <label
              class="block text-xs font-bold uppercase text-slate-600 mb-1"
            >
              Nombre *
            </label>

            <input
              v-model="categoryForm.name"
              type="text"
              required
              class="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
            />

          </div>


          <!-- Descripción -->

          <div>

            <label
              class="block text-xs font-bold uppercase text-slate-600 mb-1"
            >
              Descripción
            </label>

            <textarea
              v-model="categoryForm.description"
              rows="2"
              class="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
            ></textarea>

          </div>


          <!-- ============================================================= -->
          <!-- TRACK STOCK -->
          <!-- ============================================================= -->

          <label
            class="flex items-start gap-3 p-3 border border-blue-200 bg-blue-50 rounded-xl cursor-pointer"
          >

            <input
              v-model="categoryForm.trackStock"
              type="checkbox"
              class="rounded border-slate-300 text-blue-600 h-4 w-4 mt-0.5"
            />

            <div>

              <div class="text-sm font-semibold text-blue-800">
                📦 Maneja inventario / stock
              </div>

              <div class="text-xs text-blue-600 mt-0.5">
                Los productos de esta categoría tendrán control de existencia
                y se validará el stock al realizar ventas.
              </div>

            </div>

          </label>


          <!-- ============================================================= -->
          <!-- TRACK LOTS -->
          <!-- ============================================================= -->

          <label
            class="flex items-start gap-3 p-3 border border-purple-200 bg-purple-50 rounded-xl cursor-pointer"
          >

            <input
              v-model="categoryForm.trackLots"
              type="checkbox"
              class="rounded border-slate-300 text-purple-600 h-4 w-4 mt-0.5"
            />

            <div>

              <div class="text-sm font-semibold text-purple-800">
                🏷️ Control de Lotes y Vencimientos (FEFO)
              </div>

              <div class="text-xs text-purple-600 mt-0.5">
                Los productos de esta categoría podrán manejar lotes,
                vencimientos y rotación FEFO.
              </div>

            </div>

          </label>


          <!-- Botones -->

          <div class="flex justify-end gap-2 pt-2">

            <button
              type="button"
              @click="closeCategoryModal"
              class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>

            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {{
                isSubmitting
                  ? 'Creando...'
                  : 'Crear Categoría'
              }}
            </button>

          </div>

        </form>

      </div>

    </div>


    <!-- =================================================================== -->
    <!-- MODAL 3: GESTIÓN DE LOTES Y FEFO -->
    <!-- =================================================================== -->

    <div
      v-if="isLotModalOpen"
      class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
    >

      <div
        class="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >

        <!-- Encabezado -->

        <div
          class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50"
        >

          <div>

            <h2 class="text-lg font-bold text-slate-800">
              Gestión de Lotes (FEFO)
            </h2>

            <p
              class="text-xs text-slate-500"
              v-if="selectedProductForLot"
            >

              {{ selectedProductForLot.name }}

              —

              <span class="font-mono">
                SKU: {{ selectedProductForLot.sku }}
              </span>

            </p>

          </div>


          <button
            @click="closeLotModal"
            class="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>

        </div>


        <!-- Contenido -->

        <div class="p-6 space-y-6 overflow-y-auto">

          <!-- ============================================================= -->
          <!-- FORMULARIO NUEVO LOTE -->
          <!-- ============================================================= -->

          <form
            @submit.prevent="handleSaveLot"
            class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3"
          >

            <h3
              class="text-xs font-bold uppercase text-slate-600"
            >
              Ingresar Nuevo Lote
            </h3>


            <div class="grid grid-cols-3 gap-3">

              <!-- Número -->

              <div>

                <label
                  class="block text-xs font-semibold text-slate-600 mb-1"
                >
                  Número de Lote *
                </label>

                <input
                  v-model="lotForm.lotNumber"
                  type="text"
                  required
                  placeholder="Ej: LOT-2026-A"
                  class="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                />

              </div>


              <!-- Vencimiento -->

              <div>

                <label
                  class="block text-xs font-semibold text-slate-600 mb-1"
                >
                  Fecha Vencimiento *
                </label>

                <input
                  v-model="lotForm.expirationDate"
                  type="date"
                  required
                  class="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                />

              </div>


              <!-- Stock -->

              <div>

                <label
                  class="block text-xs font-semibold text-slate-600 mb-1"
                >
                  Cantidad (Stock) *
                </label>

                <input
                  v-model.number="lotForm.stock"
                  type="number"
                  min="1"
                  required
                  class="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                />

              </div>

            </div>


            <!-- Guardar -->

            <div class="flex justify-end">

              <button
                type="submit"
                :disabled="isSubmitting"
                class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium disabled:opacity-50"
              >

                {{
                  isSubmitting
                    ? 'Guardando...'
                    : '+ Añadir Stock a Lote'
                }}

              </button>

            </div>

          </form>


          <!-- ============================================================= -->
          <!-- LOTES DISPONIBLES -->
          <!-- ============================================================= -->

          <div>

            <h3
              class="text-xs font-bold uppercase text-slate-600 mb-2"
            >
              Lotes Disponibles
              (Orden FEFO: Primero en Vencer)
            </h3>


            <div
              class="border border-slate-200 rounded-xl overflow-hidden"
            >

              <table class="w-full text-left text-sm">

                <thead
                  class="bg-slate-100 text-slate-600 text-[11px] font-semibold uppercase"
                >

                  <tr>

                    <th class="px-3 py-2">
                      Lote
                    </th>

                    <th class="px-3 py-2">
                      Vencimiento
                    </th>

                    <th class="px-3 py-2 text-right">
                      Stock
                    </th>

                  </tr>

                </thead>


                <tbody class="divide-y divide-slate-100">

                  <!-- Cargando -->

                  <tr v-if="isLotLoading">

                    <td
                      colspan="3"
                      class="py-4 text-center text-xs text-slate-400"
                    >
                      Cargando lotes...
                    </td>

                  </tr>


                  <!-- Sin lotes -->

                  <tr
                    v-else-if="productLots.length === 0"
                  >

                    <td
                      colspan="3"
                      class="py-4 text-center text-xs text-slate-400"
                    >
                      No hay lotes registrados para este producto
                      en la sucursal actual.
                    </td>

                  </tr>


                  <!-- Lotes -->

                  <tr
                    v-for="(lot, idx) in productLots"
                    :key="lot.id || idx"
                    class="hover:bg-slate-50"
                  >

                    <td
                      class="px-3 py-2 font-mono text-xs font-medium text-slate-700"
                    >
                      {{ lot.lotNumber }}
                    </td>


                    <td
                      class="px-3 py-2 text-xs font-semibold text-slate-800"
                    >

                      {{ formatDate(lot.expirationDate) }}

                      <span
                        v-if="idx === 0"
                        class="ml-2 px-1.5 py-0.5 text-[10px] bg-red-100 text-red-700 rounded font-bold"
                      >
                        FEFO (Próximo a salir)
                      </span>

                    </td>


                    <td
                      class="px-3 py-2 text-right font-bold text-emerald-700"
                    >
                      {{ formatStock(lot.stock) }} uds
                    </td>

                  </tr>

                </tbody>

              </table>

            </div>

          </div>

        </div>

      </div>

    </div>

  </AppLayout>
</template>
