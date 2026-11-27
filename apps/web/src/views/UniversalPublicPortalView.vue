<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../services/api'

const route = useRoute()
const slug = computed(() => String(route.params.slug || 'empresa-demo'))

type PortalMode =
  | 'HOLISTIC'
  | 'PSYCHOLOGY'
  | 'SPA'
  | 'BEAUTY'
  | 'AUTOMOTIVE'
  | 'LAUNDRY'
  | 'VETERINARY'

const loadingCatalog = ref(true)
const catalogError = ref('')
const organization = ref<any>(null)
const activeVerticals = ref<string[]>([])
const branches = ref<any[]>([])
const serviceItems = ref<any[]>([])
const serviceWorkers = ref<any[]>([])

const portalMode = computed<PortalMode>(() => {
  const qMode = String(route.query.mode || route.query.vertical || '').toUpperCase()
  if (
    [
      'HOLISTIC',
      'PSYCHOLOGY',
      'SPA',
      'BEAUTY',
      'AUTOMOTIVE',
      'LAUNDRY',
      'VETERINARY',
    ].includes(qMode)
  ) {
    return qMode as PortalMode
  }

  const orgName = String(organization.value?.name || slug.value || '').toLowerCase()
  if (
    orgName.includes('psicolog') ||
    orgName.includes('mental') ||
    orgName.includes('psiquiatr')
  ) {
    return 'PSYCHOLOGY'
  }
  if (
    orgName.includes('holist') ||
    orgName.includes('terapia') ||
    orgName.includes('uma') ||
    orgName.includes('sanacion') ||
    orgName.includes('reiki')
  ) {
    return 'HOLISTIC'
  }
  if (orgName.includes('spa') || orgName.includes('masaje') || orgName.includes('relax')) {
    return 'SPA'
  }

  const verts = activeVerticals.value
  if (verts.length === 1) {
    if (verts[0] === 'AUTOMOTIVE') return 'AUTOMOTIVE'
    if (verts[0] === 'LAUNDRY') return 'LAUNDRY'
    if (verts[0] === 'VETERINARY') return 'VETERINARY'
    if (verts[0] === 'BEAUTY') return 'BEAUTY'
  }

  if (verts.includes('BEAUTY') && !verts.includes('AUTOMOTIVE') && !verts.includes('LAUNDRY')) {
    return 'HOLISTIC'
  }
  if (verts.includes('AUTOMOTIVE') && !verts.includes('BEAUTY')) return 'AUTOMOTIVE'
  if (verts.includes('LAUNDRY') && !verts.includes('BEAUTY')) return 'LAUNDRY'
  if (verts.includes('VETERINARY') && !verts.includes('BEAUTY')) return 'VETERINARY'

  return 'HOLISTIC'
})

interface PortalCopy {
  icon: string
  headerGradient: string
  badgeText: string
  defaultOrgTitle: string
  lookupHeading: string
  lookupLabel: string
  lookupPlaceholder: string
  lookupButtonText: string
  lookupEmptyTitle: string
  lookupEmptyHint: string
  tabTrackingLabel: string
  tabBookLabel: string
  showAppointments: boolean
  showServiceOrders: boolean
  showLaundryTickets: boolean
  showPets: boolean
  appointmentsSectionTitle: string
  bookHeading: string
  bookSubheading: string
  serviceFieldLabel: string
  servicePlaceholder: string
  workerFieldLabel: string
  workerAnyOption: string
  notesFieldLabel: string
  notesPlaceholder: string
  submitAppointmentButton: string
  feedbackSubjectLabel: string
  feedbackSubjectPlaceholder: string
  feedbackStaffLabel: string
  feedbackStaffPlaceholder: string
  whatsappGreeting: string
}

const copy = computed<PortalCopy>(() => {
  switch (portalMode.value) {
    case 'HOLISTIC':
      return {
        icon: '🌿',
        headerGradient: 'from-teal-950 via-emerald-900 to-teal-950',
        badgeText: 'Portal de Terapias Holísticas, Sanación & Bienestar',
        defaultOrgTitle: 'Centro de Terapias Holísticas & Bienestar',
        lookupHeading:
          '🔍 Consulta tus sesiones de terapia agendadas, tu historial de bienestar o tus puntos:',
        lookupLabel: 'Tu número de documento (cédula), celular o correo electrónico',
        lookupPlaceholder: 'Ingresa tu Cédula, Celular o Correo Electrónico...',
        lookupButtonText: 'Consultar Mis Sesiones',
        lookupEmptyTitle: 'Ingresa arriba tu Cédula, Celular o Correo Electrónico',
        lookupEmptyHint:
          'Podrás ver tus próximas sesiones holísticas confirmadas, el terapeuta asignado o reprogramar/cancelar si lo necesitas.',
        tabTrackingLabel: '🌿 Mis Sesiones Agendadas',
        tabBookLabel: '📅 Reservar Terapia / Sesión Online',
        showAppointments: true,
        showServiceOrders: false,
        showLaundryTickets: false,
        showPets: false,
        appointmentsSectionTitle: '🌿 Mis Sesiones y Terapias Programadas',
        bookHeading: '🌿 Reservar Cupo para Terapia Holística',
        bookSubheading:
          'Elige la terapia o sesión de sanación, tu terapeuta guía y el horario disponible.',
        serviceFieldLabel: 'Terapia o Sesión Holística',
        servicePlaceholder: 'Selecciona una terapia...',
        workerFieldLabel: 'Terapeuta / Guía Holístico (Opcional)',
        workerAnyOption: 'Cualquier terapeuta disponible',
        notesFieldLabel: 'Intención de tu sesión o condición de salud a tener en cuenta',
        notesPlaceholder:
          'Ej: Primera sesión de Reiki / Sound Healing, estrés, dolor lumbar, embarazo...',
        submitAppointmentButton: '🌿 Confirmar Reserva de Terapia',
        feedbackSubjectLabel: 'Terapia o Sesión Recibida',
        feedbackSubjectPlaceholder: 'Ej: Terapia Reiki, Armonización Sonora, Masaje Holístico...',
        feedbackStaffLabel: 'Terapeuta que te acompañó (Opcional)',
        feedbackStaffPlaceholder: 'Nombre de tu terapeuta...',
        whatsappGreeting: 'quiero consultar sobre las terapias holísticas y disponibilidad de sesiones.',
      }

    case 'PSYCHOLOGY':
      return {
        icon: '🧠',
        headerGradient: 'from-slate-900 via-sky-950 to-slate-900',
        badgeText: 'Portal de Consultas Psicológicas & Salud Mental',
        defaultOrgTitle: 'Centro de Psicología & Terapia Emocional',
        lookupHeading:
          '🔍 Consulta tus próximas citas psicológicas agendadas con tu documento o correo:',
        lookupLabel: 'Tu número de documento, celular o correo electrónico',
        lookupPlaceholder: 'Ingresa tu Documento de Identidad, Celular o Correo...',
        lookupButtonText: 'Consultar Mis Citas',
        lookupEmptyTitle: 'Ingresa arriba tu Documento de Identidad o Correo',
        lookupEmptyHint:
          'Verás tus sesiones de psicología programadas, el profesional asignado y el estado de confirmación.',
        tabTrackingLabel: '🧠 Mis Consultas Programadas',
        tabBookLabel: '📅 Agendar Consulta Psicológica',
        showAppointments: true,
        showServiceOrders: false,
        showLaundryTickets: false,
        showPets: false,
        appointmentsSectionTitle: '🧠 Mis Consultas Psicológicas',
        bookHeading: '🧠 Agendar Sesión de Psicología / Terapia',
        bookSubheading:
          'Selecciona el tipo de consulta (individual, pareja, valoración), tu psicólogo(a) y el horario.',
        serviceFieldLabel: 'Tipo de Consulta o Terapia',
        servicePlaceholder: 'Selecciona el tipo de consulta...',
        workerFieldLabel: 'Psicólogo(a) / Terapeuta (Opcional)',
        workerAnyOption: 'Asignar profesional disponible',
        notesFieldLabel: 'Motivo breve de consulta o preferencia (Confidencial)',
        notesPlaceholder:
          'Ej: Primera valoración, modalidad presencial o virtual, horario preferido...',
        submitAppointmentButton: '📅 Confirmar Consulta Psicológica',
        feedbackSubjectLabel: 'Tipo de Consulta',
        feedbackSubjectPlaceholder: 'Ej: Sesión de Psicología Individual, Terapia de Pareja...',
        feedbackStaffLabel: 'Psicólogo(a) tratante (Opcional)',
        feedbackStaffPlaceholder: 'Nombre del profesional...',
        whatsappGreeting: 'quiero consultar sobre el agendamiento de una cita psicológica.',
      }

    case 'SPA':
      return {
        icon: '💆‍♀️',
        headerGradient: 'from-rose-950 via-amber-950 to-stone-900',
        badgeText: 'Portal de Reservas de Spa, Masajes & Bienestar',
        defaultOrgTitle: 'Spa & Centro de Relajación',
        lookupHeading: '🔍 Consulta tus reservas de Spa, rituales y puntos de fidelidad:',
        lookupLabel: 'Tu número de documento, celular o correo',
        lookupPlaceholder: 'Ingresa tu Cédula, Celular o Correo Electrónico...',
        lookupButtonText: 'Ver Mis Reservas de Spa',
        lookupEmptyTitle: 'Ingresa arriba tu Cédula, Celular o Correo',
        lookupEmptyHint:
          'Consulta el horario de tus masajes o rituales de Spa programados y acumula puntos de fidelidad.',
        tabTrackingLabel: '💆‍♀️ Mis Reservas de Spa',
        tabBookLabel: '📅 Reservar Masaje / Ritual Online',
        showAppointments: true,
        showServiceOrders: false,
        showLaundryTickets: false,
        showPets: false,
        appointmentsSectionTitle: '💆‍♀️ Mis Citas y Rituales de Spa',
        bookHeading: '💆‍♀️ Reservar Experiencia de Spa o Masaje',
        bookSubheading: 'Elige tu tratamiento, masajista o cosmetóloga y la hora de tu visita.',
        serviceFieldLabel: 'Ritual, Masaje o Tratamiento',
        servicePlaceholder: 'Selecciona tu experiencia de Spa...',
        workerFieldLabel: 'Terapeuta de Spa / Esteticista (Opcional)',
        workerAnyOption: 'Cualquier especialista disponible',
        notesFieldLabel: 'Preferencias para tu sesión (presión del masaje, aromas, alergias)',
        notesPlaceholder: 'Ej: Presión suave, alergia a frutos secos, tensión en cuello y espalda...',
        submitAppointmentButton: '💆‍♀️ Confirmar Reserva en el Spa',
        feedbackSubjectLabel: 'Tratamiento o Ritual Recibido',
        feedbackSubjectPlaceholder: 'Ej: Masaje piedras calientes, Limpieza facial profunda...',
        feedbackStaffLabel: 'Terapeuta de Spa que te atendió (Opcional)',
        feedbackStaffPlaceholder: 'Nombre de la especialista...',
        whatsappGreeting: 'quiero consultar sobre los planes y reservas de Spa.',
      }

    case 'BEAUTY':
      return {
        icon: '💇‍♀️',
        headerGradient: 'from-slate-900 via-pink-950 to-slate-900',
        badgeText: 'Portal de Citas Online — Salón, Estética & Barbería',
        defaultOrgTitle: 'Salón de Belleza & Estética',
        lookupHeading: '🔍 Consulta tus citas agendadas y tus puntos de fidelidad:',
        lookupLabel: 'Tu número de documento, celular o correo',
        lookupPlaceholder: 'Ingresa tu Cédula, Celular o Correo...',
        lookupButtonText: 'Consultar Mis Citas',
        lookupEmptyTitle: 'Ingresa arriba tu Cédula, Celular o Correo',
        lookupEmptyHint: 'Revisa tus próximas citas con tu estilista o especialista.',
        tabTrackingLabel: '💇‍♀️ Mis Citas Agendadas',
        tabBookLabel: '📅 Agendar Cita Online',
        showAppointments: true,
        showServiceOrders: false,
        showLaundryTickets: false,
        showPets: false,
        appointmentsSectionTitle: '💇‍♀️ Mis Citas en el Salón',
        bookHeading: '💇‍♀️ Agendar Cita en el Salón',
        bookSubheading: 'Selecciona el servicio, tu profesional favorito y la hora que prefieras.',
        serviceFieldLabel: 'Servicio de Belleza / Estética',
        servicePlaceholder: 'Selecciona un servicio...',
        workerFieldLabel: 'Estilista / Especialista (Opcional)',
        workerAnyOption: 'Cualquier profesional disponible',
        notesFieldLabel: 'Notas o preferencias para tu cita',
        notesPlaceholder: 'Ej: Corte y cepillado, diseño de color...',
        submitAppointmentButton: '📅 Confirmar Cita Online',
        feedbackSubjectLabel: 'Servicio Recibido',
        feedbackSubjectPlaceholder: 'Ej: Corte, Colorimetría, Manicure...',
        feedbackStaffLabel: 'Profesional que te atendió (Opcional)',
        feedbackStaffPlaceholder: 'Nombre del estilista...',
        whatsappGreeting: 'quiero consultar sobre una cita en el salón.',
      }

    case 'AUTOMOTIVE':
      return {
        icon: '🏎️',
        headerGradient: 'from-slate-950 via-blue-950 to-slate-900',
        badgeText: 'Portal de Tracking de Taller Automotriz & Citas de Servicio',
        defaultOrgTitle: 'Centro de Servicio Automotriz',
        lookupHeading:
          '🔍 Consulta en vivo en qué etapa va tu vehículo en el taller con tu Placa o Cédula:',
        lookupLabel: 'Placa del vehículo (ej: ABC-123), número de orden o cédula',
        lookupPlaceholder: 'Ingresa la Placa de tu Vehículo (ej: ABC-123) o tu Cédula...',
        lookupButtonText: 'Ver Estado de Mi Vehículo',
        lookupEmptyTitle: 'Ingresa arriba la Placa de tu Vehículo o tu Cédula',
        lookupEmptyHint:
          'Verás en tiempo real si tu auto o moto está en diagnóstico, en bahía de reparación, esperando repuestos o listo para entrega.',
        tabTrackingLabel: '🏎️ Estado de Mi Vehículo en Taller',
        tabBookLabel: '📅 Agendar Cita de Taller / Revisión',
        showAppointments: true,
        showServiceOrders: true,
        showLaundryTickets: false,
        showPets: false,
        appointmentsSectionTitle: '📅 Mis Citas de Ingreso a Taller',
        bookHeading: '🏎️ Agendar Cita de Mantenimiento o Diagnóstico',
        bookSubheading:
          'Programa la revisión técnica, cambio de aceite o mantenimiento de tu vehículo.',
        serviceFieldLabel: 'Servicio de Taller / Mantenimiento',
        servicePlaceholder: 'Selecciona el servicio automotriz...',
        workerFieldLabel: 'Técnico / Mecánico Especialista (Opcional)',
        workerAnyOption: 'Cualquier técnico disponible',
        notesFieldLabel: 'Placa, Marca/Modelo y Falla o Servicio requerido',
        notesPlaceholder: 'Ej: Mazda 3 Placa ABC-123, mantenimiento 50.000 km o ruido en frenos...',
        submitAppointmentButton: '🏎️ Confirmar Cita en Taller',
        feedbackSubjectLabel: 'Servicio Realizado a tu Vehículo',
        feedbackSubjectPlaceholder: 'Ej: Sincronización, Frenos, Cambio de aceite...',
        feedbackStaffLabel: 'Técnico o Asesor que te atendió (Opcional)',
        feedbackStaffPlaceholder: 'Nombre del mecánico o asesor...',
        whatsappGreeting: 'quiero consultar sobre el estado de mi vehículo en el taller.',
      }

    case 'LAUNDRY':
      return {
        icon: '🧺',
        headerGradient: 'from-indigo-950 via-sky-950 to-slate-900',
        badgeText: 'Portal de Tracking de Lavandería & Tintorería en Vivo',
        defaultOrgTitle: 'Lavandería & Tintorería',
        lookupHeading:
          '🔍 Consulta en qué etapa están tus prendas (Lavado, Secado, Planchado o Listo en Perchero):',
        lookupLabel: 'Número de Ticket de Lavandería o tu Cédula / Celular',
        lookupPlaceholder: 'Ingresa tu Nro. de Ticket o tu Cédula / Celular...',
        lookupButtonText: 'Consultar Estado de Mis Prendas',
        lookupEmptyTitle: 'Ingresa arriba tu Número de Ticket o tu Cédula',
        lookupEmptyHint:
          'Conoce al instante si tu ropa ya está lista en perchero para recoger o en proceso de lavado y planchado.',
        tabTrackingLabel: '🧺 Estado de Mis Prendas y Tickets',
        tabBookLabel: '📅 Solicitar Recolección / Servicio',
        showAppointments: false,
        showServiceOrders: false,
        showLaundryTickets: true,
        showPets: false,
        appointmentsSectionTitle: '📅 Solicitudes Programadas',
        bookHeading: '🧺 Programar Entrega o Recolección de Prendas',
        bookSubheading: 'Agenda tu servicio de lavandería o tintorería.',
        serviceFieldLabel: 'Servicio de Lavandería',
        servicePlaceholder: 'Selecciona el servicio...',
        workerFieldLabel: 'Operario (Opcional)',
        workerAnyOption: 'Asignación automática en planta',
        notesFieldLabel: 'Detalle de prendas o instrucciones de lavado',
        notesPlaceholder: 'Ej: 2 trajes lavado en seco, edredón plumón...',
        submitAppointmentButton: '🧺 Confirmar Solicitud',
        feedbackSubjectLabel: 'Servicio de Lavandería Recibido',
        feedbackSubjectPlaceholder: 'Ej: Lavado por kilos, Tintorería traje, Planchado...',
        feedbackStaffLabel: 'Persona que te atendió (Opcional)',
        feedbackStaffPlaceholder: 'Nombre del asesor...',
        whatsappGreeting: 'quiero consultar sobre mi ticket de lavandería.',
      }

    case 'VETERINARY':
      return {
        icon: '🐾',
        headerGradient: 'from-teal-950 via-cyan-950 to-slate-900',
        badgeText: 'Portal Veterinario, Carnet Digital de Vacunación & Citas',
        defaultOrgTitle: 'Clínica Veterinaria & Pet Shop',
        lookupHeading:
          '🔍 Consulta el Carnet Digital de Vacunación de tu mascota, su estado en clínica o sus citas:',
        lookupLabel: 'Tu número de cédula, celular o correo registrado como propietario',
        lookupPlaceholder: 'Ingresa tu Cédula de Propietario, Celular o Correo...',
        lookupButtonText: 'Consultar Carnet y Citas de Mi Mascota',
        lookupEmptyTitle: 'Ingresa arriba tu Cédula de Propietario',
        lookupEmptyHint:
          'Accede al carnet digital de vacunas y desparasitaciones de tus mascotas, próximos refuerzos y citas veterinarias o de peluquería.',
        tabTrackingLabel: '🩺 Estado en Clínica y Citas',
        tabBookLabel: '📅 Agendar Consulta / Grooming',
        showAppointments: true,
        showServiceOrders: true,
        showLaundryTickets: false,
        showPets: true,
        appointmentsSectionTitle: '🐾 Citas Veterinarias y de Peluquería',
        bookHeading: '🐾 Agendar Consulta Veterinaria, Vacunación o Grooming',
        bookSubheading:
          'Selecciona el servicio clínico o baño/peluquería, el médico veterinario y la hora.',
        serviceFieldLabel: 'Servicio Veterinario / Pet Shop',
        servicePlaceholder: 'Selecciona consulta, vacuna o grooming...',
        workerFieldLabel: 'Médico Veterinario / Groomer (Opcional)',
        workerAnyOption: 'Cualquier profesional disponible',
        notesFieldLabel: 'Nombre de tu mascota, especie/raza y motivo de consulta',
        notesPlaceholder: 'Ej: Toby (Golden Retriever), refuerzo vacuna anual y baño...',
        submitAppointmentButton: '🐾 Confirmar Cita Veterinaria',
        feedbackSubjectLabel: 'Servicio Veterinario o Grooming',
        feedbackSubjectPlaceholder: 'Ej: Consulta médica, Vacunación, Baño y peluquería...',
        feedbackStaffLabel: 'Veterinario o Groomer que atendió a tu mascota (Opcional)',
        feedbackStaffPlaceholder: 'Nombre del doctor(a) o groomer...',
        whatsappGreeting: 'quiero consultar sobre una cita o atención veterinaria para mi mascota.',
      }
  }
})

const activeTab = ref<'tracking' | 'appointments' | 'pets' | 'feedback'>('tracking')
const actionMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)

// Búsqueda / Tracking
const trackingQuery = ref(localStorage.getItem('kuna_public_track_q') || '')
const loadingTrack = ref(false)
const trackError = ref('')
const trackData = ref<any>(null)

// Agendamiento de Cita Online
const todayStr = new Date().toISOString().split('T')[0] || ''
const submittingAppointment = ref(false)
const appointmentForm = ref({
  serviceItemId: '',
  workerId: '',
  appointmentDate: todayStr,
  appointmentTime: '10:00',
  fullName: '',
  identificationType: 'CC',
  identificationNumber: '',
  phoneNumber: '',
  email: '',
  notes: '',
})

// Calificación CSAT (1-5 ★)
const submittingFeedback = ref(false)
const feedbackForm = ref({
  subjectName: '',
  staffName: '',
  rating: 5,
  comment: '',
  isAnonymous: false,
})

const laundryStages = [
  { code: 'RECEIVED', label: '1. Recibido', icon: '📥' },
  { code: 'WASHING', label: '2. Lavado', icon: '🫧' },
  { code: 'DRYING', label: '3. Secado', icon: '🌬️' },
  { code: 'IRONING', label: '4. Planchado', icon: '♨️' },
  { code: 'READY', label: '5. Listo en Perchero', icon: '✅' },
]

const serviceOrderStages = computed(() => {
  if (portalMode.value === 'VETERINARY') {
    return [
      { code: 'PENDING', label: '1. Recepción / Triage', icon: '🐾' },
      { code: 'IN_PROGRESS', label: '2. En Consulta / Grooming', icon: '🩺' },
      { code: 'COMPLETED', label: '3. Alta Lista para Entrega', icon: '✅' },
      { code: 'BILLED', label: '4. Entregado', icon: '🏁' },
    ]
  }
  return [
    { code: 'PENDING', label: '1. Recepción / Diagnóstico', icon: '📋' },
    { code: 'IN_PROGRESS', label: '2. En Proceso / Bahía', icon: '🔧' },
    { code: 'COMPLETED', label: '3. Listo para Entrega', icon: '✅' },
    { code: 'BILLED', label: '4. Entregado / Facturado', icon: '🏁' },
  ]
})

function formatCurrency(val: number | string | null | undefined): string {
  const num = Number(val || 0)
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(num)
}

function formatDate(d?: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(d?: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatAppointmentStatus(status: string): string {
  const map: Record<string, string> = {
    SCHEDULED: 'Agendada',
    CONFIRMED: 'Confirmada',
    IN_SERVICE: 'En Sesión',
    COMPLETED: 'Finalizada',
    CANCELLED: 'Cancelada',
    NO_SHOW: 'No Asistió',
  }
  return map[status] || status
}

function getLaundryStageIndex(status: string): number {
  if (status === 'DELIVERED') return 5
  const idx = laundryStages.findIndex((s) => s.code === status)
  return idx >= 0 ? idx : 0
}

function getServiceOrderStageIndex(status: string): number {
  const idx = serviceOrderStages.value.findIndex((s) => s.code === status)
  return idx >= 0 ? idx : 0
}

async function fetchCatalog() {
  loadingCatalog.value = true
  catalogError.value = ''
  try {
    const res = await api.get(`/public-portal/catalog/${slug.value}`)
    organization.value = res.data?.organization || null
    activeVerticals.value = res.data?.activeVerticals || []
    branches.value = res.data?.branches || []
    serviceItems.value = res.data?.serviceItems || []
    serviceWorkers.value = res.data?.serviceWorkers || []

    if (serviceItems.value.length > 0 && !appointmentForm.value.serviceItemId) {
      appointmentForm.value.serviceItemId = serviceItems.value[0].id
    }

    // Si es un portal exclusivamente de citas (Terapias Holísticas, Psicología, Spa, Salón) y el usuario no tiene búsqueda previa, abrir directo en Reservar o Mis Sesiones
    if (
      ['HOLISTIC', 'PSYCHOLOGY', 'SPA', 'BEAUTY'].includes(portalMode.value) &&
      !trackingQuery.value
    ) {
      activeTab.value = 'appointments'
    }
  } catch (err: any) {
    catalogError.value =
      err?.response?.data?.message || 'No se pudo cargar la información del centro.'
  } finally {
    loadingCatalog.value = false
  }
}

async function handleTrackLookup(silent = false) {
  const clean = trackingQuery.value.trim()
  if (!clean) {
    if (!silent) trackError.value = `Ingresa ${copy.value.lookupLabel.toLowerCase()}`
    return
  }
  loadingTrack.value = true
  trackError.value = ''
  if (!silent) actionMessage.value = null
  try {
    const res = await api.get(`/public-portal/track/${slug.value}`, {
      params: { q: clean },
    })
    trackData.value = res.data
    localStorage.setItem('kuna_public_track_q', clean)

    if (res.data?.customer) {
      const c = res.data.customer
      appointmentForm.value.fullName = [c.firstName, c.lastName].filter(Boolean).join(' ')
      appointmentForm.value.identificationType = c.identificationType || 'CC'
      appointmentForm.value.identificationNumber = c.identificationNumber || ''
      appointmentForm.value.phoneNumber = c.phoneNumber || ''
      appointmentForm.value.email = c.email || ''
    }
  } catch (err: any) {
    trackData.value = null
    if (!silent) {
      trackError.value =
        err?.response?.data?.message ||
        'No encontramos registros con ese dato. Si es tu primera vez, puedes reservar directamente en la pestaña de agendamiento.'
    }
  } finally {
    loadingTrack.value = false
  }
}

function clearLookup() {
  trackData.value = null
  trackingQuery.value = ''
  trackError.value = ''
  localStorage.removeItem('kuna_public_track_q')
}

async function submitPublicAppointment() {
  submittingAppointment.value = true
  actionMessage.value = null
  try {
    const nameParts = appointmentForm.value.fullName.trim().split(/\s+/)
    const firstName = nameParts[0] || 'Cliente'
    const lastName = nameParts.slice(1).join(' ')

    const res = await api.post(`/public-portal/appointments/${slug.value}`, {
      branchId: branches.value[0]?.id,
      serviceItemId: appointmentForm.value.serviceItemId,
      workerId: appointmentForm.value.workerId || undefined,
      appointmentDate: appointmentForm.value.appointmentDate,
      appointmentTime: appointmentForm.value.appointmentTime,
      customerId: trackData.value?.customer?.id || undefined,
      firstName,
      lastName,
      identificationType: appointmentForm.value.identificationType,
      identificationNumber: appointmentForm.value.identificationNumber.trim(),
      phoneNumber: appointmentForm.value.phoneNumber.trim() || undefined,
      email: appointmentForm.value.email.trim() || undefined,
      notes: appointmentForm.value.notes.trim() || undefined,
    })

    const createdNumber = res.data?.appointmentNumber || 'Nueva Reserva'
    actionMessage.value = {
      type: 'success',
      text: `🎉 ¡Tu reserva (${createdNumber}) para el ${appointmentForm.value.appointmentDate} a las ${appointmentForm.value.appointmentTime} quedó registrada con éxito!`,
    }

    if (res.data?.customer?.identificationNumber) {
      trackingQuery.value = res.data.customer.identificationNumber
      await handleTrackLookup(true)
    }
    activeTab.value = 'tracking'
  } catch (err: any) {
    actionMessage.value = {
      type: 'error',
      text: err?.response?.data?.message || 'No se pudo completar la reserva.',
    }
  } finally {
    submittingAppointment.value = false
  }
}

async function cancelAppointment(apt: any) {
  if (!trackData.value?.customer?.id) return
  if (!confirm(`¿Deseas cancelar tu reserva ${apt.appointmentNumber}?`)) return
  try {
    await api.patch(`/public-portal/appointments/${slug.value}/${apt.id}/cancel`, {
      customerId: trackData.value.customer.id,
      reason: 'Cancelada por el usuario desde el Portal Online',
    })
    actionMessage.value = {
      type: 'success',
      text: 'Tu reserva fue cancelada correctamente.',
    }
    await handleTrackLookup(true)
  } catch (err: any) {
    actionMessage.value = {
      type: 'error',
      text: err?.response?.data?.message || 'No se pudo cancelar la reserva.',
    }
  }
}

async function submitFeedback() {
  submittingFeedback.value = true
  actionMessage.value = null
  try {
    await api.post(`/loyalty-feedback/public/feedback/${slug.value}`, {
      customerId: trackData.value?.customer?.id || undefined,
      customerIdentifier: trackingQuery.value.trim() || undefined,
      verticalCode: activeVerticals.value[0] || 'CORE',
      sourceType: 'PUBLIC_PORTAL',
      subjectName: feedbackForm.value.subjectName || 'Atención General',
      staffName: feedbackForm.value.staffName || undefined,
      rating: Number(feedbackForm.value.rating),
      comment: feedbackForm.value.comment || undefined,
      isAnonymous: feedbackForm.value.isAnonymous,
    })
    feedbackForm.value.comment = ''
    actionMessage.value = {
      type: 'success',
      text: '⭐ ¡Gracias por tu calificación! Si estabas identificado, sumaste +10 puntos de fidelidad.',
    }
    if (trackData.value) {
      await handleTrackLookup(true)
    }
  } catch (err: any) {
    actionMessage.value = {
      type: 'error',
      text: err?.response?.data?.message || 'No se pudo enviar tu calificación.',
    }
  } finally {
    submittingFeedback.value = false
  }
}

function getWhatsAppLink(): string {
  const rawPhone = branches.value[0]?.phoneNumber || ''
  const cleanPhone = rawPhone.replace(/\D/g, '')
  const targetPhone =
    cleanPhone.length >= 10
      ? cleanPhone.startsWith('57')
        ? cleanPhone
        : `57${cleanPhone}`
      : ''
  const msg = `Hola ${organization.value?.name || ''}, ${copy.value.whatsappGreeting}`
  const encoded = encodeURIComponent(msg)
  return targetPhone ? `https://wa.me/${targetPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`
}

onMounted(async () => {
  await fetchCatalog()
  if (trackingQuery.value) {
    await handleTrackLookup(true)
  }
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-800 pb-16">
    <!-- Hero Header Adaptado al Negocio -->
    <header :class="['bg-gradient-to-r text-white shadow-lg', copy.headerGradient]">
      <div class="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-2xl shadow-inner">
              {{ copy.icon }}
            </div>
            <div>
              <span class="inline-block text-[11px] font-bold uppercase tracking-widest text-white/90 bg-white/15 px-2.5 py-0.5 rounded-full border border-white/20 mb-1">
                {{ copy.badgeText }}
              </span>
              <h1 class="text-2xl sm:text-3xl font-black tracking-tight">
                {{ organization?.name || copy.defaultOrgTitle }}
              </h1>
              <p v-if="branches.length > 0" class="text-xs sm:text-sm text-slate-200 mt-0.5">
                📍 {{ branches[0]?.name }}
                <span v-if="branches[0]?.address"> • {{ branches[0]?.address }}</span>
                <span v-if="branches[0]?.city"> ({{ branches[0]?.city }})</span>
              </p>
            </div>
          </div>

          <a
            :href="getWhatsAppLink()"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition"
          >
            <span>💬</span> WhatsApp Atención
          </a>
        </div>

        <!-- Buscador Adaptado a la Vertical -->
        <div class="mt-6 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5">
          <div v-if="!trackData">
            <search>
              <form @submit.prevent="handleTrackLookup(false)" aria-labelledby="track-lookup-heading">
                <p id="track-lookup-heading" class="text-xs sm:text-sm font-semibold text-white/95 mb-2.5">
                  {{ copy.lookupHeading }}
                </p>
                <div class="flex flex-col sm:flex-row gap-2.5">
                  <div class="flex-1">
                    <label for="track-query-input" class="sr-only">{{ copy.lookupLabel }}</label>
                    <input
                      id="track-query-input"
                      v-model="trackingQuery"
                      name="q"
                      type="text"
                      autocorrect="off"
                      autocapitalize="none"
                      spellcheck="false"
                      enterkeyhint="search"
                      :placeholder="copy.lookupPlaceholder"
                      class="w-full px-4 py-2.5 rounded-xl bg-white text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <button
                    type="submit"
                    :disabled="loadingTrack"
                    class="px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-sm shadow transition cursor-pointer disabled:opacity-50"
                  >
                    {{ loadingTrack ? 'Consultando...' : copy.lookupButtonText }}
                  </button>
                </div>
                <p v-if="trackError" role="status" class="text-xs text-amber-200 mt-2 font-medium">
                  ⚠️ {{ trackError }}
                </p>
              </form>
            </search>
          </div>

          <!-- Cliente / Paciente Identificado -->
          <div v-else class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <p class="text-sm sm:text-base font-bold text-white">
                  ¡Hola, {{ trackData.customer.firstName }} {{ trackData.customer.lastName || '' }}!
                </p>
                <span class="text-xs bg-white/15 px-2.5 py-0.5 rounded-full text-white/90">
                  Doc: {{ trackData.customer.identificationNumber }}
                </span>
                <span class="text-xs bg-amber-400/20 border border-amber-300/40 px-2.5 py-0.5 rounded-full text-amber-200 font-bold">
                  ⭐ {{ Number(trackData.customer.loyaltyPoints || 0).toLocaleString('es-CO') }} pts fidelidad
                </span>
              </div>
              <p class="text-xs text-white/80 mt-1 flex flex-wrap gap-3">
                <span v-if="copy.showAppointments">
                  Sesiones / Citas: <strong>{{ trackData.appointments?.length || 0 }}</strong>
                </span>
                <span v-if="copy.showServiceOrders">
                  Órdenes en servicio: <strong>{{ trackData.serviceOrders?.length || 0 }}</strong>
                </span>
                <span v-if="copy.showLaundryTickets">
                  Tickets Lavandería: <strong>{{ trackData.laundryTickets?.length || 0 }}</strong>
                </span>
                <span v-if="copy.showPets">
                  Mascotas: <strong>{{ trackData.pets?.length || 0 }}</strong>
                </span>
              </p>
            </div>

            <button
              type="button"
              @click="clearLookup"
              class="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-semibold text-white transition cursor-pointer"
            >
              Cambiar documento
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Contenido Principal -->
    <main class="max-w-5xl mx-auto px-4 mt-6">
      <div
        v-if="actionMessage"
        role="status"
        class="mb-5 p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-sm"
        :class="
          actionMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        "
      >
        <p class="text-sm font-semibold">{{ actionMessage.text }}</p>
        <button type="button" @click="actionMessage = null" class="text-xs font-bold underline cursor-pointer">
          Cerrar
        </button>
      </div>

      <!-- Pestañas Adaptadas Exclusivamente al Tipo de Negocio -->
      <div class="flex flex-wrap gap-2 border-b border-slate-200 pb-3 mb-6">
        <button
          v-if="copy.showAppointments && ['HOLISTIC', 'PSYCHOLOGY', 'SPA', 'BEAUTY'].includes(portalMode)"
          type="button"
          @click="activeTab = 'appointments'"
          class="px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer"
          :class="
            activeTab === 'appointments'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          "
        >
          {{ copy.tabBookLabel }}
        </button>

        <button
          type="button"
          @click="activeTab = 'tracking'"
          class="px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer"
          :class="
            activeTab === 'tracking'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          "
        >
          {{ copy.tabTrackingLabel }}
        </button>

        <button
          v-if="copy.showAppointments && !['HOLISTIC', 'PSYCHOLOGY', 'SPA', 'BEAUTY'].includes(portalMode)"
          type="button"
          @click="activeTab = 'appointments'"
          class="px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer"
          :class="
            activeTab === 'appointments'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          "
        >
          {{ copy.tabBookLabel }}
        </button>

        <button
          v-if="copy.showPets"
          type="button"
          @click="activeTab = 'pets'"
          class="px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer"
          :class="
            activeTab === 'pets'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          "
        >
          🐾 Carnet Digital de Mascotas ({{ trackData?.pets?.length || 0 }})
        </button>

        <button
          type="button"
          @click="activeTab = 'feedback'"
          class="px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer"
          :class="
            activeTab === 'feedback'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          "
        >
          ⭐ Calificar Atención (+10 pts)
        </button>
      </div>

      <!-- TAB 1: CONSULTA / ESTADO SEGÚN LA VERTICAL -->
      <section v-if="activeTab === 'tracking'" class="space-y-6">
        <div v-if="!trackData" class="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <p class="text-base font-bold text-slate-800 mb-1">
            {{ copy.lookupEmptyTitle }}
          </p>
          <p class="text-xs text-slate-500">
            {{ copy.lookupEmptyHint }}
          </p>
        </div>

        <template v-else>
          <!-- 1A. TICKETS DE LAVANDERÍA (Solo si el negocio es Lavandería) -->
          <div
            v-if="copy.showLaundryTickets && trackData.laundryTickets && trackData.laundryTickets.length > 0"
            class="space-y-3"
          >
            <h2 class="text-sm font-black uppercase text-slate-700 flex items-center gap-2">
              🧺 Tracking de Lavandería & Tintorería ({{ trackData.laundryTickets.length }})
            </h2>
            <div
              v-for="ticket in trackData.laundryTickets"
              :key="ticket.id"
              class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
            >
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <span class="text-base font-black text-slate-900">
                    Ticket {{ ticket.ticketNumber }}
                  </span>
                  <span
                    v-if="ticket.isExpress"
                    class="ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                  >
                    ⚡ Servicio Express
                  </span>
                  <p class="text-xs text-slate-500 mt-0.5">
                    Piezas: <strong>{{ ticket.totalPieces }}</strong>
                    <span v-if="ticket.totalWeightKg"> • Peso: <strong>{{ ticket.totalWeightKg }} kg</strong></span>
                    <span v-if="ticket.rackLocation"> • Ubicación: <strong class="text-indigo-700">{{ ticket.rackLocation }}</strong></span>
                  </p>
                </div>
                <div class="text-right">
                  <span class="text-xs text-slate-400 block">Total Ticket</span>
                  <span class="text-lg font-black text-slate-900">{{ formatCurrency(ticket.total) }}</span>
                </div>
              </div>

              <div class="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div
                  v-for="(stage, idx) in laundryStages"
                  :key="stage.code"
                  class="p-2.5 rounded-xl border text-center text-xs font-bold transition"
                  :class="
                    idx <= getLaundryStageIndex(ticket.status)
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  "
                >
                  <span class="block text-base">{{ stage.icon }}</span>
                  <span>{{ stage.label }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 1B. ÓRDENES DE TALLER O ATENCIÓN EN CLÍNICA (Solo Automotriz o Veterinaria) -->
          <div
            v-if="copy.showServiceOrders && trackData.serviceOrders && trackData.serviceOrders.length > 0"
            class="space-y-3"
          >
            <h2 class="text-sm font-black uppercase text-slate-700 flex items-center gap-2">
              {{ portalMode === 'VETERINARY' ? '🩺 Estado de Atención en Clínica Veterinaria' : '🏎️ Estado de Mi Vehículo en Taller' }} ({{ trackData.serviceOrders.length }})
            </h2>
            <div
              v-for="order in trackData.serviceOrders"
              :key="order.id"
              class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
            >
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <span class="text-base font-black text-slate-900">
                    Orden {{ order.orderNumber }} — {{ order.pet?.name || order.assetName }}
                  </span>
                  <span
                    v-if="portalMode === 'AUTOMOTIVE' && (order.assetIdentifier || order.vehicle?.licensePlate)"
                    class="ml-2 px-2.5 py-0.5 rounded-lg text-xs font-black bg-amber-100 text-amber-900 border border-amber-300"
                  >
                    Placa: {{ order.vehicle?.licensePlate || order.assetIdentifier }}
                  </span>
                  <p class="text-xs text-slate-500 mt-0.5">
                    Ingreso: {{ formatDate(order.createdAt) }}
                    <span v-if="order.assignedWorker">
                      • Profesional: <strong>{{ order.assignedWorker.firstName }} {{ order.assignedWorker.lastName || '' }}</strong>
                    </span>
                  </p>
                </div>
                <div class="text-right">
                  <span class="text-xs text-slate-400 block">Total Orden</span>
                  <span class="text-lg font-black text-slate-900">{{ formatCurrency(order.total) }}</span>
                </div>
              </div>

              <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div
                  v-for="(stage, idx) in serviceOrderStages"
                  :key="stage.code"
                  class="p-2.5 rounded-xl border text-center text-xs font-bold"
                  :class="
                    idx <= getServiceOrderStageIndex(order.status)
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  "
                >
                  <span class="block text-base">{{ stage.icon }}</span>
                  <span>{{ stage.label }}</span>
                </div>
              </div>

              <div v-if="order.diagnosis || order.resolutionNotes" class="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                <p v-if="order.diagnosis"><strong>🔎 Diagnóstico:</strong> {{ order.diagnosis }}</p>
                <p v-if="order.resolutionNotes"><strong>✅ Observaciones finales:</strong> {{ order.resolutionNotes }}</p>
              </div>
            </div>
          </div>

          <!-- 1C. CITAS / SESIONES AGENDADAS (Terapias Holísticas, Psicología, Spa, Salón, Veterinaria) -->
          <div
            v-if="copy.showAppointments && trackData.appointments && trackData.appointments.length > 0"
            class="space-y-3"
          >
            <h2 class="text-sm font-black uppercase text-slate-700 flex items-center gap-2">
              {{ copy.appointmentsSectionTitle }} ({{ trackData.appointments.length }})
            </h2>
            <div
              v-for="apt in trackData.appointments"
              :key="apt.id"
              class="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-black text-slate-900">{{ apt.appointmentNumber }}</span>
                  <span
                    class="px-2.5 py-0.5 rounded-full text-xs font-bold border"
                    :class="
                      apt.status === 'CONFIRMED' || apt.status === 'SCHEDULED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : apt.status === 'CANCELLED'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                    "
                  >
                    {{ formatAppointmentStatus(apt.status) }}
                  </span>
                </div>
                <p class="text-xs text-slate-600 mt-1">
                  📅 <strong>{{ formatDateTime(apt.startAt) }}</strong>
                  <span v-if="apt.worker">
                    • Profesional: <strong>{{ apt.worker.firstName }} {{ apt.worker.lastName || '' }}</strong>
                  </span>
                </p>
                <p v-if="apt.items?.length" class="text-xs text-slate-500 mt-0.5">
                  {{ copy.serviceFieldLabel }}: <strong>{{ apt.items.map((i: any) => i.serviceItem?.name).join(', ') }}</strong> ({{ formatCurrency(apt.totalEstimated) }})
                </p>
              </div>

              <button
                v-if="['SCHEDULED', 'CONFIRMED'].includes(apt.status)"
                type="button"
                @click="cancelAppointment(apt)"
                class="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer"
              >
                Cancelar Reserva
              </button>
            </div>
          </div>

          <div
            v-if="
              (!copy.showLaundryTickets || !trackData.laundryTickets?.length) &&
              (!copy.showServiceOrders || !trackData.serviceOrders?.length) &&
              (!copy.showAppointments || !trackData.appointments?.length)
            "
            class="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500"
          >
            No tienes registros activos en este momento.
            <span v-if="copy.showAppointments">
              Puedes programar una nueva sesión en la pestaña <strong>{{ copy.tabBookLabel }}</strong>.
            </span>
          </div>
        </template>
      </section>

      <!-- TAB 2: AGENDAR SESIÓN / TERAPIA / CITA ONLINE -->
      <section v-if="activeTab === 'appointments' && copy.showAppointments">
        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-2xl mx-auto">
          <h2 id="book-apt-heading" class="text-lg font-black text-slate-900">
            {{ copy.bookHeading }}
          </h2>
          <p class="text-xs text-slate-500 mt-1">
            {{ copy.bookSubheading }}
          </p>

          <form @submit.prevent="submitPublicAppointment" aria-labelledby="book-apt-heading" class="mt-5 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="apt-service" class="block text-xs font-bold uppercase text-slate-600 mb-1">
                  {{ copy.serviceFieldLabel }} <span aria-hidden="true">*</span>
                </label>
                <select
                  id="apt-service"
                  v-model="appointmentForm.serviceItemId"
                  name="serviceItemId"
                  required
                  class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option disabled value="">{{ copy.servicePlaceholder }}</option>
                  <option v-for="s in serviceItems" :key="s.id" :value="s.id">
                    {{ s.name }} — {{ formatCurrency(s.basePrice) }} ({{ s.estimatedMinutes }} min)
                  </option>
                </select>
              </div>

              <div>
                <label for="apt-worker" class="block text-xs font-bold uppercase text-slate-600 mb-1">
                  {{ copy.workerFieldLabel }}
                </label>
                <select
                  id="apt-worker"
                  v-model="appointmentForm.workerId"
                  name="workerId"
                  class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">{{ copy.workerAnyOption }}</option>
                  <option v-for="w in serviceWorkers" :key="w.id" :value="w.id">
                    {{ w.firstName }} {{ w.lastName || '' }} {{ w.specialty ? `(${w.specialty})` : '' }}
                  </option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="apt-date" class="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Fecha de la Sesión <span aria-hidden="true">*</span>
                </label>
                <input
                  id="apt-date"
                  v-model="appointmentForm.appointmentDate"
                  name="appointmentDate"
                  type="date"
                  :min="todayStr"
                  required
                  class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label for="apt-time" class="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Hora Preferida <span aria-hidden="true">*</span>
                </label>
                <input
                  id="apt-time"
                  v-model="appointmentForm.appointmentTime"
                  name="appointmentTime"
                  type="time"
                  required
                  class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label for="apt-fullname" class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Tu Nombre Completo <span aria-hidden="true">*</span>
              </label>
              <input
                id="apt-fullname"
                v-model="appointmentForm.fullName"
                name="name"
                type="text"
                autocomplete="name"
                required
                placeholder="Ej: Laura Martínez"
                class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label for="apt-id-type" class="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Tipo Doc.
                </label>
                <select
                  id="apt-id-type"
                  v-model="appointmentForm.identificationType"
                  name="identificationType"
                  class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="CC">Cédula (CC)</option>
                  <option value="CE">Cédula Extranjería</option>
                  <option value="PASSPORT">Pasaporte</option>
                  <option value="NIT">NIT</option>
                </select>
              </div>
              <div class="sm:col-span-2">
                <label for="apt-id-num" class="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Número de Documento <span aria-hidden="true">*</span>
                </label>
                <input
                  id="apt-id-num"
                  v-model="appointmentForm.identificationNumber"
                  name="identificationNumber"
                  type="text"
                  autocorrect="off"
                  spellcheck="false"
                  required
                  placeholder="Ej: 1020304050"
                  class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="apt-phone" class="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Celular / WhatsApp <span aria-hidden="true">*</span>
                </label>
                <input
                  id="apt-phone"
                  v-model="appointmentForm.phoneNumber"
                  name="phone"
                  type="tel"
                  autocomplete="tel"
                  required
                  placeholder="Ej: 3001234567"
                  class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label for="apt-email" class="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Correo Electrónico
                </label>
                <input
                  id="apt-email"
                  v-model="appointmentForm.email"
                  name="email"
                  type="email"
                  autocomplete="email"
                  spellcheck="false"
                  placeholder="tu@correo.com"
                  class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label for="apt-notes" class="block text-xs font-bold uppercase text-slate-600 mb-1">
                {{ copy.notesFieldLabel }}
              </label>
              <textarea
                id="apt-notes"
                v-model="appointmentForm.notes"
                name="notes"
                rows="2"
                :placeholder="copy.notesPlaceholder"
                class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              ></textarea>
            </div>

            <div class="pt-2 flex justify-end">
              <button
                type="submit"
                :disabled="submittingAppointment || !appointmentForm.serviceItemId"
                class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
              >
                {{ submittingAppointment ? 'Agendando...' : copy.submitAppointmentButton }}
              </button>
            </div>
          </form>
        </div>
      </section>

      <!-- TAB 3: CARNET DIGITAL DE MASCOTAS Y VACUNACIÓN (Exclusivo para VETERINARY) -->
      <section v-if="activeTab === 'pets' && copy.showPets" class="space-y-4">
        <div v-if="!trackData" class="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <p class="text-base font-bold text-slate-800 mb-1">
            Identifícate arriba con tu número de documento
          </p>
          <p class="text-xs text-slate-500">
            Para visualizar la ficha clínica y el carnet de vacunación y desparasitación de tus mascotas.
          </p>
        </div>

        <div
          v-else-if="!trackData.pets || trackData.pets.length === 0"
          class="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500"
        >
          No tienes mascotas registradas con este documento.
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="pet in trackData.pets"
            :key="pet.id"
            class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
          >
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 class="text-lg font-black text-slate-900">🐾 {{ pet.name }}</h3>
                <p class="text-xs text-slate-500">
                  {{ pet.species }} {{ pet.breed ? `• ${pet.breed}` : '' }}
                  <span v-if="pet.weightKg"> • {{ pet.weightKg }} kg</span>
                </p>
              </div>
              <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Carnet Digital Activo
              </span>
            </div>

            <div>
              <p class="text-xs font-bold uppercase text-slate-500 mb-2">💉 Vacunas y Desparasitaciones</p>
              <div v-if="!pet.vaccinations || pet.vaccinations.length === 0" class="text-xs text-slate-400 italic">
                Sin vacunas registradas aún.
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="vac in pet.vaccinations"
                  :key="vac.id"
                  class="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-center justify-between"
                >
                  <div>
                    <p class="font-bold text-slate-800">{{ vac.vaccineName }} ({{ vac.type }})</p>
                    <p class="text-slate-500">Aplicada: {{ formatDate(vac.appliedAt) }}</p>
                  </div>
                  <div v-if="vac.nextDueDate" class="text-right">
                    <span class="text-[10px] uppercase font-bold text-amber-700 block">Próximo Refuerzo</span>
                    <span class="font-black text-amber-800">{{ formatDate(vac.nextDueDate) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- TAB 4: CALIFICAR ATENCIÓN (1-5 ★) -->
      <section v-if="activeTab === 'feedback'">
        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-2xl mx-auto">
          <h2 id="universal-fb-heading" class="text-lg font-black text-slate-900">
            ⭐ Califica Nuestra Atención (1 a 5 Estrellas)
          </h2>
          <p class="text-xs text-slate-500 mt-1">
            Si estás identificado con tu documento, recibes automáticamente <strong>+10 puntos de fidelidad</strong> por compartir tu opinión.
          </p>

          <form @submit.prevent="submitFeedback" aria-labelledby="universal-fb-heading" class="mt-5 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="univ-fb-subject" class="block text-xs font-bold uppercase text-slate-600 mb-1">
                  {{ copy.feedbackSubjectLabel }}
                </label>
                <input
                  id="univ-fb-subject"
                  v-model="feedbackForm.subjectName"
                  name="subjectName"
                  type="text"
                  :placeholder="copy.feedbackSubjectPlaceholder"
                  class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label for="univ-fb-staff" class="block text-xs font-bold uppercase text-slate-600 mb-1">
                  {{ copy.feedbackStaffLabel }}
                </label>
                <input
                  id="univ-fb-staff"
                  v-model="feedbackForm.staffName"
                  name="staffName"
                  type="text"
                  :placeholder="copy.feedbackStaffPlaceholder"
                  class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
            </div>

            <fieldset class="border border-slate-200 rounded-xl p-3.5">
              <legend class="text-xs font-bold uppercase text-slate-600 px-1">
                Calificación (1 a 5 Estrellas)
              </legend>
              <div class="grid grid-cols-5 gap-2 mt-1">
                <div
                  v-for="star in [1, 2, 3, 4, 5]"
                  :key="star"
                  class="flex items-center justify-center gap-1.5 py-2 rounded-lg border"
                  :class="feedbackForm.rating === star ? 'bg-amber-50 border-amber-400 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-600'"
                >
                  <input
                    :id="`univ-star-${star}`"
                    v-model.number="feedbackForm.rating"
                    type="radio"
                    name="rating"
                    :value="star"
                    class="accent-amber-500"
                  />
                  <label :for="`univ-star-${star}`" class="text-xs font-black cursor-pointer">
                    {{ star }} ★
                  </label>
                </div>
              </div>
            </fieldset>

            <div>
              <label for="univ-fb-comment" class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Comentario o Sugerencia
              </label>
              <textarea
                id="univ-fb-comment"
                v-model="feedbackForm.comment"
                name="comment"
                rows="3"
                placeholder="Cuéntanos cómo fue tu experiencia..."
                class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              ></textarea>
            </div>

            <div class="pt-2 flex justify-end">
              <button
                type="submit"
                :disabled="submittingFeedback"
                class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
              >
                {{ submittingFeedback ? 'Enviando...' : '⭐ Enviar Calificación' }}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  </div>
</template>
