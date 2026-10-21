import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../services/api'

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
  const roles = ref<string[]>(getSafeJSON<string[]>('kuna_roles') || [])
  const permissions = ref<string[]>(getSafeJSON<string[]>('kuna_permissions') || [])
  const accessLoaded = ref<boolean>(roles.value.length > 0 || permissions.value.length > 0)

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => roles.value.includes('ADMIN'))

  function hasPermission(required?: string | string[]): boolean {
    if (!required || (Array.isArray(required) && required.length === 0)) {
      return true
    }
    if (isAdmin.value) {
      return true
    }
    if (typeof required === 'string') {
      return permissions.value.includes(required)
    }
    return required.some((perm) => permissions.value.includes(perm))
  }

  function setAccess(newRoles: string[], newPermissions: string[]) {
    const uniqueRoles = Array.from(new Set(newRoles.filter(Boolean)))
    const uniquePermissions = Array.from(new Set(newPermissions.filter(Boolean)))
    roles.value = uniqueRoles
    permissions.value = uniquePermissions
    accessLoaded.value = true
    localStorage.setItem('kuna_roles', JSON.stringify(uniqueRoles))
    localStorage.setItem('kuna_permissions', JSON.stringify(uniquePermissions))
  }

  async function resolveUserAccessFromProfile(dbUserData: any) {
    const userRoles = Array.isArray(dbUserData?.userRoles) ? dbUserData.userRoles : []
    const roleCodes: string[] = []
    const permissionCodes: string[] = []
    const roleIdsMissingPerms: string[] = []

    for (const ur of userRoles) {
      const role = ur?.role
      if (!role) continue
      if (role.code) {
        roleCodes.push(role.code)
      }
      if (Array.isArray(role.rolePermissions)) {
        for (const rp of role.rolePermissions) {
          if (rp?.permission?.code) {
            permissionCodes.push(rp.permission.code)
          }
        }
      } else if (role.id) {
        roleIdsMissingPerms.push(role.id)
      }
    }

    if (roleIdsMissingPerms.length > 0) {
      const roleDetails = await Promise.all(
        roleIdsMissingPerms.map((roleId) =>
          api.get(`/roles/${roleId}/permissions`).then((r) => r.data).catch(() => null)
        )
      )
      for (const rd of roleDetails) {
        if (Array.isArray(rd?.rolePermissions)) {
          for (const rp of rd.rolePermissions) {
            if (rp?.permission?.code) {
              permissionCodes.push(rp.permission.code)
            }
          }
        }
      }
    }

    setAccess(roleCodes, permissionCodes)
    return { roles: roles.value, permissions: permissions.value }
  }

  async function refreshUserAccess() {
    if (!user.value?.id || !token.value) return
    try {
      const profileResponse = await api.get(`/user-roles/${user.value.id}/roles`)
      await resolveUserAccessFromProfile(profileResponse.data)
    } catch (err) {
      console.error('[KUNA RBAC] Error sincronizando permisos del usuario:', err)
    }
  }

  function setSession(
    newToken: string,
    newUser: User,
    org: Organization,
    branch: Branch,
    newRoles?: string[],
    newPermissions?: string[]
  ) {
    token.value = newToken
    user.value = newUser
    currentOrganization.value = org
    currentBranch.value = branch

    localStorage.setItem('kuna_token', newToken)
    localStorage.setItem('kuna_user', JSON.stringify(newUser))
    localStorage.setItem('kuna_org', JSON.stringify(org))
    localStorage.setItem('kuna_branch', JSON.stringify(branch))

    if (newRoles || newPermissions) {
      setAccess(newRoles || [], newPermissions || [])
    }
  }

  function logout() {
    token.value = null
    user.value = null
    currentOrganization.value = null
    currentBranch.value = null
    roles.value = []
    permissions.value = []
    accessLoaded.value = false

    localStorage.removeItem('kuna_token')
    localStorage.removeItem('kuna_user')
    localStorage.removeItem('kuna_org')
    localStorage.removeItem('kuna_branch')
    localStorage.removeItem('kuna_roles')
    localStorage.removeItem('kuna_permissions')
  }

  return {
    token,
    user,
    currentOrganization,
    currentBranch,
    roles,
    permissions,
    accessLoaded,
    isAuthenticated,
    isAdmin,
    hasPermission,
    setAccess,
    resolveUserAccessFromProfile,
    refreshUserAccess,
    setSession,
    logout
  }
})
