<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'

// Interfaz 1:1 con tu CreateProductDto y esquema de Prisma
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
}

// Interfaz Base para Categorías (la ajustaremos con tu DTO final)
interface Category {
  id: string
  name: string
  description?: string | null
  isActive: boolean
}

const activeTab = ref<'products' | 'categories'>('products')
const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const isLoading = ref(true)
const errorMessage = ref('')

async function loadInventoryData() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    // Llamada transaccional a tu endpoint protegido: GET /products
    const productResponse = await api.get<Product[]>('/products')
    products.value = productResponse.data

    // Intentamos cargar categorías (si el endpoint ya está listo, si no, lo manejamos defensivo)
    try {
      const categoryResponse = await api.get<Category[]>('/product-categories')
      categories.value = categoryResponse.data
    } catch {
      // Fallback temporal si aún no compila el controlador de categorías
      categories.value = []
    }
  } catch (error: any) {
    console.error(error)
    errorMessage.value = 'No tienes permisos o no fue posible conectar con el catálogo de productos.'
  } finally {
    isLoading.value = false
  }
}

// Helper para formatear los precios a la moneda de Latinoamérica (ej: COP, MXN)
function formatCurrency(value: number | string) {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(num)
}

// Helper para formatear stock (maneja decimales de Prisma Decimal(12,3))
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
    <!-- Encabezado del Módulo -->
    <header class="mb-6">
      <h1 class="text-3xl font-bold tracking-tight text-slate-900">Catálogo de Inventario</h1>
      <p class="mt-1 text-sm text-slate-500">
        Control maestro de productos comerciales, códigos de barra, costos y agrupaciones por categorías.
      </p>
    </header>

    <!-- Pestañas (Tabs) -->
    <div class="mb-6 border-b border-slate-200">
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

    <!-- Estado de Carga -->
    <div v-if="isLoading" class="flex h-48 items-center justify-center rounded-xl border border-slate-200 bg-white">
      <p class="text-sm font-medium text-slate-500 animate-pulse">Sincronizando inventario con la API...</p>
    </div>

    <!-- Alerta de Error -->
    <div v-else-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <!-- Tablas Transaccionales -->
    <div v-else class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

      <!-- SUB-VISTA: LISTADO DE PRODUCTOS -->
      <div v-if="activeTab === 'products'">
        <div v-if="products.length === 0" class="p-8 text-center text-slate-500">
          No hay artículos registrados en el inventario actual.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th class="px-6 py-3">Código SKU / Nombre</th>
                <th class="px-6 py-3">Código de Barras</th>
                <th class="px-6 py-3 text-right">Costo Base</th>
                <th class="px-6 py-3 text-right">Precio Venta</th>
                <th class="px-6 py-3 text-center">Existencia Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="product in products" :key="product.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <div class="font-semibold text-slate-900">{{ product.name }}</div>
                  <div class="text-xs font-mono text-blue-600 font-bold mt-0.5">SKU: {{ product.sku }}</div>
                  <div v-if="product.description" class="text-xs text-slate-400 mt-1 max-w-md truncate">{{ product.description }}</div>
                </td>
                <td class="px-6 py-4 font-mono text-xs text-slate-500">
                  {{ product.barcode || '—' }}
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
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- SUB-VISTA: CATEGORÍAS (Estructura lista para inyectar) -->
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
                <th class="px-6 py-3">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="cat in categories" :key="cat.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4 font-semibold text-slate-900">{{ cat.name }}</td>
                <td class="px-6 py-4 text-slate-500 max-w-xs truncate">{{ cat.description || '—' }}</td>
                <td class="px-6 py-4">
                  <span class="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Activa</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </AppLayout>
</template>
