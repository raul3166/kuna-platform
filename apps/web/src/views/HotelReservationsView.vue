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

// Modo de vista: 'table' (Tabla) o 'rack' (Rack Visual de Ocupación)
const viewMode = ref<'table' | 'rack'>('table');

// Modales
const showCreateModal = ref(false);
const showCheckOutModal = ref(false);
const showChargesModal = ref(false);

const selectedReservation = ref<any | null>(null);
const currentReservationCharges = ref<any[]>([]);
const loadingCharges = ref(false);

// Filtros
const filterCheckIn = ref('');
const filterStatus = ref<string>('ALL');
const filterRoomId = ref<string>('ALL');

// Búsqueda de clientes dentro del modal
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

// Formulario de nuevo cargo a la habitación
const newChargeForm = ref({
  description: '',
  amount: 0,
  quantity: 1,
});

// Helper para obtener la fecha correspondiente al Domingo de la semana
const getSundayOfWeek = (dateInput: Date | string): string => {
  const d = new Date(typeof dateInput === 'string' ? `${dateInput}T00:00:00` : dateInput);
  const day = d.getDay(); // 0: Domingo, 1: Lunes, ..., 6: Sábado
  d.setDate(d.getDate() - day);
  return d.toISOString().split('T')[0];
};

// Rack de Ocupación (Navegación de Fechas - Alineado de Domingo a Sábado)
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

// Formateador de moneda COP
const formatCurrency = (val: number | string | null) => {
  const num = Number(val || 0);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(num);
};

// Cálculo de noches en el formulario de creación
const calculatedNights = computed(() => {
  if (!form.value.checkInDate || !form.value.checkOutDate) return 0;
  const start = new Date(`${form.value.checkInDate}T00:00:00`);
  const end = new Date(`${form.value.checkOutDate}T00:00:00`);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
});

const estimatedTotal = computed(() => {
  return calculatedNights.value * (Number(form.value.nightlyRate) || 0);
});

// Cargar habitaciones
const fetchRooms = async () => {
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const branchId = authStore.currentBranch?.id;
    if (!orgId) return;

    const { data } = await api.get('/hotel-rooms', {
      params: { organizationId: orgId, ...(branchId ? { branchId } : {}) },
    });
    rooms.value = Array.isArray(data) ? data : (data.items || data.data || []);
  } catch (error) {
    console.error('Error al cargar habitaciones:', error);
  }
};

// Cargar reservas con filtros
const fetchReservations = async () => {
  loading.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    if (!orgId) return;

    const branchId = authStore.currentBranch?.id;

    const params: Record<string, any> = {
      organizationId: orgId,
      ...(branchId ? { branchId } : {}),
      ...(filterCheckIn.value ? { checkInDate: filterCheckIn.value } : {}),
      ...(filterStatus.value !== 'ALL' ? { status: filterStatus.value } : {}),
      ...(filterRoomId.value !== 'ALL' ? { hotelRoomId: filterRoomId.value } : {}),
    };

    const { data } = await api.get('/hotel-reservations', { params });
    reservations.value = Array.isArray(data) ? data : (data.items || data.data || []);
  } catch (error) {
    console.error('Error al obtener reservas:', error);
  } finally {
    loading.value = false;
  }
};

// Al cambiar la habitación seleccionada en el modal de reserva, actualizar su precio por noche
watch(() => form.value.hotelRoomId, (newRoomId) => {
  const selectedRoom = rooms.value.find(r => r.id === newRoomId);
  if (selectedRoom) {
    form.value.nightlyRate = Number(selectedRoom.pricePerNight || 120000);
  }
});

// Buscar clientes CRM
const searchCustomers = async () => {
  if (!customerSearch.value || customerSearch.value.length < 2) return;
  loadingCustomers.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const { data } = await api.get('/customers', {
      params: { organizationId: orgId, search: customerSearch.value },
    });
    customers.value = Array.isArray(data) ? data : (data.items || data.data || []);
  } catch (error) {
    console.error('Error buscando clientes:', error);
  } finally {
    loadingCustomers.value = false;
  }
};

// Guardar nueva reserva
const saveReservation = async () => {
  if (!form.value.checkInDate || !form.value.checkOutDate) {
    alert('Debes seleccionar las fechas de Check-in y Check-out.');
    return;
  }

  if (new Date(form.value.checkOutDate) <= new Date(form.value.checkInDate)) {
    alert('La fecha de Check-out debe ser posterior al Check-in.');
    return;
  }

  loadingSubmit.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const branchId = authStore.currentBranch?.id;

    const payload = {
      organizationId: orgId,
      branchId: branchId,
      customerId: form.value.customerId,
      hotelRoomId: form.value.hotelRoomId,
      checkInDate: form.value.checkInDate,
      checkOutDate: form.value.checkOutDate,
      nightlyRate: Number(form.value.nightlyRate),
      totalAmount: estimatedTotal.value,
      notes: form.value.notes,
    };

    await api.post('/hotel-reservations', payload);
    showCreateModal.value = false;
    form.value = { ...initialForm };
    customerSearch.value = '';
    fetchReservations();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al procesar la reserva. Es posible que la habitación ya esté ocupada en esas fechas.');
  } finally {
    loadingSubmit.value = false;
  }
};

// Operación Check-In
const performCheckIn = async (reservationId: string) => {
  if (!confirm('¿Deseas confirmar el Check-In para este huésped y marcar la habitación como ocupada?')) return;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    await api.patch(`/hotel-reservations/${reservationId}/check-in`, null, {
      params: { organizationId: orgId },
    });
    fetchReservations();
    fetchRooms();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al realizar el Check-In');
  }
};

// Abrir modal de Check-Out
const openCheckOutModal = async (reservation: any) => {
  selectedReservation.value = reservation;
  checkOutForm.value = { paymentMethod: 'CASH', notes: '' };
  showCheckOutModal.value = true;

  // Cargar los cargos de la reserva
  const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
  try {
    const { data } = await api.get(`/hotel-reservations/${reservation.id}/charges`, {
      params: { organizationId: orgId },
    });
    currentReservationCharges.value = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Error al obtener cargos:', err);
  }
};

// Confirmar Check-Out y Facturación
const processCheckOut = async () => {
  if (!selectedReservation.value) return;
  loadingSubmit.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    await api.post(`/hotel-reservations/${selectedReservation.value.id}/check-out`, {
      organizationId: orgId,
      paymentMethod: checkOutForm.value.paymentMethod,
      notes: checkOutForm.value.notes,
    }, {
      params: { organizationId: orgId },
    });

    alert(' Check-Out realizado con éxito. Factura POS y pago registrados.');
    showCheckOutModal.value = false;
    selectedReservation.value = null;
    fetchReservations();
    fetchRooms();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al procesar el Check-Out');
  } finally {
    loadingSubmit.value = false;
  }
};

// Modal de gestión de Cargos
const openChargesModal = async (reservation: any) => {
  selectedReservation.value = reservation;
  newChargeForm.value = { description: '', amount: 0, quantity: 1 };
  showChargesModal.value = true;
  fetchCharges();
};

const fetchCharges = async () => {
  if (!selectedReservation.value) return;
  loadingCharges.value = true;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    const { data } = await api.get(`/hotel-reservations/${selectedReservation.value.id}/charges`, {
      params: { organizationId: orgId },
    });
    currentReservationCharges.value = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Error al cargar cargos:', err);
  } finally {
    loadingCharges.value = false;
  }
};

const addCharge = async () => {
  if (!newChargeForm.value.description || newChargeForm.value.amount <= 0) {
    alert('Ingresa una descripción y monto válido para el consumo.');
    return;
  }
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    await api.post(`/hotel-reservations/${selectedReservation.value.id}/charges`, {
      organizationId: orgId,
      description: newChargeForm.value.description,
      amount: Number(newChargeForm.value.amount),
      quantity: Number(newChargeForm.value.quantity || 1),
    });
    newChargeForm.value = { description: '', amount: 0, quantity: 1 };
    fetchCharges();
    fetchReservations();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al añadir el cargo');
  }
};

const removeCharge = async (chargeId: string) => {
  if (!confirm('¿Deseas eliminar este consumo?')) return;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    await api.delete(`/hotel-reservations/charges/${chargeId}`, {
      params: { organizationId: orgId },
    });
    fetchCharges();
    fetchReservations();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al eliminar el cargo');
  }
};

// Cancelar reserva
const cancelReservation = async (id: string) => {
  if (!confirm('¿Deseas cancelar esta reserva?')) return;
  try {
    const orgId = authStore.user?.organizationId || authStore.currentOrganization?.id;
    await api.patch(`/hotel-reservations/${id}/cancel`, null, {
      params: { organizationId: orgId },
    });
    fetchReservations();
    fetchRooms();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al cancelar la reserva');
  }
};

// Métodos auxiliares
const openCreateModal = () => {
  form.value = {
    customerId: '',
    hotelRoomId: filterRoomId.value !== 'ALL' ? filterRoomId.value : '',
    checkInDate: filterCheckIn.value || new Date().toISOString().split('T')[0],
    checkOutDate: '',
    nightlyRate: 120000,
    notes: '',
  };
  showCreateModal.value = true;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'CONFIRMED':
      return { text: 'Confirmada', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'PENDING':
      return { text: 'Pendiente', class: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'CANCELLED':
      return { text: 'Cancelada', class: 'bg-rose-50 text-rose-700 border-rose-200' };
    case 'CHECKED_IN':
      return { text: 'En Estancia (Check-In)', class: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'CHECKED_OUT':
      return { text: 'Finalizada (Check-Out)', class: 'bg-slate-50 text-slate-700 border-slate-200' };
    default:
      return { text: status, class: 'bg-slate-50 text-slate-700 border-slate-200' };
  }
};

// Obtener reservas para una habitación y un día específico en el Rack Visual
const getReservationsForRoomAndDay = (roomId: string, dateStr: string) => {
  const targetDate = new Date(`${dateStr}T00:00:00`);
  return reservations.value.filter(r => {
    if (r.hotelRoomId !== roomId || r.status === 'CANCELLED') return false;
    const checkIn = new Date(r.checkInDate);
    const checkOut = new Date(r.checkOutDate);
    return targetDate >= checkIn && targetDate < checkOut;
  });
};

// Totales de Check-Out
const checkOutStaySubtotal = computed(() => {
  if (!selectedReservation.value) return 0;
  const r = selectedReservation.value;
  const start = new Date(r.checkInDate);
  const end = new Date(r.checkOutDate);
  const nights = Math.max(1, Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  return Number(r.totalAmount || nights * Number(r.nightlyRate || r.hotelRoom?.pricePerNight || 0));
});

const checkOutChargesTotal = computed(() => {
  return currentReservationCharges.value.reduce((acc, c) => acc + (Number(c.amount) * c.quantity), 0);
});

const checkOutGrandTotal = computed(() => {
  return checkOutStaySubtotal.value + checkOutChargesTotal.value;
});

// Escuchar cambios de filtros principales de la tabla
watch([filterCheckIn, filterStatus, filterRoomId], () => {
  fetchReservations();
});

onMounted(() => {
  fetchRooms();
  fetchReservations();
});
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Encabezado con Selector de Vista (Tabla / Rack Visual) -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Gestión de Reservas & Recepción</h1>
          <p class="text-sm text-slate-500 mt-1">Control de ocupación, check-in, check-out, consumos a la habitación y facturación POS.</p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <!-- Switcher Tabla vs Rack -->
          <div class="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              @click="viewMode = 'table'"
              :class="viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
              class="px-3 py-1.5 rounded-lg transition-all"
            >
              📋 Lista / Tabla
            </button>
            <button
              @click="viewMode = 'rack'"
              :class="viewMode === 'rack' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
              class="px-3 py-1.5 rounded-lg transition-all"
            >
              🗓️ Rack de Ocupación
            </button>
          </div>

          <button
            @click="openCreateModal"
            class="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all text-sm gap-2"
          >
            <span>🛎️</span> Nueva Reserva
          </button>
        </div>
      </div>

      <!-- Barra de Filtros (Modo Tabla) -->
      <div v-if="viewMode === 'table'" class="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Fecha de Ingreso (Check-in)</label>
          <input
            v-model="filterCheckIn"
            type="date"
            class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Habitación</label>
          <select v-model="filterRoomId" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
            <option value="ALL">Todas las habitaciones</option>
            <option v-for="room in rooms" :key="room.id" :value="room.id">
              Habitación {{ room.roomNumber }} - {{ room.roomType }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Estado</label>
          <select v-model="filterStatus" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
            <option value="ALL">Todos los estados</option>
            <option value="CONFIRMED">Confirmadas</option>
            <option value="CHECKED_IN">En Estancia (Check-In)</option>
            <option value="CHECKED_OUT">Finalizadas (Check-Out)</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
        </div>
      </div>

      <!-- VISTA 1: TABLA DE RESERVAS -->
      <div v-if="viewMode === 'table'" class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div v-if="loading" class="p-12 text-center text-slate-400">
          Cargando reservas...
        </div>

        <div v-else-if="reservations.length === 0" class="p-12 text-center text-slate-400 space-y-2">
          <span class="text-4xl block">🛏️</span>
          <p class="text-sm font-medium">No se encontraron reservas para esta selección.</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50/70 border-b border-slate-100 text-xs uppercase font-bold text-slate-500">
              <tr>
                <th class="px-6 py-3.5">Huésped</th>
                <th class="px-6 py-3.5">Habitación</th>
                <th class="px-6 py-3.5">Estancia (Fechas)</th>
                <th class="px-6 py-3.5">Monto Noches / Consumos</th>
                <th class="px-6 py-3.5">Estado</th>
                <th class="px-6 py-3.5 text-right">Acciones de Recepción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="r in reservations" :key="r.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <p class="font-bold text-slate-900">{{ r.customer?.firstName }} {{ r.customer?.lastName || '' }}</p>
                  <p class="text-xs text-slate-400">Doc: {{ r.customer?.identificationNumber || 'N/A' }}</p>
                </td>
                <td class="px-6 py-4">
                  <p class="font-bold text-slate-800">Hab. {{ r.hotelRoom?.roomNumber }}</p>
                  <p class="text-xs text-slate-400">Tipo: {{ r.hotelRoom?.roomType }}</p>
                </td>
                <td class="px-6 py-4">
                  <p class="font-medium text-slate-800">
                    IN: {{ new Date(r.checkInDate).toLocaleDateString('es-ES', { timeZone: 'UTC' }) }}
                  </p>
                  <p class="text-xs text-slate-500 mt-0.5">
                    OUT: {{ new Date(r.checkOutDate).toLocaleDateString('es-ES', { timeZone: 'UTC' }) }}
                  </p>
                </td>
                <td class="px-6 py-4">
                  <p class="font-bold text-slate-900">{{ formatCurrency(r.totalAmount) }}</p>
                  <span v-if="r.charges && r.charges.length > 0" class="text-xs text-purple-600 font-semibold block">
                    +{{ r.charges.length }} consumos extra
                  </span>
                </td>
                <td class="px-6 py-4">
                  <span
                    :class="getStatusBadge(r.status).class"
                    class="px-2.5 py-1 rounded-lg text-xs font-bold border inline-block"
                  >
                    {{ getStatusBadge(r.status).text }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right space-x-1.5">
                  <!-- Botón Check-In -->
                  <button
                    v-if="['PENDING', 'CONFIRMED'].includes(r.status)"
                    @click="performCheckIn(r.id)"
                    title="Registrar entrada del huésped"
                    class="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
                  >
                    🛎️ Check-In
                  </button>

                  <!-- Botón Cargos / Consumos Extra -->
                  <button
                    v-if="r.status === 'CHECKED_IN'"
                    @click="openChargesModal(r)"
                    title="Añadir consumos de minibar o restaurante"
                    class="text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg border border-purple-200 transition-colors"
                  >
                    🛒 Consumos
                  </button>

                  <!-- Botón Check-Out -->
                  <button
                    v-if="r.status === 'CHECKED_IN'"
                    @click="openCheckOutModal(r)"
                    title="Realizar salida y cobrar factura"
                    class="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                  >
                    💳 Check-Out
                  </button>

                  <!-- Cancelar -->
                  <button
                    v-if="['PENDING', 'CONFIRMED'].includes(r.status)"
                    @click="cancelReservation(r.id)"
                    class="text-xs font-bold text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-100 transition-colors"
                  >
                    Cancelar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- VISTA 2: RACK DE OCUPACIÓN (MATRIZ VISUAL DE OCUPACIÓN) -->
      <div v-else-if="viewMode === 'rack'" class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <!-- Control de Navegación del Rack -->
        <div class="flex flex-col sm:flex-row justify-between items-center gap-4 pb-4 border-b border-slate-100">
          <div class="flex items-center gap-2">
            <button
              @click="prevRackWeek"
              class="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              ◀️ Semana Anterior
            </button>
            <button
              @click="resetRackToday"
              class="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
            >
              Hoy
            </button>
            <button
              @click="nextRackWeek"
              class="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Semana Siguiente ▶️
            </button>
          </div>

          <div class="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Mostrando: {{ rackDays[0].label }} - {{ rackDays[6].label }}
          </div>
        </div>

        <!-- Matriz Grid -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200">
                <th class="p-3 font-black uppercase text-slate-500 w-36 border-r border-slate-200">Habitación</th>
                <th
                  v-for="d in rackDays"
                  :key="d.dateStr"
                  :class="d.isToday ? 'bg-blue-50/80 text-blue-900 font-extrabold border-b-2 border-b-blue-600' : 'text-slate-700'"
                  class="p-3 text-center font-bold border-r border-slate-200 transition-colors"
                >
                  <div class="flex items-center justify-center gap-1">
                    <span class="uppercase text-[10px]" :class="d.isToday ? 'text-blue-600 font-extrabold' : 'text-slate-400'">{{ d.dayName }}</span>
                    <span v-if="d.isToday" class="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-black">Hoy</span>
                  </div>
                  <span>{{ d.label }}</span>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="room in rooms" :key="room.id" class="hover:bg-slate-50/50">
                <!-- Habitación Header -->
                <td class="p-3 font-bold border-r border-slate-200 bg-slate-50/40">
                  <div class="text-slate-900 font-extrabold text-sm">Hab. {{ room.roomNumber }}</div>
                  <div class="text-[11px] text-slate-400">{{ room.roomType }}</div>
                </td>

                <!-- Celda por cada Día -->
                <td
                  v-for="d in rackDays"
                  :key="d.dateStr"
                  :class="d.isToday ? 'bg-blue-50/20' : ''"
                  class="p-2 border-r border-slate-100 min-w-[110px] align-top text-center"
                >
                  <div
                    v-for="res in getReservationsForRoomAndDay(room.id, d.dateStr)"
                    :key="res.id"
                    :class="getStatusBadge(res.status).class"
                    class="p-2 rounded-xl text-[11px] font-bold border shadow-xs space-y-1 mb-1 text-left cursor-pointer hover:scale-102 transition-transform"
                    @click="res.status === 'CHECKED_IN' ? openCheckOutModal(res) : null"
                  >
                    <div class="truncate font-black text-slate-900">{{ res.customer?.firstName }} {{ res.customer?.lastName || '' }}</div>
                    <div class="text-[10px] opacity-80">{{ getStatusBadge(res.status).text }}</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal Nueva Reserva -->
      <div v-if="showCreateModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100">
          <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 class="text-lg font-bold text-slate-900">Agendar Nueva Reserva</h3>
            <button @click="showCreateModal = false" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
          </div>

          <form @submit.prevent="saveReservation" class="p-6 space-y-4">
            <!-- Buscar Huésped -->
            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Buscar Huésped (CRM)</label>
              <div class="flex gap-2">
                <input
                  v-model="customerSearch"
                  type="text"
                  placeholder="Nombre o identificación..."
                  @keyup.enter="searchCustomers"
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  @click="searchCustomers"
                  class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Buscar
                </button>
              </div>

              <!-- Selector de Cliente encontrado -->
              <div v-if="customers.length > 0" class="mt-2">
                <select v-model="form.customerId" required class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
                  <option value="" disabled>-- Selecciona un huésped --</option>
                  <option v-for="c in customers" :key="c.id" :value="c.id">
                    {{ c.firstName }} {{ c.lastName }} ({{ c.identificationNumber }})
                  </option>
                </select>
              </div>
              <p v-else-if="loadingCustomers" class="text-xs text-slate-400 mt-1">Buscando en CRM...</p>
            </div>

            <!-- Seleccionar Habitación -->
            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Habitación a Reservar</label>
              <select
                v-model="form.hotelRoomId"
                required
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="" disabled>-- Selecciona una habitación --</option>
                <option v-for="room in rooms" :key="room.id" :value="room.id">
                  Hab. {{ room.roomNumber }} - {{ room.roomType }} (Tarifa: {{ formatCurrency(room.pricePerNight) }})
                </option>
              </select>
            </div>

            <!-- Fechas de Estancia -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Check-in</label>
                <input
                  v-model="form.checkInDate"
                  type="date"
                  required
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Check-out</label>
                <input
                  v-model="form.checkOutDate"
                  type="date"
                  required
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <!-- Tarifa y Resumen -->
            <div class="bg-blue-50/40 p-4 rounded-xl border border-blue-100 space-y-2">
              <div class="flex justify-between items-center text-xs text-slate-600">
                <span>Noches estimadas:</span>
                <span class="font-bold text-slate-900">{{ calculatedNights }} noche(s)</span>
              </div>
              <div class="flex justify-between items-center text-xs text-slate-600">
                <span>Tarifa por noche:</span>
                <input
                  v-model="form.nightlyRate"
                  type="number"
                  class="w-32 rounded-lg border border-slate-200 px-2 py-1 text-right text-xs font-bold bg-white"
                />
              </div>
              <div class="flex justify-between items-center text-sm pt-2 border-t border-blue-100 text-blue-900 font-extrabold">
                <span>Total Estimado Estancia:</span>
                <span>{{ formatCurrency(estimatedTotal) }}</span>
              </div>
            </div>

            <div class="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                @click="showCreateModal = false"
                class="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="loadingSubmit || !form.customerId || !form.hotelRoomId"
                class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-all"
              >
                {{ loadingSubmit ? 'Procesando...' : 'Confirmar Reserva' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Check-Out & Facturación -->
      <div v-if="showCheckOutModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
          <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 class="text-lg font-bold text-slate-900">Check-Out & Facturación POS</h3>
            <button @click="showCheckOutModal = false" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
          </div>

          <div class="p-6 space-y-4">
            <!-- Detalles del Huésped y Habitación -->
            <div class="bg-slate-50 p-4 rounded-xl space-y-1 text-xs text-slate-600 border border-slate-100">
              <p><strong class="text-slate-900">Huésped:</strong> {{ selectedReservation?.customer?.firstName }} {{ selectedReservation?.customer?.lastName }}</p>
              <p><strong class="text-slate-900">Habitación:</strong> Hab. {{ selectedReservation?.hotelRoom?.roomNumber }} ({{ selectedReservation?.hotelRoom?.roomType }})</p>
            </div>

            <!-- Resumen de Cuenta -->
            <div class="space-y-2 border-t border-b border-slate-100 py-3 text-xs">
              <div class="flex justify-between text-slate-600">
                <span>Subtotal Hospedaje:</span>
                <span class="font-bold text-slate-900">{{ formatCurrency(checkOutStaySubtotal) }}</span>
              </div>
              <div class="flex justify-between text-slate-600">
                <span>Consumos Extra / Minibar ({{ currentReservationCharges.length }} ítems):</span>
                <span class="font-bold text-slate-900">{{ formatCurrency(checkOutChargesTotal) }}</span>
              </div>
              <div class="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-100">
                <span>TOTAL A PAGAR:</span>
                <span class="text-emerald-600">{{ formatCurrency(checkOutGrandTotal) }}</span>
              </div>
            </div>

            <!-- Método de Pago -->
            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Método de Pago</label>
              <select v-model="checkOutForm.paymentMethod" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
                <option value="CASH">💵 Efectivo</option>
                <option value="CREDIT_CARD">💳 Tarjeta de Crédito</option>
                <option value="DEBIT_CARD">💳 Tarjeta de Débito</option>
                <option value="TRANSFER">🏦 Transferencia Bancaria (Nequi/Daviplata)</option>
              </select>
            </div>

            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                @click="showCheckOutModal = false"
                class="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                @click="processCheckOut"
                :disabled="loadingSubmit"
                class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-all"
              >
                {{ loadingSubmit ? 'Facturando...' : 'Confirmar Check-Out' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Gestión de Consumos / Cargos Extra -->
      <div v-if="showChargesModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100">
          <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 class="text-lg font-bold text-slate-900">
              Consumos de Habitación - Hab. {{ selectedReservation?.hotelRoom?.roomNumber }}
            </h3>
            <button @click="showChargesModal = false" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
          </div>

          <div class="p-6 space-y-4">
            <!-- Formulario agregar consumo -->
            <form @submit.prevent="addCharge" class="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-100">
              <span class="text-xs font-bold uppercase text-slate-500 block">Añadir Consumo / Servicio</span>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  v-model="newChargeForm.description"
                  type="text"
                  placeholder="Ej: Minibar Agua 500ml"
                  required
                  class="sm:col-span-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white"
                />
                <input
                  v-model="newChargeForm.amount"
                  type="number"
                  placeholder="Precio"
                  required
                  min="0"
                  class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white"
                />
              </div>
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2 text-xs">
                  <span class="text-slate-500 font-bold">Cantidad:</span>
                  <input
                    v-model="newChargeForm.quantity"
                    type="number"
                    min="1"
                    class="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs text-center bg-white"
                  />
                </div>
                <button
                  type="submit"
                  class="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors"
                >
                  + Agregar Consumo
                </button>
              </div>
            </form>

            <!-- Lista de Consumos Registrados -->
            <div class="space-y-2">
              <span class="text-xs font-bold uppercase text-slate-500 block">Consumos Registrados</span>
              <div v-if="loadingCharges" class="text-xs text-slate-400 text-center py-4">Cargando consumos...</div>
              <div v-else-if="currentReservationCharges.length === 0" class="text-xs text-slate-400 text-center py-4 italic">
                Sin consumos adicionales registrados.
              </div>
              <div v-else class="max-h-48 overflow-y-auto divide-y divide-slate-100 border rounded-xl">
                <div
                  v-for="c in currentReservationCharges"
                  :key="c.id"
                  class="p-3 flex justify-between items-center text-xs hover:bg-slate-50"
                >
                  <div>
                    <p class="font-bold text-slate-900">{{ c.description }} (x{{ c.quantity }})</p>
                    <p class="text-[10px] text-slate-400">{{ new Date(c.createdAt).toLocaleString('es-CO') }}</p>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="font-extrabold text-slate-900">{{ formatCurrency(Number(c.amount) * c.quantity) }}</span>
                    <button @click="removeCharge(c.id)" class="text-rose-600 hover:text-rose-800 font-bold">✕</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex justify-end pt-4 border-t border-slate-100">
              <button
                @click="showChargesModal = false"
                class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
