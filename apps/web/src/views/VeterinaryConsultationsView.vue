<template>
  <AppLayout>
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- Encabezado -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Consultorio Veterinario, Grooming & Vacunación</h1>
          <p class="text-sm text-slate-500">
            Registro de historias clínicas, signos vitales, recetas, vacunas e integración automática con Órdenes de Servicio y POS.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="activeTab = 'consultation'"
            :class="activeTab === 'consultation' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700'"
            class="px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            🩺 Nueva Consulta / Grooming
          </button>
          <button
            @click="activeTab = 'vaccination'"
            :class="activeTab === 'vaccination' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700'"
            class="px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            💉 Aplicar Vacuna / Desparasitante
          </button>
        </div>
      </div>

      <!-- Formulario de Consulta / Historia Clínica -->
      <div v-if="activeTab === 'consultation'" class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <h2 class="text-lg font-bold text-slate-900 border-b pb-3">Registrar Atención Clínica o Peluquería</h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <label class="block font-medium text-slate-700 mb-1">Paciente (Mascota) *</label>
            <select v-model="consultForm.petId" class="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white">
              <option value="">Seleccione mascota...</option>
              <option v-for="p in pets" :key="p.id" :value="p.id">
                {{ p.name }} ({{ p.species }}) — Tutor: {{ formatCustomerName(p.customer) }}
              </option>
            </select>
          </div>

          <div>
            <label class="block font-medium text-slate-700 mb-1">Tipo de Atención</label>
            <select v-model="consultForm.visitType" class="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white">
              <option value="CONSULTATION">Consulta Médica General</option>
              <option value="EMERGENCY">Urgencia / Triaje</option>
              <option value="GROOMING">Peluquería / Baño / Grooming</option>
              <option value="SURGERY">Cirugía / Procedimiento</option>
              <option value="CHECKUP">Control / Revisión</option>
              <option value="HOSPITALIZATION">Hospitalización</option>
              <option value="VACCINATION">Consulta de Vacunación</option>
              <option value="DEWORMING">Desparasitación</option>
            </select>
          </div>

          <div>
            <label class="block font-medium text-slate-700 mb-1">Médico Veterinario / Groomer</label>
            <select v-model="consultForm.veterinarianId" class="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white">
              <option value="">Seleccione profesional...</option>
              <option v-for="w in workers" :key="w.id" :value="w.id">
                {{ formatWorkerName(w) }} ({{ w.specialty || 'Especialista' }})
              </option>
            </select>
          </div>
        </div>

        <!-- Constantes Fisiológicas -->
        <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div class="text-xs font-bold uppercase tracking-wider text-slate-500">Signos Vitales y Constantes</div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <label class="block text-xs text-slate-600 mb-1">Peso (kg)</label>
              <input
                v-model.number="consultForm.weightKg"
                type="number"
                step="0.1"
                placeholder="Ej: 14.5"
                class="w-full border border-slate-300 rounded-xl px-3 py-1.5 bg-white"
              />
            </div>
            <div>
              <label class="block text-xs text-slate-600 mb-1">Temperatura (°C)</label>
              <input
                v-model.number="consultForm.temperatureC"
                type="number"
                step="0.1"
                placeholder="Ej: 38.5"
                class="w-full border border-slate-300 rounded-xl px-3 py-1.5 bg-white"
              />
            </div>
            <div>
              <label class="block text-xs text-slate-600 mb-1">Frec. Cardíaca (lpm)</label>
              <input
                v-model.number="consultForm.heartRateBpm"
                type="number"
                placeholder="Ej: 95"
                class="w-full border border-slate-300 rounded-xl px-3 py-1.5 bg-white"
              />
            </div>
            <div>
              <label class="block text-xs text-slate-600 mb-1">Frec. Respiratoria (rpm)</label>
              <input
                v-model.number="consultForm.respiratoryRate"
                type="number"
                placeholder="Ej: 24"
                class="w-full border border-slate-300 rounded-xl px-3 py-1.5 bg-white"
              />
            </div>
          </div>
        </div>

        <!-- Campos Clínicos -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div class="md:col-span-2">
            <label class="block font-medium text-slate-700 mb-1">Motivo de Consulta / Servicio *</label>
            <input
              v-model="consultForm.reason"
              type="text"
              placeholder="Ej: Decaimiento e inapetencia de 2 días, o Baño medicado + corte..."
              class="w-full border border-slate-300 rounded-xl px-3 py-2"
            />
          </div>

          <div>
            <label class="block font-medium text-slate-700 mb-1">Anamnesis / Examen Físico</label>
            <textarea
              v-model="consultForm.physicalExam"
              rows="3"
              placeholder="Mucosas rosadas, TLLC < 2s, palpación abdominal..."
              class="w-full border border-slate-300 rounded-xl px-3 py-2"
            ></textarea>
          </div>

          <div>
            <label class="block font-medium text-slate-700 mb-1">Diagnóstico</label>
            <textarea
              v-model="consultForm.diagnosis"
              rows="3"
              placeholder="Diagnóstico presuntivo o definitivo..."
              class="w-full border border-slate-300 rounded-xl px-3 py-2"
            ></textarea>
          </div>

          <div>
            <label class="block font-medium text-slate-700 mb-1">Tratamiento en Clínica</label>
            <textarea
              v-model="consultForm.treatment"
              rows="2"
              placeholder="Fluidoterapia, analgesia aplicada..."
              class="w-full border border-slate-300 rounded-xl px-3 py-2"
            ></textarea>
          </div>

          <div>
            <label class="block font-medium text-slate-700 mb-1">Fórmula Médica / Receta para Casa</label>
            <textarea
              v-model="consultForm.prescription"
              rows="2"
              placeholder="Medicamento, dosis, frecuencia y días..."
              class="w-full border border-slate-300 rounded-xl px-3 py-2"
            ></textarea>
          </div>
        </div>

        <!-- Integración con Orden de Servicio y Facturación POS -->
        <div class="p-4 rounded-xl bg-teal-50/60 border border-teal-200 space-y-4">
          <div class="flex items-center justify-between">
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="consultForm.createServiceOrder" type="checkbox" class="rounded text-teal-600" />
              <span class="text-sm font-bold text-teal-900">
                Generar Orden de Servicio para cobro en POS y descarga de medicamentos/insumos
              </span>
            </label>
          </div>

          <div v-if="consultForm.createServiceOrder" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label class="block font-medium text-slate-700 mb-1">Servicio Base (Catálogo Core)</label>
                <select
                  v-model="consultForm.serviceItemId"
                  @change="onSelectServiceItem"
                  class="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                >
                  <option value="">Honorarios personalizados...</option>
                  <option v-for="s in serviceItems" :key="s.id" :value="s.id">
                    {{ s.name }} (${{ Number(s.basePrice || 0).toLocaleString('es-CO') }})
                  </option>
                </select>
              </div>
              <div>
                <label class="block font-medium text-slate-700 mb-1">Valor Consulta / Mano de Obra ($)</label>
                <input
                  v-model.number="consultForm.laborTotal"
                  type="number"
                  min="0"
                  class="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                />
              </div>
            </div>

            <!-- Medicamentos e Insumos aplicados -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold uppercase text-slate-600">Medicamentos / Insumos Aplicados (Inventario)</span>
                <button
                  type="button"
                  @click="addMaterialRow"
                  class="text-xs font-semibold text-teal-700 hover:underline"
                >
                  + Agregar medicamento / insumo
                </button>
              </div>

              <div
                v-for="(mat, idx) in consultForm.materials"
                :key="idx"
                class="flex flex-col sm:flex-row gap-2 items-center"
              >
                <select
                  v-model="mat.productId"
                  class="flex-1 border border-slate-300 rounded-xl px-3 py-1.5 text-sm bg-white"
                >
                  <option value="">Seleccione producto/medicamento...</option>
                  <option v-for="prod in products" :key="prod.id" :value="prod.id">
                    {{ prod.name }} (Stock: {{ prod.stock }} — ${{ Number(prod.salePrice || prod.price || 0).toLocaleString('es-CO') }})
                  </option>
                </select>
                <input
                  v-model.number="mat.quantity"
                  type="number"
                  min="1"
                  placeholder="Cant."
                  class="w-24 border border-slate-300 rounded-xl px-3 py-1.5 text-sm bg-white"
                />
                <button
                  type="button"
                  @click="consultForm.materials.splice(idx, 1)"
                  class="text-rose-500 hover:text-rose-700 text-xs px-2"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end">
          <button
            @click="submitConsultation"
            :disabled="submitting"
            class="px-6 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 transition shadow-sm"
          >
            {{ submitting ? 'Guardando...' : 'Guardar Historia Clínica' }}
          </button>
        </div>
      </div>

      <!-- Formulario de Vacunación / Desparasitación -->
      <div v-if="activeTab === 'vaccination'" class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <h2 class="text-lg font-bold text-slate-900 border-b pb-3">Registrar Vacuna o Desparasitación en Carnet</h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <label class="block font-medium text-slate-700 mb-1">Paciente (Mascota) *</label>
            <select v-model="vacForm.petId" class="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white">
              <option value="">Seleccione mascota...</option>
              <option v-for="p in pets" :key="p.id" :value="p.id">
                {{ p.name }} ({{ p.species }}) — Tutor: {{ formatCustomerName(p.customer) }}
              </option>
            </select>
          </div>

          <div>
            <label class="block font-medium text-slate-700 mb-1">Tipo de Registro</label>
            <select v-model="vacForm.type" class="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white">
              <option value="VACCINE">Vacuna (Biológico)</option>
              <option value="DEWORMING">Desparasitación Interna</option>
              <option value="ANTIPARASITIC">Antiparasitario Externo (Pipeta/Tableta)</option>
            </select>
          </div>

          <div>
            <label class="block font-medium text-slate-700 mb-1">Nombre de Vacuna / Producto *</label>
            <input
              v-model="vacForm.vaccineName"
              type="text"
              placeholder="Ej: Rabia, Séxtuple, Triple Felina, Bravecto..."
              class="w-full border border-slate-300 rounded-xl px-3 py-2"
            />
          </div>

          <div>
            <label class="block font-medium text-slate-700 mb-1">Producto en Inventario (Opcional)</label>
            <select v-model="vacForm.productId" class="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white">
              <option value="">Sin vincular a producto...</option>
              <option v-for="prod in products" :key="prod.id" :value="prod.id">
                {{ prod.name }} (Stock: {{ prod.stock }})
              </option>
            </select>
          </div>

          <div>
            <label class="block font-medium text-slate-700 mb-1">Lote / Serie</label>
            <input
              v-model="vacForm.batchNumber"
              type="text"
              placeholder="Número de lote"
              class="w-full border border-slate-300 rounded-xl px-3 py-2"
            />
          </div>

          <div>
            <label class="block font-medium text-slate-700 mb-1">Dosis Aplicada</label>
            <input
              v-model="vacForm.dose"
              type="text"
              placeholder="Ej: 1 ml SC / 1 tableta"
              class="w-full border border-slate-300 rounded-xl px-3 py-2"
            />
          </div>

          <div>
            <label class="block font-medium text-slate-700 mb-1">Fecha de Próximo Refuerzo</label>
            <input
              v-model="vacForm.nextDueDate"
              type="date"
              class="w-full border border-slate-300 rounded-xl px-3 py-2"
            />
          </div>

          <div>
            <label class="block font-medium text-slate-700 mb-1">Veterinario Responsable</label>
            <select v-model="vacForm.veterinarianId" class="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white">
              <option value="">Seleccione profesional...</option>
              <option v-for="w in workers" :key="w.id" :value="w.id">
                {{ formatWorkerName(w) }}
              </option>
            </select>
          </div>

          <div class="flex items-center pt-6">
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="vacForm.deductStock" type="checkbox" class="rounded text-teal-600" />
              <span class="text-slate-700 text-xs font-medium">
                Descontar 1 unidad inmediatamente del stock de sucursal
              </span>
            </label>
          </div>
        </div>

        <div class="flex justify-end">
          <button
            @click="submitVaccination"
            :disabled="submitting"
            class="px-6 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 transition shadow-sm"
          >
            {{ submitting ? 'Registrando...' : 'Registrar en Carnet Sanitario' }}
          </button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppLayout from '../components/AppLayout.vue';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();
const activeTab = ref<'consultation' | 'vaccination'>('consultation');
const submitting = ref(false);

const pets = ref<any[]>([]);
const workers = ref<any[]>([]);
const serviceItems = ref<any[]>([]);
const products = ref<any[]>([]);
const branches = ref<any[]>([]);

const consultForm = ref({
  petId: '',
  visitType: 'CONSULTATION',
  veterinarianId: '',
  weightKg: undefined as number | undefined,
  temperatureC: undefined as number | undefined,
  heartRateBpm: undefined as number | undefined,
  respiratoryRate: undefined as number | undefined,
  reason: '',
  physicalExam: '',
  diagnosis: '',
  treatment: '',
  prescription: '',
  createServiceOrder: true,
  serviceItemId: '',
  laborTotal: 50000,
  materials: [] as Array<{ productId: string; quantity: number }>,
});

const vacForm = ref({
  petId: '',
  type: 'VACCINE',
  vaccineName: '',
  productId: '',
  batchNumber: '',
  dose: '1 dosis',
  nextDueDate: '',
  veterinarianId: '',
  deductStock: false,
});

const getOrgId = () =>
  authStore.currentOrganization?.id || authStore.user?.organizationId || undefined;

const getBranchId = () =>
  authStore.currentBranch?.id || authStore.user?.branchId || branches.value[0]?.id || undefined;

const formatCustomerName = (c?: any) => {
  if (!c) return 'Sin asignar';
  if (c.companyName) return c.companyName;
  const full = `${c.firstName || ''} ${c.lastName || ''}`.trim();
  return full || c.name || 'Cliente';
};

const formatWorkerName = (w?: any) => {
  if (!w) return 'General';
  const full = `${w.firstName || ''} ${w.lastName || ''}`.trim();
  return full || w.fullName || w.name || 'Profesional';
};

const loadCatalogs = async () => {
  const organizationId = getOrgId();
  try {
    const [petsRes, workersRes, itemsRes, prodRes, branchRes] = await Promise.all([
      api.get('/veterinary/pets', { params: { organizationId } }),
      api.get('/service-workers', { params: { organizationId } }),
      api.get('/service-items', { params: { organizationId } }),
      api.get('/products', { params: { organizationId } }),
      api.get('/branches', { params: { organizationId } }),
    ]);

    pets.value = petsRes.data || [];
    workers.value = Array.isArray(workersRes.data) ? workersRes.data : workersRes.data?.data || [];
    serviceItems.value = Array.isArray(itemsRes.data) ? itemsRes.data : itemsRes.data?.data || [];
    products.value = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data || [];
    branches.value = Array.isArray(branchRes.data) ? branchRes.data : branchRes.data?.data || [];
  } catch (error) {
    console.error('Error cargando catálogos de consultorio:', error);
  }
};

const onSelectServiceItem = () => {
  const item = serviceItems.value.find((i) => i.id === consultForm.value.serviceItemId);
  if (item) {
    consultForm.value.laborTotal = Number(item.basePrice || 0);
  }
};

const addMaterialRow = () => {
  consultForm.value.materials.push({ productId: '', quantity: 1 });
};

const submitConsultation = async () => {
  if (!consultForm.value.petId || !consultForm.value.reason.trim()) {
    alert('Selecciona una mascota e ingresa el motivo de la consulta.');
    return;
  }

  submitting.value = true;
  try {
    const organizationId = getOrgId();
    const branchId = getBranchId();
    const validMaterials = consultForm.value.materials.filter((m) => m.productId && m.quantity > 0);

    await api.post('/veterinary/medical-records', {
      organizationId,
      branchId,
      ...consultForm.value,
      veterinarianId: consultForm.value.veterinarianId || undefined,
      serviceItemId: consultForm.value.serviceItemId || undefined,
      materials: validMaterials,
    });

    router.push('/veterinary-dashboard');
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al registrar la historia clínica');
  } finally {
    submitting.value = false;
  }
};

const submitVaccination = async () => {
  if (!vacForm.value.petId || !vacForm.value.vaccineName.trim()) {
    alert('Selecciona una mascota e indica el nombre de la vacuna o antiparasitario.');
    return;
  }

  submitting.value = true;
  try {
    const organizationId = getOrgId();
    const branchId = getBranchId();

    await api.post('/veterinary/vaccinations', {
      organizationId,
      branchId,
      ...vacForm.value,
      productId: vacForm.value.productId || undefined,
      veterinarianId: vacForm.value.veterinarianId || undefined,
      nextDueDate: vacForm.value.nextDueDate || undefined,
    });

    router.push('/veterinary-dashboard');
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al registrar vacuna');
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  loadCatalogs();
});
</script>

