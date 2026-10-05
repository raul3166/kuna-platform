<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import AppLayout from '../components/AppLayout.vue';

const authStore = useAuthStore();

// Estados principales
const reservations = ref<any[]>([]);
const rooms = ref<any[]>([]);
const customers = ref<any[]>([]);
const loading = ref(false);
const loadingSubmit = ref(false);

// Modo de vista
const viewMode = ref<'table' | 'rack'>('table');

// Modales
const showCreateModal = ref(false);
const showCheckOutModal = ref(false);
const showChargesModal = ref(false);
const showFolioPanel = ref(false);
const showTransferModal = ref(false);
const showExtendModal = ref(false);
const showCancelModal = ref(false);

const selectedReservation = ref<any | null>(null);
const currentReservationCharges = ref<any[]>([]);
const loadingCharges = ref(false);

// Filtros
const filterStatus = ref<string>('ALL');
const filterRoomId = ref<string>('ALL');

// Búsqueda de clientes
const customerSearch = ref('');
const loadingCustomers = ref(false);

// Formulario de reserva
const initialForm = {
  customerId: '',
  hotelRoomId: '',
  checkInDate: new Date().toISOString().split('T')[0],
  checkOutDate: '',
  nightlyRate: 0,
  notes: '',
};
const form = ref({ ...initialForm });

// Formulario de Check-Out
const checkOutForm = ref({
  paymentMethod: 'CASH',
  notes: '',
});

// Formulario de nuevo cargo
const newChargeForm = ref({
  description: '',
  amount: 0,
  quantity: 1,
});

// Formulario de Cambio de Habitación (6A)
const transferForm = ref({
  newRoomId: '',
  reason: '',
});

// Formulario de Extensión de Estadía (6B)
const extendForm = ref({
  newCheckOutDate: '',
  notes: '',
});

// Formulario de Cancelación con motivo (6C)
const cancelForm = ref({
  reason: '',
  cancellationCharge: 0,
});

// ── Rack de Ocupación ───────────────────────────────────────────────
const getSundayOfWeek = (dateInput: Date | string): string => {
  const d = new Date(typeof dateInput === 'string' ? `${dateInput}T00:00:00` : dateInput);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().split('T')[0];
};

const rackStartDate = ref(getSundayOfWeek(new Date()));

const rackDays = computed(() => {
  const days: { dateStr: string; label: string; dayName: string; isToday: boolean }[] = [];
  const start = new Date(`${rackStartDate.value}T00:00:00`);
  const todayStr = new Date().toISOString().split('T')[0];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' });
    const label = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    days.push({ dateStr, label, dayName, isToday: dateStr === todayStr });
  }
  return days;
});

const prevRackWeek = () => {
  const d = new Date(`${rackStartDate.value}T00:00:00`);
  d.setDate(d.getDate() - 7);
  rackStartDate.value = getSundayOfWeek(d);
};
const nextRackWeek = () => {
  const d = new Date(`${rackStartDate.value}T00:00:00`);
  d.setDate(d.getDate() + 7);
  rackStartDate.value = getSundayOfWeek(d);
};
const resetRackToday = () => {
  rackStartDate.value = getSundayOfWeek(new Date());
};

const getRoomRackOccupancy = (roomId: string, dateStr: string) => {
  return reservations.value.find((r) => {
    if (r.hotelRoomId !== roomId) return false;
    if (['CANCELLED', 'NO_SHOW'].includes(r.status)) return false;
    const ci = r.checkInDate.split('T')[0];
    const co = r.checkOutDate.split('T')[0];
    return dateStr >= ci && dateStr < co;
  });
};

// ── Formateo ────────────────────────────────────────────────────────
const formatCurrency = (val: number | string | null) => {
  const num = Number(val || 0);
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
};
const formatDate = (d: string) => {
  if (!d) return '';
  return new Date(`${d.split('T')[0]}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ── KPIs de la vista tabla ──────────────────────────────────────────
const kpiStats = computed(() => ({
  confirmed: reservations.value.filter(r => r.status === 'CONFIRMED').length,
  checkedIn: reservations.value.filter(r => r.status === 'CHECKED_IN').length,
  checkedOut: reservations.value.filter(r => r.status === 'CHECKED_OUT').length,
  cancelled: reservations.value.filter(r => ['CANCELLED', 'NO_SHOW'].includes(r.status)).length,
}));

// ── API Calls ───────────────────────────────────────────────────────
const fetchData = async () => {
  loading.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const branchId = authStore.currentBranch?.id;
    const params: any = { organizationId: orgId, ...(branchId ? { branchId } : {}) };
    if (filterStatus.value !== 'ALL') params.status = filterStatus.value;
    if (filterRoomId.value !== 'ALL') params.hotelRoomId = filterRoomId.value;
    const [resRes, roomsRes] = await Promise.all([
      api.get('/hotel-reservations', { params }),
      api.get('/hotel-rooms', { params: { organizationId: orgId, ...(branchId ? { branchId } : {}) } }),
    ]);
    reservations.value = Array.isArray(resRes.data) ? resRes.data : (resRes.data?.items || []);
    rooms.value = Array.isArray(roomsRes.data) ? roomsRes.data : (roomsRes.data?.items || []);
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const searchCustomers = async () => {
  if (customerSearch.value.length < 2) { customers.value = []; return; }
  loadingCustomers.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const { data } = await api.get('/customers', { params: { organizationId: orgId, search: customerSearch.value } });
    customers.value = Array.isArray(data) ? data : (data?.items || data?.customers || []);
  } catch (e) { console.error(e); }
  finally { loadingCustomers.value = false; }
};

const onRoomSelected = () => {
  const room = rooms.value.find(r => r.id === form.value.hotelRoomId);
  if (room?.pricePerNight) form.value.nightlyRate = Number(room.pricePerNight);
};

const computedTotal = computed(() => {
  if (!form.value.checkInDate || !form.value.checkOutDate) return 0;
  const ci = new Date(`${form.value.checkInDate}T00:00:00`);
  const co = new Date(`${form.value.checkOutDate}T00:00:00`);
  if (co <= ci) return 0;
  const nights = Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24));
  return nights * (form.value.nightlyRate || 0);
});

// ── Folio ────────────────────────────────────────────────────────────
const folioTotal = computed(() => {
  if (!selectedReservation.value) return 0;
  const stayTotal = Number(selectedReservation.value.totalAmount || 0);
  const chargesTotal = currentReservationCharges.value.reduce((s, c) => s + Number(c.amount) * c.quantity, 0);
  return stayTotal + chargesTotal;
});

const openFolio = async (reservation: any) => {
  selectedReservation.value = reservation;
  showFolioPanel.value = true;
  await loadCharges(reservation);
};

const loadCharges = async (reservation: any) => {
  loadingCharges.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const { data } = await api.get(`/hotel-reservations/${reservation.id}/charges`, {
      params: { organizationId: orgId },
    });
    currentReservationCharges.value = Array.isArray(data) ? data : [];
  } catch (e) { console.error(e); }
  finally { loadingCharges.value = false; }
};

// ── Acciones ─────────────────────────────────────────────────────────
const createReservation = async () => {
  loadingSubmit.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const branchId = authStore.currentBranch?.id;
    await api.post('/hotel-reservations', {
      organizationId: orgId,
      branchId,
      customerId: form.value.customerId,
      hotelRoomId: form.value.hotelRoomId,
      checkInDate: form.value.checkInDate,
      checkOutDate: form.value.checkOutDate,
      nightlyRate: form.value.nightlyRate,
      totalAmount: computedTotal.value,
      notes: form.value.notes,
    });
    showCreateModal.value = false;
    form.value = { ...initialForm };
    customerSearch.value = '';
    customers.value = [];
    fetchData();
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Error al crear la reserva');
  } finally {
    loadingSubmit.value = false;
  }
};

const doCheckIn = async (r: any) => {
  if (!confirm(`¿Confirmar Check-In para ${r.customer?.firstName} ${r.customer?.lastName} en hab. ${r.hotelRoom?.roomNumber}?`)) return;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    await api.patch(`/hotel-reservations/${r.id}/check-in`, {}, { params: { organizationId: orgId } });
    fetchData();
  } catch (e: any) { alert(e?.response?.data?.message || 'Error en Check-In'); }
};

const openCheckOut = (r: any) => {
  selectedReservation.value = r;
  showCheckOutModal.value = true;
  loadCharges(r);
};

const doCheckOut = async () => {
  loadingSubmit.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    await api.post(`/hotel-reservations/${selectedReservation.value.id}/check-out`, {
      organizationId: orgId,
      paymentMethod: checkOutForm.value.paymentMethod,
      notes: checkOutForm.value.notes,
    });
    showCheckOutModal.value = false;
    selectedReservation.value = null;
    fetchData();
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Error en Check-Out');
  } finally {
    loadingSubmit.value = false;
  }
};

const openCharges = async (r: any) => {
  selectedReservation.value = r;
  showChargesModal.value = true;
  await loadCharges(r);
};

const addCharge = async () => {
  if (!newChargeForm.value.description || !newChargeForm.value.amount) return;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    await api.post(`/hotel-reservations/${selectedReservation.value.id}/charges`, {
      organizationId: orgId,
      description: newChargeForm.value.description,
      amount: newChargeForm.value.amount,
      quantity: newChargeForm.value.quantity || 1,
    });
    newChargeForm.value = { description: '', amount: 0, quantity: 1 };
    await loadCharges(selectedReservation.value);
    fetchData();
  } catch (e: any) { alert(e?.response?.data?.message || 'Error al agregar cargo'); }
};

const removeCharge = async (chargeId: string) => {
  if (!confirm('¿Eliminar este cargo?')) return;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    await api.delete(`/hotel-reservations/charges/${chargeId}`, { params: { organizationId: orgId } });
    await loadCharges(selectedReservation.value);
    fetchData();
  } catch (e: any) { alert(e?.response?.data?.message || 'Error al eliminar cargo'); }
};

// ── 6A: Cambio de Habitación ─────────────────────────────────────────
const openTransfer = (r: any) => {
  selectedReservation.value = r;
  transferForm.value = { newRoomId: '', reason: '' };
  showTransferModal.value = true;
};

const availableRoomsForTransfer = computed(() => {
  if (!selectedReservation.value) return [];
  return rooms.value.filter(r =>
    r.id !== selectedReservation.value.hotelRoomId &&
    (r.status === 'AVAILABLE' || r.status === 'CLEANING')
  );
});

const doTransferRoom = async () => {
  if (!transferForm.value.newRoomId) return;
  loadingSubmit.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    await api.patch(`/hotel-reservations/${selectedReservation.value.id}/transfer-room`, {
      organizationId: orgId,
      newRoomId: transferForm.value.newRoomId,
      reason: transferForm.value.reason,
    });
    showTransferModal.value = false;
    fetchData();
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Error al cambiar habitación');
  } finally {
    loadingSubmit.value = false;
  }
};

// ── 6B: Extensión de Estadía ─────────────────────────────────────────
const openExtend = (r: any) => {
  selectedReservation.value = r;
  extendForm.value = { newCheckOutDate: r.checkOutDate?.split('T')[0] || '', notes: '' };
  showExtendModal.value = true;
};

const extendNights = computed(() => {
  if (!selectedReservation.value || !extendForm.value.newCheckOutDate) return 0;
  const orig = new Date(selectedReservation.value.checkOutDate);
  const newD = new Date(`${extendForm.value.newCheckOutDate}T00:00:00`);
  return Math.max(0, Math.ceil((newD.getTime() - orig.getTime()) / (1000 * 60 * 60 * 24)));
});

const doExtendStay = async () => {
  if (!extendForm.value.newCheckOutDate) return;
  loadingSubmit.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    await api.patch(`/hotel-reservations/${selectedReservation.value.id}/extend`, {
      organizationId: orgId,
      newCheckOutDate: extendForm.value.newCheckOutDate,
      notes: extendForm.value.notes,
    });
    showExtendModal.value = false;
    fetchData();
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Error al extender estadía');
  } finally {
    loadingSubmit.value = false;
  }
};

// ── 6C: No-Show & Cancelación ────────────────────────────────────────
const doNoShow = async (r: any) => {
  if (!confirm(`¿Marcar la reserva de ${r.customer?.firstName} ${r.customer?.lastName} como NO SHOW?`)) return;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    await api.patch(`/hotel-reservations/${r.id}/no-show`, {}, { params: { organizationId: orgId } });
    fetchData();
  } catch (e: any) { alert(e?.response?.data?.message || 'Error'); }
};

const openCancel = (r: any) => {
  selectedReservation.value = r;
  cancelForm.value = { reason: '', cancellationCharge: 0 };
  showCancelModal.value = true;
};

const doCancel = async () => {
  loadingSubmit.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    await api.patch(`/hotel-reservations/${selectedReservation.value.id}/cancel`, {
      organizationId: orgId,
      reason: cancelForm.value.reason,
      cancellationCharge: cancelForm.value.cancellationCharge || undefined,
    });
    showCancelModal.value = false;
    fetchData();
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Error al cancelar');
  } finally {
    loadingSubmit.value = false;
  }
};

// ── Status helpers ───────────────────────────────────────────────────
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'CONFIRMED': return { text: 'Confirmada', class: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'CHECKED_IN': return { text: 'En Estadía', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'CHECKED_OUT': return { text: 'Check-Out', class: 'bg-slate-50 text-slate-600 border-slate-200' };
    case 'CANCELLED': return { text: 'Cancelada', class: 'bg-rose-50 text-rose-700 border-rose-200' };
    case 'NO_SHOW': return { text: 'No-Show', class: 'bg-amber-50 text-amber-700 border-amber-200' };
    default: return { text: status, class: 'bg-slate-50 text-slate-600 border-slate-200' };
  }
};

watch([filterStatus, filterRoomId], fetchData);
onMounted(fetchData);
</script>

<template>
  <AppLayout>
    <div class="space-y-5">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Reservas de Hotel</h1>
          <p class="text-sm text-slate-500 mt-1">Gestiona check-in, check-out, traslados y extensiones de estadía.</p>
        </div>
        <div class="flex items-center gap-2">
          <!-- Toggle vista -->
          <div class="inline-flex bg-slate-100 p-1 rounded-xl">
            <button @click="viewMode = 'table'" :class="viewMode === 'table' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'" class="px-3 py-1.5 text-xs font-bold rounded-lg transition-all">📋 Lista</button>
            <button @click="viewMode = 'rack'" :class="viewMode === 'rack' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'" class="px-3 py-1.5 text-xs font-bold rounded-lg transition-all">🏨 Rack</button>
          </div>
          <button @click="showCreateModal = true" class="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm text-sm">
            ➕ Nueva Reserva
          </button>
        </div>
      </div>

      <!-- KPIs -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="bg-white border border-blue-100 rounded-xl p-4 text-center"><span class="text-xs font-bold uppercase text-blue-600 block">Confirmadas</span><span class="text-2xl font-black text-blue-700">{{ kpiStats.confirmed }}</span></div>
        <div class="bg-white border border-emerald-100 rounded-xl p-4 text-center"><span class="text-xs font-bold uppercase text-emerald-600 block">En Estadía</span><span class="text-2xl font-black text-emerald-700">{{ kpiStats.checkedIn }}</span></div>
        <div class="bg-white border border-slate-100 rounded-xl p-4 text-center"><span class="text-xs font-bold uppercase text-slate-400 block">Check-Out</span><span class="text-2xl font-black text-slate-600">{{ kpiStats.checkedOut }}</span></div>
        <div class="bg-white border border-rose-100 rounded-xl p-4 text-center"><span class="text-xs font-bold uppercase text-rose-500 block">Cancel./No-Show</span><span class="text-2xl font-black text-rose-600">{{ kpiStats.cancelled }}</span></div>
      </div>

      <!-- Filtros -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Estado</label>
          <select v-model="filterStatus" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
            <option value="ALL">Todos</option>
            <option value="CONFIRMED">Confirmadas</option>
            <option value="CHECKED_IN">En Estadía</option>
            <option value="CHECKED_OUT">Check-Out</option>
            <option value="CANCELLED">Canceladas</option>
            <option value="NO_SHOW">No-Show</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Habitación</label>
          <select v-model="filterRoomId" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
            <option value="ALL">Todas</option>
            <option v-for="r in rooms" :key="r.id" :value="r.id">Hab. {{ r.roomNumber }}</option>
          </select>
        </div>
        <div class="flex items-end">
          <button @click="fetchData" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">🔄 Actualizar</button>
        </div>
      </div>

      <!-- ═══ VISTA TABLA ═════════════════════════════════════════════ -->
      <div v-if="viewMode === 'table'" class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div v-if="loading" class="p-12 text-center text-slate-400">Cargando reservas...</div>
        <div v-else-if="reservations.length === 0" class="p-12 text-center text-slate-400 space-y-2">
          <span class="text-4xl block">🛎️</span>
          <p class="text-sm font-medium">No hay reservas con los filtros actuales.</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50/70 border-b border-slate-100 text-xs uppercase font-bold text-slate-500">
              <tr>
                <th class="px-4 py-3">Huésped</th>
                <th class="px-4 py-3">Habitación</th>
                <th class="px-4 py-3">Check-In</th>
                <th class="px-4 py-3">Check-Out</th>
                <th class="px-4 py-3">Total</th>
                <th class="px-4 py-3">Estado</th>
                <th class="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="r in reservations" :key="r.id" class="hover:bg-slate-50/50">
                <td class="px-4 py-3">
                  <p class="font-semibold text-slate-800">{{ r.customer?.firstName }} {{ r.customer?.lastName }}</p>
                  <p class="text-xs text-slate-400">{{ r.customer?.email }}</p>
                </td>
                <td class="px-4 py-3">
                  <span class="font-bold text-slate-800">Hab. {{ r.hotelRoom?.roomNumber }}</span>
                  <p class="text-xs text-slate-400">{{ r.hotelRoom?.roomType }}</p>
                </td>
                <td class="px-4 py-3 text-xs">{{ formatDate(r.checkInDate) }}</td>
                <td class="px-4 py-3 text-xs">{{ formatDate(r.checkOutDate) }}</td>
                <td class="px-4 py-3 font-bold">{{ formatCurrency(r.totalAmount) }}</td>
                <td class="px-4 py-3">
                  <span :class="getStatusBadge(r.status).class" class="px-2 py-0.5 rounded-lg text-xs font-bold border">
                    {{ getStatusBadge(r.status).text }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap justify-end gap-1">
                    <!-- Folio (siempre visible en activas) -->
                    <button v-if="['CONFIRMED','CHECKED_IN'].includes(r.status)" @click="openFolio(r)" title="Ver Folio" class="px-2 py-1 rounded-lg border text-xs font-bold bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100">📋 Folio</button>
                    <!-- Check-In -->
                    <button v-if="r.status === 'CONFIRMED'" @click="doCheckIn(r)" class="px-2 py-1 rounded-lg border text-xs font-bold bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">✅ Check-In</button>
                    <!-- Check-Out -->
                    <button v-if="r.status === 'CHECKED_IN'" @click="openCheckOut(r)" class="px-2 py-1 rounded-lg border text-xs font-bold bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">🏁 Check-Out</button>
                    <!-- Cargos extra -->
                    <button v-if="['CONFIRMED','CHECKED_IN'].includes(r.status)" @click="openCharges(r)" class="px-2 py-1 rounded-lg border text-xs font-bold bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100">🍽️ Cargos</button>
                    <!-- Cambio habitación -->
                    <button v-if="['CONFIRMED','CHECKED_IN'].includes(r.status)" @click="openTransfer(r)" title="Cambio Habitación" class="px-2 py-1 rounded-lg border text-xs font-bold bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100">🔄 Cambio</button>
                    <!-- Extensión -->
                    <button v-if="['CONFIRMED','CHECKED_IN'].includes(r.status)" @click="openExtend(r)" title="Extender Estadía" class="px-2 py-1 rounded-lg border text-xs font-bold bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100">🌙 Extender</button>
                    <!-- No-Show -->
                    <button v-if="r.status === 'CONFIRMED'" @click="doNoShow(r)" title="Marcar No-Show" class="px-2 py-1 rounded-lg border text-xs font-bold bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100">👻 No-Show</button>
                    <!-- Cancelar -->
                    <button v-if="['CONFIRMED','CHECKED_IN'].includes(r.status)" @click="openCancel(r)" class="px-2 py-1 rounded-lg border text-xs font-bold bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100">✕ Cancelar</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ═══ VISTA RACK ══════════════════════════════════════════════ -->
      <div v-if="viewMode === 'rack'" class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <button @click="prevRackWeek" class="p-2 rounded-lg hover:bg-slate-100 text-slate-600 font-bold">◀</button>
          <div class="text-center">
            <p class="font-bold text-slate-800 text-sm">Semana del {{ rackDays[0]?.label }} al {{ rackDays[6]?.label }}</p>
            <button @click="resetRackToday" class="text-xs text-blue-600 hover:underline">Ir a hoy</button>
          </div>
          <button @click="nextRackWeek" class="p-2 rounded-lg hover:bg-slate-100 text-slate-600 font-bold">▶</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-100">
                <th class="px-4 py-3 text-left text-slate-500 font-bold w-24">Hab.</th>
                <th v-for="day in rackDays" :key="day.dateStr" class="px-2 py-3 text-center font-bold min-w-[90px]" :class="day.isToday ? 'text-blue-700 bg-blue-50' : 'text-slate-500'">
                  <span class="block uppercase">{{ day.dayName }}</span>
                  <span class="block">{{ day.label }}</span>
                  <span v-if="day.isToday" class="inline-block mt-0.5 text-[9px] bg-blue-600 text-white px-1.5 rounded-full">Hoy</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="room in rooms" :key="room.id" class="border-b border-slate-50 hover:bg-slate-50/30">
                <td class="px-4 py-2.5 font-bold text-slate-700">
                  <p>{{ room.roomNumber }}</p>
                  <p class="text-slate-400 font-normal">{{ room.roomType }}</p>
                </td>
                <td v-for="day in rackDays" :key="day.dateStr" class="px-1 py-1.5 text-center" :class="day.isToday ? 'bg-blue-50/40' : ''">
                  <template v-if="getRoomRackOccupancy(room.id, day.dateStr)">
                    <div class="bg-blue-600 text-white rounded px-1.5 py-1 text-[10px] leading-tight">
                      <p class="font-bold truncate max-w-[80px]">{{ getRoomRackOccupancy(room.id, day.dateStr)?.customer?.firstName }}</p>
                      <p class="opacity-80 text-[9px]">{{ getStatusBadge(getRoomRackOccupancy(room.id, day.dateStr)?.status).text }}</p>
                    </div>
                  </template>
                  <template v-else>
                    <span class="text-slate-200 text-lg">·</span>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ═══ MODAL: CREAR RESERVA ════════════════════════════════════════ -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-100">
        <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 class="text-lg font-bold text-slate-900">🛎️ Nueva Reserva</h3>
          <button @click="showCreateModal = false" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>
        <form @submit.prevent="createReservation" class="p-6 space-y-4">
          <!-- Búsqueda de Cliente -->
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Huésped (CRM)</label>
            <input v-model="customerSearch" @input="searchCustomers" type="text" placeholder="Buscar por nombre o email..." class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <div v-if="customers.length > 0" class="mt-1 border border-slate-200 rounded-xl bg-white shadow-md max-h-36 overflow-y-auto">
              <button v-for="c in customers" :key="c.id" type="button" @click="() => { form.customerId = c.id; customerSearch = `${c.firstName} ${c.lastName}`; customers = []; }" class="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-0">
                {{ c.firstName }} {{ c.lastName }} <span class="text-xs text-slate-400">{{ c.email }}</span>
              </button>
            </div>
          </div>
          <!-- Habitación -->
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Habitación</label>
            <select v-model="form.hotelRoomId" required @change="onRoomSelected" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
              <option value="">Seleccionar habitación...</option>
              <option v-for="r in rooms.filter(r => r.status === 'AVAILABLE')" :key="r.id" :value="r.id">Hab. {{ r.roomNumber }} — {{ r.roomType }} — {{ formatCurrency(r.pricePerNight) }}/noche</option>
            </select>
          </div>
          <!-- Fechas y tarifa -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Check-In</label>
              <input v-model="form.checkInDate" type="date" required class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Check-Out</label>
              <input v-model="form.checkOutDate" type="date" required class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Tarifa por Noche</label>
            <input v-model="form.nightlyRate" type="number" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div v-if="computedTotal > 0" class="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 text-sm">
            <span class="text-emerald-700 font-bold">Total estimado: {{ formatCurrency(computedTotal) }}</span>
          </div>
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Notas (Opcional)</label>
            <textarea v-model="form.notes" rows="2" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none"></textarea>
          </div>
          <div class="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" @click="showCreateModal = false" class="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold hover:bg-slate-50">Cancelar</button>
            <button type="submit" :disabled="loadingSubmit || !form.customerId || !form.hotelRoomId" class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold">
              {{ loadingSubmit ? 'Creando...' : 'Crear Reserva' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ═══ PANEL LATERAL: FOLIO DE HUÉSPED (5A) ═══════════════════════ -->
    <div v-if="showFolioPanel" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-end z-50">
      <div class="bg-white w-full max-w-sm h-full flex flex-col shadow-2xl">
        <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 class="text-lg font-bold text-slate-900">📋 Folio de Huésped</h3>
            <p class="text-xs text-slate-500">{{ selectedReservation?.customer?.firstName }} {{ selectedReservation?.customer?.lastName }} — Hab. {{ selectedReservation?.hotelRoom?.roomNumber }}</p>
          </div>
          <button @click="showFolioPanel = false" class="text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
        </div>
        <div class="flex-1 overflow-y-auto p-6 space-y-4">
          <!-- Hospedaje -->
          <div class="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p class="text-xs font-bold uppercase text-blue-600 mb-2">🛏️ Hospedaje</p>
            <div class="flex justify-between text-sm">
              <span class="text-slate-600">{{ formatDate(selectedReservation?.checkInDate) }} → {{ formatDate(selectedReservation?.checkOutDate) }}</span>
              <span class="font-bold text-slate-800">{{ formatCurrency(selectedReservation?.totalAmount) }}</span>
            </div>
            <p class="text-xs text-slate-400 mt-1">{{ formatCurrency(selectedReservation?.nightlyRate) }}/noche</p>
          </div>
          <!-- Cargos extra -->
          <div>
            <p class="text-xs font-bold uppercase text-slate-500 mb-2">🍽️ Cargos Extra</p>
            <div v-if="loadingCharges" class="text-xs text-slate-400">Cargando...</div>
            <div v-else-if="currentReservationCharges.length === 0" class="text-xs text-slate-400 italic">Sin cargos adicionales</div>
            <div v-else class="space-y-2">
              <div v-for="c in currentReservationCharges" :key="c.id" class="flex justify-between items-center text-sm bg-slate-50 rounded-lg px-3 py-2">
                <span class="text-slate-700">{{ c.description }} <span class="text-slate-400 text-xs">(x{{ c.quantity }})</span></span>
                <span class="font-semibold">{{ formatCurrency(Number(c.amount) * c.quantity) }}</span>
              </div>
            </div>
          </div>
          <!-- Agregar cargo rápido -->
          <div class="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p class="text-xs font-bold uppercase text-amber-700 mb-3">➕ Agregar Cargo</p>
            <input v-model="newChargeForm.description" type="text" placeholder="Descripción (ej: Minibar, Lavandería)" class="w-full rounded-lg border border-amber-200 px-3 py-1.5 text-sm mb-2" />
            <div class="grid grid-cols-2 gap-2 mb-2">
              <input v-model="newChargeForm.amount" type="number" placeholder="Valor" class="w-full rounded-lg border border-amber-200 px-3 py-1.5 text-sm" />
              <input v-model="newChargeForm.quantity" type="number" min="1" placeholder="Cant." class="w-full rounded-lg border border-amber-200 px-3 py-1.5 text-sm" />
            </div>
            <button @click="addCharge" :disabled="!newChargeForm.description || !newChargeForm.amount" class="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold">Agregar Cargo</button>
          </div>
        </div>
        <!-- Total del folio -->
        <div class="border-t border-slate-100 px-6 py-4 bg-slate-50">
          <div class="flex justify-between items-center">
            <span class="font-bold text-slate-700">Total Folio</span>
            <span class="text-2xl font-black text-slate-900">{{ formatCurrency(folioTotal) }}</span>
          </div>
          <button v-if="selectedReservation?.status === 'CHECKED_IN'" @click="() => { showFolioPanel = false; openCheckOut(selectedReservation); }" class="mt-3 w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold">🏁 Proceder a Check-Out</button>
        </div>
      </div>
    </div>

    <!-- ═══ MODAL: CHECK-OUT ═══════════════════════════════════════════ -->
    <div v-if="showCheckOutModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
        <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 class="text-lg font-bold">🏁 Check-Out — Hab. {{ selectedReservation?.hotelRoom?.roomNumber }}</h3>
          <button @click="showCheckOutModal = false" class="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div class="p-6 space-y-4">
          <div class="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
            <div class="flex justify-between"><span>Hospedaje</span><span class="font-bold">{{ formatCurrency(selectedReservation?.totalAmount) }}</span></div>
            <div v-for="c in currentReservationCharges" :key="c.id" class="flex justify-between text-slate-600">
              <span>{{ c.description }} x{{ c.quantity }}</span>
              <span>{{ formatCurrency(Number(c.amount) * c.quantity) }}</span>
            </div>
            <div class="flex justify-between font-black text-slate-900 pt-2 border-t border-slate-200">
              <span>Total</span>
              <span>{{ formatCurrency(Number(selectedReservation?.totalAmount || 0) + currentReservationCharges.reduce((s, c) => s + Number(c.amount) * c.quantity, 0)) }}</span>
            </div>
          </div>
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Método de Pago</label>
            <select v-model="checkOutForm.paymentMethod" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
              <option value="CASH">Efectivo</option>
              <option value="CREDIT_CARD">Tarjeta de Crédito</option>
              <option value="DEBIT_CARD">Tarjeta de Débito</option>
              <option value="TRANSFER">Transferencia</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Notas</label>
            <textarea v-model="checkOutForm.notes" rows="2" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none"></textarea>
          </div>
          <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button @click="showCheckOutModal = false" class="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold">Cancelar</button>
            <button @click="doCheckOut" :disabled="loadingSubmit" class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold">{{ loadingSubmit ? 'Procesando...' : '✅ Confirmar Check-Out' }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ MODAL: CARGOS EXTRA ══════════════════════════════════════ -->
    <div v-if="showChargesModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
        <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 class="text-lg font-bold">🍽️ Cargos — Hab. {{ selectedReservation?.hotelRoom?.roomNumber }}</h3>
          <button @click="showChargesModal = false" class="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div class="p-6 space-y-4">
          <div v-if="currentReservationCharges.length === 0" class="text-sm text-slate-400 text-center">Sin cargos aún</div>
          <div v-for="c in currentReservationCharges" :key="c.id" class="flex justify-between items-center bg-slate-50 rounded-xl px-4 py-2.5">
            <div><p class="text-sm font-semibold">{{ c.description }}</p><p class="text-xs text-slate-400">x{{ c.quantity }} × {{ formatCurrency(c.amount) }}</p></div>
            <div class="flex items-center gap-2"><span class="text-sm font-bold">{{ formatCurrency(Number(c.amount) * c.quantity) }}</span><button @click="removeCharge(c.id)" class="text-rose-500 hover:text-rose-700 text-xs">✕</button></div>
          </div>
          <div class="border-t border-slate-100 pt-4 space-y-2">
            <input v-model="newChargeForm.description" type="text" placeholder="Descripción" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <div class="grid grid-cols-2 gap-2">
              <input v-model="newChargeForm.amount" type="number" placeholder="Valor unitario" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input v-model="newChargeForm.quantity" type="number" min="1" placeholder="Cantidad" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <button @click="addCharge" class="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold">➕ Agregar Cargo</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ MODAL: CAMBIO DE HABITACIÓN (6A) ════════════════════════ -->
    <div v-if="showTransferModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
        <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 class="text-lg font-bold text-slate-900">🔄 Cambio de Habitación</h3>
          <button @click="showTransferModal = false" class="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div class="p-6 space-y-4">
          <p class="text-sm text-slate-600">Huésped: <strong>{{ selectedReservation?.customer?.firstName }} {{ selectedReservation?.customer?.lastName }}</strong> — Hab. actual: <strong>{{ selectedReservation?.hotelRoom?.roomNumber }}</strong></p>
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Nueva Habitación</label>
            <select v-model="transferForm.newRoomId" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
              <option value="">Seleccionar...</option>
              <option v-for="r in availableRoomsForTransfer" :key="r.id" :value="r.id">Hab. {{ r.roomNumber }} — {{ r.roomType }} — {{ formatCurrency(r.pricePerNight) }}/noche</option>
            </select>
            <p v-if="availableRoomsForTransfer.length === 0" class="text-xs text-amber-600 mt-1">⚠️ No hay habitaciones disponibles para traslado.</p>
          </div>
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Motivo (Opcional)</label>
            <input v-model="transferForm.reason" type="text" placeholder="Ej: Solicitud del huésped, problema técnico..." class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div class="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button @click="showTransferModal = false" class="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold">Cancelar</button>
            <button @click="doTransferRoom" :disabled="loadingSubmit || !transferForm.newRoomId" class="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold">{{ loadingSubmit ? 'Cambiando...' : '🔄 Confirmar Cambio' }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ MODAL: EXTENSIÓN DE ESTADÍA (6B) ═══════════════════════════ -->
    <div v-if="showExtendModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
        <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 class="text-lg font-bold text-slate-900">🌙 Extensión de Estadía</h3>
          <button @click="showExtendModal = false" class="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div class="p-6 space-y-4">
          <p class="text-sm text-slate-600">Check-out actual: <strong>{{ formatDate(selectedReservation?.checkOutDate) }}</strong></p>
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Nueva Fecha de Check-Out</label>
            <input v-model="extendForm.newCheckOutDate" type="date" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div v-if="extendNights > 0" class="bg-teal-50 border border-teal-100 rounded-xl px-4 py-2.5 text-sm">
            <span class="text-teal-700 font-bold">+{{ extendNights }} noche{{ extendNights > 1 ? 's' : '' }} adicional{{ extendNights > 1 ? 'es' : '' }}</span>
            <span class="text-teal-600 ml-2">(+{{ formatCurrency(extendNights * Number(selectedReservation?.nightlyRate || 0)) }})</span>
          </div>
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Notas (Opcional)</label>
            <input v-model="extendForm.notes" type="text" placeholder="Motivo de la extensión..." class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div class="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button @click="showExtendModal = false" class="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold">Cancelar</button>
            <button @click="doExtendStay" :disabled="loadingSubmit || !extendForm.newCheckOutDate || extendNights <= 0" class="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold">{{ loadingSubmit ? 'Extendiendo...' : '🌙 Confirmar Extensión' }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ MODAL: CANCELACIÓN CON MOTIVO (6C) ══════════════════════════ -->
    <div v-if="showCancelModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
        <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 class="text-lg font-bold text-rose-700">✕ Cancelar Reserva</h3>
          <button @click="showCancelModal = false" class="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div class="p-6 space-y-4">
          <p class="text-sm text-slate-600">Huésped: <strong>{{ selectedReservation?.customer?.firstName }} {{ selectedReservation?.customer?.lastName }}</strong> — Hab. <strong>{{ selectedReservation?.hotelRoom?.roomNumber }}</strong></p>
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Motivo de Cancelación</label>
            <input v-model="cancelForm.reason" type="text" placeholder="Ej: Cancelación voluntaria, fuerza mayor..." class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Cargo por Cancelación (Opcional)</label>
            <input v-model="cancelForm.cancellationCharge" type="number" min="0" placeholder="0" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div class="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button @click="showCancelModal = false" class="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold">Volver</button>
            <button @click="doCancel" :disabled="loadingSubmit" class="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-semibold">{{ loadingSubmit ? 'Cancelando...' : '✕ Cancelar Reserva' }}</button>
          </div>
        </div>
      </div>
    </div>

  </AppLayout>
</template>
