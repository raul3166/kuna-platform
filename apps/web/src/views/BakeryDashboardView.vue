<template>
  <AppLayout>
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- Encabezado -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 rounded-full">
              Vertical Panadería & Pastelería
            </span>
            <span class="text-xs text-slate-400">Reutilizando Core: Productos, Lotes FEFO, Kardex, Panaderos y POS</span>
          </div>
          <h1 class="text-2xl font-bold text-slate-900 mt-1">Control de Hornos, Tandas & Vitrina Fresca</h1>
          <p class="text-sm text-slate-500">
            Flujo de producción diario: Programación → Amasado → Fermentación → Horno → Decorado → Entrada a Vitrina con Lote FEFO.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button
            @click="loadDashboard"
            class="px-3.5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition"
          >
            ↻ Actualizar Hornos
          </button>
          <router-link
            to="/bakery-recipes"
            class="px-4 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition shadow-sm"
          >
            🥐 Recetario & Lanzar Tanda
          </router-link>
          <router-link
            to="/pos"
            class="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition shadow-sm"
          >
            🛒 Vitrina POS
          </router-link>
          <button
            @click="showConfigModal = true"
            class="p-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition"
            title="Configuración Operativa de Panadería"
          >
            ⚙️
          </button>
        </div>
      </div>

      <!-- KPIs Operativos -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-bold uppercase text-slate-400">Recetas Activas</div>
          <div class="text-2xl font-extrabold text-slate-900 mt-1">{{ kpis.activeRecipesCount }}</div>
          <div class="text-xs text-slate-500 mt-0.5">Fórmulas técnicas</div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-bold uppercase text-amber-600">En Proceso / Horno</div>
          <div class="text-2xl font-extrabold text-amber-600 mt-1">{{ kpis.batchesInProcess }}</div>
          <div class="text-xs text-slate-500 mt-0.5">{{ kpis.plannedBatchesCount }} programadas</div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-bold uppercase text-emerald-600">Horneado Hoy</div>
          <div class="text-2xl font-extrabold text-emerald-600 mt-1">{{ formatQty(kpis.unitsBakedToday) }}</div>
          <div class="text-xs text-slate-500 mt-0.5">Unidades a vitrina</div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-bold uppercase text-rose-600">Merma del Día</div>
          <div class="text-2xl font-extrabold text-rose-600 mt-1">{{ formatQty(kpis.wasteUnitsToday) }}</div>
          <div class="text-xs text-slate-500 mt-0.5">Quemado / rotura</div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-bold uppercase text-indigo-600">Costo Insumos Hoy</div>
          <div class="text-xl font-extrabold text-indigo-600 mt-1">{{ formatCurrency(kpis.productionCostToday) }}</div>
          <div class="text-xs text-slate-500 mt-0.5">Harina, mantequilla, etc.</div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-bold uppercase text-orange-600">Lotes por Vencer</div>
          <div class="text-2xl font-extrabold text-orange-600 mt-1">{{ kpis.expiringLotsCount }}</div>
          <div class="text-xs text-slate-500 mt-0.5">Frescura ≤ 3 días</div>
        </div>
      </div>

      <!-- Tablero Kanban de Producción y Hornos -->
      <div v-if="loading" class="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500">
        Cargando monitor de hornos y tandas de panadería...
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div
          v-for="stage in stages"
          :key="stage.key"
          class="bg-slate-50 rounded-2xl border border-slate-200 flex flex-col max-h-[640px]"
        >
          <!-- Cabecera de Columna -->
          <div class="p-3.5 border-b border-slate-200 flex items-center justify-between bg-white rounded-t-2xl">
            <div class="flex items-center gap-2">
              <span class="text-lg">{{ stage.icon }}</span>
              <div>
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-800">{{ stage.title }}</h3>
                <p class="text-[11px] text-slate-400">{{ stage.subtitle }}</p>
              </div>
            </div>
            <span
              class="px-2 py-0.5 text-xs font-bold rounded-full"
              :class="stage.badgeClass"
            >
              {{ (kanban[stage.key] || []).length }}
            </span>
          </div>

          <!-- Lista de Tandas -->
          <div class="p-3 space-y-3 overflow-y-auto flex-1">
            <div
              v-if="(kanban[stage.key] || []).length === 0"
              class="text-center py-8 text-xs text-slate-400 italic"
            >
              Sin tandas en esta etapa
            </div>

            <div
              v-for="order in kanban[stage.key]"
              :key="order.id"
              class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-2.5"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  {{ order.batchNumber }}
                </span>
                <span class="text-[11px] font-semibold text-slate-500">
                  {{ Number(order.batchesMultiplier) }}x tanda(s)
                </span>
              </div>

              <div>
                <div class="font-bold text-sm text-slate-900 leading-tight">
                  {{ order.finishedProduct?.name || order.recipe?.name }}
                </div>
                <div class="text-xs text-slate-500 mt-0.5">
                  Fórmula: {{ order.recipe?.name }}
                </div>
              </div>

              <div class="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                <div>
                  <span class="text-slate-400 block">Meta / Real:</span>
                  <span class="font-bold text-slate-800">
                    {{ formatQty(order.actualQuantity ?? order.plannedQuantity) }} {{ order.recipe?.yieldUnit || 'UND' }}
                  </span>
                </div>
                <div>
                  <span class="text-slate-400 block">Horno / Temp:</span>
                  <span class="font-bold text-slate-800">
                    {{ order.ovenNumber || 'Horno #1' }}
                    <template v-if="order.recipe?.ovenTempC">({{ order.recipe.ovenTempC }}°C)</template>
                  </span>
                </div>
                <div>
                  <span class="text-slate-400 block">Panadero:</span>
                  <span class="font-semibold text-slate-700">
                    {{ order.bakerWorker ? `${order.bakerWorker.firstName} ${order.bakerWorker.lastName || ''}` : 'Sin asignar' }}
                  </span>
                </div>
                <div>
                  <span class="text-slate-400 block">Costo Lote:</span>
                  <span class="font-bold text-emerald-700">
                    {{ formatCurrency(order.totalIngredientsCost) }}
                  </span>
                </div>
              </div>

              <div v-if="Number(order.wasteQuantity) > 0" class="text-[11px] text-rose-600 font-semibold bg-rose-50 px-2 py-1 rounded">
                ⚠️ Merma registrada: {{ formatQty(order.wasteQuantity) }} ({{ order.wasteReason || 'Control de calidad' }})
              </div>

              <!-- Acciones de avance -->
              <div class="pt-1 flex flex-col gap-1.5" v-if="stage.nextStatus">
                <button
                  v-if="stage.nextStatus !== 'COMPLETED'"
                  @click="advanceStage(order, stage.nextStatus)"
                  :disabled="updatingId === order.id"
                  class="w-full py-1.5 px-3 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition disabled:opacity-50"
                >
                  {{ stage.actionLabel }} →
                </button>
                <button
                  v-else
                  @click="openCompleteModal(order)"
                  :disabled="updatingId === order.id"
                  class="w-full py-1.5 px-3 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  ✅ {{ stage.actionLabel }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Control de Frescura y Lotes Próximos a Vencer (FEFO) -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-slate-900">Control de Frescura en Vitrina (Lotes FEFO ≤ 3 días)</h2>
            <p class="text-xs text-slate-500">
              Cada tanda completada genera automáticamente un lote (<code class="text-amber-700 font-bold">ProductLot</code>) con su fecha de caducidad para rotación FEFO.
            </p>
          </div>
          <router-link
            to="/product-lots"
            class="text-xs font-bold text-amber-700 hover:text-amber-800 underline"
          >
            Ver todos los Lotes Core →
          </router-link>
        </div>

        <div v-if="expiringLots.length === 0" class="p-6 text-center text-sm text-slate-400">
          No hay lotes de panadería o pastelería próximos a vencer en los siguientes 3 días.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                <th class="py-2.5 px-4">Lote / Tanda</th>
                <th class="py-2.5 px-4">Producto Fresco</th>
                <th class="py-2.5 px-4">Sucursal</th>
                <th class="py-2.5 px-4">Stock Disponible</th>
                <th class="py-2.5 px-4">Fecha Vencimiento</th>
                <th class="py-2.5 px-4">Estado Frescura</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr v-for="lot in expiringLots" :key="lot.id" class="hover:bg-slate-50">
                <td class="py-2.5 px-4 font-mono text-xs font-bold text-amber-700">{{ lot.lotNumber }}</td>
                <td class="py-2.5 px-4 font-semibold text-slate-900">{{ lot.product?.name }}</td>
                <td class="py-2.5 px-4 text-slate-600">{{ lot.branch?.name || 'Principal' }}</td>
                <td class="py-2.5 px-4 font-bold text-slate-800">{{ formatQty(lot.stock) }}</td>
                <td class="py-2.5 px-4 text-slate-600">{{ formatDate(lot.expirationDate) }}</td>
                <td class="py-2.5 px-4">
                  <span
                    class="px-2 py-0.5 rounded-full text-xs font-bold"
                    :class="isExpired(lot.expirationDate) ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'"
                  >
                    {{ isExpired(lot.expirationDate) ? 'Vencido - Retirar de vitrina' : 'Próximo a vencer (Promocionar)' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal Finalizar Tanda de Horneado (Descarga Insumos + Crea Lote Fresco) -->
      <div
        v-if="showCompleteModal && selectedOrder"
        class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <span class="text-xs font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Salida de Horno a Vitrina
              </span>
              <h3 class="text-lg font-bold text-slate-900 mt-1">
                Finalizar Tanda {{ selectedOrder.batchNumber }}
              </h3>
            </div>
            <button @click="showCompleteModal = false" class="text-slate-400 hover:text-slate-600 text-xl">×</button>
          </div>

          <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
            <div class="font-bold">Producto Terminado: {{ selectedOrder.finishedProduct?.name }}</div>
            <div>Meta programada: <strong>{{ formatQty(selectedOrder.plannedQuantity) }} {{ selectedOrder.recipe?.yieldUnit || 'UND' }}</strong></div>
            <div>
              Al confirmar, KUNA descontará automáticamente los insumos de la receta del inventario y creará el lote fresco
              <strong>{{ selectedOrder.batchNumber }}</strong> con <strong>{{ selectedOrder.recipe?.shelfLifeDays || 3 }} días</strong> de vida útil.
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Cantidad Buena Obtenida ({{ selectedOrder.recipe?.yieldUnit || 'UND' }})
              </label>
              <input
                v-model.number="completeForm.actualQuantity"
                type="number"
                step="0.01"
                min="0"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-900"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Merma / Descarte (Quemado, Rotura)
              </label>
              <input
                v-model.number="completeForm.wasteQuantity"
                type="number"
                step="0.01"
                min="0"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-rose-600"
              />
            </div>
          </div>

          <div v-if="completeForm.wasteQuantity > 0">
            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">
              Motivo de la Merma
            </label>
            <input
              v-model="completeForm.wasteReason"
              type="text"
              placeholder="Ej: Sobrecocción en bandeja superior / rotura al desmoldar"
              class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">
              Notas de Calidad / Decorado
            </label>
            <textarea
              v-model="completeForm.notes"
              rows="2"
              placeholder="Observaciones de textura, humedad o decoración..."
              class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
            ></textarea>
          </div>

          <div class="flex justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              @click="showCompleteModal = false"
              class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              @click="confirmCompleteBatch"
              :disabled="updatingId === selectedOrder.id"
              class="px-5 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
            >
              {{ updatingId === selectedOrder.id ? 'Procesando Kardex y Lote...' : 'Confirmar Entrada a Vitrina' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Configuración de Panadería -->
      <div
        v-if="showConfigModal"
        class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 class="text-lg font-bold text-slate-900">Parámetros Operativos de Panadería</h3>
            <button @click="showConfigModal = false" class="text-slate-400 hover:text-slate-600 text-xl">×</button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Días de Frescura por Defecto (Vida Útil Lote FEFO)
              </label>
              <input
                v-model.number="configForm.defaultShelfLifeDays"
                type="number"
                min="1"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Alerta de Merma Máxima Permitida (%)
              </label>
              <input
                v-model.number="configForm.maxWasteAlertPct"
                type="number"
                min="0"
                step="0.5"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <label class="flex items-center gap-2 text-sm text-slate-700 cursor-pointer pt-1">
              <input v-model="configForm.autoDeductIngredientsOnBake" type="checkbox" class="rounded text-amber-600" />
              <span>Descontar insumos automáticamente al completar horneado</span>
            </label>

            <label class="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input v-model="configForm.autoCreateProductLotOnBake" type="checkbox" class="rounded text-amber-600" />
              <span>Crear lote FEFO automático al ingresar producto a vitrina</span>
            </label>
          </div>

          <div class="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              @click="showConfigModal = false"
              class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cerrar
            </button>
            <button
              @click="saveConfig"
              class="px-5 py-2 rounded-xl text-sm font-bold text-white bg-amber-600 hover:bg-amber-700"
            >
              Guardar Configuración
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const loading = ref(false);
const updatingId = ref<string | null>(null);

const kpis = ref({
  activeRecipesCount: 0,
  plannedBatchesCount: 0,
  batchesInProcess: 0,
  unitsBakedToday: 0,
  wasteUnitsToday: 0,
  productionCostToday: 0,
  expiringLotsCount: 0,
});

const kanban = ref<Record<string, any[]>>({
  PLANNED: [],
  MIXING: [],
  FERMENTING: [],
  BAKING: [],
  COOLING_DECORATING: [],
  COMPLETED: [],
});

const expiringLots = ref<any[]>([]);

const stages = [
  {
    key: 'PLANNED',
    title: 'Programada',
    subtitle: 'Lista para pesaje',
    icon: '📋',
    badgeClass: 'bg-slate-200 text-slate-800',
    nextStatus: 'MIXING',
    actionLabel: 'Iniciar Amasado',
  },
  {
    key: 'MIXING',
    title: 'Amasado / Pesaje',
    subtitle: 'Mezcla de insumos',
    icon: '🥣',
    badgeClass: 'bg-blue-100 text-blue-800',
    nextStatus: 'FERMENTING',
    actionLabel: 'Pasar a Fermentación',
  },
  {
    key: 'FERMENTING',
    title: 'Fermentación',
    subtitle: 'Cuarto de crecimiento',
    icon: '⏳',
    badgeClass: 'bg-amber-100 text-amber-800',
    nextStatus: 'BAKING',
    actionLabel: 'Meter al Horno',
  },
  {
    key: 'BAKING',
    title: 'En Horno',
    subtitle: 'Cocción controlada',
    icon: '🔥',
    badgeClass: 'bg-orange-100 text-orange-800',
    nextStatus: 'COOLING_DECORATING',
    actionLabel: 'Enfriar / Decorar',
  },
  {
    key: 'COOLING_DECORATING',
    title: 'Enfriado / Decorado',
    subtitle: 'Control de calidad',
    icon: '🎂',
    badgeClass: 'bg-purple-100 text-purple-800',
    nextStatus: 'COMPLETED',
    actionLabel: 'Entrar a Vitrina',
  },
  {
    key: 'COMPLETED',
    title: 'En Vitrina (Hoy)',
    subtitle: 'Stock + Lote FEFO listo',
    icon: '🥐',
    badgeClass: 'bg-emerald-100 text-emerald-800',
    nextStatus: null,
    actionLabel: '',
  },
];

const showCompleteModal = ref(false);
const selectedOrder = ref<any | null>(null);
const completeForm = ref({
  actualQuantity: 0,
  wasteQuantity: 0,
  wasteReason: '',
  notes: '',
});

const showConfigModal = ref(false);
const configForm = ref({
  defaultShelfLifeDays: 3,
  autoCreateProductLotOnBake: true,
  autoDeductIngredientsOnBake: true,
  maxWasteAlertPct: 5,
});

function formatCurrency(val: any): string {
  const num = Number(val ?? 0);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(num);
}

function formatQty(val: any): string {
  const num = Number(val ?? 0);
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

function formatDate(val: string | Date): string {
  if (!val) return '-';
  return new Date(val).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function isExpired(val: string | Date): boolean {
  if (!val) return false;
  return new Date(val).getTime() < Date.now();
}

async function loadDashboard() {
  loading.value = true;
  try {
    const orgId = authStore.user?.organizationId;
    const branchId = authStore.user?.branchId;
    const [dashRes, cfgRes] = await Promise.all([
      api.get('/bakery/dashboard', {
        params: { organizationId: orgId, branchId },
      }),
      api.get('/bakery/config', {
        params: { organizationId: orgId },
      }),
    ]);

    if (dashRes.data) {
      kpis.value = dashRes.data.kpis || kpis.value;
      kanban.value = dashRes.data.kanban || kanban.value;
      expiringLots.value = dashRes.data.expiringLots || [];
    }

    if (cfgRes.data?.config) {
      configForm.value = {
        ...configForm.value,
        ...cfgRes.data.config,
      };
    }
  } catch (error) {
    console.error('Error cargando dashboard de panadería:', error);
  } finally {
    loading.value = false;
  }
}

async function advanceStage(order: any, nextStatus: string) {
  updatingId.value = order.id;
  try {
    await api.patch(`/bakery/production-orders/${order.id}/status`, {
      organizationId: authStore.user?.organizationId,
      status: nextStatus,
    });
    await loadDashboard();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al actualizar etapa de horneado.');
  } finally {
    updatingId.value = null;
  }
}

function openCompleteModal(order: any) {
  selectedOrder.value = order;
  completeForm.value = {
    actualQuantity: Number(order.plannedQuantity ?? 0),
    wasteQuantity: Number(order.wasteQuantity ?? 0),
    wasteReason: order.wasteReason || '',
    notes: order.notes || '',
  };
  showCompleteModal.value = true;
}

async function confirmCompleteBatch() {
  if (!selectedOrder.value) return;
  updatingId.value = selectedOrder.value.id;
  try {
    await api.patch(`/bakery/production-orders/${selectedOrder.value.id}/status`, {
      organizationId: authStore.user?.organizationId,
      status: 'COMPLETED',
      actualQuantity: Number(completeForm.value.actualQuantity),
      wasteQuantity: Number(completeForm.value.wasteQuantity),
      wasteReason: completeForm.value.wasteReason,
      notes: completeForm.value.notes,
    });
    showCompleteModal.value = false;
    selectedOrder.value = null;
    await loadDashboard();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al finalizar la tanda de horneado.');
  } finally {
    updatingId.value = null;
  }
}

async function saveConfig() {
  try {
    await api.patch('/bakery/config', {
      organizationId: authStore.user?.organizationId,
      ...configForm.value,
    });
    showConfigModal.value = false;
  } catch (error: any) {
    alert(error?.response?.data?.message || 'No se pudo guardar la configuración.');
  }
}

onMounted(() => {
  loadDashboard();
});
</script>

