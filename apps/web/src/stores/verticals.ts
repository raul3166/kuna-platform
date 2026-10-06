import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../services/api'

export interface Vertical {
  id: string
  code: string
  name: string
  description?: string | null
  icon?: string | null
  isCore: boolean
  isActiveForOrg: boolean
  activatedAt?: string | null
  config?: Record<string, any> | null
}

function getSafeJSON<T>(key: string): T | null {
  const item = localStorage.getItem(key)
  if (!item || item === 'undefined' || item === 'null') return null
  try {
    return JSON.parse(item) as T
  } catch {
    return null
  }
}

export const useVerticalsStore = defineStore('verticals', () => {
  const verticals = ref<Vertical[]>([])
  const activeVerticalCodes = ref<string[]>(
    getSafeJSON<string[]>('kuna_active_verticals') || []
  )
  const isLoading = ref(false)
  const lastLoadedOrgId = ref<string | null>(null)

  const activeVerticals = computed(() => {
    return verticals.value.filter((v) => v.isActiveForOrg)
  })

  async function loadOrganizationVerticals(organizationId: string, force = false) {
    if (!organizationId) return

    // Evitar recargar si ya tenemos los datos de la misma organización a menos que se fuerce
    if (lastLoadedOrgId.value === organizationId && verticals.value.length > 0 && !force) {
      return
    }

    isLoading.value = true
    try {
      const response = await api.get<Vertical[]>(`/verticals/organization/${organizationId}`)
      verticals.value = response.data
      const activeCodes = response.data.filter((v) => v.isActiveForOrg).map((v) => v.code)
      activeVerticalCodes.value = activeCodes
      lastLoadedOrgId.value = organizationId

      localStorage.setItem('kuna_active_verticals', JSON.stringify(activeCodes))
    } catch (error) {
      console.error('Error al cargar verticales de la organización:', error)
    } finally {
      isLoading.value = false
    }
  }

  function hasVertical(code: string): boolean {
    if (!code) return true
    return activeVerticalCodes.value.includes(code.toUpperCase())
  }

  async function toggleVertical(organizationId: string, verticalCode: string, isActive: boolean) {
    try {
      await api.post(`/verticals/organization/${organizationId}/toggle`, {
        verticalCode,
        isActive,
      })

      // Actualizar estado local inmediatamente
      const vertical = verticals.value.find((v) => v.code === verticalCode)
      if (vertical) {
        vertical.isActiveForOrg = isActive
      }

      if (isActive) {
        if (!activeVerticalCodes.value.includes(verticalCode)) {
          activeVerticalCodes.value.push(verticalCode)
        }
      } else {
        activeVerticalCodes.value = activeVerticalCodes.value.filter((c) => c !== verticalCode)
      }

      localStorage.setItem('kuna_active_verticals', JSON.stringify(activeVerticalCodes.value))
      return { success: true }
    } catch (error: any) {
      console.error(`Error al alternar vertical ${verticalCode}:`, error)
      throw error
    }
  }

  function clear() {
    verticals.value = []
    activeVerticalCodes.value = []
    lastLoadedOrgId.value = null
    localStorage.removeItem('kuna_active_verticals')
  }

  return {
    verticals,
    activeVerticalCodes,
    activeVerticals,
    isLoading,
    loadOrganizationVerticals,
    hasVertical,
    toggleVertical,
    clear,
  }
})

