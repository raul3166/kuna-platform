<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useVerticalsStore } from '../stores/verticals'
import { navigationSections } from '../config/navigation'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const verticalsStore = useVerticalsStore()

function handleLogout() {
  authStore.logout()
  verticalsStore.clear()
  router.push('/login')
}

// Filtra las secciones e ítems visibles según los verticales activos de la organización y los permisos RBAC del usuario
const visibleNavigation = computed(() => {
  return navigationSections
    .map((section) => {
      const isVerticalAllowed =
        section.isCore ||
        !section.requiredVertical ||
        verticalsStore.hasVertical(section.requiredVertical)

      if (!isVerticalAllowed) return null
      if (!authStore.hasPermission(section.requiredPermission)) return null

      const allowedItems = section.items.filter((item) =>
        authStore.hasPermission(item.requiredPermission)
      )

      if (allowedItems.length === 0) return null

      return {
        ...section,
        items: allowedItems,
      }
    })
    .filter((section): section is NonNullable<typeof section> => section !== null)
})

const activeSection = ref<string | null>(null)
const isMobileMenuOpen = ref(false)

function closeMobileMenu() {
  isMobileMenuOpen.value = false
}

// Encuentra dinámicamente qué sección contiene la ruta actual
function autoExpandSection(currentPath: string) {
  const matchingSection = visibleNavigation.value.find((section) =>
    section.items.some((item) => currentPath.startsWith(item.to))
  )
  if (matchingSection) {
    activeSection.value = matchingSection.key
  }
}

function toggleSection(sectionKey: string) {
  activeSection.value = activeSection.value === sectionKey ? null : sectionKey
}

watch(
  () => route.path,
  (newPath) => {
    autoExpandSection(newPath)
    isMobileMenuOpen.value = false
  },
  { immediate: true }
)

watch(
  () => authStore.currentOrganization?.id,
  (newOrgId) => {
    if (newOrgId) {
      verticalsStore.loadOrganizationVerticals(newOrgId)
    }
  }
)

onMounted(async () => {
  if (authStore.currentOrganization?.id) {
    verticalsStore.loadOrganizationVerticals(authStore.currentOrganization.id)
  }
  await authStore.refreshUserAccess()
  autoExpandSection(route.path)
})
</script>

<template>
  <div class="flex h-screen bg-slate-50 font-sans overflow-hidden">
    <!-- OVERLAY MÓVIL -->
    <div
      v-if="isMobileMenuOpen"
      @click="closeMobileMenu"
      class="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs transition-opacity md:hidden"
      aria-hidden="true"
    />

    <!-- SIDEBAR LATERAL (Drawer en móvil, fijo en escritorio) -->
    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-900 text-slate-300 border-r border-slate-800 transform transition-transform duration-300 ease-in-out md:static md:w-64 md:translate-x-0"
      :class="isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'"
    >
      <!-- Logo KUNA -->
      <div class="flex h-16 items-center justify-between px-6 bg-slate-950 border-b border-slate-800">
        <div class="flex items-center">
          <span class="text-xl font-black tracking-wider text-white">KUNA</span>
          <span class="ml-1.5 text-xs font-semibold uppercase tracking-widest text-blue-500 bg-blue-950 px-1.5 py-0.5 rounded border border-blue-900">SaaS</span>
        </div>

        <!-- Botón cerrar menú en móvil -->
        <button
          @click="closeMobileMenu"
          type="button"
          class="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
          aria-label="Cerrar menú"
        >
          ✕
        </button>
      </div>

      <!-- Menú Renderizado Dinámicamente -->
      <nav class="flex-1 space-y-2 px-3 py-6 overflow-y-auto">
        <div v-for="section in visibleNavigation" :key="section.key">
          <button
            @click="toggleSection(section.key)"
            type="button"
            class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:bg-slate-800/60 hover:text-white transition-colors"
            :class="{ 'text-white bg-slate-800/40': activeSection === section.key }"
          >
            <span>{{ section.label }}</span>
            <span class="text-[10px] transform transition-transform duration-200" :class="{ 'rotate-180 text-blue-400': activeSection === section.key }">▼</span>
          </button>

          <div v-show="activeSection === section.key" class="mt-1 space-y-1 pl-2">
            <router-link
              v-for="item in section.items"
              :key="item.to"
              :to="item.to"
              @click="closeMobileMenu"
              class="flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white"
              active-class="bg-blue-600 text-white hover:bg-blue-600"
            >
              <span class="mr-2">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </router-link>
          </div>
        </div>
      </nav>

      <!-- Footer del Sidebar -->
      <div class="p-4 bg-slate-950 border-t border-slate-800 space-y-2">
        <div class="sm:hidden border-b border-slate-800 pb-2 mb-2">
          <p class="text-xs font-semibold text-slate-200 truncate">
            {{ authStore.user?.firstName }} {{ authStore.user?.lastName }}
          </p>
          <p class="text-[11px] text-slate-400 truncate">{{ authStore.user?.email }}</p>
        </div>
        <p class="text-xs text-slate-500 text-center">Latam Edition v0.7.0</p>
      </div>
    </aside>

    <!-- ÁREA DE CONTENIDO PRINCIPAL -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- TOPBAR SUPERIOR -->
      <header class="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 shadow-sm z-10">
        <div class="flex items-center space-x-2 min-w-0">
          <!-- Botón Hamburguesa (visible solo en móvil/tablet vertical) -->
          <button
            @click="isMobileMenuOpen = true"
            type="button"
            class="mr-1 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 md:hidden shadow-xs"
            aria-label="Abrir menú de navegación"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <span class="inline-flex shrink-0 items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800 border border-slate-200">
            📍 {{ authStore.currentBranch?.name || 'Sucursal Activa' }}
          </span>

          <span class="text-sm font-medium text-slate-400">/</span>
          <span class="text-sm font-semibold text-slate-600 truncate">{{ authStore.currentOrganization?.name || 'Organización' }}</span>
        </div>

        <div class="flex items-center space-x-3 sm:space-x-4 shrink-0">
          <div class="text-right hidden sm:block">
            <p class="text-sm font-semibold text-slate-700">
              {{ authStore.user?.firstName }} {{ authStore.user?.lastName }}
            </p>
            <p class="text-xs text-slate-400">{{ authStore.user?.email }}</p>
          </div>

          <button @click="handleLogout" type="button" class="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-red-600 transition-colors shadow-sm" title="Cerrar sesión">
            🚪 <span class="ml-1.5 text-sm font-medium hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      <!-- VISTA ENRUTADA -->
      <main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>
