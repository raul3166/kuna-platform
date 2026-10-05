<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import AppLayout from '../components/AppLayout.vue';

const authStore = useAuthStore();

const report = ref<any>(null);
const loading = ref(false);

// Filtros
const fromDate = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
const toDate = ref(new Date().toISOString().split('T')[0]);

const fetchReport = async () => {
  loading.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const branchId = authStore.currentBranch?.id;
    const { data } = await api.get('/hotel-reservations/reports/occupancy', {
      params: {
        organizationId: orgId,
        ...(branchId ? { branchId } : {}),
        from: fromDate.value,
        to: toDate.value,
      },
    });
    report.value = data;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);

const formatPct = (v: number) => `${(v || 0).toFixed(1)}%`;

const roomTypeLabel: Record<string, string> = {
  SINGLE: 'Sencilla', STANDARD: 'Estándar', DOUBLE: 'Doble', SUITE: 'Suite', PENTHOUSE: 'Penthouse',
};

onMounted(fetchReport);
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Header -->
      <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h1 class="text-2xl font-black text-slate-900">📊 Reporte de Ocupación e Ingresos</h1>
        <p class="text-sm text-slate-500 mt-1">Analiza la performance del hotel por período.</p>
      </div>

      <!-- Filtros -->
      <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div class="flex flex-wrap gap-4 items-end">
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Desde</label>
            <input v-model="fromDate" type="date" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Hasta</label>
            <input v-model="toDate" type="date" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <button @click="fetchReport" :disabled="loading" class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold">
            {{ loading ? 'Calculando...' : '📊 Generar Reporte' }}
          </button>
        </div>
      </div>

      <template v-if="report">
        <!-- KPIs Principales -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-center">
            <span class="text-xs font-bold uppercase text-slate-400 block">Ocupación</span>
            <span class="text-3xl font-black text-blue-700">{{ formatPct(report.summary.occupancyRate) }}</span>
            <span class="text-xs text-slate-400 block mt-1">{{ report.summary.totalNightsOccupied }} noches vendidas</span>
          </div>
          <div class="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm text-center">
            <span class="text-xs font-bold uppercase text-emerald-600 block">Ingresos Totales</span>
            <span class="text-2xl font-black text-emerald-700">{{ formatCurrency(report.summary.totalRevenue) }}</span>
          </div>
          <div class="bg-white border border-indigo-100 rounded-2xl p-5 shadow-sm text-center">
            <span class="text-xs font-bold uppercase text-indigo-600 block">RevPAR</span>
            <span class="text-2xl font-black text-indigo-700">{{ formatCurrency(report.summary.revPAR) }}</span>
            <span class="text-xs text-slate-400 block mt-1">Revenue / hab. disponible / día</span>
          </div>
          <div class="bg-white border border-amber-100 rounded-2xl p-5 shadow-sm text-center">
            <span class="text-xs font-bold uppercase text-amber-600 block">ADR</span>
            <span class="text-2xl font-black text-amber-700">{{ formatCurrency(report.summary.adr) }}</span>
            <span class="text-xs text-slate-400 block mt-1">Tarifa promedio diaria</span>
          </div>
        </div>

        <!-- Por Tipo de Habitación -->
        <div class="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
          <h3 class="text-base font-bold text-slate-800 mb-4">Por Tipo de Habitación</h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div v-for="rt in report.byRoomType" :key="rt.type" class="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <p class="text-xs font-bold uppercase text-slate-500">{{ roomTypeLabel[rt.type] || rt.type }}</p>
              <p class="text-xl font-black text-slate-800 mt-1">{{ formatCurrency(rt.revenue) }}</p>
              <p class="text-xs text-slate-400">{{ rt.reservations }} reservas · {{ rt.nights }} noches</p>
            </div>
          </div>
        </div>

        <!-- Ranking Habitaciones -->
        <div class="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100">
            <h3 class="text-base font-bold text-slate-800">🏆 Ranking de Habitaciones (por ingresos)</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-slate-600">
              <thead class="bg-slate-50 text-xs uppercase font-bold text-slate-500">
                <tr>
                  <th class="px-6 py-3 text-left">#</th>
                  <th class="px-6 py-3 text-left">Habitación</th>
                  <th class="px-6 py-3 text-left">Tipo</th>
                  <th class="px-6 py-3 text-right">Reservas</th>
                  <th class="px-6 py-3 text-right">Noches</th>
                  <th class="px-6 py-3 text-right">Ingresos</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="(room, idx) in report.byRoom" :key="room.roomNumber" class="hover:bg-slate-50/50">
                  <td class="px-6 py-3 font-bold text-slate-400">{{ Number(idx) + 1 }}</td>
                  <td class="px-6 py-3 font-bold text-slate-800">Hab. {{ room.roomNumber }}</td>
                  <td class="px-6 py-3">{{ roomTypeLabel[room.roomType] || room.roomType }}</td>
                  <td class="px-6 py-3 text-right">{{ room.reservations }}</td>
                  <td class="px-6 py-3 text-right">{{ room.nights }}</td>
                  <td class="px-6 py-3 text-right font-bold text-emerald-700">{{ formatCurrency(room.revenue) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Resumen del período -->
        <div class="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm text-slate-500 text-center">
          Período analizado: <strong>{{ report.summary.totalRooms }} habitaciones</strong> durante <strong>{{ report.period.days }} días</strong> · <strong>{{ report.summary.totalReservations }} reservas</strong>
        </div>
      </template>

      <div v-else-if="loading" class="text-center text-slate-400 py-16">Calculando reporte...</div>
    </div>
  </AppLayout>
</template>
