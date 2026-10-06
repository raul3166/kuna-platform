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

// Filtra las secciones visibles según los verticales activos de la organización
const visibleNavigation = computed(() => {
  return navigationSections.filter((section) => {
    if (section.isCore) return true
    if (!section.requiredVertical) return true
    return verticalsStore.hasVertical(section.requiredVertical)
  })
})

const activeSection = ref<string | null>(null)

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

onMounted(() => {
  if (authStore.currentOrganization?.id) {
    verticalsStore.loadOrganizationVerticals(authStore.currentOrganization.id)
  }
  autoExpandSection(route.path)
})
</script>

<template>
  <div class="flex h-screen bg-slate-50 font-sans overflow-hidden">
    <!-- SIDEBAR LATERAL -->
    <aside class="hidden w-64 bg-slate-900 text-slate-300 md:flex md:flex-col border-r border-slate-800">
      <!-- Logo KUNA -->
      <div class="flex h-16 items-center px-6 bg-slate-950 border-b border-slate-800">
        <span class="text-xl font-black tracking-wider text-white">KUNA</span>
        <span class="ml-1.5 text-xs font-semibold uppercase tracking-widest text-blue-500 bg-blue-950 px-1.5 py-0.5 rounded border border-blue-900">SaaS</span>
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
      <div class="p-4 bg-slate-950 border-t border-slate-800">
        <p class="text-xs text-slate-500 text-center">Latam Edition v0.7.0</p>
      </div>
    </aside>

    <!-- ÁREA DE CONTENIDO PRINCIPAL -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- TOPBAR SUPERIOR -->
      <header class="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm z-10">
        <div class="flex items-center space-x-2">
          <span class="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800 border border-slate-200">
            📍 {{ authStore.currentBranch?.name || 'Sucursal Activa' }}
          </span>

          <span class="text-sm font-medium text-slate-400">/</span>
          <span class="text-sm font-semibold text-slate-600">{{ authStore.currentOrganization?.name || 'Organización' }}</span>
        </div>

        <div class="flex items-center space-x-4">
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
      <main class="flex-1 overflow-y-auto p-6 lg:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>
