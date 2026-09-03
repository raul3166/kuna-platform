<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'

interface Product {
  id: string
  name: string
}

interface SaleItem {
  id: string
  quantity: number
  description?: string
  product?: Product
}

interface Table {
  id: string
  tableNumber: string
}

interface KitchenOrder {
  id: string
  saleNumber: string
  status: string          // Estado comercial ('DRAFT')
  kitchenStatus?: string  // Estado KDS ('PENDING', 'IN_PREPARATION', 'READY')
  createdAt: string
  table?: Table
  items: SaleItem[]
}

const orders = ref<KitchenOrder[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const autoRefreshInterval = ref<any>(null)

// Cargar comandas activas para cocina
async function fetchKitchenOrders() {
  try {
    const res = await api.get<KitchenOrder[]>('/restaurant-orders/kitchen')
    orders.value = res.data ?? []
    errorMessage.value = ''
  } catch (err: any) {
    errorMessage.value = err.response?.data?.message || 'Error al actualizar comandas de cocina.'
  }
}

// Cambiar estado de la comanda en cocina
async function changeOrderStatus(orderId: string, status: string) {
  try {
    await api.patch(`/restaurant-orders/${orderId}/status`, { status })
    await fetchKitchenOrders()
  } catch (err: any) {
    alert(err.response?.data?.message || 'Error al actualizar el estado de la orden')
  }
}

// Calcular minutos transcurridos desde que se creó la orden
function getElapsedMinutes(createdAt: string): number {
  const diffMs = new Date().getTime() - new Date(createdAt).getTime()
  return Math.floor(diffMs / (1000 * 60))
}

// Auto-refresco cada 10 segundos
onMounted(() => {
  isLoading.value = true
  fetchKitchenOrders().finally(() => {
    isLoading.value = false
  })

  autoRefreshInterval.value = setInterval(() => {
    fetchKitchenOrders()
  }, 10000)
})

onUnmounted(() => {
  if (autoRefreshInterval.value) {
    clearInterval(autoRefreshInterval.value)
  }
})
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- HEADER COCINA -->
      <div class="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900">👨‍🍳 Monitor de Cocina (KDS)</h1>
          <p class="text-xs text-slate-500 mt-1">Gestión en tiempo real de comandas pendientes y en preparación.</p>
        </div>

        <div class="flex items-center gap-3">
          <span class="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            En línea (Auto-refresco 10s)
          </span>

          <button
            @click="fetchKitchenOrders"
            class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      <!-- ALERTA DE ERROR -->
      <div v-if="errorMessage" class="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
        {{ errorMessage }}
      </div>

      <!-- CARGANDO -->
      <div v-if="isLoading" class="p-8 text-center text-sm text-slate-500 bg-white rounded-xl border border-slate-200">
        Cargando comandas de cocina...
      </div>

      <!-- GRID DE COMANDAS -->
      <div v-else-if="orders.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div
          v-for="order in orders"
          :key="order.id"
          class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between"
        >
          <!-- CABECERA TARJETA -->
          <div>
            <div class="p-3 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <span class="font-extrabold text-sm block">Mesa {{ order.table?.tableNumber || 'S/N' }}</span>
                <span class="text-[10px] text-slate-400">Orden #{{ order.saleNumber }}</span>
              </div>

              <div class="text-right">
                <span
                  :class="[
                    'text-[10px] font-bold px-2 py-0.5 rounded uppercase block',
                    getElapsedMinutes(order.createdAt) >= 15 ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-200'
                  ]"
                >
                  ⏱️ {{ getElapsedMinutes(order.createdAt) }} min
                </span>
              </div>
            </div>

            <!-- PRODUCTOS / ÍTEMS -->
            <div class="p-3 divide-y divide-slate-100 max-h-72 overflow-y-auto">
              <div
                v-for="item in order.items"
                :key="item.id"
                class="py-2 first:pt-0 last:pb-0"
              >
                <div class="flex items-start justify-between gap-2">
                  <span class="font-bold text-sm text-slate-800">
                    <span class="text-blue-600 font-extrabold me-1">{{ item.quantity }}x</span>
                    {{ item.product?.name || 'Producto' }}
                  </span>
                </div>

                <!-- NOTA/OBSERVACIÓN -->
                <p v-if="item.description" class="text-xs font-semibold text-amber-700 bg-amber-50 p-1.5 rounded mt-1 border border-amber-200">
                  📌 {{ item.description }}
                </p>
              </div>
            </div>
          </div>

          <!-- BOTONES DE ACCIÓN DE ESTADO -->
          <div class="p-3 bg-slate-50 border-t border-slate-200 space-y-2">
            <!-- Botón PENDING -> IN_PREPARATION -->
            <button
              v-if="!order.kitchenStatus || order.kitchenStatus === 'PENDING'"
              @click="changeOrderStatus(order.id, 'IN_PREPARATION')"
              class="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
            >
              👨‍🍳 Marcar En Preparación
            </button>

            <!-- Botón IN_PREPARATION -> READY -->
            <button
              v-else-if="order.kitchenStatus === 'IN_PREPARATION'"
              @click="changeOrderStatus(order.id, 'READY')"
              class="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
            >
              ✅ Marcar Como Listo
            </button>

            <button
              @click="changeOrderStatus(order.id, 'CANCELLED')"
              class="w-full py-1.5 text-rose-600 hover:bg-rose-50 text-[11px] font-semibold rounded transition-colors text-center block"
            >
              Descartar Orden
            </button>
          </div>
        </div>
      </div>

      <!-- ESTADO VACÍO (SIN ÓRDENES) -->
      <div v-else class="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300 space-y-2">
        <div class="text-4xl">🎉</div>
        <h3 class="font-bold text-slate-700">Cocina al día</h3>
        <p class="text-xs text-slate-500">No hay órdenes pendientes por marchar en este momento.</p>
      </div>
    </div>
  </AppLayout>
</template>
