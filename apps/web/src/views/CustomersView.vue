<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

interface Customer {
  id: string;
  firstName: string;
  lastName?: string | null;
  companyName?: string | null;
  identificationType?: string | null;
  identificationNumber?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  notes?: string | null;
  isActive: boolean;
}

const activeTab = ref<'list' | 'form'>('list')
const customers = ref<Customer[]>([])
const isLoading = ref(true)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Estado de Edición (null = Creación, string = Edición)
const editingCustomerId = ref<string | null>(null)
const isEditing = computed(() => !!editingCustomerId.value)

const initialFormState = {
  firstName: '',
  lastName: '',
  companyName: '',
  identificationType: 'CEDULA',
  identificationNumber: '',
  email: '',
  phoneNumber: '',
  address: '',
  city: '',
  state: '',
  country: 'Colombia',
  notes: ''
}

const formCustomer = ref({ ...initialFormState })

function resetForm() {
  editingCustomerId.value = null
  formCustomer.value = { ...initialFormState }
}

function openCreateForm() {
  resetForm()
  activeTab.value = 'form'
}

function openEditForm(customer: Customer) {
  editingCustomerId.value = customer.id
  formCustomer.value = {
    firstName: customer.firstName || '',
    lastName: customer.lastName || '',
    companyName: customer.companyName || '',
    identificationType: customer.identificationType || 'CEDULA',
    identificationNumber: customer.identificationNumber || '',
    email: customer.email || '',
    phoneNumber: customer.phoneNumber || '',
    address: customer.address || '',
    city: customer.city || '',
    state: customer.state || '',
    country: customer.country || 'Colombia',
    notes: customer.notes || ''
  }
  activeTab.value = 'form'
}

async function fetchCustomers() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const response = await api.get<Customer[]>('/customers')
    customers.value = response.data
  } catch (error: any) {
    console.error(error)
    errorMessage.value = 'No fue posible conectar con el catálogo de clientes.'
  } finally {
    isLoading.value = false
  }
}

async function handleSaveCustomer() {
  if (!formCustomer.value.firstName.trim()) {
    errorMessage.value = 'El nombre de pila es obligatorio.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const payload = {
      ...(isEditing.value ? {} : { organizationId: authStore.user?.organizationId || '' }),
      firstName: formCustomer.value.firstName,
      lastName: formCustomer.value.lastName || undefined,
      companyName: formCustomer.value.companyName || undefined,
      identificationType: formCustomer.value.identificationNumber ? formCustomer.value.identificationType : undefined,
      identificationNumber: formCustomer.value.identificationNumber || undefined,
      email: formCustomer.value.email || undefined,
      phoneNumber: formCustomer.value.phoneNumber || undefined,
      address: formCustomer.value.address || undefined,
      city: formCustomer.value.city || undefined,
      state: formCustomer.value.state || undefined,
      country: formCustomer.value.country || undefined,
      notes: formCustomer.value.notes || undefined
    }

    if (isEditing.value && editingCustomerId.value) {
      await api.patch(`/customers/${editingCustomerId.value}`, payload)
      successMessage.value = `Cliente ${formCustomer.value.firstName} actualizado exitosamente.`
    } else {
      await api.post('/customers', payload)
      successMessage.value = `Cliente ${formCustomer.value.firstName} registrado exitosamente.`
    }

    resetForm()
    activeTab.value = 'list'
    await fetchCustomers()
  } catch (error: any) {
    console.error(error)
    errorMessage.value = error.response?.data?.message || 'Error al procesar la solicitud del cliente.'
  } finally {
    isSubmitting.value = false
  }
}

async function handleDeleteCustomer(customer: Customer) {
  const confirmed = window.confirm(`¿Confirma desactivar la ficha de ${customer.firstName}?`)
  if (!confirmed) return

  try {
    await api.delete(`/customers/${customer.id}`)
    successMessage.value = 'Cliente desactivado de la base operativa.'
    await fetchCustomers()
  } catch (error: any) {
    console.error(error)
    errorMessage.value = error.response?.data?.message || 'No fue posible eliminar el registro.'
  }
}

onMounted(() => { fetchCustomers() })
</script>

<template>
  <AppLayout>
    <header class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-900">Directorio de Clientes (CRM)</h1>
        <p class="mt-1 text-sm text-slate-500">Módulo core para administración de cuentas comerciales y fidelización.</p>
      </div>
    </header>

    <!-- NAVEGACIÓN TABS -->
    <div class="mb-6 border-b border-slate-200">
      <nav class="-mb-px flex space-x-6">
        <button
          type="button"
          @click="activeTab = 'list'"
          :class="[activeTab === 'list' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700', 'pb-4 text-sm font-medium border-b-2 transition-colors']"
        >
          👥 Clientes Registrados ({{ customers.length }})
        </button>
        <button
          type="button"
          @click="openCreateForm"
          :class="[activeTab === 'form' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700', 'pb-4 text-sm font-medium border-b-2 transition-colors']"
        >
          {{ isEditing ? '✏️ Modificar Ficha de Cliente' : '➕ Registrar Nuevo Cliente' }}
        </button>
      </nav>
    </div>

    <!-- FEEDBACK -->
    <div v-if="errorMessage" class="mb-4 bg-red-50 text-red-700 p-4 border border-red-200 rounded-xl text-sm flex items-center justify-between">
      <span>⚠️ {{ errorMessage }}</span>
      <button @click="errorMessage = ''" class="text-red-500 hover:text-red-700 font-bold">✕</button>
    </div>
    <div v-if="successMessage" class="mb-4 bg-green-50 text-green-700 p-4 border border-green-200 rounded-xl text-sm flex items-center justify-between">
      <span>🎉 {{ successMessage }}</span>
      <button @click="successMessage = ''" class="text-green-500 hover:text-green-700 font-bold">✕</button>
    </div>

    <!-- CARGANDO -->
    <div v-if="isLoading" class="p-8 text-center text-sm font-medium text-slate-500 animate-pulse bg-white border border-slate-200 rounded-xl">
      Consultando catálogo de datos CRM...
    </div>

    <div v-else>
      <!-- TABLA (KNA-079) -->
      <div v-if="activeTab === 'list'" class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div v-if="customers.length === 0" class="p-8 text-center text-slate-400">No hay clientes activos en la organización.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th class="px-6 py-3">Nombre Completo / Empresa</th>
                <th class="px-6 py-3">Identificación Legal</th>
                <th class="px-6 py-3">Contacto</th>
                <th class="px-6 py-3">Ubicación</th>
                <th class="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-sans">
              <tr v-for="c in customers" :key="c.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <div class="font-bold text-slate-900">{{ c.firstName }} {{ c.lastName || '' }}</div>
                  <div v-if="c.companyName" class="text-xs text-slate-500 font-medium mt-0.5">🏢 {{ c.companyName }}</div>
                </td>
                <td class="px-6 py-4">
                  <span v-if="c.identificationNumber" class="font-mono text-xs bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-bold">
                    {{ c.identificationType }}: {{ c.identificationNumber }}
                  </span>
                  <span v-else class="text-xs text-slate-400 italic">No Suministrada</span>
                </td>
                <td class="px-6 py-4 text-xs text-slate-600">
                  <div v-if="c.email" class="font-medium text-blue-600">{{ c.email }}</div>
                  <div v-if="c.phoneNumber" class="text-slate-500 font-mono mt-0.5">📞 {{ c.phoneNumber }}</div>
                  <div v-if="!c.email && !c.phoneNumber" class="text-slate-400 italic">Sin canales</div>
                </td>
                <td class="px-6 py-4 text-xs text-slate-500">
                  <div v-if="c.address" class="text-slate-700">{{ c.address }}</div>
                  <div class="mt-0.5 text-slate-400">{{ c.city || 'Ciudad' }}<span v-if="c.country">, {{ c.country }}</span></div>
                </td>
                <td class="px-6 py-4 text-right space-x-2">
                  <button @click="openEditForm(c)" class="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                    Editar
                  </button>
                  <button @click="handleDeleteCustomer(c)" class="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                    Desactivar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- FORMULARIO UPSERT (KNA-080) -->
      <div v-if="activeTab === 'form'" class="max-w-2xl bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-slate-900">
            {{ isEditing ? 'Actualizar Ficha de Cliente' : 'Ingresar Ficha de Cliente' }}
          </h3>
          <button v-if="isEditing" @click="resetForm(); activeTab = 'list'" class="text-xs text-slate-500 hover:text-slate-700 underline">
            Cancelar edición
          </button>
        </div>

        <form @submit.prevent="handleSaveCustomer" class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-semibold text-slate-700">Primer Nombre / Pila <span class="text-red-500">*</span></label>
              <input v-model="formCustomer.firstName" type="text" placeholder="Ej: Juan" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" required />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700">Apellidos</label>
              <input v-model="formCustomer.lastName" type="text" placeholder="Ej: Pérez Rodríguez" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700">Razón Social / Razón Comercial</label>
            <input v-model="formCustomer.companyName" type="text" placeholder="Ej: Inversiones Latam S.A." class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-semibold text-slate-700">Tipo Documento</label>
              <select v-model="formCustomer.identificationType" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none">
                <option value="CEDULA">Cédula de Ciudadanía</option>
                <option value="NIT">NIT (Empresas)</option>
                <option value="PASAPORTE">Pasaporte</option>
                <option value="RUT">RUT / RFC / RUC</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700">Número de Documento</label>
              <input v-model="formCustomer.identificationNumber" type="text" placeholder="Ej: 1020340560" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-semibold text-slate-700">Correo Electrónico</label>
              <input v-model="formCustomer.email" type="email" placeholder="Ej: juan.perez@correo.com" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700">Celular / Teléfono</label>
              <input v-model="formCustomer.phoneNumber" type="text" placeholder="Ej: +573159998877" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <div class="sm:col-span-2">
              <label class="block text-sm font-semibold text-slate-700">Dirección</label>
              <input v-model="formCustomer.address" type="text" placeholder="Ej: Calle 50 #12-45" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700">Ciudad</label>
              <input v-model="formCustomer.city" type="text" placeholder="Ej: Bogotá" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700">Notas / Perfilamiento</label>
            <textarea v-model="formCustomer.notes" rows="2" placeholder="Observaciones comerciales..." class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none"></textarea>
          </div>

          <div class="pt-2 flex items-center space-x-3">
            <button type="submit" :disabled="isSubmitting" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition-all shadow-sm disabled:opacity-50">
              {{ isSubmitting ? 'Procesando...' : (isEditing ? 'Guardar Cambios' : 'Crear Ficha de Cliente') }}
            </button>
            <button v-if="isEditing" type="button" @click="resetForm(); activeTab = 'list'" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-lg text-sm transition-all">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>
