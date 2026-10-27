<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
const auth = useAuthStore();
const instructors = ref<any[]>([]), schedules = ref<any[]>([]), assignments = ref<any[]>([]), report = ref<any>(null), loading = ref(false), showForm = ref(false);
const editingInstructorId = ref<string | null>(null);
const enablingId = ref<string | null>(null);
const accessSuccessMsg = ref<string | null>(null);
const today = new Date().toISOString().slice(0, 10);
const defaultForm = () => ({
  firstName: '',
  lastName: '',
  identification: '',
  phoneNumber: '',
  email: '',
  specialty: '',
  businessType: 'STUDIO',
  paymentModel: 'FIXED_PER_CLASS',
  fixedClassRate: 0,
  perStudentRate: 0,
  createUserAccount: true,
});
const form = ref<any>(defaultForm());
const openCreateModal = () => {
  editingInstructorId.value = null;
  form.value = defaultForm();
  showForm.value = true;
};
const openEditModal = (inst: any) => {
  editingInstructorId.value = inst.id;
  form.value = {
    firstName: inst.firstName || '',
    lastName: inst.lastName || '',
    identification: inst.identification || '',
    phoneNumber: inst.phoneNumber || '',
    email: inst.email || '',
    specialty: inst.specialty || '',
    businessType: inst.businessType || 'STUDIO',
    paymentModel: inst.paymentModel || 'FIXED_PER_CLASS',
    fixedClassRate: Number(inst.fixedClassRate || 0),
    perStudentRate: Number(inst.perStudentRate || 0),
    createUserAccount: true,
  };
  showForm.value = true;
};
const assignment = ref({ studioScheduleId:'', instructorId:'', classDate:'', notes:'' });
const filters = ref({ instructorId:'', startDate: today.slice(0, 8) + '01', endDate: today });
const orgId = computed(() => auth.currentOrganization?.id || auth.user?.organizationId);
const branchId = computed(() => auth.currentBranch?.id);
const money = (value: number) => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(value || 0);
const name = (item: any) => [item.firstName, item.lastName].filter(Boolean).join(' ');
const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const assignmentsFor = (instructorId: string) => assignments.value.flatMap(schedule => {
  const rows: any[] = [];
  if (schedule.instructorId === instructorId) rows.push({ ...schedule, kind: 'Recurrente' });
  schedule.classInstructors?.filter((item: any) => item.instructorId === instructorId).forEach((item: any) => rows.push({ ...schedule, kind: 'Reemplazo', classDate: item.classDate }));
  return rows;
});
async function load() { if (!orgId.value) return; const params={organizationId:orgId.value,...(branchId.value?{branchId:branchId.value}:{})}; const [a,b,c]=await Promise.all([api.get('/instructors',{params:{...params,businessType:'STUDIO'}}),api.get('/studio-schedules',{params}),api.get('/instructors/assignments/list',{params})]); instructors.value=a.data; schedules.value=b.data; assignments.value=c.data; }
async function save() {
  try {
    if (editingInstructorId.value) {
      await api.patch(
        `/instructors/${editingInstructorId.value}`,
        {
          ...form.value,
          businessType: form.value.businessType || 'STUDIO',
        },
        { params: { organizationId: orgId.value } }
      );
      showForm.value = false;
      editingInstructorId.value = null;
      accessSuccessMsg.value = `Datos del instructor actualizados. Si marcaste acceso, su clave es su cédula (${form.value.identification}).`;
      form.value = defaultForm();
      load();
      return;
    }
    const { data } = await api.post('/instructors', {
      ...form.value,
      businessType: form.value.businessType || 'STUDIO',
      organizationId: orgId.value,
      branchId: branchId.value,
    });
    showForm.value = false;
    if (data?.accessInfo) {
      accessSuccessMsg.value = `Instructor creado con acceso al sistema. Usuario: ${data.accessInfo.email} | Contraseña: ${data.accessInfo.initialPassword}`;
    } else {
      accessSuccessMsg.value = null;
    }
    form.value = defaultForm();
    load();
  } catch (err: any) {
    alert(err?.response?.data?.message || 'Error al guardar el instructor');
  }
}
async function enableInstructorAccess(inst: any) {
  let email = inst.email || '';
  if (!email) {
    const input = prompt(`Ingresa el correo electrónico para el acceso de ${name(inst)}:`, '');
    if (!input || !input.trim()) return;
    email = input.trim();
  }
  enablingId.value = inst.id;
  try {
    const { data } = await api.post(
      `/instructors/${inst.id}/enable-access`,
      { email },
      { params: { organizationId: orgId.value } }
    );
    accessSuccessMsg.value = `Acceso habilitado para ${name(inst)} -> Usuario: ${data.accessInfo?.email || email} | Contraseña: ${data.accessInfo?.initialPassword || inst.identification}`;
    await load();
  } catch (err: any) {
    alert(err?.response?.data?.message || 'No se pudo habilitar el usuario del instructor');
  } finally {
    enablingId.value = null;
  }
}
async function assign() {
  if (!assignment.value.studioScheduleId || !assignment.value.instructorId || !assignment.value.classDate) {
    alert('Selecciona la clase, la instructora de reemplazo y la fecha del reemplazo.');
    return;
  }
  await api.post('/instructors/overrides', { ...assignment.value, organizationId: orgId.value });
  assignment.value = { studioScheduleId: '', instructorId: '', classDate: '', notes: '' };
  load();
}
async function runReport() { loading.value=true; try { const {data}=await api.get('/instructors/settlement/report',{params:{organizationId:orgId.value,branchId:branchId.value,...filters.value}}); report.value=data; } finally { loading.value=false; } }
onMounted(load);
</script>
<template><AppLayout><div class="space-y-6">
  <section class="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex justify-between gap-4"><div><h1 class="text-2xl font-black text-slate-900">Instructores y liquidación</h1><p class="text-sm text-slate-500 mt-1">1. Crea aquí tus instructores y sus tarifas · 2. Asígnalos como titulares al crear cada horario en <strong>Calendario Clases</strong>.</p></div><button @click="openCreateModal" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shrink-0">+ Instructor</button></section>
  <div v-if="accessSuccessMsg" class="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 flex items-center justify-between gap-3">
    <div><strong>✅ Credenciales listas:</strong> {{ accessSuccessMsg }}</div>
    <button @click="accessSuccessMsg = null" class="text-xs font-bold text-emerald-700 hover:underline">Cerrar</button>
  </div>
  <section class="grid md:grid-cols-3 gap-4"><article v-for="i in instructors" :key="i.id" class="bg-white rounded-2xl p-5 border border-slate-100 flex flex-col justify-between gap-3"><div><div class="flex justify-between items-start gap-2"><div><h3 class="font-bold text-slate-900">{{name(i)}}</h3><span class="text-xs text-blue-600">{{i.specialty || 'Sin especialidad'}}</span></div><button type="button" @click="openEditModal(i)" class="text-xs font-bold text-slate-500 hover:text-blue-600 px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50">✏️ Editar</button></div><p class="text-xs text-slate-500 mt-2">Cédula: {{i.identification}} · {{i.phoneNumber || 'Sin teléfono'}}</p><p v-if="i.email" class="text-xs text-slate-500 mt-0.5">✉️ {{ i.email }}</p><p class="text-sm font-semibold mt-3">{{ i.paymentModel === 'FIXED_PER_CLASS' ? money(Number(i.fixedClassRate)) + ' / clase' : i.paymentModel === 'PER_STUDENT' ? money(Number(i.perStudentRate)) + ' / alumno' : money(Number(i.fixedClassRate)) + ' + ' + money(Number(i.perStudentRate)) + ' / alumno' }}</p></div><div class="pt-3 border-t border-slate-100"><div v-if="i.hasSystemAccess" class="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-[11px] text-emerald-800"><span class="font-bold block">🔑 Acceso Instructor Activo</span><span>Usuario: <strong>{{ i.email }}</strong> · Clave: <strong>{{ i.identification }}</strong></span></div><button v-else type="button" :disabled="enablingId === i.id" @click="enableInstructorAccess(i)" class="w-full rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 text-xs font-bold text-indigo-700 transition-colors">{{ enablingId === i.id ? 'Habilitando...' : '🔑 Habilitar Acceso (Clave = Cédula)' }}</button></div></article></section>
  <section class="bg-white rounded-2xl p-6 border border-slate-100"><div class="mb-4"><h2 class="font-bold text-slate-800">🔄 Registrar reemplazo por un día específico (Opcional)</h2><p class="text-xs text-slate-500 mt-1">El instructor titular fijo se elige al crear o editar la clase en <strong>Calendario Clases</strong>. Usa esta sección únicamente cuando otro instructor vaya a cubrir una clase en una fecha puntual.</p></div><div class="grid md:grid-cols-4 gap-3"><select v-model="assignment.studioScheduleId" class="field"><option value="">-- Selecciona la clase --</option><option v-for="s in schedules" :key="s.id" :value="s.id">{{ days[s.dayOfWeek] }} · {{s.className}} ({{s.startTime}})</option></select><select v-model="assignment.instructorId" class="field"><option value="">-- Instructora de reemplazo --</option><option v-for="i in instructors.filter(x=>x.isActive)" :key="i.id" :value="i.id">{{name(i)}}</option></select><input v-model="assignment.classDate" type="date" required class="field" title="Fecha del reemplazo"><button @click="assign" class="bg-slate-900 text-white rounded-xl text-sm font-bold px-4 py-2">Registrar reemplazo</button></div></section>
  <section class="bg-white rounded-2xl p-6 border border-slate-100"><div class="mb-4"><h2 class="font-bold text-slate-800">Horarios asignados</h2><p class="text-xs text-slate-500 mt-1">Consulta las clases recurrentes y los reemplazos registrados para cada instructor.</p></div><div class="grid gap-4 md:grid-cols-2"><article v-for="i in instructors" :key="`assignments-${i.id}`" class="rounded-xl border border-slate-100 p-4"><h3 class="font-bold text-slate-800">{{ name(i) }}</h3><div v-if="assignmentsFor(i.id).length" class="mt-3 space-y-2"><div v-for="item in assignmentsFor(i.id)" :key="`${item.id}-${item.kind}-${item.classDate || ''}`" class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs"><span><strong>{{ item.className }}</strong> · {{ item.startTime }}–{{ item.endTime }}<span v-if="item.kind === 'Recurrente'"> · {{ days[item.dayOfWeek] }}</span><span v-else> · {{ new Date(item.classDate).toLocaleDateString('es-CO', { timeZone: 'UTC' }) }}</span></span><span :class="item.kind === 'Recurrente' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'" class="ml-2 shrink-0 rounded-full px-2 py-0.5 font-bold">{{ item.kind }}</span></div></div><p v-else class="mt-3 text-xs text-slate-400">No tiene horarios asignados todavía.</p></article></div></section>
  <section class="bg-white rounded-2xl p-6 border border-slate-100"><div class="flex flex-wrap gap-3 items-end"><div><label class="label">Instructor</label><select v-model="filters.instructorId" class="field"><option value="">Todos</option><option v-for="i in instructors" :key="i.id" :value="i.id">{{name(i)}}</option></select></div><div><label class="label">Desde</label><input v-model="filters.startDate" type="date" class="field"></div><div><label class="label">Hasta</label><input v-model="filters.endDate" type="date" class="field"></div><button @click="runReport" class="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold">Generar liquidación</button></div><div v-if="report" class="mt-6"><div class="grid grid-cols-3 gap-3 mb-4"><div class="metric">{{report.totalClasses}}<small>Clases</small></div><div class="metric">{{report.totalAttendees}}<small>Asistentes</small></div><div class="metric">{{money(report.totalPayment)}}<small>Total a pagar</small></div></div><div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-left text-slate-500 border-b"><th>Fecha / clase</th><th>Instructor</th><th>Asistentes</th><th>Pago</th></tr></thead><tbody><tr v-for="row in report.details" :key="row.scheduleId+row.classDate" class="border-b border-slate-50"><td class="py-3">{{row.classDate}} · {{row.className}} <span v-if="row.isReplacement" class="text-xs text-amber-600">Reemplazo</span></td><td>{{name(row.instructor)}}</td><td>{{row.attendees}}</td><td class="font-bold">{{money(row.total)}}</td></tr></tbody></table></div></div></section>
  <div v-if="showForm" class="fixed inset-0 bg-slate-900/50 grid place-items-center p-4 z-50"><form @submit.prevent="save" class="bg-white rounded-2xl p-6 w-full max-w-xl grid grid-cols-2 gap-3"><h2 class="col-span-2 font-black text-lg">{{ editingInstructorId ? 'Editar instructor' : 'Nuevo instructor' }}</h2><input v-model="form.firstName" required placeholder="Nombre" class="field"><input v-model="form.lastName" placeholder="Apellido" class="field"><input v-model="form.identification" required placeholder="Cédula / Identificación" class="field"><input v-model="form.phoneNumber" placeholder="Teléfono" class="field"><input v-model="form.email" :required="form.createUserAccount" type="email" placeholder="Correo electrónico (Usuario de ingreso)" class="field"><input v-model="form.specialty" placeholder="Especialidad (Ej: Hatha Yoga)" class="field"><select v-model="form.businessType" class="field col-span-2"><option value="STUDIO">Estudio (Yoga / Pilates / Barre)</option><option value="GYM">Gimnasio</option><option value="ALL">Ambos / Todos los negocios</option></select><select v-model="form.paymentModel" class="field col-span-2"><option value="FIXED_PER_CLASS">Tarifa fija por clase</option><option value="PER_STUDENT">Tarifa por alumno</option><option value="HYBRID">Híbrido: base + alumno</option></select><input v-model.number="form.fixedClassRate" type="number" min="0" placeholder="Base por clase" class="field"><input v-model.number="form.perStudentRate" type="number" min="0" placeholder="Tarifa por alumno" class="field"><label class="col-span-2 flex items-start gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs text-indigo-950 cursor-pointer"><input v-model="form.createUserAccount" type="checkbox" class="mt-0.5 rounded border-indigo-300 text-indigo-600"><div><span class="font-bold block">🔑 Sincronizar usuario de acceso con rol Instructor</span><span class="text-indigo-700">El instructor podrá iniciar sesión con su <strong>Correo electrónico</strong> y su <strong>Cédula ({{ form.identification || 'identificación' }})</strong> como contraseña para pasar asistencia en sus clases.</span></div></label><button type="button" @click="showForm=false" class="py-2">Cancelar</button><button class="bg-blue-600 text-white rounded-xl py-2 font-bold">{{ editingInstructorId ? 'Actualizar' : 'Guardar' }}</button></form></div>
</div></AppLayout></template>
<style scoped>.field{width:100%;border:1px solid #e2e8f0;border-radius:.75rem;padding:.55rem .75rem;font-size:.875rem;background:white}.label{display:block;font-size:.7rem;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:.25rem}.metric{border-radius:.75rem;background:#f8fafc;padding:1rem;font-size:1.25rem;font-weight:800}.metric small{display:block;font-size:.7rem;color:#64748b;font-weight:600}</style>
