<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

interface Supplier {
  id: string
  companyName: string
  contactName?: string | null
  identificationType: string
  identificationNumber: string
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
const suppliers = ref<Supplier[]>([])
const isLoading = ref(true)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const formSupplier = ref({
  companyName: '',
  contactName: '',
  identificationType: 'NIT',
  identificationNumber: '',
  email: '',
  phoneNumber: '',
  address: '',
  city: '',
  state: '',
  country: 'Colombia',
  notes: ''
})

async function fetchSuppliers() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const response = await api.get<Supplier[]>('/suppliers')
    suppliers.value = response.data
  } catch (error: any) {
    console.error(error)
    errorMessage.value = 'No fue posible sincronizar el listado de proveedores.'
  } finally {
    isLoading.value = false
  }
}

async function handleCreateSupplier() {
  if (!formSupplier.value.companyName || !formSupplier.value.identificationType || !formSupplier.value.identificationNumber) {
    errorMessage.value = 'Razón social, tipo e identificación son campos mandatorios.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const payload = {
      organizationId: authStore.user?.organizationId || '',
      companyName: formSupplier.value.companyName,
      contactName: formSupplier.value.contactName || undefined,
      identificationType: formSupplier.value.identificationType,
      identificationNumber: formSupplier.value.identificationNumber,
      email: formSupplier.value.email || undefined,
      phoneNumber: formSupplier.value.phoneNumber || undefined,
      address: formSupplier.value.address || undefined,
      city: formSupplier.value.city || undefined,
      state: formSupplier.value.state || undefined,
      country: formSupplier.value.country || undefined,
      notes: formSupplier.value.notes || undefined
    }

    await api.post('/suppliers', payload)

    successMessage.value = '¡Proveedor registrado de forma exitosa en la organización!'

    formSupplier.value = {
      companyName: '', contactName: '', identificationType: 'NIT', identificationNumber: '',
      email: '', phoneNumber: '', address: '', city: '', state: '', country: 'Colombia', notes: ''
    }

    activeTab.value = 'list'
    await fetchSuppliers()
  } catch (error: any) {
    console.error(error)
    errorMessage.value = error.response?.data?.message || 'Error al guardar el proveedor. Puede que ya exista en el sistema.'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  fetchSuppliers()
})
</script>
<template>
  <AppLayout>
    <header class="mb-6">
      <h1 class="text-3xl font-bold tracking-tight text-slate-900">Catálogo de Proveedores</h1>
      <p class="mt-1 text-sm text-slate-500">Administración de cuentas, identificaciones tributarias y contactos comerciales de aprovisionamiento.</p>
    </header>

    <div class="mb-6 border-b border-slate-200">
      <nav class="-mb-px flex space-x-6">
        <button type="button" @click="activeTab = 'list'" :class="[activeTab === 'list' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300', 'pb-4 text-sm font-medium border-b-2 transition-colors focus:outline-none']">
          🚚 Proveedores Activos ({{ suppliers.length }})
        </button>
        <button type="button" @click="activeTab = 'create'" :class="[activeTab === 'create' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300', 'pb-4 text-sm font-medium border-b-2 transition-colors focus:outline-none']">
          ➕ Registrar Proveedor
        </button>
      </nav>
    </div>

    <div v-if="errorMessage" class="mb-4 bg-red-50 text-red-700 p-4 border border-red-200 rounded-xl text-sm">⚠️ {{ errorMessage }}</div>
    <div v-if="successMessage" class="mb-4 bg-green-50 text-green-700 p-4 border border-green-200 rounded-xl text-sm">🎉 {{ successMessage }}</div>

    <div v-if="isLoading" class="p-8 text-center text-sm font-medium text-slate-500 animate-pulse bg-white border border-slate-200 rounded-xl">
      Sincronizando base de proveedores corporativos...
    </div>

    <div v-else>
      <!-- SUB-VISTA 1: TABLA GENERAL -->
      <div v-if="activeTab === 'list'" class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div v-if="suppliers.length === 0" class="p-8 text-center text-slate-400">No hay proveedores registrados en la organización actual.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th class="px-6 py-3">Razón Social / Contacto</th>
                <th class="px-6 py-3">Identificación Legal</th>
                <th class="px-6 py-3">Ubicación</th>
                <th class="px-6 py-3">Información de Contacto</th>
                <th class="px-6 py-3">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-sans">
              <tr v-for="sup in suppliers" :key="sup.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <div class="font-bold text-slate-900">{{ sup.companyName }}</div>
                  <div v-if="sup.contactName" class="text-xs text-slate-500 mt-0.5">👤 Atn: {{ sup.contactName }}</div>
                </td>
                <td class="px-6 py-4">
                  <div class="font-mono text-xs font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border inline-block">
                    {{ sup.identificationType }}: {{ sup.identificationNumber }}
                  </div>
                </td>
                <td class="px-6 py-4 text-xs text-slate-600">
                  <div>{{ sup.address || '—' }}</div>
                  <div v-if="sup.city" class="text-slate-400 mt-0.5">{{ sup.city }}<span v-if="sup.country">, {{ sup.country }}</span></div>
                </td>
                <td class="px-6 py-4 text-xs text-slate-600">
                  <div v-if="sup.email" class="font-medium text-blue-600">{{ sup.email }}</div>
                  <div v-if="sup.phoneNumber" class="text-slate-500 font-mono mt-0.5">📞 {{ sup.phoneNumber }}</div>
                  <div v-if="!sup.email && !sup.phoneNumber" class="text-slate-400 italic">Sin datos</div>
                </td>
                <td class="px-6 py-4">
                  <span class="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Activo</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- SUB-VISTA 2: FORMULARIO DINÁMICO CORREGIDO -->
      <div v-if="activeTab === 'create'" class="max-w-2xl bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <h3 class="text-lg font-bold text-slate-900 mb-4">Ingresar Nuevo Proveedor</h3>

        <form @submit.prevent="handleCreateSupplier" class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-semibold text-slate-700">Tipo de Documento Legal</label>
              <select v-model="formSupplier.identificationType" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none">
                <option value="NIT">NIT (Colombia)</option>
                <option value="RUT">RUT (Latam)</option>
                <option value="RFC">RFC (México)</option>
                <option value="RUC">RUT/RUC</option>
                <option value="CEDULA">Cédula Jurídica</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700">Número de Identificación</label>
              <input v-model="formSupplier.identificationNumber" type="text" placeholder="Ej: 901234567-8" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700">Razón Social / Nombre Comercial</label>
            <input v-model="formSupplier.companyName" type="text" placeholder="Ej: Distribuidora de Alimentos S.A.S." class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-semibold text-slate-700">Nombre de Contacto (Opcional)</label>
              <input v-model="formSupplier.contactName" type="text" placeholder="Ej: Carlos Mendoza" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700">Teléfono Comercial</label>
              <input v-model="formSupplier.phoneNumber" type="text" placeholder="Ej: +573004445566" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700">Correo Electrónico Notificaciones</label>
            <input v-model="formSupplier.email" type="email" placeholder="Ej: facturacion@proveedor.com" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <div class="sm:col-span-2">
              <label class="block text-sm font-semibold text-slate-700">Dirección Física</label>
              <input v-model="formSupplier.address" type="text" placeholder="Ej: Avenida Industrial #45-12" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700">Ciudad</label>
              <input v-model="formSupplier.city" type="text" placeholder="Ej: Medellín" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700">Notas / Términos comerciales (Opcional)</label>
            <textarea v-model="formSupplier.notes" rows="2" placeholder="Ej: Descuento del 5% por pronto pago..." class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none"></textarea>
          </div>

          <div class="pt-2">
            <button type="submit" :disabled="isSubmitting" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {{ isSubmitting ? 'Registrando...' : 'Dar de alta Proveedor' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>
