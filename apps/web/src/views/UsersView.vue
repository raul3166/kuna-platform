<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

interface Branch { id: string; name: string }
interface SystemRole { id: string; name: string; code: string }

interface UserStaff {
  id: string
  firstName: string
  lastName: string
  email: string
  phoneNumber?: string | null
  isActive: boolean
  organizationId: string
  branchId: string
  branch?: { name: string } | null
}

const activeTab = ref<'list' | 'create'>('list')
const users = ref<UserStaff[]>([])
const branches = ref<Branch[]>([])
const allRoles = ref<SystemRole[]>([])

// Control del panel lateral para la asignación de Roles en caliente (KNA-052)
const selectedUserForRoles = ref<UserStaff | null>(null)
const userAssignedRoleIds = ref<string[]>([])

const isLoading = ref(true)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const formUser = ref({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phoneNumber: '',
  branchId: authStore.user?.branchId || ''
})

async function loadStaffModuleData() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const [usersRes, branchesRes, rolesRes] = await Promise.all([
      api.get<UserStaff[]>('/users'),
      api.get<Branch[]>('/branches'),
      api.get<SystemRole[]>('/roles') // Cargamos el catálogo del RolesController
    ])
    users.value = usersRes.data
    branches.value = branchesRes.data
    allRoles.value = rolesRes.data
  } catch (error: any) {
    console.error(error)
    errorMessage.value = 'No fue posible sincronizar el directorio de personal operativo.'
  } finally {
    isLoading.value = false
  }
}

// Cargar roles asignados al usuario (GET /user-roles/:userId/roles)
// Reemplaza esta función exacta en src/views/UsersView.vue
async function openRolesManagement(user: UserStaff) {
  selectedUserForRoles.value = user
  userAssignedRoleIds.value = []
  try {
    const response = await api.get<any>(`/user-roles/${user.id}/roles`)

    // Validamos que exista el objeto y la propiedad userRoles anidada que devuelve tu API
    if (response.data && response.data.userRoles && Array.isArray(response.data.userRoles)) {
      userAssignedRoleIds.value = response.data.userRoles.map((item: any) => item.roleId)
    } else {
      userAssignedRoleIds.value = []
    }

    console.log('Roles asignados mapeados con éxito:', userAssignedRoleIds.value)
  } catch (error) {
    console.error('Error al consultar roles del usuario:', error)
    userAssignedRoleIds.value = []
  }
}


// Modificar rol de forma inmediata (POST / DELETE /user-roles)
async function toggleUserRole(roleId: string) {
  if (!selectedUserForRoles.value) return
  const userId = selectedUserForRoles.value.id
  const isAssigned = userAssignedRoleIds.value.includes(roleId)

  try {
    if (isAssigned) {
      // DELETE /user-roles/:userId/roles/:roleId
      await api.delete(`/user-roles/${userId}/roles/${roleId}`)
      userAssignedRoleIds.value = userAssignedRoleIds.value.filter(id => id !== roleId)
    } else {
      // POST /user-roles/:userId/roles (AssignUserRolesDto)
      await api.post(`/user-roles/${userId}/roles`, {
        roleIds: [roleId]
      })
      userAssignedRoleIds.value.push(roleId)
    }
  } catch (error) {
    console.error('Error al mutar el rol del usuario:', error)
    alert('No fue posible modificar el cargo. Verifica las dependencias.')
  }
}

async function handleCreateUser() {
  if (!formUser.value.firstName || !formUser.value.lastName || !formUser.value.email || !formUser.value.password || !formUser.value.branchId) {
    errorMessage.value = 'Todos los campos marcados con asterisco (*) son mandatorios.'
    return
  }

  if (formUser.value.password.length < 8) {
    errorMessage.value = 'La contraseña debe contener un mínimo de 8 caracteres.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const payload = {
      organizationId: authStore.user?.organizationId || '',
      branchId: formUser.value.branchId,
      firstName: formUser.value.firstName,
      lastName: formUser.value.lastName,
      email: formUser.value.email,
      password: formUser.value.password,
      phoneNumber: formUser.value.phoneNumber || undefined
    }

    await api.post('/users', payload)
    successMessage.value = `¡Usuario operativo dado de alta para ${formUser.value.firstName} con éxito!`

    formUser.value = {
      firstName: '', lastName: '', email: '', password: '', phoneNumber: '',
      branchId: authStore.user?.branchId || ''
    }

    activeTab.value = 'list'
    await loadStaffModuleData()
  } catch (error: any) {
    console.error(error)
    errorMessage.value = error.response?.data?.message || 'Error al guardar el usuario.'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => { loadStaffModuleData() })
</script>
<template>
  <AppLayout>
    <header class="mb-6">
      <h1 class="text-3xl font-bold tracking-tight text-slate-900">Personal y Colaboradores</h1>
      <p class="mt-1 text-sm text-slate-500">Directorio maestro para la supervisión de usuarios, asignación de sucursales físicas y gobierno de cargos.</p>
    </header>

    <!-- Pestañas Modulares -->
    <div class="mb-6 border-b border-slate-200">
      <nav class="-mb-px flex space-x-6">
        <button type="button" @click="activeTab = 'list'" :class="[activeTab === 'list' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300', 'pb-4 text-sm font-medium border-b-2 transition-colors focus:outline-none']">
          👥 Usuarios Activos ({{ users.length }})
        </button>
        <button type="button" @click="activeTab = 'create'" :class="[activeTab === 'create' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300', 'pb-4 text-sm font-medium border-b-2 transition-colors focus:outline-none']">
          ➕ Dar de alta Colaborador
        </button>
      </nav>
    </div>

    <!-- Alertas -->
    <div v-if="errorMessage" class="mb-4 bg-red-50 text-red-700 p-4 border border-red-200 rounded-xl text-sm">⚠️ {{ errorMessage }}</div>
    <div v-if="successMessage" class="mb-4 bg-green-50 text-green-700 p-4 border border-green-200 rounded-xl text-sm">🎉 {{ successMessage }}</div>

    <!-- Estado de Carga -->
    <div v-if="isLoading" class="p-8 text-center text-sm font-medium text-slate-500 animate-pulse bg-white border border-slate-200 rounded-xl">
      Sincronizando directorio del personal con NestJS...
    </div>

    <div v-else>
      <!-- SUB-VISTA 1: LISTADO DE USUARIOS CON ACCIÓN DE ROLES -->
      <div v-if="activeTab === 'list'" class="grid gap-6 lg:grid-cols-3 items-start">

        <!-- Tabla Maestro (Izquierda) -->
        <div :class="[selectedUserForRoles ? 'lg:col-span-2' : 'lg:col-span-3', 'bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all']">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th class="px-6 py-3">Nombre Funcionario</th>
                <th class="px-6 py-3">Correo Institucional</th>
                <th class="px-6 py-3">Sede Asignada</th>
                <th class="px-6 py-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-sans">
              <tr v-for="u in users" :key="u.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <div class="font-bold text-slate-900">{{ u.firstName }} {{ u.lastName }}</div>
                  <div class="text-[9px] text-slate-400 font-mono mt-0.5">ID: {{ u.id.substring(0,10) }}</div>
                </td>
                <td class="px-6 py-4 font-medium text-slate-600 text-xs">{{ u.email }}</td>
                <td class="px-6 py-4 text-xs font-semibold text-slate-700">📍 {{ u.branch?.name || u.branchId }}</td>
                <td class="px-6 py-4 text-center whitespace-nowrap">
                  <button @click="openRolesManagement(u)" type="button" class="bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-200 transition-colors shadow-sm">
                    🛡️ Cargos / Roles
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Panel Lateral de Asignación en Caliente (Derecha) -->
        <div v-if="selectedUserForRoles" class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 transition-all">
          <div class="flex justify-between items-center border-b pb-2">
            <div>
              <h3 class="text-sm font-black text-slate-900">Asignar Cargos</h3>
              <p class="text-[11px] text-blue-600 font-semibold mt-0.5">{{ selectedUserForRoles.firstName }} {{ selectedUserForRoles.lastName }}</p>
            </div>
            <button @click="selectedUserForRoles = null" type="button" class="text-xs font-bold text-slate-400 hover:text-slate-600">✕ Cerrar</button>
          </div>

          <p class="text-[11px] text-slate-400">Prende o apaga los perfiles de acceso. Los cambios afectarán de inmediato los permisos de navegación del empleado.</p>

          <div class="space-y-2 max-h-[300px] overflow-y-auto pt-2">
            <div v-for="role in allRoles" :key="role.id" class="flex items-center justify-between p-3 bg-slate-50 border rounded-lg hover:bg-slate-100/50 transition-colors">
              <div>
                <div class="text-xs font-bold text-slate-800">{{ role.name }}</div>
                <div class="text-[10px] font-mono text-slate-400 mt-0.5">{{ role.code }}</div>
              </div>

              <!-- Toggle Button -->
              <button
                type="button"
                @click="toggleUserRole(role.id)"
                :class="[userAssignedRoleIds.includes(role.id) ? 'bg-blue-600' : 'bg-slate-200', 'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none']"
              >
                <span :class="[userAssignedRoleIds.includes(role.id) ? 'translate-x-4' : 'translate-x-0', 'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out']"></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- SUB-VISTA 2: FORMULARIO DE ALTA -->
      <div v-if="activeTab === 'create'" class="max-w-2xl bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <h3 class="text-lg font-bold text-slate-900 mb-4">Ingresar Credenciales de Funcionario</h3>

        <form @submit.prevent="handleCreateUser" class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-semibold text-slate-700">Nombres <span class="text-red-500">*</span></label>
              <input v-model="formUser.firstName" type="text" placeholder="Ej: Raúl" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" required />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700">Apellidos <span class="text-red-500">*</span></label>
              <input v-model="formUser.lastName" type="text" placeholder="Ej: Ramírez" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" required />
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-semibold text-slate-700">Correo Electrónico Notificaciones <span class="text-red-500">*</span></label>
              <input v-model="formUser.email" type="email" placeholder="Ej: colaborador@kuna.com" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" required />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700">Teléfono Móvil (Opcional)</label>
              <input v-model="formUser.phoneNumber" type="text" placeholder="Ej: +573001112233" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-semibold text-slate-700">Contraseña del Sistema <span class="text-red-500">*</span></label>
              <input v-model="formUser.password" type="password" placeholder="Mínimo 8 caracteres..." class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" required />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700">Sucursal de Operación Primaria <span class="text-red-500">*</span></label>
              <select v-model="formUser.branchId" class="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none" required>
                <option value="" disabled>Selecciona la sucursal de trabajo...</option>
                <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
            </div>
          </div>

          <div class="pt-2">
            <button type="submit" :disabled="isSubmitting" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition-all shadow-sm disabled:opacity-50">
              {{ isSubmitting ? 'Registrando...' : 'Emitir Acceso Colaborador' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>
