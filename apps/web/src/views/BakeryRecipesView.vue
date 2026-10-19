<template>
  <AppLayout>
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- Encabezado -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 rounded-full">
              Fórmulas Técnicas & Costeo
            </span>
            <span class="text-xs text-slate-400">Vinculado a Catálogo Core de Productos e Insumos</span>
          </div>
          <h1 class="text-2xl font-bold text-slate-900 mt-1">Recetario de Panadería, Pastelería & Lanzador de Tandas</h1>
          <p class="text-sm text-slate-500">
            Define tus fórmulas maestras con harina, mantequilla, levadura y rellenos; calcula costos unitarios y lanza tandas al horno.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <router-link
            to="/bakery-dashboard"
            class="px-3.5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition"
          >
            ← Monitor de Hornos
          </router-link>
          <button
            @click="openQuickProductModal"
            class="px-3.5 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition"
          >
            + Crear Producto / Insumo Core
          </button>
          <button
            @click="openNewRecipeModal"
            class="px-4 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition shadow-sm"
          >
            + Nueva Receta Técnica
          </button>
        </div>
      </div>

      <!-- Barra de búsqueda -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <input
          v-model="searchQuery"
          @keyup.enter="loadRecipes"
          type="text"
          placeholder="Buscar por nombre de receta, código o producto terminado (ej. Pan Francés, Croissant, Torta Tres Leches)..."
          class="flex-1 w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm"
        />
        <button
          @click="loadRecipes"
          class="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
        >
          Buscar
        </button>
      </div>

      <!-- Listado de Recetas -->
      <div v-if="loading" class="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500">
        Cargando recetario técnico y costos de insumos...
      </div>

      <div
        v-else-if="recipes.length === 0"
        class="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3"
      >
        <div class="text-4xl">🥐</div>
        <h3 class="text-lg font-bold text-slate-800">Aún no hay recetas técnicas registradas</h3>
        <p class="text-sm text-slate-500 max-w-md mx-auto">
          Crea tu primera fórmula vinculando un producto terminado de vitrina con sus ingredientes (harina, azúcar, huevos, mantequilla) para activar el costeo y horneado automático.
        </p>
        <button
          @click="openNewRecipeModal"
          class="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700"
        >
          + Crear Primera Receta
        </button>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="recipe in recipes"
          :key="recipe.id"
          class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden"
        >
          <div class="p-5 space-y-4">
            <div class="flex items-start justify-between gap-2">
              <div>
                <span class="text-[11px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {{ recipe.code || 'FÓRMULA' }}
                </span>
                <h3 class="text-lg font-bold text-slate-900 mt-1">{{ recipe.name }}</h3>
                <p class="text-xs text-slate-500">
                  Producto Vitrina: <strong class="text-slate-800">{{ recipe.finishedProduct?.name }}</strong>
                  (Stock actual: {{ formatQty(recipe.finishedProduct?.stock) }})
                </p>
              </div>
              <span class="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                Rinde {{ formatQty(recipe.yieldQuantity) }} {{ recipe.yieldUnit }}
              </span>
            </div>

            <!-- Parámetros Técnicos -->
            <div class="grid grid-cols-3 gap-2 text-center bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
              <div>
                <span class="text-slate-400 block text-[10px] uppercase">Prep / Horno</span>
                <span class="font-bold text-slate-800">{{ recipe.prepMinutes }}m / {{ recipe.bakeMinutes }}m</span>
              </div>
              <div>
                <span class="text-slate-400 block text-[10px] uppercase">Temperatura</span>
                <span class="font-bold text-orange-600">{{ recipe.ovenTempC || 180 }} °C</span>
              </div>
              <div>
                <span class="text-slate-400 block text-[10px] uppercase">Frescura FEFO</span>
                <span class="font-bold text-indigo-700">{{ recipe.shelfLifeDays }} días</span>
              </div>
            </div>

            <!-- Rentabilidad y Costeo -->
            <div class="grid grid-cols-3 gap-2 bg-amber-50/60 p-3 rounded-xl border border-amber-200/70 text-xs">
              <div>
                <span class="text-slate-500 block text-[10px] uppercase">Costo Tanda</span>
                <span class="font-extrabold text-slate-900">{{ formatCurrency(recipe.estimatedBatchCost) }}</span>
              </div>
              <div>
                <span class="text-slate-500 block text-[10px] uppercase">Costo Unit.</span>
                <span class="font-extrabold text-amber-800">{{ formatCurrency(recipe.estimatedUnitCost) }}</span>
              </div>
              <div>
                <span class="text-slate-500 block text-[10px] uppercase">Precio Venta</span>
                <span class="font-extrabold text-emerald-700">{{ formatCurrency(recipe.finishedProduct?.salePrice) }}</span>
              </div>
            </div>

            <!-- Ingredientes -->
            <div>
              <div class="text-[11px] font-bold uppercase text-slate-400 mb-1.5">
                Insumos por Tanda ({{ (recipe.ingredients || []).length }})
              </div>
              <ul class="space-y-1 max-h-32 overflow-y-auto text-xs divide-y divide-slate-100">
                <li
                  v-for="ing in recipe.ingredients"
                  :key="ing.id"
                  class="py-1 flex items-center justify-between text-slate-700"
                >
                  <span class="truncate pr-2">• {{ ing.ingredientProduct?.name }}</span>
                  <span class="font-semibold text-slate-900 whitespace-nowrap">
                    {{ formatQty(ing.quantity) }} {{ ing.unit }}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Pie de Tarjeta -->
          <div class="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span class="text-xs text-slate-500">
              {{ recipe._count?.productionOrders || 0 }} tandas históricas
            </span>
            <button
              @click="openLaunchBatchModal(recipe)"
              class="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition shadow-sm"
            >
              🔥 Lanzar Tanda al Horno
            </button>
          </div>
        </div>
      </div>

      <!-- Modal: Lanzar Tanda de Producción al Horno -->
      <div
        v-if="showLaunchModal && selectedRecipe"
        class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <span class="text-xs font-bold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                Orden de Horneado
              </span>
              <h3 class="text-lg font-bold text-slate-900 mt-1">{{ selectedRecipe.name }}</h3>
            </div>
            <button @click="showLaunchModal = false" class="text-slate-400 hover:text-slate-600 text-xl">×</button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Multiplicador de Tandas (Ej. 1 tanda, 2 tandas)
              </label>
              <input
                v-model.number="launchForm.batchesMultiplier"
                type="number"
                min="0.5"
                step="0.5"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold"
              />
              <p class="text-xs text-slate-500 mt-1">
                Producción estimada:
                <strong class="text-emerald-700">
                  {{ formatQty(Number(selectedRecipe.yieldQuantity) * Number(launchForm.batchesMultiplier || 1)) }}
                  {{ selectedRecipe.yieldUnit }}
                </strong>
                | Costo estimado:
                <strong class="text-amber-700">
                  {{ formatCurrency(Number(selectedRecipe.estimatedBatchCost) * Number(launchForm.batchesMultiplier || 1)) }}
                </strong>
              </p>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Maestro Panadero / Pastelero Responsable
              </label>
              <select
                v-model="launchForm.bakerWorkerId"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              >
                <option value="">-- Sin asignar / Equipo general --</option>
                <option v-for="w in workers" :key="w.id" :value="w.id">
                  {{ w.firstName }} {{ w.lastName || '' }} ({{ w.specialty || 'Panadería' }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Horno / Estación Asignada
              </label>
              <input
                v-model="launchForm.ovenNumber"
                type="text"
                placeholder="Ej: Horno Rotativo #1 / Horno de Piso #2"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Observaciones de la Tanda
              </label>
              <textarea
                v-model="launchForm.notes"
                rows="2"
                placeholder="Ej: Tanda para vitrina de la mañana / Pedido especial..."
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              ></textarea>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              @click="showLaunchModal = false"
              class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              @click="confirmLaunchBatch"
              :disabled="submitting"
              class="px-5 py-2 rounded-xl text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
            >
              {{ submitting ? 'Programando...' : '🔥 Enviar a Hornos' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Modal: Crear Nueva Receta Técnica -->
      <div
        v-if="showRecipeModal"
        class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      >
        <div class="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 space-y-5 my-8 max-h-[92vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 class="text-lg font-bold text-slate-900">Nueva Receta / Fórmula Técnica de Panadería</h3>
              <p class="text-xs text-slate-500">
                Conecta el producto terminado de vitrina con los insumos de bodega para automatizar costos y descargue de inventario.
              </p>
            </div>
            <button @click="showRecipeModal = false" class="text-slate-400 hover:text-slate-600 text-xl">×</button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2">
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Producto Terminado en Vitrina (Catálogo Core) *
              </label>
              <select
                v-model="recipeForm.finishedProductId"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              >
                <option value="">-- Selecciona el pan, pastel o postre terminado --</option>
                <option v-for="p in products" :key="p.id" :value="p.id">
                  {{ p.name }} (SKU: {{ p.sku }} | Venta: {{ formatCurrency(p.salePrice) }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Nombre de la Fórmula *
              </label>
              <input
                v-model="recipeForm.name"
                type="text"
                placeholder="Ej: Tanda Pan Francés Artesanal x 50 und"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Código Ficha Técnica
              </label>
              <input
                v-model="recipeForm.code"
                type="text"
                placeholder="Ej: FOR-PAN-001"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Rendimiento Esperado por Tanda *
              </label>
              <div class="flex gap-2">
                <input
                  v-model.number="recipeForm.yieldQuantity"
                  type="number"
                  min="1"
                  step="0.1"
                  class="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold"
                />
                <select
                  v-model="recipeForm.yieldUnit"
                  class="w-28 px-2 py-2 border border-slate-300 rounded-xl text-sm"
                >
                  <option value="UND">UND</option>
                  <option value="KG">KG</option>
                  <option value="PORCIONES">PORCIONES</option>
                  <option value="BANDEJAS">BANDEJAS</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Prep (min)</label>
                <input
                  v-model.number="recipeForm.prepMinutes"
                  type="number"
                  min="1"
                  class="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>
              <div>
                <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Horno (min)</label>
                <input
                  v-model.number="recipeForm.bakeMinutes"
                  type="number"
                  min="1"
                  class="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>
              <div>
                <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Temp (°C)</label>
                <input
                  v-model.number="recipeForm.ovenTempC"
                  type="number"
                  min="0"
                  class="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Días de Frescura (Para Lote FEFO automático)
              </label>
              <input
                v-model.number="recipeForm.shelfLifeDays"
                type="number"
                min="1"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Instrucciones de Amasado / Horneado
              </label>
              <input
                v-model="recipeForm.instructions"
                type="text"
                placeholder="Ej: Amasar 12 min en 1ra velocidad, fermentar a 28°C con 75% humedad..."
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>
          </div>

          <!-- Constructor de Ingredientes -->
          <div class="border-t border-slate-200 pt-4 space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-bold text-slate-900">Ingredientes / Materia Prima por 1 Tanda *</h4>
              <button
                type="button"
                @click="addIngredientRow"
                class="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold hover:bg-amber-100"
              >
                + Agregar Ingrediente
              </button>
            </div>

            <div
              v-for="(ing, idx) in recipeForm.ingredients"
              :key="idx"
              class="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200"
            >
              <div class="col-span-6">
                <select
                  v-model="ing.ingredientProductId"
                  class="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="">-- Seleccionar insumo (Harina, Mantequilla, Huevos...) --</option>
                  <option v-for="p in products" :key="p.id" :value="p.id">
                    {{ p.name }} (Costo: {{ formatCurrency(p.costPrice) }} | Stock: {{ formatQty(p.stock) }})
                  </option>
                </select>
              </div>
              <div class="col-span-3">
                <input
                  v-model.number="ing.quantity"
                  type="number"
                  min="0.001"
                  step="0.01"
                  placeholder="Cantidad"
                  class="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-bold"
                />
              </div>
              <div class="col-span-2">
                <select
                  v-model="ing.unit"
                  class="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="KG">KG</option>
                  <option value="GR">GR</option>
                  <option value="LT">LT</option>
                  <option value="ML">ML</option>
                  <option value="UND">UND</option>
                </select>
              </div>
              <div class="col-span-1 text-right">
                <button
                  v-if="recipeForm.ingredients.length > 1"
                  type="button"
                  @click="removeIngredientRow(idx)"
                  class="text-rose-500 hover:text-rose-700 font-bold text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            <!-- Resumen de Costeo en Vivo -->
            <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span class="text-slate-600">Costo Estimado de la Tanda:</span>
                <strong class="text-slate-900 ml-1 text-sm">{{ formatCurrency(liveBatchCost) }}</strong>
              </div>
              <div>
                <span class="text-slate-600">Costo Unitario Calculado:</span>
                <strong class="text-emerald-800 ml-1 text-sm">{{ formatCurrency(liveUnitCost) }}</strong>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              @click="showRecipeModal = false"
              class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              @click="saveRecipe"
              :disabled="submitting"
              class="px-5 py-2 rounded-xl text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
            >
              {{ submitting ? 'Guardando Fórmula...' : 'Guardar Receta Técnica' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Rápido: Crear Producto Terminado o Insumo en Catálogo Core -->
      <div
        v-if="showQuickProductModal"
        class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 class="text-lg font-bold text-slate-900">Crear Producto / Insumo en Core</h3>
            <button @click="showQuickProductModal = false" class="text-slate-400 hover:text-slate-600 text-xl">×</button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Nombre *</label>
              <input
                v-model="quickProductForm.name"
                type="text"
                placeholder="Ej: Harina de Trigo Fortificada (Kg) o Croissant de Mantequilla"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">SKU / Código *</label>
              <input
                v-model="quickProductForm.sku"
                type="text"
                placeholder="Ej: PAN-001 o INS-HAR-01"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Costo Unitario (COP)</label>
                <input
                  v-model.number="quickProductForm.costPrice"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Precio Venta (COP)</label>
                <input
                  v-model.number="quickProductForm.salePrice"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Stock Inicial</label>
              <input
                v-model.number="quickProductForm.stock"
                type="number"
                min="0"
                step="0.1"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              @click="showQuickProductModal = false"
              class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              @click="saveQuickProduct"
              :disabled="submitting"
              class="px-5 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              Crear en Catálogo
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppLayout from '../components/AppLayout.vue';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const submitting = ref(false);
const searchQuery = ref('');

const recipes = ref<any[]>([]);
const products = ref<any[]>([]);
const workers = ref<any[]>([]);

const showRecipeModal = ref(false);
const recipeForm = ref({
  finishedProductId: '',
  name: '',
  code: '',
  yieldQuantity: 50,
  yieldUnit: 'UND',
  prepMinutes: 45,
  bakeMinutes: 25,
  ovenTempC: 180,
  shelfLifeDays: 3,
  instructions: '',
  ingredients: [
    { ingredientProductId: '', quantity: 1, unit: 'KG', notes: '' },
  ],
});

const showLaunchModal = ref(false);
const selectedRecipe = ref<any | null>(null);
const launchForm = ref({
  batchesMultiplier: 1,
  bakerWorkerId: '',
  ovenNumber: 'Horno Rotativo #1',
  notes: '',
});

const showQuickProductModal = ref(false);
const quickProductForm = ref({
  name: '',
  sku: '',
  costPrice: 3500,
  salePrice: 5000,
  stock: 50,
});

const liveBatchCost = computed(() => {
  return recipeForm.value.ingredients.reduce((sum, ing) => {
    const prod = products.value.find((p) => p.id === ing.ingredientProductId);
    const cost = Number(prod?.costPrice ?? 0);
    return sum + cost * Number(ing.quantity || 0);
  }, 0);
});

const liveUnitCost = computed(() => {
  const y = Number(recipeForm.value.yieldQuantity || 1);
  return y > 0 ? liveBatchCost.value / y : 0;
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

async function loadRecipes() {
  loading.value = true;
  try {
    const orgId = authStore.user?.organizationId;
    const res = await api.get('/bakery/recipes', {
      params: {
        organizationId: orgId,
        search: searchQuery.value || undefined,
      },
    });
    recipes.value = Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error('Error cargando recetas de panadería:', error);
  } finally {
    loading.value = false;
  }
}

async function loadCatalogs() {
  try {
    const orgId = authStore.user?.organizationId;
    const [prodRes, workRes] = await Promise.all([
      api.get('/products', { params: { organizationId: orgId } }),
      api.get('/service-workers', { params: { organizationId: orgId } }),
    ]);
    products.value = Array.isArray(prodRes.data)
      ? prodRes.data
      : prodRes.data?.data || [];
    workers.value = Array.isArray(workRes.data)
      ? workRes.data
      : workRes.data?.data || [];
  } catch (error) {
    console.error('Error cargando catálogos Core para panadería:', error);
  }
}

function openNewRecipeModal() {
  recipeForm.value = {
    finishedProductId: '',
    name: '',
    code: `REC-${Math.floor(100 + Math.random() * 900)}`,
    yieldQuantity: 50,
    yieldUnit: 'UND',
    prepMinutes: 45,
    bakeMinutes: 25,
    ovenTempC: 180,
    shelfLifeDays: 3,
    instructions: '',
    ingredients: [
      { ingredientProductId: '', quantity: 1, unit: 'KG', notes: '' },
    ],
  };
  showRecipeModal.value = true;
}

function addIngredientRow() {
  recipeForm.value.ingredients.push({
    ingredientProductId: '',
    quantity: 1,
    unit: 'KG',
    notes: '',
  });
}

function removeIngredientRow(idx: number) {
  recipeForm.value.ingredients.splice(idx, 1);
}

async function saveRecipe() {
  const validIngredients = recipeForm.value.ingredients.filter(
    (i) => i.ingredientProductId && Number(i.quantity) > 0,
  );

  if (!recipeForm.value.finishedProductId || !recipeForm.value.name.trim()) {
    alert('Por favor selecciona el producto terminado e ingresa el nombre de la receta.');
    return;
  }

  if (validIngredients.length === 0) {
    alert('Agrega al menos un ingrediente o insumo con cantidad mayor a cero.');
    return;
  }

  submitting.value = true;
  try {
    await api.post('/bakery/recipes', {
      organizationId: authStore.user?.organizationId,
      finishedProductId: recipeForm.value.finishedProductId,
      name: recipeForm.value.name,
      code: recipeForm.value.code,
      yieldQuantity: Number(recipeForm.value.yieldQuantity),
      yieldUnit: recipeForm.value.yieldUnit,
      prepMinutes: Number(recipeForm.value.prepMinutes),
      bakeMinutes: Number(recipeForm.value.bakeMinutes),
      ovenTempC: Number(recipeForm.value.ovenTempC),
      shelfLifeDays: Number(recipeForm.value.shelfLifeDays),
      instructions: recipeForm.value.instructions,
      ingredients: validIngredients,
    });
    showRecipeModal.value = false;
    await loadRecipes();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al guardar la receta técnica.');
  } finally {
    submitting.value = false;
  }
}

function openLaunchBatchModal(recipe: any) {
  selectedRecipe.value = recipe;
  launchForm.value = {
    batchesMultiplier: 1,
    bakerWorkerId: '',
    ovenNumber: 'Horno Principal #1',
    notes: '',
  };
  showLaunchModal.value = true;
}

async function confirmLaunchBatch() {
  if (!selectedRecipe.value) return;
  submitting.value = true;
  try {
    await api.post('/bakery/production-orders', {
      organizationId: authStore.user?.organizationId,
      branchId: authStore.user?.branchId,
      recipeId: selectedRecipe.value.id,
      batchesMultiplier: Number(launchForm.value.batchesMultiplier || 1),
      bakerWorkerId: launchForm.value.bakerWorkerId || undefined,
      ovenNumber: launchForm.value.ovenNumber,
      notes: launchForm.value.notes,
    });
    showLaunchModal.value = false;
    router.push('/bakery-dashboard');
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al lanzar tanda de horneado.');
  } finally {
    submitting.value = false;
  }
}

function openQuickProductModal() {
  quickProductForm.value = {
    name: '',
    sku: `PAN-${Math.floor(1000 + Math.random() * 9000)}`,
    costPrice: 2500,
    salePrice: 4500,
    stock: 20,
  };
  showQuickProductModal.value = true;
}

async function saveQuickProduct() {
  if (!quickProductForm.value.name.trim() || !quickProductForm.value.sku.trim()) {
    alert('Ingresa nombre y SKU del producto o insumo.');
    return;
  }
  submitting.value = true;
  try {
    await api.post('/products', {
      organizationId: authStore.user?.organizationId,
      name: quickProductForm.value.name.trim(),
      sku: quickProductForm.value.sku.trim(),
      costPrice: Number(quickProductForm.value.costPrice),
      salePrice: Number(quickProductForm.value.salePrice),
      stock: Number(quickProductForm.value.stock),
    });
    showQuickProductModal.value = false;
    await loadCatalogs();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error creando producto en catálogo Core.');
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadRecipes(), loadCatalogs()]);
});
</script>

