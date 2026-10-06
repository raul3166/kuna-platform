import axios from 'axios'
import { env } from '../config/env'
import { useAuthStore } from '../stores/auth'

export const api = axios.create({
  baseURL: env.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor de Peticiones: Adjunta el token JWT y el contexto de organización automáticamente
api.interceptors.request.use(
  (config) => {
    // Obtenemos el token directamente desde el localStorage
    // para evitar problemas de inicialización limpia de Pinia
    const token = localStorage.getItem('kuna_token')

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Adjuntar organización activa para multi-tenancy y verticales
    const orgStr = localStorage.getItem('kuna_org')
    if (orgStr && config.headers && !config.headers['x-organization-id']) {
      try {
        const org = JSON.parse(orgStr)
        if (org?.id) {
          config.headers['x-organization-id'] = org.id
        }
      } catch {}
    }

    // Adjuntar sucursal activa si está presente
    const branchStr = localStorage.getItem('kuna_branch')
    if (branchStr && config.headers && !config.headers['x-branch-id']) {
      try {
        const branch = JSON.parse(branchStr)
        if (branch?.id) {
          config.headers['x-branch-id'] = branch.id
        }
      } catch {}
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor de Respuestas: Controla sesiones expiradas (Error 401)
// En src/services/api.ts

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Verificamos si es un error 401 y excluimos explícitamente la ruta de login
    const isLoginRequest = error.config?.url?.includes('/auth/login')

    if (error.response && error.response.status === 401 && !isLoginRequest) {
      const authStore = useAuthStore()
      authStore.logout()

      // Solo redirige forzosamente si el usuario estaba navegando dentro del sistema
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    // Es vital retornar el rechazo de la promesa para que llegue al 'catch' de Login.vue
    return Promise.reject(error)
  }
)
