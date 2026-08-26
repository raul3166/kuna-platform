<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

interface Role {
  id: string
  name: string
  code: string
  description?: string | null
  isActive: boolean
}

interface Permission {
  id: string
  name: string
  code: string
  module: string
}

const activeTab = ref<'roles' | 'matrix'>('roles')
const roles = ref<Role[]>([])
const allPermissions = ref<Permission[]>([])
const selectedRoleId = ref('')
const assignedPermissionIds = ref<string[]>([])

const isLoading = ref(true)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const formRole = ref({
  name: '',
  code: '',
  description: ''
})

async function loadSecurityData() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const [rolesRes, permRes] = await Promise.all([
      api.get<Role[]>('/roles'),
      api.get<Permission[]>('/permissions') // Conectado a tu nuevo PermissionsController
    ])
    roles.value = rolesRes.data
    allPermissions.value = permRes.data || []

    // Si hay roles y no se ha seleccionado ninguno, preselecciona el primero
    if (roles.value.length > 0 && !selectedRoleId.value) {
      selectedRoleId.value = roles.value[0].id
    }
  } catch (error: any) {
    console.error(error)
    errorMessage.value = 'No se pudo sincronizar la matriz de seguridad con NestJS.'
  } finally {
    isLoading.value = false
  }
}

// Reemplaza esta función exacta en la sección <script> de SecuritySettingsView.vue
async function fetchRolePermissions() {
  if (!selectedRoleId.value) return
  try {
    const response = await api.get<any>(`/roles/${selectedRoleId.value}/permissions`)

    // Validamos la estructura relacional anidada que devuelve tu backend (rolePermissions)
    if (response.data && response.data.rolePermissions && Array.isArray(response.data.rolePermissions)) {
      assignedPermissionIds.value = response.data.rolePermissions.map((item: any) => item.permissionId)
    } else if (response.data && Array.isArray(response.data)) {
      assignedPermissionIds.value = response.data.map((rp: any) => rp.permissionId || rp.id)
    } else {
      assignedPermissionIds.value = []
    }

    console.log('Permisos asignados al rol cargados con éxito:', assignedPermissionIds.value)
  } catch (error) {
    console.error('Error al cargar permisos del rol:', error)
    assignedPermissionIds.value = []
  }
}


async function handleCreateRole() {
  if (!formRole.value.name || !formRole.value.code) {
    errorMessage.value = 'El nombre y código del rol son obligatorios.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const payload = {
      organizationId: authStore.user?.organizationId || '',
      name: formRole.value.name,
      code: formRole.value.code.toUpperCase(),
      description: formRole.value.description || undefined
    }

    await api.post('/roles', payload)
    successMessage.value = `¡Rol ${formRole.value.name} dado de alta de forma exitosa!`
    formRole.value = { name: '', code: '', description: '' }
    activeTab.value = 'roles'
    await loadSecurityData()
  } catch (error: any) {
    console.error(error)
    errorMessage.value = error.response?.data?.message || 'Error al guardar el rol. El código ya existe.'
  } finally {
    isSubmitting.value = false
  }
}

async function togglePermission(permissionId: string) {
  if (!selectedRoleId.value) return
  const isAssigned = assignedPermissionIds.value.includes(permissionId)

  try {
    if (isAssigned) {
      // DELETE /roles/:roleId/permissions/:permissionId
      await api.delete(`/roles/${selectedRoleId.value}/permissions/${permissionId}`)
      assignedPermissionIds.value = assignedPermissionIds.value.filter(id => id !== permissionId)
    } else {
      // POST /roles/:id/permissions (AssignPermissionsDto)
      await api.post(`/roles/${selectedRoleId.value}/permissions`, {
        permissionIds: [permissionId]
      })
      assignedPermissionIds.value.push(permissionId)
    }
  } catch (error) {
    console.error('Error al actualizar permiso:', error)
    alert('No se pudo modificar el permiso. Verifica la conexión.')
  }
}

watch(selectedRoleId, () => { fetchRolePermissions() })

onMounted(() => {
  loadSecurityData().then(() => fetchRolePermissions())
})
</script>
<template>
  <AppLayout>
    <header class="mb-6">
      <h1 class="text-3xl font-bold tracking-tight text-slate-900">Configuración de Seguridad (RBAC)</h1>
      <p class="mt-1 text-sm text-slate-500">Administra los perfiles de acceso globales y gobierna la asignación de permisos de NestJS en caliente.</p>
    </header>

    <div class="mb-6 border-b border-slate-200">
      <nav class="-mb-px flex space-x-6">
        <button type="button" @click="activeTab = 'roles'" :class="[activeTab === 'roles' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300', 'pb-4 text-sm font-medium border-b-2 transition-colors focus:outline-none']">
          🛡️ Roles del Sistema ({{ roles.length }})
        </button>
        <button type="button" @click="activeTab = 'matrix'" :class="[activeTab === 'matrix' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300', 'pb-4 text-sm font-medium border-b-2 transition-colors focus:outline-none']">
          🎛️ Matriz de Permisos
        </button>
      </nav>
    </div>

    <div v-if="errorMessage" class="mb-4 bg-red-50 text-red-700 p-4 border border-red-200 rounded-xl text-sm">⚠️ {{ errorMessage }}</div>
    <div v-if="successMessage" class="mb-4 bg-green-50 text-green-700 p-4 border border-green-200 rounded-xl text-sm">🎉 {{ successMessage }}</div>

    <div v-if="isLoading" class="p-8 text-center text-sm font-medium text-slate-500 animate-pulse bg-white border border-slate-200 rounded-xl">
      Sincronizando directivas de seguridad corporativa...
    </div>

    <div v-else>
      <!-- SUB-VISTA 1: ROLES Y CREACIÓN -->
      <div v-if="activeTab === 'roles'" class="grid gap-6 md:grid-cols-3">
        <!-- Listado Izquierda -->
        <div class="md:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th class="px-6 py-3">Nombre del Cargo</th>
                <th class="px-6 py-3">Código Interno</th>
                <th class="px-6 py-3">Descripción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-sans">
              <tr v-for="role in roles" :key="role.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4 font-bold text-slate-900">{{ role.name }}</td>
                <td class="px-6 py-4">
                  <span class="font-mono text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                    {{ role.code }}
                  </span>
                </td>
                <td class="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">{{ role.description || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Formulario Derecha -->
        <div class="bg-white border border-slate-200 p-6 rounded-xl shadow-sm h-fit">
          <h3 class="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Nuevo Cargo</h3>
          <form @submit.prevent="handleCreateRole" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700">Nombre Comercial</label>
              <input v-model="formRole.name" type="text" placeholder="Ej: Cajero Principal" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" required />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700">Código del Rol (Code)</label>
              <input v-model="formRole.code" type="text" placeholder="Ej: CASHIER" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" required />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700">Descripción Alcance</label>
              <textarea v-model="formRole.description" rows="2" placeholder="Ej: Operador de punto de venta..." class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none"></textarea>
            </div>
            <button type="submit" :disabled="isSubmitting" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-xs shadow-sm transition-colors">
              {{ isSubmitting ? 'Guardando...' : 'Crear Perfil' }}
            </button>
          </form>
        </div>
      </div>

      <!-- SUB-VISTA 2: MATRIZ DINÁMICA CON SWITCHES -->
      <div v-if="activeTab === 'matrix'" class="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6">
        <div class="max-w-md">
          <label class="block text-sm font-semibold text-slate-700 mb-1">Seleccionar Cargo a Configurar</label>
          <select v-model="selectedRoleId" class="w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none">
            <option v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }} ({{ role.code }})</option>
          </select>
        </div>

        <!-- Grilla de Permisos -->
        <div class="border border-slate-200 rounded-xl overflow-hidden mt-4">
          <div class="bg-slate-50 border-b p-4 text-xs font-bold uppercase tracking-wider text-slate-500">Matriz de Acceso del Rol</div>

          <div v-if="allPermissions.length === 0" class="p-6 text-center text-xs text-slate-400 italic">No se encontraron códigos de permisos registrados en el sistema.</div>

          <div v-else class="divide-y divide-slate-100 max-h-[450px] overflow-y-auto">
            <div v-for="perm in allPermissions" :key="perm.id" class="p-4 flex items-center justify-between hover:bg-slate-50/40 transition-colors">
              <div>
                <div class="text-sm font-bold text-slate-800">{{ perm.name || 'Permiso Operativo' }}</div>
                <div class="text-xs font-mono text-slate-400 mt-0.5">
                  <span class="bg-slate-100 text-slate-600 border border-slate-200 px-1 rounded text-[11px] font-semibold mr-2">{{ perm.module.toUpperCase() }}</span>
                  {{ perm.code }}
                </div>
              </div>

              <!-- Interruptor / Toggle Button -->
              <button
                type="button"
                @click="togglePermission(perm.id)"
                :class="[assignedPermissionIds.includes(perm.id) ? 'bg-blue-600' : 'bg-slate-200', 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none']"
              >
                <span :class="[assignedPermissionIds.includes(perm.id) ? 'translate-x-5' : 'translate-x-0', 'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out']"></span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
