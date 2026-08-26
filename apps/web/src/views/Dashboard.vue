<script setup lang="ts">
import AppLayout from '../components/AppLayout.vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <AppLayout>
    <!-- Todo lo que pongas aquí se inyectará automáticamente en el <slot /> del Layout -->
    <header class="mb-8">
      <h1 class="text-3xl font-bold tracking-tight text-slate-900">
        ¡Bienvenido de vuelta, {{ authStore.user?.firstName }}!
      </h1>
      <p class="mt-2 text-sm text-slate-500">
        Panel de control centralizado para la administración de tu negocio.
      </p>
    </header>

    <!-- Tarjetas de Resumen Rápido (Métricas base) -->
    <section class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm font-medium text-slate-500">Sucursal de Operación</p>
        <p class="mt-2 text-xl font-bold text-slate-900">{{ authStore.currentBranch?.name || 'Cargando...' }}</p>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm font-medium text-slate-500">Estatus de Empresa</p>
        <p class="mt-2 text-sm font-semibold text-green-600 inline-flex items-center bg-green-50 px-2.5 py-0.5 rounded border border-green-200">
          ● Activa / En Línea
        </p>
      </div>
    </section>
  </AppLayout>
</template>
