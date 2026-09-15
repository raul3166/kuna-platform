<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import AppLayout from '../components/AppLayout.vue';

const authStore = useAuthStore();

const workers = ref<any[]>([]);
const loading = ref(false);
const loadingSubmit = ref(false);
const showModal = ref(false);

const initialForm = {
  id: '',
  firstName: '',
  lastName: '',
  identification: '', // Corregido: 'identification'
  phoneNumber: '',    // Corregido: 'phoneNumber'
  email: '',
  specialty: 'Técnico Especialista', // Corregido: 'specialty'
  employmentType: 'SALARIED',
  commissionPercentage: 0,
  isActive: true,
};

const form = ref({ ...initialForm });

const handleEmploymentTypeChange = () => {
  if (form.value.employmentType === 'SALARIED') {
    form.value.commissionPercentage = 0;
  } else if (form.value.commissionPercentage === 0) {
    form.value.commissionPercentage = 10;
  }
};

const fetchWorkers = async () => {
  loading.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    if (!orgId) return;

    const { data } = await api.get('/service-workers', { params: { organizationId: orgId } });
    workers.value = Array.isArray(data) ? data : (data.items || data.data || []);
  } catch (error) {
    console.error('Error al obtener personal:', error);
  } finally {
    loading.value = false;
  }
};

const saveWorker = async () => {
  loadingSubmit.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const { id, ...payloadData } = form.value;
    const payload = { ...payloadData, organizationId: orgId };

    if (id) {
      await api.patch(`/service-workers/${id}`, payload, { params: { organizationId: orgId } });
    } else {
      await api.post('/service-workers', payload);
    }

    showModal.value = false;
    form.value = { ...initialForm };
    fetchWorkers();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al guardar personal de servicio');
  } finally {
    loadingSubmit.value = false;
  }
};

const openCreateModal = () => {
  form.value = { ...initialForm };
  showModal.value = true;
};

const openEditModal = (worker: any) => {
  form.value = {
    id: worker.id,
    firstName: worker.firstName || '',
    lastName: worker.lastName || '',
    identification: worker.identification || '',
    phoneNumber: worker.phoneNumber || '',
    email: worker.email || '',
    specialty: worker.specialty || 'Técnico',
    employmentType: worker.employmentType || (Number(worker.commissionPercentage) > 0 ? 'COMMISSION' : 'SALARIED'),
    commissionPercentage: Number(worker.commissionPercentage) || 0,
    isActive: worker.isActive ?? true,
  };
  showModal.value = true;
};

onMounted(() => {
  fetchWorkers();
});
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Técnicos y Personal de Servicio</h1>
          <p class="text-sm text-slate-500 mt-1">Administración de equipo técnico, vinculación laboral y comisiones.</p>
        </div>
        <button
          @click="openCreateModal"
          class="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all text-sm gap-2"
        >
          <span>👷</span> Nuevo Técnico
        </button>
      </div>

      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div v-if="loading" class="p-12 text-center text-slate-400">
          Cargando personal de servicio...
        </div>

        <div v-else-if="workers.length === 0" class="p-12 text-center text-slate-400 space-y-2">
          <span class="text-4xl block">👤</span>
          <p class="text-sm font-medium">No se han registrado técnicos todavía.</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50/70 border-b border-slate-100 text-xs uppercase font-bold text-slate-500">
              <tr>
                <th class="px-6 py-3.5">Nombre & Doc</th>
                <th class="px-6 py-3.5">Tipo Vinculación</th>
                <th class="px-6 py-3.5">Especialidad</th>
                <th class="px-6 py-3.5">Contacto</th>
                <th class="px-6 py-3.5">% Comisión</th>
                <th class="px-6 py-3.5">Estado</th>
                <th class="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="w in workers" :key="w.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <p class="font-bold text-slate-900">{{ w.firstName }} {{ w.lastName }}</p>
                  <p class="text-xs text-slate-400">Doc: {{ w.identification || 'N/A' }}</p>
                </td>
                <td class="px-6 py-4">
                  <span
                    :class="w.employmentType === 'SALARIED'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'"
                    class="px-2.5 py-1 rounded-lg text-xs font-bold border inline-block"
                  >
                    {{ w.employmentType === 'SALARIED' ? '🏢 Planta (Nómina)' : '🤝 Comisión' }}
                  </span>
                </td>
                <td class="px-6 py-4 font-medium text-slate-800">
                  {{ w.specialty || 'Técnico' }}
                </td>
                <td class="px-6 py-4 text-xs">
                  <p class="text-slate-700">{{ w.phoneNumber || 'Sin teléfono' }}</p>
                  <p class="text-slate-400">{{ w.email || '' }}</p>
                </td>
                <td class="px-6 py-4 font-bold">
                  <span v-if="w.employmentType === 'SALARIED'" class="text-slate-400 text-xs">
                    N/A (Nómina)
                  </span>
                  <span v-else class="text-blue-600">
                    {{ w.commissionPercentage }}%
                  </span>
                </td>
                <td class="px-6 py-4">
                  <span
                    :class="w.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'"
                    class="px-2.5 py-1 rounded-lg text-xs font-bold border inline-block"
                  >
                    {{ w.isActive ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                  <button
                    @click="openEditModal(w)"
                    class="text-xs font-bold text-slate-600 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal Crear / Editar -->
      <div v-if="showModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
          <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 class="text-lg font-bold text-slate-900">{{ form.id ? 'Editar Técnico' : 'Nuevo Técnico' }}</h3>
            <button @click="showModal = false" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
          </div>

          <form @submit.prevent="saveWorker" class="p-6 space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Nombre</label>
                <input v-model="form.firstName" type="text" required class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Apellido</label>
                <input v-model="form.lastName" type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Identificación / Cédula</label>
              <input v-model="form.identification" type="text" required class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Especialidad</label>
              <input v-model="form.specialty" type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Teléfono</label>
                <input v-model="form.phoneNumber" type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Email</label>
                <input v-model="form.email" type="email" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Tipo de Vinculación</label>
              <select
                v-model="form.employmentType"
                @change="handleEmploymentTypeChange"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="SALARIED">🏢 Personal de Planta (Nómina / Fijo)</option>
                <option value="COMMISSION">🤝 Contratista / Por Comisión</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">% Comisión por Mano de Obra</label>
              <input
                v-model.number="form.commissionPercentage"
                type="number"
                step="0.1"
                min="0"
                max="100"
                :disabled="form.employmentType === 'SALARIED'"
                :class="form.employmentType === 'SALARIED' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-blue-600 font-bold'"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm transition-colors"
              />
              <p v-if="form.employmentType === 'SALARIED'" class="text-[11px] text-slate-400 mt-1">
                El personal de planta no percibe comisiones por orden de servicio.
              </p>
            </div>

            <div class="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button type="button" @click="showModal = false" class="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold">Cancelar</button>
              <button type="submit" :disabled="loadingSubmit" class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
                {{ loadingSubmit ? 'Procesando...' : 'Guardar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
