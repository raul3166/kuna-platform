<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'

interface ProductCategory {
  id: string
  name: string
  trackStock: boolean
}

interface Product {
  id: string
  name: string
  sku: string
  category?: ProductCategory | null
}

interface HistoryMovement {
  id: string
  date: string
  movementType: string
  movementName: string
  reference?: string | null
  notes?: string | null
  unitCost: number | null
  totalCost: number | null
  quantity: number
  entry: number
  exit: number
  balance: number

  /*
   * Indica si el movimiento realmente afecta
   * el inventario físico.
   *
   * Para una venta de un producto cuya categoría
   * tiene trackStock = false:
   *
   * affectsStock = false
   */
  affectsStock?: boolean
}

interface KardexResponse {
  product: Product

  summary: {
    totalMovements: number
    currentStock: number
    kardexStock: number
    isConsistent: boolean
    stockDifference?: number
  }

  movements: HistoryMovement[]
}

const products = ref<Product[]>([])
const selectedProductId = ref('')
const kardexMovements = ref<HistoryMovement[]>([])
const summaryData = ref<KardexResponse['summary'] | null>(null)
const selectedProduct = ref<Product | null>(null)

const isLoadingMovements = ref(false)

/*
 * ============================================================
 * CARGAR PRODUCTOS
 * ============================================================
 */
async function loadProducts() {
  try {
    const response = await api.get('/products')

    products.value = response.data
  } catch (error) {
    console.error(
      'Error al cargar productos para el Kardex:',
      error,
    )
  }
}

/*
 * ============================================================
 * CARGAR KARDEX
 * ============================================================
 */
async function fetchKardex() {
  if (!selectedProductId.value) {
    kardexMovements.value = []
    summaryData.value = null
    selectedProduct.value = null
    return
  }

  isLoadingMovements.value = true
  kardexMovements.value = []
  summaryData.value = null

  try {
    /*
     * --------------------------------------------------------
     * PRODUCTO SELECCIONADO
     * --------------------------------------------------------
     */
    const productFromList = products.value.find(
      (p) => p.id === selectedProductId.value,
    )

    if (productFromList) {
      selectedProduct.value = productFromList
    }

    /*
     * --------------------------------------------------------
     * KARDEX
     * --------------------------------------------------------
     */
    const response = await api.get<KardexResponse>(
      `/inventory-movements/product/${selectedProductId.value}`,
    )

    /*
     * El backend sigue siendo la fuente principal
     * de los movimientos.
     */
    kardexMovements.value = response.data.movements

    summaryData.value = response.data.summary

    /*
     * Si el backend devuelve el producto con más información,
     * utilizamos esa información.
     */
    if (response.data.product) {
      selectedProduct.value = {
        ...selectedProduct.value,
        ...response.data.product,
      }
    }
  } catch (error) {
    console.error(
      'Error al consultar transacciones del producto:',
      error,
    )
  } finally {
    isLoadingMovements.value = false
  }
}

/*
 * ============================================================
 * PRODUCTO CONTROLA STOCK
 * ============================================================
 */
const tracksStock = computed(() => {
  /*
   * Si tenemos información de la categoría,
   * utilizamos trackStock.
   *
   * Si no tenemos categoría, mantenemos true
   * para no asumir accidentalmente que no controla
   * inventario.
   */
  return selectedProduct.value?.category?.trackStock ?? true
})

/*
 * ============================================================
 * TOTAL VENDIDO
 * ============================================================
 *
 * IMPORTANTE:
 *
 * Esto NO representa una salida de inventario.
 *
 * Representa solamente cuántas unidades se han vendido.
 *
 * Esto es especialmente importante para productos
 * como platos del menú.
 */
const totalSold = computed(() => {
  return kardexMovements.value
    .filter((movement) => movement.movementType === 'SALE')
    .reduce((total, movement) => {
      return total + Number(movement.quantity || 0)
    }, 0)
})

/*
 * ============================================================
 * TOTAL ENTRADAS DE INVENTARIO
 * ============================================================
 */
const totalEntries = computed(() => {
  return kardexMovements.value.reduce((total, movement) => {
    /*
     * Si el backend informa explícitamente si el movimiento
     * afecta inventario, respetamos esa información.
     */
    if (movement.affectsStock === false) {
      return total
    }

    return total + Number(movement.entry || 0)
  }, 0)
})

/*
 * ============================================================
 * TOTAL SALIDAS DE INVENTARIO
 * ============================================================
 */
const totalExits = computed(() => {
  return kardexMovements.value.reduce((total, movement) => {
    /*
     * Una venta de un producto que NO controla inventario
     * aparece en el Kardex, pero NO cuenta como salida física.
     */
    if (
      movement.movementType === 'SALE' &&
      movement.affectsStock === false
    ) {
      return total
    }

    return total + Number(movement.exit || 0)
  }, 0)
})

/*
 * ============================================================
 * SALDO CALCULADO EN LA VISTA
 * ============================================================
 *
 * Este cálculo tiene como objetivo que un producto de menú
 * no termine mostrando stock negativo solamente porque
 * registra sus ventas en el Kardex.
 */
const calculatedInventoryBalance = computed(() => {
  let balance = 0

  for (const movement of kardexMovements.value) {
    /*
     * Si sabemos que el movimiento NO afecta inventario,
     * lo ignoramos para el saldo físico.
     */
    if (movement.affectsStock === false) {
      continue
    }

    /*
     * Si el producto completo no controla stock,
     * las ventas no afectan el saldo.
     */
    if (
      movement.movementType === 'SALE' &&
      !tracksStock.value
    ) {
      continue
    }

    /*
     * Utilizamos entradas y salidas ya calculadas
     * por el backend.
     */
    balance += Number(movement.entry || 0)
    balance -= Number(movement.exit || 0)
  }

  return balance
})

/*
 * ============================================================
 * TEXTO DEL TIPO DE CONTROL
 * ============================================================
 */
const stockControlLabel = computed(() => {
  return tracksStock.value
    ? 'Control de inventario'
    : 'Sin control de inventario'
})

/*
 * ============================================================
 * CLASE DEL MOVIMIENTO
 * ============================================================
 */
function getMovementClass(type: string) {
  if (
    type.includes('PURCHASE') ||
    type.includes('IN')
  ) {
    return 'bg-green-50 text-green-700 border-green-200'
  }

  if (
    type.includes('SALE') ||
    type.includes('OUT')
  ) {
    return 'bg-blue-50 text-blue-700 border-blue-200'
  }

  return 'bg-amber-50 text-amber-700 border-amber-200'
}

/*
 * ============================================================
 * TEXTO DE CONTROL DEL MOVIMIENTO
 * ============================================================
 */
function getMovementImpact(movement: HistoryMovement) {
  /*
   * Caso explícito informado por backend.
   */
  if (movement.affectsStock === false) {
    return 'Solo registro de venta'
  }

  /*
   * Caso de producto sin control de inventario.
   */
  if (
    movement.movementType === 'SALE' &&
    !tracksStock.value
  ) {
    return 'Solo registro de venta'
  }

  if (movement.movementType === 'SALE') {
    return 'Salida de inventario'
  }

  return 'Afecta inventario'
}

/*
 * ============================================================
 * OBSERVACIÓN VISUAL DEL MOVIMIENTO
 * ============================================================
 */
function isNonStockSale(movement: HistoryMovement) {
  return (
    movement.movementType === 'SALE' &&
    (
      movement.affectsStock === false ||
      !tracksStock.value
    )
  )
}

watch(
  selectedProductId,
  () => {
    fetchKardex()
  },
)

onMounted(() => {
  loadProducts()
})
</script>

<template>
  <AppLayout>

    <!-- ======================================================
         ENCABEZADO
    ======================================================= -->
    <header class="mb-6">
      <h1 class="text-3xl font-bold tracking-tight text-slate-900">
        Kardex de Inventario
      </h1>

      <p class="text-sm text-slate-500">
        Consulta el historial cronológico de movimientos,
        existencias y unidades vendidas por artículo.
      </p>
    </header>

    <!-- ======================================================
         SELECTOR
    ======================================================= -->
    <div
      class="mb-6 max-w-md bg-white border border-slate-200 p-4 rounded-xl shadow-sm"
    >
      <label
        class="block text-sm font-semibold text-slate-700 mb-1"
      >
        Filtrar por Artículo
      </label>

      <select
        v-model="selectedProductId"
        class="w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      >
        <option
          value=""
          disabled
        >
          Selecciona un artículo para auditar...
        </option>

        <option
          v-for="p in products"
          :key="p.id"
          :value="p.id"
        >
          {{ p.name }} (SKU: {{ p.sku }})
        </option>
      </select>
    </div>

    <!-- ======================================================
         INFORMACIÓN DEL PRODUCTO
    ======================================================= -->
    <div
      v-if="summaryData && selectedProduct"
      class="mb-6 bg-white border border-slate-200 rounded-xl shadow-sm p-5"
    >
      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 class="text-xl font-bold text-slate-900">
            {{ selectedProduct.name }}
          </h2>

          <p class="text-sm text-slate-500">
            SKU:
            <span class="font-mono">
              {{ selectedProduct.sku }}
            </span>
          </p>
        </div>

        <div>
          <span
            v-if="tracksStock"
            class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200"
          >
            ✓ {{ stockControlLabel }}
          </span>

          <span
            v-else
            class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200"
          >
            ℹ {{ stockControlLabel }}
          </span>
        </div>
      </div>
    </div>

    <!-- ======================================================
         RESUMEN
    ======================================================= -->
    <div
      v-if="summaryData"
      class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
    >

      <!-- TRANSACCIONES -->
      <div
        class="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-center"
      >
        <p class="text-xs text-slate-400 font-semibold uppercase">
          Transacciones
        </p>

        <p class="text-xl font-bold text-slate-800 mt-1">
          {{ summaryData.totalMovements }}
        </p>
      </div>

      <!-- STOCK ACTUAL -->
      <div
        class="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-center"
      >
        <p class="text-xs text-slate-400 font-semibold uppercase">
          Stock Actual
        </p>

        <p
          class="text-xl font-bold mt-1"
          :class="
            tracksStock
              ? 'text-blue-600'
              : 'text-slate-400'
          "
        >
          {{ tracksStock ? summaryData.currentStock : '—' }}
        </p>

        <p
          v-if="!tracksStock"
          class="text-[11px] text-slate-400 mt-1"
        >
          No controlado
        </p>
      </div>

      <!-- VENDIDO -->
      <div
        class="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-center"
      >
        <p class="text-xs text-slate-400 font-semibold uppercase">
          Unidades Vendidas
        </p>

        <p class="text-xl font-bold text-blue-600 mt-1">
          {{ totalSold }}
        </p>

        <p class="text-[11px] text-slate-400 mt-1">
          Historial de ventas
        </p>
      </div>

      <!-- MOVIMIENTOS DE INVENTARIO -->
      <div
        class="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-center"
      >
        <p class="text-xs text-slate-400 font-semibold uppercase">
          Salidas Físicas
        </p>

        <p class="text-xl font-bold text-rose-600 mt-1">
          {{ totalExits }}
        </p>

        <p class="text-[11px] text-slate-400 mt-1">
          Inventario
        </p>
      </div>

      <!-- AUDITORÍA -->
      <div
        class="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-center"
      >
        <p class="text-xs text-slate-400 font-semibold uppercase">
          Auditoría
        </p>

        <!-- PRODUCTO QUE SÍ CONTROLA STOCK -->
        <span
          v-if="tracksStock"
          :class="[
            summaryData.isConsistent
              ? 'text-green-600 bg-green-50 border-green-200'
              : 'text-rose-600 bg-rose-50 border-rose-200',
            'inline-block text-xs font-bold px-2 py-0.5 rounded border mt-1.5',
          ]"
        >
          {{
            summaryData.isConsistent
              ? '✓ Consistente'
              : '⚠️ Desfase'
          }}
        </span>

        <!-- PRODUCTO QUE NO CONTROLA STOCK -->
        <span
          v-else
          class="inline-block text-xs font-bold px-2 py-0.5 rounded border mt-1.5 text-slate-500 bg-slate-50 border-slate-200"
        >
          — No aplica
        </span>

        <p
          v-if="!tracksStock"
          class="text-[11px] text-slate-400 mt-1"
        >
          No controla inventario
        </p>
      </div>
    </div>

    <!-- ======================================================
         INFORMACIÓN PARA PRODUCTOS SIN CONTROL DE STOCK
    ======================================================= -->
    <div
      v-if="summaryData && !tracksStock"
      class="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4"
    >
      <div class="flex gap-3">
        <div class="text-amber-600 text-lg">
          ℹ
        </div>

        <div>
          <h3 class="font-bold text-amber-800 text-sm">
            Producto sin control de inventario
          </h3>

          <p class="text-xs text-amber-700 mt-1">
            Este producto registra sus ventas en el Kardex,
            pero las ventas no descuentan existencias físicas.
            Por esta razón, las
            <strong>
              {{ totalSold }} unidades vendidas
            </strong>
            se muestran como trazabilidad comercial y no
            como salidas de inventario.
          </p>
        </div>
      </div>
    </div>

    <!-- ======================================================
         CARGANDO
    ======================================================= -->
    <div
      v-if="isLoadingMovements"
      class="text-slate-500 text-sm animate-pulse p-4"
    >
      Analizando traza del Kardex...
    </div>

    <!-- ======================================================
         TABLA
    ======================================================= -->
    <div
      v-else-if="selectedProductId"
      class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"
    >

      <!-- SIN MOVIMIENTOS -->
      <div
        v-if="kardexMovements.length === 0"
        class="p-8 text-center text-slate-400"
      >
        Este producto no registra movimientos históricos.
      </div>

      <!-- TABLA -->
      <div
        v-else
        class="overflow-x-auto"
      >
        <table
          class="w-full text-left border-collapse text-sm"
        >
          <thead>
            <tr
              class="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider"
            >
              <th class="px-6 py-3">
                Fecha y Hora
              </th>

              <th class="px-6 py-3">
                Concepto Operativo
              </th>

              <th class="px-6 py-3 text-right">
                Entradas
              </th>

              <th class="px-6 py-3 text-right">
                Salidas
              </th>

              <th class="px-6 py-3 text-right bg-slate-100/50">
                Saldo Inventario
              </th>

              <th class="px-6 py-3">
                Impacto
              </th>

              <th class="px-6 py-3">
                Documento / Justificación
              </th>
            </tr>
          </thead>

          <tbody
            class="divide-y divide-slate-100 font-sans"
          >
            <tr
              v-for="k in kardexMovements"
              :key="k.id"
              class="hover:bg-slate-50/50 transition-colors"
            >

              <!-- FECHA -->
              <td
                class="px-6 py-4 text-xs text-slate-500 whitespace-nowrap"
              >
                {{ new Date(k.date).toLocaleString('es-CO') }}
              </td>

              <!-- CONCEPTO -->
              <td class="px-6 py-4">
                <span
                  :class="[
                    getMovementClass(k.movementType),
                    'inline-block px-2.5 py-0.5 border rounded-md text-xs font-bold',
                  ]"
                >
                  {{ k.movementName }}
                </span>
              </td>

              <!-- ENTRADAS -->
              <td
                class="px-6 py-4 text-right font-mono font-medium text-green-600"
              >
                {{
                  k.entry > 0
                    ? `+${k.entry}`
                    : '—'
                }}
              </td>

              <!-- SALIDAS -->
              <td
                class="px-6 py-4 text-right font-mono font-medium text-rose-600"
              >
                {{
                  k.exit > 0
                    ? `-${k.exit}`
                    : '—'
                }}
              </td>

              <!-- SALDO -->
              <td
                class="px-6 py-4 text-right font-mono font-bold bg-slate-50/40"
                :class="
                  isNonStockSale(k)
                    ? 'text-slate-400'
                    : 'text-slate-900'
                "
              >
                {{
                  isNonStockSale(k)
                    ? '—'
                    : k.balance
                }}

                <span
                  v-if="!isNonStockSale(k)"
                  class="text-xs font-normal text-slate-400"
                >
                  uds
                </span>
              </td>

              <!-- IMPACTO -->
              <td class="px-6 py-4">
                <span
                  v-if="isNonStockSale(k)"
                  class="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap"
                >
                  Solo venta
                </span>

                <span
                  v-else-if="k.movementType === 'SALE'"
                  class="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap"
                >
                  Salida física
                </span>

                <span
                  v-else
                  class="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-slate-50 text-slate-600 border border-slate-200 whitespace-nowrap"
                >
                  {{ getMovementImpact(k) }}
                </span>
              </td>

              <!-- REFERENCIA -->
              <td
                class="px-6 py-4 text-xs text-slate-600 max-w-xs"
              >
                <div class="font-bold text-slate-800">
                  {{ k.reference || 'Sin Ref' }}
                </div>

                <div
                  v-if="k.notes"
                  class="text-slate-400 mt-0.5 italic truncate"
                  :title="k.notes"
                >
                  "{{ k.notes }}"
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </AppLayout>
</template>
