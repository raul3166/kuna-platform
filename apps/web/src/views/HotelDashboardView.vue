<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import AppLayout from '../components/AppLayout.vue';

const authStore = useAuthStore();
const router = useRouter();

const rooms = ref<any[]>([]);
const reservations = ref<any[]>([]);
const loading = ref(false);

const todayStr = new Date().toISOString().split('T')[0];

const fetchData = async () => {
  loading.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const branchId = authStore.currentBranch?.id;
    const params: any = { organizationId: orgId, ...(branchId ? { branchId } : {}) };
    const [roomsRes, resRes] = await Promise.all([
      api.get('/hotel-rooms', { params }),
      api.get('/hotel-reservations', { params }),
    ]);
    rooms.value = Array.isArray(roomsRes.data) ? roomsRes.data : (roomsRes.data?.items || []);
    reservations.value = Array.isArray(resRes.data) ? resRes.data : (resRes.data?.items || []);
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const kpi = computed(() => {
  const total = rooms.value.length;
  const available = rooms.value.filter(r => r.status === 'AVAILABLE').length;
  const occupied = rooms.value.filter(r => r.status === 'OCCUPIED').length;
  const cleaning = rooms.value.filter(r => r.status === 'CLEANING').length;
  const maintenance = rooms.value.filter(r => ['MAINTENANCE', 'OUT_OF_ORDER'].includes(r.status)).length;
  const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
  return { total, available, occupied, cleaning, maintenance, occupancyRate };
});

const arrivalsToday = computed(() =>
  reservations.value.filter(r => r.status === 'CONFIRMED' && r.checkInDate?.split('T')[0] === todayStr)
);

const departuresToday = computed(() =>
  reservations.value.filter(r => r.status === 'CHECKED_IN' && r.checkOutDate?.split('T')[0] === todayStr)
);

const revenueToday = computed(() =>
  reservations.value
    .filter(r => r.status === 'CHECKED_OUT' && r.updatedAt?.split('T')[0] === todayStr)
    .reduce((sum, r) => sum + Number(r.totalAmount || 0), 0)
);

const getRoomColor = (status: string) => {
  switch (status) {
    case 'AVAILABLE': return 'bg-emerald-100 border-emerald-300 text-emerald-800';
    case 'OCCUPIED': return 'bg-blue-100 border-blue-300 text-blue-800';
    case 'CLEANING': return 'bg-purple-100 border-purple-300 text-purple-800';
    case 'MAINTENANCE': return 'bg-amber-100 border-amber-300 text-amber-800';
    case 'OUT_OF_ORDER': return 'bg-rose-100 border-rose-300 text-rose-800';
    default: return 'bg-slate-100 border-slate-300 text-slate-600';
  }
};

const getRoomIcon = (status: string) => {
  switch (status) {
    case 'AVAILABLE': return '✅';
    case 'OCCUPIED': return '🔵';
    case 'CLEANING': return '🧹';
    case 'MAINTENANCE': return '🔧';
    case 'OUT_OF_ORDER': return '🚫';
    default: return '❓';
  }
};

const getActiveReservation = (roomId: string) =>
  reservations.value.find(r => r.hotelRoomId === roomId && ['CHECKED_IN', 'CONFIRMED'].includes(r.status));

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

const formatDate = (d: string) => {
  if (!d) return '';
  return new Date(`${d.split('T')[0]}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
};

onMounted(fetchData);
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">🛎️ Dashboard de Recepción</h1>
          <p class="text-sm text-slate-500 mt-1">Visión en tiempo real del estado del hotel. Actualizado: {{ new Date().toLocaleTimeString('es-ES') }}</p>
        </div>
        <div class="flex gap-2">
          <button @click="fetchData" class="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">🔄 Actualizar</button>
          <button @click="router.push('/hotel-reservations')" class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">📋 Ver Reservas</button>
        </div>
      </div>

      <!-- KPI Top Row -->
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
          <span class="text-xs font-bold uppercase text-slate-400 block">Ocupación</span>
          <span class="text-3xl font-black" :class="kpi.occupancyRate >= 80 ? 'text-emerald-600' : kpi.occupancyRate >= 50 ? 'text-blue-600' : 'text-slate-500'">{{ kpi.occupancyRate }}%</span>
          <span class="text-xs text-slate-400">{{ kpi.occupied }}/{{ kpi.total }} hab.</span>
        </div>
        <div class="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm text-center">
          <span class="text-xs font-bold uppercase text-emerald-600 block">Disponibles</span>
          <span class="text-3xl font-black text-emerald-700">{{ kpi.available }}</span>
        </div>
        <div class="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm text-center">
          <span class="text-xs font-bold uppercase text-blue-600 block">Ocupadas</span>
          <span class="text-3xl font-black text-blue-700">{{ kpi.occupied }}</span>
        </div>
        <div class="bg-purple-50 p-4 rounded-xl border border-purple-100 shadow-sm text-center">
          <span class="text-xs font-bold uppercase text-purple-600 block">En Limpieza</span>
          <span class="text-3xl font-black text-purple-700">{{ kpi.cleaning }}</span>
        </div>
        <div class="bg-amber-50 p-4 rounded-xl border border-amber-100 shadow-sm text-center">
          <span class="text-xs font-bold uppercase text-amber-600 block">Mant./Fuera</span>
          <span class="text-3xl font-black text-amber-700">{{ kpi.maintenance }}</span>
        </div>
      </div>

      <!-- Actividad del Día -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <!-- Llegadas hoy -->
        <div class="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
          <h3 class="text-sm font-bold uppercase text-slate-500 mb-3">🛬 Llegadas Hoy <span class="ml-1 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{{ arrivalsToday.length }}</span></h3>
          <div v-if="arrivalsToday.length === 0" class="text-xs text-slate-400 italic">Sin llegadas pendientes</div>
          <div v-for="r in arrivalsToday" :key="r.id" class="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
            <div>
              <p class="text-sm font-semibold text-slate-800">{{ r.customer?.firstName }} {{ r.customer?.lastName }}</p>
              <p class="text-xs text-slate-400">Hab. {{ r.hotelRoom?.roomNumber }} — hasta {{ formatDate(r.checkOutDate) }}</p>
            </div>
            <span class="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">CHECK-IN</span>
          </div>
        </div>
        <!-- Salidas hoy -->
        <div class="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
          <h3 class="text-sm font-bold uppercase text-slate-500 mb-3">🛫 Salidas Hoy <span class="ml-1 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">{{ departuresToday.length }}</span></h3>
          <div v-if="departuresToday.length === 0" class="text-xs text-slate-400 italic">Sin salidas pendientes</div>
          <div v-for="r in departuresToday" :key="r.id" class="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
            <div>
              <p class="text-sm font-semibold text-slate-800">{{ r.customer?.firstName }} {{ r.customer?.lastName }}</p>
              <p class="text-xs text-slate-400">Hab. {{ r.hotelRoom?.roomNumber }}</p>
            </div>
            <span class="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">CHECK-OUT</span>
          </div>
        </div>
        <!-- Revenue hoy -->
        <div class="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
          <h3 class="text-sm font-bold uppercase text-slate-500 mb-3">💰 Revenue Hoy</h3>
          <p class="text-3xl font-black text-emerald-700">{{ formatCurrency(revenueToday) }}</p>
          <p class="text-xs text-slate-400 mt-1">Check-outs completados hoy</p>
        </div>
      </div>

      <!-- Mapa Visual de Habitaciones -->
      <div class="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-base font-bold text-slate-800">🗺️ Mapa de Habitaciones</h3>
          <!-- Leyenda -->
          <div class="flex gap-3 flex-wrap">
            <span class="flex items-center gap-1 text-xs text-emerald-700"><span class="w-3 h-3 rounded bg-emerald-200 border border-emerald-300 inline-block"></span>Disponible</span>
            <span class="flex items-center gap-1 text-xs text-blue-700"><span class="w-3 h-3 rounded bg-blue-200 border border-blue-300 inline-block"></span>Ocupada</span>
            <span class="flex items-center gap-1 text-xs text-purple-700"><span class="w-3 h-3 rounded bg-purple-200 border border-purple-300 inline-block"></span>Limpieza</span>
            <span class="flex items-center gap-1 text-xs text-amber-700"><span class="w-3 h-3 rounded bg-amber-200 border border-amber-300 inline-block"></span>Mantenimiento</span>
          </div>
        </div>
        <div v-if="loading" class="text-center text-slate-400 py-8">Cargando mapa...</div>
        <div v-else class="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-3">
          <div
            v-for="room in rooms"
            :key="room.id"
            :class="getRoomColor(room.status)"
            class="border-2 rounded-xl p-3 cursor-pointer hover:opacity-90 transition-all group relative"
            @click="router.push('/hotel-reservations')"
          >
            <p class="text-xs font-black text-center">{{ getRoomIcon(room.status) }}</p>
            <p class="text-sm font-black text-center mt-1">{{ room.roomNumber }}</p>
            <p class="text-[10px] text-center opacity-70 truncate">{{ room.roomType }}</p>
            <!-- Tooltip con info del huésped -->
            <div v-if="getActiveReservation(room.id)" class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap hidden group-hover:block z-10 shadow-xl">
              <p class="font-bold">{{ getActiveReservation(room.id)?.customer?.firstName }} {{ getActiveReservation(room.id)?.customer?.lastName }}</p>
              <p class="opacity-70">Sal. {{ formatDate(getActiveReservation(room.id)?.checkOutDate) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
