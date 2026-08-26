<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

// Interfaz adaptada a tu esquema laxo de Prisma
interface Customer {
  id: string
  firstName: string
  lastName?: string | null
  companyName?: string | null
  identificationType?: string | null
  identificationNumber?: string | null
  email?: string | null
  phoneNumber?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  notes?: string | null
  isActive: boolean
}

const activeTab = ref<'list' | 'create'>('list')
const customers = ref<Customer[]>([])
const isLoading = ref(true)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Formulario reactivo acoplado 1:1 a tu CreateCustomerDto
const formCustomer = ref({
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
})

async function fetchCustomers() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const response = await api.get<Customer[]>('/customers')
    customers.value = response.data
  } catch (error: any) {
    console.error(error)
    errorMessage.value = 'No fue posible conectar con el catálogo de clientes (CRM).'
  } finally {
    isLoading.value = false
  }
}

async function handleCreateCustomer() {
  if (!formCustomer.value.firstName) {
    errorMessage.value = 'El nombre de pila es un campo mandatorio en la plataforma.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    // Estructura limpia que limpia vacíos y los manda como undefined para tu DTO
    const payload = {
      organizationId: authStore.user?.organizationId || '',
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

    await api.post('/customers', payload)
    successMessage.value = `¡Cliente ${formCustomer.value.firstName} dado de alta de forma exitosa!`

    // Limpieza de formulario
    formCustomer.value = {
      firstName: '', lastName: '', companyName: '', identificationType: 'CEDULA',
      identificationNumber: '', email: '', phoneNumber: '', address: '', city: '',
      state: '', country: 'Colombia', notes: ''
    }

    activeTab.value = 'list'
    await fetchCustomers()
  } catch (error: any) {
    console.error(error)
    errorMessage.value = error.response?.data?.message || 'Error de validación al guardar el registro comercial.'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => { fetchCustomers() })
</script>
<template>
  <AppLayout>
    <header class="mb-6">
      <h1 class="text-3xl font-bold tracking-tight text-slate-900">Directorio de Clientes (CRM)</h1>
      <p class="mt-1 text-sm text-slate-500">Módulo core para la administración de cuentas comerciales, datos de contacto de consumidores y fidelización.</p>
    </header>

    <!-- Selector de Pestañas -->
    <div class="mb-6 border-b border-slate-200">
      <nav class="-mb-px flex space-x-6">
        <button type="button" @click="activeTab = 'list'" :class="[activeTab === 'list' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300', 'pb-4 text-sm font-medium border-b-2 transition-colors focus:outline-none']">
          👥 Clientes Registrados ({{ customers.length }})
        </button>
        <button type="button" @click="activeTab = 'create'" :class="[activeTab === 'create' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300', 'pb-4 text-sm font-medium border-b-2 transition-colors focus:outline-none']">
          ➕ Registrar Nuevo Cliente
        </button>
      </nav>
    </div>

    <!-- Alertas -->
    <div v-if="errorMessage" class="mb-4 bg-red-50 text-red-700 p-4 border border-red-200 rounded-xl text-sm">⚠️ {{ errorMessage }}</div>
    <div v-if="successMessage" class="mb-4 bg-green-50 text-green-700 p-4 border border-green-200 rounded-xl text-sm">🎉 {{ successMessage }}</div>

    <!-- Spinner -->
    <div v-if="isLoading" class="p-8 text-center text-sm font-medium text-slate-500 animate-pulse bg-white border border-slate-200 rounded-xl">
      Consultando directorio de base de datos...
    </div>

    <div v-else>
      <!-- VISTA 1: TABLA MAESTRA -->
      <div v-if="activeTab === 'list'" class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div v-if="customers.length === 0" class="p-8 text-center text-slate-400">No hay clientes dados de alta en esta organización.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th class="px-6 py-3">Nombre Completo / Empresa</th>
                <th class="px-6 py-3">Identificación Legal</th>
                <th class="px-6 py-3">Medios de Contacto</th>
                <th class="px-6 py-3">Ubicación</th>
                <th class="px-6 py-3">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-sans">
              <tr v-for="c in customers" :key="c.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <div class="font-bold text-slate-900">
                    {{ c.firstName }} {{ c.lastName || '' }}
                  </div>
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
                <td class="px-6 py-4">
                  <span class="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Fiel</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- VISTA 2: FORMULARIO FLEXIBLE -->
      <div v-if="activeTab === 'create'" class="max-w-2xl bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <h3 class="text-lg font-bold text-slate-900 mb-4">Ingresar Ficha de Cliente</h3>

        <form @submit.prevent="handleCreateCustomer" class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-semibold text-slate-700">Primer Nombre / Pila <span class="text-red-500">*</span></label>
              <input v-model="formCustomer.firstName" type="text" placeholder="Ej: Juan" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" required />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700">Apellidos (Opcional)</label>
              <input v-model="formCustomer.lastName" type="text" placeholder="Ej: Pérez Rodríguez" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700">Razón Social / Razón Comercial Jurídica (Opcional)</label>
            <input v-model="formCustomer.companyName" type="text" placeholder="Ej: Inversiones y Servicios Latam S.A." class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-semibold text-slate-700">Tipo Documento Identidad</label>
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
              <label class="block text-sm font-semibold text-slate-700">Correo Electrónico (Opcional)</label>
              <input v-model="formCustomer.email" type="email" placeholder="Ej: juan.perez@correo.com" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700">Celular / Teléfono</label>
              <input v-model="formCustomer.phoneNumber" type="text" placeholder="Ej: +573159998877" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <div class="sm:col-span-2">
              <label class="block text-sm font-semibold text-slate-700">Dirección Domicilio / Envío</label>
              <input v-model="formCustomer.address" type="text" placeholder="Ej: Calle 50 #12-45 Apt 302" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700">Ciudad</label>
              <input v-model="formCustomer.city" type="text" placeholder="Ej: Bogotá" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700">Preferencias, Cumpleaños o Perfilamiento (Opcional)</label>
            <textarea v-model="formCustomer.notes" rows="2" placeholder="Ej: Prefiere facturación electrónica inmediata. Descuento pactado del 5%..." class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none"></textarea>
          </div>

          <div class="pt-2">
            <button type="submit" :disabled="isSubmitting" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition-all shadow-sm disabled:opacity-50">
              {{ isSubmitting ? 'Guardando Cliente...' : 'Crear Ficha de Cliente' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>
