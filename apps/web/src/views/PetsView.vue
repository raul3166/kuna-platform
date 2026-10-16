<template>
  <AppLayout>
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- Encabezado -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Directorio de Mascotas & Expediente Clínico</h1>
          <p class="text-sm text-slate-500">
            Gestión de pacientes vinculados a clientes propietarios (Core), carnet de vacunas e historial médico.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <router-link
            to="/veterinary-consultations"
            class="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition"
          >
            🩺 Ir a Consultorio
          </router-link>
          <button
            @click="openCreateModal"
            class="px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition shadow-sm"
          >
            + Registrar Mascota
          </button>
        </div>
      </div>

      <!-- Filtros -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <input
          v-model="searchQuery"
          @input="loadPets"
          type="text"
          placeholder="Buscar por nombre de mascota, raza, microchip o propietario..."
          class="flex-1 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <select
          v-model="selectedSpecies"
          @change="loadPets"
          class="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white"
        >
          <option value="">Todas las especies</option>
          <option value="CANINE">🐶 Caninos</option>
          <option value="FELINE">🐱 Felinos</option>
          <option value="AVIAN">🦜 Aves</option>
          <option value="RODENT">🐹 Roedores</option>
          <option value="REPTILE">🐢 Reptiles</option>
          <option value="EQUINE">🐴 Equinos</option>
          <option value="BOVINE">🐮 Bovinos</option>
          <option value="OTHER">🐾 Otros</option>
        </select>
      </div>

      <!-- Grid de Mascotas -->
      <div v-if="loading" class="p-12 text-center text-slate-400">
        Cargando directorio de pacientes...
      </div>

      <div v-else-if="pets.length === 0" class="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
        <div class="text-4xl">🐾</div>
        <h3 class="text-lg font-bold text-slate-800">No se encontraron mascotas registradas</h3>
        <p class="text-sm text-slate-500">Registra la primera mascota asociada a un cliente propietario.</p>
        <button
          @click="openCreateModal"
          class="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700"
        >
          + Registrar Mascota
        </button>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="pet in pets"
          :key="pet.id"
          class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
        >
          <div class="space-y-2">
            <div class="flex items-start justify-between">
              <div>
                <h3 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                  {{ pet.name }}
                  <span class="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-semibold">
                    {{ formatSpecies(pet.species) }}
                  </span>
                </h3>
                <p class="text-xs text-slate-500">
                  {{ pet.breed || 'Raza no especificada' }} • {{ formatGender(pet.gender) }}
                  <span v-if="pet.weightKg"> • {{ pet.weightKg }} kg</span>
                </p>
              </div>
              <button
                @click="openEditModal(pet)"
                class="text-xs text-slate-400 hover:text-slate-700"
                title="Editar ficha"
              >
                ✏️ Editar
              </button>
            </div>

            <div class="p-3 rounded-xl bg-slate-50 text-xs space-y-1">
              <div class="font-semibold text-slate-700">
                👤 Propietario: {{ formatCustomerName(pet.customer) }}
              </div>
              <div class="text-slate-500">
                📞 {{ pet.customer?.phoneNumber || 'Sin teléfono' }}
                <span v-if="pet.microchipNumber" class="ml-2 font-mono">• Chip: {{ pet.microchipNumber }}</span>
              </div>
            </div>

            <div v-if="pet.allergies || pet.chronicIssues" class="text-xs space-y-1">
              <div v-if="pet.allergies" class="text-rose-600 font-medium">
                ⚠️ Alergias: {{ pet.allergies }}
              </div>
              <div v-if="pet.chronicIssues" class="text-amber-700 font-medium">
                🩺 Condición crónica: {{ pet.chronicIssues }}
              </div>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <div class="text-slate-500 space-x-2">
              <span>📋 {{ pet._count?.medicalRecords || 0 }} consultas</span>
              <span>💉 {{ pet._count?.vaccinations || 0 }} vacunas</span>
            </div>
            <button
              @click="openHistoryModal(pet.id)"
              class="px-3 py-1.5 bg-teal-50 text-teal-700 font-semibold rounded-lg hover:bg-teal-100 transition"
            >
              Ver Expediente →
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Crear / Editar Mascota -->
      <div
        v-if="showPetModal"
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto"
      >
        <div class="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl my-8">
          <div class="flex items-center justify-between border-b pb-3">
            <h3 class="text-lg font-bold text-slate-900">
              {{ editingPetId ? 'Editar Mascota' : 'Registrar Nueva Mascota' }}
            </h3>
            <button @click="showPetModal = false" class="text-slate-400 hover:text-slate-600">✕</button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div class="sm:col-span-2">
              <label class="block font-medium text-slate-700 mb-1">Propietario / Tutor (Cliente Core) *</label>
              <select
                v-model="petForm.customerId"
                class="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
              >
                <option value="">Seleccione un cliente propietario...</option>
                <option v-for="c in customers" :key="c.id" :value="c.id">
                  {{ formatCustomerName(c) }} ({{ c.identificationNumber || c.phoneNumber || c.email || 'Cliente' }})
                </option>
              </select>
            </div>

            <div>
              <label class="block font-medium text-slate-700 mb-1">Nombre de la Mascota *</label>
              <input
                v-model="petForm.name"
                type="text"
                placeholder="Ej: Max, Luna..."
                class="w-full border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <label class="block font-medium text-slate-700 mb-1">Especie</label>
              <select
                v-model="petForm.species"
                class="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
              >
                <option value="CANINE">Canino (Perro)</option>
                <option value="FELINE">Felino (Gato)</option>
                <option value="AVIAN">Ave</option>
                <option value="RODENT">Roedor</option>
                <option value="REPTILE">Reptil</option>
                <option value="EQUINE">Equino</option>
                <option value="BOVINE">Bovino</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>

            <div>
              <label class="block font-medium text-slate-700 mb-1">Raza</label>
              <input
                v-model="petForm.breed"
                type="text"
                placeholder="Ej: Golden Retriever, Criollo..."
                class="w-full border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <label class="block font-medium text-slate-700 mb-1">Sexo</label>
              <select
                v-model="petForm.gender"
                class="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
              >
                <option value="MALE">Macho</option>
                <option value="FEMALE">Hembra</option>
                <option value="UNKNOWN">Sin especificar</option>
              </select>
            </div>

            <div>
              <label class="block font-medium text-slate-700 mb-1">Peso Actual (kg)</label>
              <input
                v-model.number="petForm.weightKg"
                type="number"
                step="0.1"
                min="0"
                class="w-full border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <label class="block font-medium text-slate-700 mb-1">Fecha de Nacimiento (aprox.)</label>
              <input
                v-model="petForm.birthDate"
                type="date"
                class="w-full border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <label class="block font-medium text-slate-700 mb-1">Color / Pelaje</label>
              <input
                v-model="petForm.color"
                type="text"
                placeholder="Ej: Negro y blanco"
                class="w-full border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <label class="block font-medium text-slate-700 mb-1">Microchip / Identificador</label>
              <input
                v-model="petForm.microchipNumber"
                type="text"
                placeholder="Código ISO microchip"
                class="w-full border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>

            <div class="sm:col-span-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="petForm.isSterilized" type="checkbox" class="rounded text-teal-600" />
                <span class="text-slate-700 font-medium">Paciente esterilizado / castrado</span>
              </label>
            </div>

            <div class="sm:col-span-2">
              <label class="block font-medium text-slate-700 mb-1">Alergias conocidas</label>
              <input
                v-model="petForm.allergies"
                type="text"
                placeholder="Alergias alimentarias o medicamentosas..."
                class="w-full border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>

            <div class="sm:col-span-2">
              <label class="block font-medium text-slate-700 mb-1">Condiciones Crónicas / Notas</label>
              <textarea
                v-model="petForm.chronicIssues"
                rows="2"
                placeholder="Antecedentes quirúrgicos, displasia, temperamento..."
                class="w-full border border-slate-300 rounded-xl px-3 py-2"
              ></textarea>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4 border-t">
            <button
              @click="showPetModal = false"
              class="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm"
            >
              Cancelar
            </button>
            <button
              @click="savePet"
              class="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700"
            >
              {{ editingPetId ? 'Actualizar Mascota' : 'Guardar Mascota' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Expediente Clínico Completo -->
      <div
        v-if="selectedPetDetail"
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto"
      >
        <div class="bg-white rounded-2xl max-w-4xl w-full p-6 space-y-5 shadow-xl my-8 max-h-[90vh] overflow-y-auto">
          <div class="flex items-start justify-between border-b pb-4">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-xl font-bold text-slate-900">{{ selectedPetDetail.name }}</h3>
                <span class="px-2.5 py-0.5 text-xs font-semibold bg-teal-100 text-teal-800 rounded-full">
                  {{ formatSpecies(selectedPetDetail.species) }}
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-1">
                Raza: {{ selectedPetDetail.breed || 'N/A' }} • Peso: {{ selectedPetDetail.weightKg || '-' }} kg •
                Propietario: <span class="font-semibold">{{ formatCustomerName(selectedPetDetail.customer) }}</span>
              </p>
            </div>
            <button @click="selectedPetDetail = null" class="text-slate-400 hover:text-slate-600 text-lg">✕</button>
          </div>

          <!-- Historial de Consultas -->
          <div class="space-y-3">
            <h4 class="text-sm font-bold uppercase tracking-wider text-slate-500">
              🩺 Historial Clínico ({{ selectedPetDetail.medicalRecords?.length || 0 }})
            </h4>
            <div v-if="!selectedPetDetail.medicalRecords?.length" class="text-xs text-slate-400 italic">
              Sin historias clínicas registradas.
            </div>
            <div
              v-for="rec in selectedPetDetail.medicalRecords"
              :key="rec.id"
              class="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs"
            >
              <div class="flex items-center justify-between">
                <span class="font-bold text-slate-900">
                  {{ new Date(rec.visitDate).toLocaleString('es-CO') }} — {{ rec.visitType }}
                </span>
                <span class="text-slate-500">
                  Vet: {{ formatWorkerName(rec.veterinarian) }}
                </span>
              </div>
              <div class="text-slate-600">
                <span class="font-semibold">Constantes:</span>
                Peso: {{ rec.weightKg || '-' }} kg | Temp: {{ rec.temperatureC || '-' }} °C |
                FC: {{ rec.heartRateBpm || '-' }} lpm | FR: {{ rec.respiratoryRate || '-' }} rpm
              </div>
              <div><span class="font-semibold text-slate-800">Motivo:</span> {{ rec.reason }}</div>
              <div v-if="rec.diagnosis"><span class="font-semibold text-slate-800">Diagnóstico:</span> {{ rec.diagnosis }}</div>
              <div v-if="rec.treatment"><span class="font-semibold text-slate-800">Tratamiento:</span> {{ rec.treatment }}</div>
              <div v-if="rec.prescription" class="p-2 bg-white rounded border border-slate-200">
                <span class="font-semibold text-teal-700">Fórmula / Receta:</span> {{ rec.prescription }}
              </div>
            </div>
          </div>

          <!-- Carnet de Vacunación -->
          <div class="space-y-3 pt-2">
            <h4 class="text-sm font-bold uppercase tracking-wider text-slate-500">
              💉 Carnet de Vacunación y Desparasitación ({{ selectedPetDetail.vaccinations?.length || 0 }})
            </h4>
            <div v-if="!selectedPetDetail.vaccinations?.length" class="text-xs text-slate-400 italic">
              Sin vacunas ni desparasitaciones registradas.
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                v-for="vac in selectedPetDetail.vaccinations"
                :key="vac.id"
                class="p-3 rounded-xl border border-slate-200 text-xs space-y-1"
              >
                <div class="font-bold text-slate-900">{{ vac.vaccineName }} ({{ vac.type }})</div>
                <div class="text-slate-500">
                  Aplicada: {{ new Date(vac.appliedAt).toLocaleDateString('es-CO') }}
                  <span v-if="vac.batchNumber"> • Lote: {{ vac.batchNumber }}</span>
                </div>
                <div v-if="vac.nextDueDate" class="font-semibold text-teal-700">
                  Próximo refuerzo: {{ new Date(vac.nextDueDate).toLocaleDateString('es-CO') }}
                </div>
              </div>
            </div>
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
const pets = ref<any[]>([]);
const customers = ref<any[]>([]);
const searchQuery = ref('');
const selectedSpecies = ref('');

const showPetModal = ref(false);
const editingPetId = ref<string | null>(null);
const selectedPetDetail = ref<any | null>(null);

const petForm = ref({
  customerId: '',
  name: '',
  species: 'CANINE',
  breed: '',
  gender: 'UNKNOWN',
  weightKg: undefined as number | undefined,
  birthDate: '',
  color: '',
  microchipNumber: '',
  isSterilized: false,
  allergies: '',
  chronicIssues: '',
});

const getOrgId = () =>
  authStore.currentOrganization?.id || authStore.user?.organizationId || undefined;

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

const loadPets = async () => {
  loading.value = true;
  try {
    const organizationId = getOrgId();
    const res = await api.get('/veterinary/pets', {
      params: {
        organizationId,
        search: searchQuery.value || undefined,
        species: selectedSpecies.value || undefined,
      },
    });
    pets.value = res.data;
  } catch (error) {
    console.error('Error cargando mascotas:', error);
  } finally {
    loading.value = false;
  }
};

const loadCustomers = async () => {
  try {
    const organizationId = getOrgId();
    const res = await api.get('/customers', { params: { organizationId } });
    customers.value = Array.isArray(res.data) ? res.data : res.data?.data || [];
  } catch (error) {
    console.error('Error cargando clientes:', error);
  }
};

const openCreateModal = () => {
  editingPetId.value = null;
  petForm.value = {
    customerId: customers.value[0]?.id || '',
    name: '',
    species: 'CANINE',
    breed: '',
    gender: 'UNKNOWN',
    weightKg: undefined,
    birthDate: '',
    color: '',
    microchipNumber: '',
    isSterilized: false,
    allergies: '',
    chronicIssues: '',
  };
  showPetModal.value = true;
};

const openEditModal = (pet: any) => {
  editingPetId.value = pet.id;
  petForm.value = {
    customerId: pet.customerId,
    name: pet.name,
    species: pet.species,
    breed: pet.breed || '',
    gender: pet.gender || 'UNKNOWN',
    weightKg: pet.weightKg ? Number(pet.weightKg) : undefined,
    birthDate: pet.birthDate ? pet.birthDate.slice(0, 10) : '',
    color: pet.color || '',
    microchipNumber: pet.microchipNumber || '',
    isSterilized: !!pet.isSterilized,
    allergies: pet.allergies || '',
    chronicIssues: pet.chronicIssues || '',
  };
  showPetModal.value = true;
};

const savePet = async () => {
  if (!petForm.value.customerId || !petForm.value.name.trim()) {
    alert('Selecciona un propietario e ingresa el nombre de la mascota.');
    return;
  }
  try {
    const organizationId = getOrgId();
    const payload = {
      ...petForm.value,
      organizationId,
      birthDate: petForm.value.birthDate || undefined,
    };

    if (editingPetId.value) {
      await api.patch(`/veterinary/pets/${editingPetId.value}`, payload);
    } else {
      await api.post('/veterinary/pets', payload);
    }
    showPetModal.value = false;
    await loadPets();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al guardar la mascota');
  }
};

const openHistoryModal = async (petId: string) => {
  try {
    const organizationId = getOrgId();
    const res = await api.get(`/veterinary/pets/${petId}`, {
      params: { organizationId },
    });
    selectedPetDetail.value = res.data;
  } catch (error) {
    console.error('Error cargando expediente de mascota:', error);
  }
};

const formatSpecies = (species?: string) => {
  const map: Record<string, string> = {
    CANINE: '🐶 Canino',
    FELINE: '🐱 Felino',
    AVIAN: '🦜 Ave',
    RODENT: '🐹 Roedor',
    REPTILE: '🐢 Reptil',
    EQUINE: '🐴 Equino',
    BOVINE: '🐮 Bovino',
    OTHER: '🐾 Otro',
  };
  return species ? map[species] || species : '🐾 Mascota';
};

const formatGender = (gender?: string) => {
  if (gender === 'MALE') return 'Macho';
  if (gender === 'FEMALE') return 'Hembra';
  return 'Sexo N/A';
};

onMounted(() => {
  loadPets();
  loadCustomers();
});
</script>

