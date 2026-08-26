import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface User {
  id: string
  organizationId: string
  branchId: string
  firstName: string
  lastName: string
  email: string
  phoneNumber?: string | null
  isActive: boolean
}

export interface Branch {
  id: string
  name: string
}

export interface Organization {
  id: string
  name: string
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

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('kuna_token') || null)
  const user = ref<User | null>(getSafeJSON<User>('kuna_user'))
  const currentOrganization = ref<Organization | null>(getSafeJSON<Organization>('kuna_org'))
  const currentBranch = ref<Branch | null>(getSafeJSON<Branch>('kuna_branch'))

  const isAuthenticated = computed(() => !!token.value)

  function setSession(
    newToken: string,
    newUser: User,
    org: Organization,
    branch: Branch
  ) {
    token.value = newToken
    user.value = newUser
    currentOrganization.value = org
    currentBranch.value = branch

    localStorage.setItem('kuna_token', newToken)
    localStorage.setItem('kuna_user', JSON.stringify(newUser))
    localStorage.setItem('kuna_org', JSON.stringify(org))
    localStorage.setItem('kuna_branch', JSON.stringify(branch))
  }

  function logout() {
    token.value = null
    user.value = null
    currentOrganization.value = null
    currentBranch.value = null

    localStorage.removeItem('kuna_token')
    localStorage.removeItem('kuna_user')
    localStorage.removeItem('kuna_org')
    localStorage.removeItem('kuna_branch')
  }

  return {
    token,
    user,
    currentOrganization,
    currentBranch,
    isAuthenticated,
    setSession,
    logout
  }
})
