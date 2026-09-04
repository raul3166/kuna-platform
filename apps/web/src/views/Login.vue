<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'
import { jwtDecode } from 'jwt-decode' // Importamos el decodificador


const router = useRouter()
const authStore = useAuthStore()

// Estado del formulario
const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

async function handleLogin() {
  if (!email.value || !password.value) {
    errorMessage.value = 'Por favor, completa todos los campos.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    // 1. Autenticar y obtener el accessToken puro de tu AuthService
    const loginResponse = await api.post('/auth/login', {
      email: email.value,
      password: password.value,
    })

    const { accessToken } = loginResponse.data

    // Guardamos temporalmente el token para que los interceptores lo usen
    localStorage.setItem('kuna_token', accessToken)

    // 2. Decodificamos el JWT para extraer el ID del usuario (el campo 'sub' de tu JwtPayload)
    const decoded: { sub: string; email: string } = jwtDecode(accessToken)
    const userId = decoded.sub

    // 3. Consumimos tu endpoint existente de UserRolesController
    const profileResponse = await api.get(`/user-roles/${userId}/roles`)
    const dbUserData = profileResponse.data

    // 4. Estructuramos la información para el estado de Pinia
    const user = {
      id: dbUserData.id,
      organizationId: dbUserData.organizationId,
      branchId: dbUserData.branchId,
      firstName: dbUserData.firstName,
      lastName: dbUserData.lastName,
      email: dbUserData.email,
      phoneNumber: dbUserData.phoneNumber,
      isActive: dbUserData.isActive,
    }

    // Guardamos la sesión completa de forma segura
    // ✅ Pasamos los nombres reales mapeados desde la API
    authStore.setSession(
      accessToken,
      user,
      {
        id: dbUserData.organizationId,
        name: dbUserData.organization?.name || dbUserData.organizationName || 'Sin Organización'
      },
      {
        id: dbUserData.branchId,
        name: dbUserData.branch?.name || dbUserData.branchName || 'Sin Sucursal'
      }
    )

    // 5. Redirección al área de trabajo
    router.push('/dashboard')
  } catch (error: any) {
    console.error(error)
    localStorage.removeItem('kuna_token')

    if (error.response && error.response.data && error.response.data.message) {
      errorMessage.value = error.response.data.message
    } else {
      errorMessage.value = 'Credenciales incorrectas o servidor no disponible.'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12 sm:px-6 lg:px-8">
    <div class="w-full max-w-md space-y-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
      <!-- Encabezado / Logo -->
      <div class="text-center">
        <p class="text-xs font-bold uppercase tracking-widest text-blue-600">
          KUNA Platform
        </p>
        <h2 class="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
          Inicia sesión en tu cuenta
        </h2>
        <p class="mt-2 text-sm text-slate-600">
          Gestión empresarial modular para Latinoamérica
        </p>
      </div>

      <!-- Formulario -->
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <div class="space-y-4 rounded-md">
          <div>
            <label for="email-address" class="block text-sm font-medium text-slate-700">
              Correo electrónico
            </label>
            <input
              id="email-address"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
              placeholder="ejemplo@kuna.com"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
              class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
              placeholder="••••••••"
            />
          </div>
        </div>

        <!-- Alerta de Error -->
        <div v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {{ errorMessage }}
        </div>

        <!-- Botón de Envío -->
        <div>
          <button
            type="submit"
            :disabled="isLoading"
            class="group relative flex w-full justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span v-if="isLoading">Ingresando...</span>
            <span v-else>Iniciar Sesión</span>
          </button>
        </div>
      </form>
    </div>
  </main>
</template>
