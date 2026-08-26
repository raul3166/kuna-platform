<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
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

      <!-- Menú de Navegación Estructurado Sprint 8 -->
      <nav class="flex-1 space-y-7 px-4 py-6 overflow-y-auto">
        <!-- Grupo 1: Core Corporativo -->
        <div>
          <p class="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Core</p>
          <div class="mt-2 space-y-1">
            <router-link to="/dashboard" class="flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white" active-class="bg-blue-600 text-white hover:bg-blue-600">
              👋 Bienvenida
            </router-link>
            <router-link to="/organizations" class="flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white" active-class="bg-blue-600 text-white hover:bg-blue-600">
              🏢 Organizaciones
            </router-link>
          </div>
        </div>

        <!-- ¡NUEVO! Grupo 2: Catálogo Comercial / CRM (KNA-050) -->
        <div>
          <p class="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Comercial</p>
          <div class="mt-2 space-y-1">
            <router-link to="/customers" class="flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white" active-class="bg-blue-600 text-white hover:bg-blue-600">
              👥 Clientes (CRM)
            </router-link>
          </div>
        </div>

        <!-- Grupo 3: Inventarios -->
        <div>
          <p class="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Inventario Core</p>
          <div class="mt-2 space-y-1">
            <router-link to="/products" class="flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white" active-class="bg-blue-600 text-white hover:bg-blue-600">
              📦 Productos y Catálogos
            </router-link>
            <router-link bro to="/inventory-dashboard" class="flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white" active-class="bg-blue-600 text-white hover:bg-blue-600">
              📊 Panel Analítico Stock
            </router-link>
            <router-link to="/inventory-movements" class="flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white" active-class="bg-blue-600 text-white hover:bg-blue-600">
              🔄 Movimientos y Ajustes
            </router-link>
            <router-link to="/inventory-transfers" class="flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white" active-class="bg-blue-600 text-white hover:bg-blue-600">
              🚚 Transferencias
            </router-link>
            <router-link to="/kardex" class="flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white" active-class="bg-blue-600 text-white hover:bg-blue-600">
              📋 Kardex / Historial
            </router-link>
          </div>
        </div>

        <!-- Grupo 4: Compras -->
        <div>
          <p class="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Compras</p>
          <div class="mt-2 space-y-1">
            <router-link to="/suppliers" class="flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white" active-class="bg-blue-600 text-white hover:bg-blue-600">
              🚚 Proveedores
            </router-link>
            <router-link to="/purchase-orders" class="flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white" active-class="bg-blue-600 text-white hover:bg-blue-600">
              📑 Órdenes de Compra
            </router-link>
            <router-link to="/goods-receipts" class="flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white" active-class="bg-blue-600 text-white hover:bg-blue-600">
              📥 Recepción de Mercancía
            </router-link>
            <router-link to="/purchase-invoices" class="flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white" active-class="bg-blue-600 text-white hover:bg-blue-600">
              🧾 Facturas de Proveedores
            </router-link>
            <router-link to="/purchase-returns" class="flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white" active-class="bg-blue-600 text-white hover:bg-blue-600">
              ↩️ Devoluciones a Proveedores
            </router-link>
          </div>
        </div>

        <!-- ¡NUEVO! Grupo 5: Ajustes del Sistema y Seguridad (Al fondo) -->
        <div>
          <p class="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Configuración</p>
          <div class="mt-2 space-y-1">
            <router-link to="/users" class="flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white" active-class="bg-blue-600 text-white hover:bg-blue-600">
              👥 Personal / Usuarios
            </router-link>
            <router-link to="/security-settings" class="flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white" active-class="bg-blue-600 text-white hover:bg-blue-600">
              🛡️ Roles y Permisos (RBAC)
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
        <!-- Información contextual -->
        <div class="flex items-center space-x-2">
          <span class="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800 border border-slate-200">
            📍 {{ authStore.currentBranch?.name || 'Sucursal Activa' }}
          </span>
          <span class="text-sm font-medium text-slate-400">/</span>
          <span class="text-sm font-semibold text-slate-600">{{ authStore.currentOrganization?.name || 'Organización' }}</span>
        </div>

        <!-- Perfil -->
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

      <!-- VISTA ENRUTADA (SLOT DINÁMICO) -->
      <main class="flex-1 overflow-y-auto p-6 lg:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>
