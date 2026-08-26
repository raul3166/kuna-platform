import axios from 'axios'
import { env } from '../config/env'
import { useAuthStore } from '../stores/auth'

export const api = axios.create({
  baseURL: env.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor de Peticiones: Adjunta el token JWT automáticamente
api.interceptors.request.use(
  (config) => {
    // Obtenemos el token directamente desde el localStorage
    // para evitar problemas de inicialización limpia de Pinia
    const token = localStorage.getItem('kuna_token')

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
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
