<script setup lang="ts">
import { ref } from 'vue'

import { api } from '../services/api'

const apiStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const apiMessage = ref('')

async function testApiConnection() {
  apiStatus.value = 'loading'
  apiMessage.value = ''

  try {
    const response = await api.get('/health')

    apiStatus.value = 'success'
    apiMessage.value = JSON.stringify(response.data)
  } catch (error) {
    console.error(error)

    apiStatus.value = 'error'
    apiMessage.value = 'No fue posible conectar con la API.'
  }
}
</script>

<template>
  <main class="min-h-screen bg-slate-100 p-8">
    <div class="mx-auto max-w-6xl">
      <header class="mb-8">
        <p class="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-600">
          KUNA Platform
        </p>

        <h1 class="text-4xl font-bold text-slate-900">
          Web Foundation
        </h1>

        <p class="mt-3 max-w-2xl text-slate-600">
          Base frontend de KUNA conectada al backend mediante Vue,
          Axios, Pinia, Vue Router y Tailwind CSS.
        </p>
      </header>

      <section class="grid gap-6 md:grid-cols-3">
        <article class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p class="text-sm text-slate-500">
            Frontend
          </p>

          <h2 class="mt-2 text-xl font-semibold text-slate-900">
            Vue + Vite
          </h2>

          <p class="mt-2 text-sm text-green-600">
            ✓ Funcionando
          </p>
        </article>

        <article class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p class="text-sm text-slate-500">
            State Management
          </p>

          <h2 class="mt-2 text-xl font-semibold text-slate-900">
            Pinia
          </h2>

          <p class="mt-2 text-sm text-green-600">
            ✓ Configurado
          </p>
        </article>

        <article class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p class="text-sm text-slate-500">
            Navigation
          </p>

          <h2 class="mt-2 text-xl font-semibold text-slate-900">
            Vue Router
          </h2>

          <p class="mt-2 text-sm text-green-600">
            ✓ Configurado
          </p>
        </article>
      </section>

      <section class="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="text-xl font-semibold text-slate-900">
              Conexión con API
            </h2>

            <p class="mt-1 text-sm text-slate-500">
              Prueba de comunicación entre Vue y NestJS.
            </p>
          </div>

          <button
            type="button"
            class="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="apiStatus === 'loading'"
            @click="testApiConnection"
          >
            {{ apiStatus === 'loading' ? 'Conectando...' : 'Probar API' }}
          </button>
        </div>

        <div
          v-if="apiStatus === 'success'"
          class="mt-6 rounded-lg border border-green-200 bg-green-50 p-4"
        >
          <p class="font-semibold text-green-800">
            API conectada correctamente.
          </p>

          <pre class="mt-2 overflow-auto text-sm text-green-700">{{ apiMessage }}</pre>
        </div>

        <div
          v-if="apiStatus === 'error'"
          class="mt-6 rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <p class="font-semibold text-red-800">
            Error de conexión
          </p>

          <p class="mt-1 text-sm text-red-700">
            {{ apiMessage }}
          </p>
        </div>
      </section>

      <footer class="mt-8 text-sm text-slate-500">
        KUNA Platform — Frontend Foundation
      </footer>
    </div>
  </main>
</template>
