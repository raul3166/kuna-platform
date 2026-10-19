<template>
  <AppLayout>
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- Encabezado -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 rounded-full">
              Admisiones, Cursos & Cohortes
            </span>
            <span class="text-xs text-slate-400">Integrado con Clientes, Personal Docente, Inventario y POS</span>
          </div>
          <h1 class="text-2xl font-bold text-slate-900 mt-1">Oferta Académica, Grupos y Consola de Matrículas</h1>
          <p class="text-sm text-slate-500">
            Administra cursos, abre horarios con docentes, matricula alumnos con becas/kits de estudio y factura en POS.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <router-link
            to="/academy-dashboard"
            class="px-3.5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition"
          >
            ← Campus & Asistencia
          </router-link>
          <button
            @click="showCourseModal = true"
            class="px-3.5 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 transition"
          >
            + Nuevo Curso
          </button>
          <button
            @click="showCohortModal = true"
            class="px-3.5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
          >
            + Abrir Grupo / Horario
          </button>
          <button
            @click="openEnrollmentModal()"
            class="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-sm"
          >
            🎓 Matricular Estudiante
          </button>
        </div>
      </div>

      <!-- Pestañas de Navegación -->
      <div class="flex items-center gap-2 border-b border-slate-200">
        <button
          @click="activeTab = 'enrollments'"
          class="px-5 py-3 text-sm font-bold border-b-2 transition"
          :class="activeTab === 'enrollments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'"
        >
          📋 Matrículas & Estudiantes ({{ enrollments.length }})
        </button>
        <button
          @click="activeTab = 'cohorts'"
          class="px-5 py-3 text-sm font-bold border-b-2 transition"
          :class="activeTab === 'cohorts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'"
        >
          🏫 Grupos / Cohortes ({{ cohorts.length }})
        </button>
        <button
          @click="activeTab = 'courses'"
          class="px-5 py-3 text-sm font-bold border-b-2 transition"
          :class="activeTab === 'courses' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'"
        >
          📚 Programas / Cursos ({{ courses.length }})
        </button>
      </div>

      <!-- TAB 1: MATRÍCULAS Y ESTUDIANTES -->
      <div v-if="activeTab === 'enrollments'" class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-bold text-slate-900">Directorio de Matrículas Académicas</h2>
            <p class="text-xs text-slate-500">Gestiona el estado académico del alumno, su calificación y el pago de su matrícula en POS.</p>
          </div>
          <select
            v-model="filterCohortId"
            @change="loadAll"
            class="px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
          >
            <option value="">Todos los grupos / cohortes</option>
            <option v-for="c in cohorts" :key="c.id" :value="c.id">
              {{ c.code }} - {{ c.name }} ({{ c.course?.name }})
            </option>
          </select>
        </div>

        <div v-if="enrollments.length === 0" class="p-12 text-center space-y-3">
          <div class="text-4xl">🎓</div>
          <div class="font-bold text-slate-800">No hay matrículas registradas</div>
          <p class="text-xs text-slate-500">Inscribe a tu primer alumno seleccionando un grupo abierto.</p>
          <button
            @click="openEnrollmentModal()"
            class="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
          >
            + Matricular Primer Estudiante
          </button>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                <th class="py-3 px-4">N° Matrícula</th>
                <th class="py-3 px-4">Estudiante / Acudiente</th>
                <th class="py-3 px-4">Programa & Grupo</th>
                <th class="py-3 px-4">Estado Académico</th>
                <th class="py-3 px-4">Asist. / Nota</th>
                <th class="py-3 px-4">Valor Pactado</th>
                <th class="py-3 px-4">Acciones / Cobro POS</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr v-for="enr in enrollments" :key="enr.id" class="hover:bg-slate-50">
                <td class="py-3 px-4 font-mono text-xs font-bold text-blue-700">
                  {{ enr.enrollmentNumber }}
                  <div class="text-[10px] text-slate-400 font-normal">{{ formatDate(enr.enrolledAt) }}</div>
                </td>
                <td class="py-3 px-4">
                  <div class="font-bold text-slate-900">
                    {{ enr.studentCustomer?.firstName }} {{ enr.studentCustomer?.lastName || '' }}
                  </div>
                  <div class="text-xs text-slate-500">
                    Doc: {{ enr.studentCustomer?.identificationNumber || 'N/A' }} | Tel: {{ enr.studentCustomer?.phoneNumber || '-' }}
                  </div>
                  <div v-if="enr.guardianName" class="text-[11px] text-indigo-700">
                    Acudiente: {{ enr.guardianName }} ({{ enr.guardianPhone || '-' }})
                  </div>
                </td>
                <td class="py-3 px-4">
                  <div class="font-bold text-slate-900">{{ enr.cohort?.course?.name }}</div>
                  <div class="text-xs text-slate-500">{{ enr.cohort?.name }} ({{ enr.cohort?.scheduleLabel }})</div>
                </td>
                <td class="py-3 px-4">
                  <select
                    :value="enr.status"
                    @change="changeEnrollmentStatus(enr.id, ($event.target as HTMLSelectElement).value)"
                    class="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200"
                    :class="{
                      'bg-emerald-50 text-emerald-800': enr.status === 'ACTIVE',
                      'bg-blue-50 text-blue-800': enr.status === 'COMPLETED',
                      'bg-amber-50 text-amber-800': enr.status === 'PAUSED',
                      'bg-rose-50 text-rose-700': enr.status === 'DROPPED',
                    }"
                  >
                    <option value="ACTIVE">🟢 Activo</option>
                    <option value="COMPLETED">🎓 Graduado / Completado</option>
                    <option value="PAUSED">⏸️ Congelado</option>
                    <option value="DROPPED">🔴 Retirado</option>
                  </select>
                </td>
                <td class="py-3 px-4">
                  <div class="text-xs font-bold text-slate-800">
                    Asist: {{ Math.round(Number(enr.attendancePct ?? 100)) }}%
                  </div>
                  <div class="text-xs text-slate-500">
                    Nota: <strong>{{ enr.finalGrade !== null && enr.finalGrade !== undefined ? Number(enr.finalGrade).toFixed(1) : 'S/N' }}</strong>
                  </div>
                </td>
                <td class="py-3 px-4">
                  <div class="font-extrabold text-slate-900">{{ formatCurrency(enr.agreedTotalAmount) }}</div>
                  <div v-if="Number(enr.scholarshipPct) > 0" class="text-[11px] text-emerald-700 font-semibold">
                    Beca {{ Number(enr.scholarshipPct) }}% aplicada
                  </div>
                </td>
                <td class="py-3 px-4">
                  <span
                    v-if="enr.serviceOrder?.saleId"
                    class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800"
                  >
                    ✅ Pagado en POS
                  </span>
                  <router-link
                    v-else-if="enr.serviceOrder?.id"
                    :to="`/pos?serviceOrderId=${enr.serviceOrder.id}`"
                    class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition shadow-sm"
                  >
                    💳 Facturar en POS
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 2: GRUPOS Y COHORTES -->
      <div v-if="activeTab === 'cohorts'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="cohort in cohorts"
          :key="cohort.id"
          class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4"
        >
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                {{ cohort.code }}
              </span>
              <span class="text-xs text-slate-500 font-semibold">
                📍 {{ cohort.classroom || 'Aula Principal' }}
              </span>
            </div>
            <h3 class="text-lg font-bold text-slate-900">{{ cohort.name }}</h3>
            <p class="text-xs font-bold text-blue-700">{{ cohort.course?.name }} ({{ cohort.course?.level }})</p>
            <div class="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl">
              <div>🗓️ <strong>Horario:</strong> {{ cohort.scheduleLabel }}</div>
              <div>
                👩‍🏫 <strong>Profesor:</strong>
                {{ cohort.teacherWorker ? `${cohort.teacherWorker.firstName} ${cohort.teacherWorker.lastName || ''}` : 'Sin asignar' }}
              </div>
              <div>
                👥 <strong>Inscritos:</strong> {{ cohort._count?.enrollments || 0 }} / {{ cohort.maxCapacity }} cupos
              </div>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span class="text-xs text-slate-400">Inicio: {{ formatDate(cohort.startDate) }}</span>
            <button
              @click="openEnrollmentModal(cohort.id)"
              class="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
            >
              + Matricular en este Grupo
            </button>
          </div>
        </div>
      </div>

      <!-- TAB 3: PROGRAMAS Y CURSOS -->
      <div v-if="activeTab === 'courses'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="course in courses"
          :key="course.id"
          class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4"
        >
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded">
                {{ course.code }}
              </span>
              <span class="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                {{ course.category }} • {{ course.level }}
              </span>
            </div>
            <h3 class="text-lg font-bold text-slate-900">{{ course.name }}</h3>
            <p class="text-xs text-slate-500">{{ course.description || 'Programa académico estructurado por niveles.' }}</p>

            <div class="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl text-xs">
              <div>
                <span class="text-slate-400 block text-[10px] uppercase">Duración</span>
                <span class="font-bold text-slate-800">{{ course.durationWeeks }} sem ({{ course.totalHours }} hrs)</span>
              </div>
              <div>
                <span class="text-slate-400 block text-[10px] uppercase">Grupos Creados</span>
                <span class="font-bold text-slate-800">{{ course._count?.cohorts || 0 }} cohortes</span>
              </div>
              <div>
                <span class="text-slate-400 block text-[10px] uppercase">Inscripción</span>
                <span class="font-bold text-slate-900">{{ formatCurrency(course.tuitionFee) }}</span>
              </div>
              <div>
                <span class="text-slate-400 block text-[10px] uppercase">Pensión / Curso</span>
                <span class="font-bold text-emerald-700">{{ formatCurrency(course.monthlyFee) }}</span>
              </div>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex justify-end">
            <button
              @click="openCohortForCourse(course.id)"
              class="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-100"
            >
              + Abrir Grupo de este Curso
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL 1: CREAR CURSO / PROGRAMA -->
      <div
        v-if="showCourseModal"
        class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 class="text-lg font-bold text-slate-900">Nuevo Programa / Curso Académico</h3>
            <button @click="showCourseModal = false" class="text-slate-400 hover:text-slate-600 text-xl">×</button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2">
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Nombre del Curso / Programa *</label>
              <input
                v-model="courseForm.name"
                type="text"
                placeholder="Ej: Inglés Conversacional B1 / Piano Infantil / Bootcamp Python"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Código</label>
              <input
                v-model="courseForm.code"
                type="text"
                placeholder="Ej: CUR-ING-B1"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Categoría</label>
              <select v-model="courseForm.category" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm">
                <option value="IDIOMAS">Idiomas</option>
                <option value="MUSICA_ARTES">Música y Artes</option>
                <option value="TECNOLOGIA">Tecnología y Programación</option>
                <option value="TUTORIA_ESCOLAR">Nivelación / PreICFES</option>
                <option value="DEPORTES">Escuelas Deportivas</option>
                <option value="OTRO"> Educación Continua / Otro</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Nivel</label>
              <select v-model="courseForm.level" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm">
                <option value="INICIAL">Inicial / Infantil</option>
                <option value="BASICO">Básico (A1-A2)</option>
                <option value="INTERMEDIO">Intermedio (B1-B2)</option>
                <option value="AVANZADO">Avanzado (C1-C2)</option>
                <option value="CERTIFICACION">Diplomado / Certificación</option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Semanas</label>
                <input
                  v-model.number="courseForm.durationWeeks"
                  type="number"
                  min="1"
                  class="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>
              <div>
                <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Horas Totales</label>
                <input
                  v-model.number="courseForm.totalHours"
                  type="number"
                  min="1"
                  class="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Valor Matrícula / Inscripción (COP)</label>
              <input
                v-model.number="courseForm.tuitionFee"
                type="number"
                min="0"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Valor Pensión / Módulo (COP)</label>
              <input
                v-model.number="courseForm.monthlyFee"
                type="number"
                min="0"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-emerald-700"
              />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Descripción / Pensum</label>
              <textarea
                v-model="courseForm.description"
                rows="2"
                placeholder="Objetivos del curso, competencias y requisitos..."
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              ></textarea>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button @click="showCourseModal = false" class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">
              Cancelar
            </button>
            <button
              @click="saveCourse"
              :disabled="submitting"
              class="px-5 py-2 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50"
            >
              Guardar Programa
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL 2: ABRIR GRUPO / COHORTE -->
      <div
        v-if="showCohortModal"
        class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 class="text-lg font-bold text-slate-900">Abrir Nuevo Grupo / Cohorte Académico</h3>
            <button @click="showCohortModal = false" class="text-slate-400 hover:text-slate-600 text-xl">×</button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2">
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Programa / Curso *</label>
              <select v-model="cohortForm.courseId" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm">
                <option value="">-- Seleccionar Curso --</option>
                <option v-for="c in courses" :key="c.id" :value="c.id">
                  {{ c.name }} ({{ c.level }} - {{ formatCurrency(Number(c.tuitionFee) + Number(c.monthlyFee)) }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Nombre del Grupo *</label>
              <input
                v-model="cohortForm.name"
                type="text"
                placeholder="Ej: Grupo Sabatino Mañana"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Aula / Modalidad</label>
              <input
                v-model="cohortForm.classroom"
                type="text"
                placeholder="Ej: Aula 201 / Virtual Zoom"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Horario de Clases *</label>
              <input
                v-model="cohortForm.scheduleLabel"
                type="text"
                placeholder="Ej: Sábados 8:00 AM - 12:00 PM o Lun-Mié-Vie 6:00 PM"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Docente / Profesor Asignado (Core ServiceWorker)</label>
              <select v-model="cohortForm.teacherWorkerId" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm">
                <option value="">-- Sin asignar aún --</option>
                <option v-for="w in workers" :key="w.id" :value="w.id">
                  {{ w.firstName }} {{ w.lastName || '' }} ({{ w.specialty || 'Docente' }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Fecha de Inicio *</label>
              <input
                v-model="cohortForm.startDate"
                type="date"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Cupo Máximo de Alumnos</label>
              <input
                v-model.number="cohortForm.maxCapacity"
                type="number"
                min="1"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold"
              />
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button @click="showCohortModal = false" class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">
              Cancelar
            </button>
            <button
              @click="saveCohort"
              :disabled="submitting"
              class="px-5 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              Abrir Grupo
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL 3: MATRICULAR ESTUDIANTE (VINCULADO A CUSTOMER + SERVICEORDER + POS) -->
      <div
        v-if="showEnrollModal"
        class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      >
        <div class="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <span class="text-xs font-bold uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                Admisión & Registro Académico
              </span>
              <h3 class="text-lg font-bold text-slate-900 mt-1">Matricular Estudiante en Grupo</h3>
            </div>
            <button @click="showEnrollModal = false" class="text-slate-400 hover:text-slate-600 text-xl">×</button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2">
              <div class="flex items-center justify-between mb-1">
                <label class="text-xs font-bold uppercase text-slate-600">Estudiante (Catálogo Core Clientes) *</label>
                <button
                  type="button"
                  @click="showQuickStudentModal = true"
                  class="text-xs font-bold text-blue-600 hover:underline"
                >
                  + Crear Nuevo Estudiante
                </button>
              </div>
              <select
                v-model="enrollForm.studentCustomerId"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              >
                <option value="">-- Seleccionar Estudiante --</option>
                <option v-for="cust in customers" :key="cust.id" :value="cust.id">
                  {{ cust.firstName }} {{ cust.lastName || '' }} ({{ cust.identificationNumber || 'Sin Doc' }})
                </option>
              </select>
            </div>

            <div class="sm:col-span-2">
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Grupo / Cohorte Académico *</label>
              <select
                v-model="enrollForm.cohortId"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              >
                <option value="">-- Seleccionar Grupo con Cupo --</option>
                <option v-for="c in cohorts" :key="c.id" :value="c.id">
                  {{ c.code }} - {{ c.name }} | {{ c.course?.name }} ({{ c._count?.enrollments || 0 }}/{{ c.maxCapacity }} cupos)
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Beca / Descuento (%)</label>
              <input
                v-model.number="enrollForm.scholarshipPct"
                type="number"
                min="0"
                max="100"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-emerald-700"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Acudiente (Opcional para menores)</label>
              <input
                v-model="enrollForm.guardianName"
                type="text"
                placeholder="Nombre del padre/madre o acudiente"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">
                Incluir Kit de Estudio / Libro / Uniforme (Inventario Core)
              </label>
              <select
                v-model="enrollForm.selectedMaterialProductId"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              >
                <option value="">-- Sin material adicional (Solo matrícula y pensión) --</option>
                <option v-for="p in products" :key="p.id" :value="p.id">
                  {{ p.name }} (+{{ formatCurrency(p.salePrice) }} | Stock: {{ Number(p.stock) }})
                </option>
              </select>
            </div>

            <div class="sm:col-span-2">
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Observaciones Académicas</label>
              <input
                v-model="enrollForm.notes"
                type="text"
                placeholder="Ej: Nivelación por examen de clasificación / Horario especial..."
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>
          </div>

          <div class="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
            <div>
              <span class="text-slate-600 block">Valor Total de Matrícula + Pensión + Material:</span>
              <span class="text-slate-500">Genera Orden de Servicio automática para pago en POS</span>
            </div>
            <div class="text-lg font-extrabold text-blue-900">
              {{ formatCurrency(estimatedEnrollmentTotal) }}
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button @click="showEnrollModal = false" class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">
              Cancelar
            </button>
            <button
              @click="saveEnrollment"
              :disabled="submitting"
              class="px-5 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-sm"
            >
              {{ submitting ? 'Matriculando...' : 'Confirmar Matrícula' }}
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL RÁPIDO: CREAR ESTUDIANTE EN CUSTOMER CORE -->
      <div
        v-if="showQuickStudentModal"
        class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 class="text-lg font-bold text-slate-900">Registrar Nuevo Estudiante (Core)</h3>
            <button @click="showQuickStudentModal = false" class="text-slate-400 hover:text-slate-600 text-xl">×</button>
          </div>

          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Nombres *</label>
                <input v-model="studentForm.firstName" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Apellidos</label>
                <input v-model="studentForm.lastName" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Documento / TI / CC *</label>
              <input v-model="studentForm.identificationNumber" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm" />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Teléfono / WhatsApp</label>
              <input v-model="studentForm.phoneNumber" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm" />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Email</label>
              <input v-model="studentForm.email" type="email" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm" />
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button @click="showQuickStudentModal = false" class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">
              Cancelar
            </button>
            <button
              @click="saveQuickStudent"
              :disabled="submitting"
              class="px-5 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700"
            >
              Guardar Estudiante
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const activeTab = ref<'enrollments' | 'cohorts' | 'courses'>('enrollments');
const submitting = ref(false);
const filterCohortId = ref('');

const courses = ref<any[]>([]);
const cohorts = ref<any[]>([]);
const enrollments = ref<any[]>([]);
const customers = ref<any[]>([]);
const workers = ref<any[]>([]);
const products = ref<any[]>([]);

const showCourseModal = ref(false);
const courseForm = ref({
  name: '',
  code: '',
  category: 'IDIOMAS',
  level: 'BASICO',
  durationWeeks: 12,
  totalHours: 48,
  tuitionFee: 80000,
  monthlyFee: 220000,
  description: '',
});

const showCohortModal = ref(false);
const cohortForm = ref({
  courseId: '',
  teacherWorkerId: '',
  name: '',
  classroom: 'Aula 101',
  scheduleLabel: 'Lun - Mié - Vie 6:00 PM a 8:00 PM',
  startDate: new Date().toISOString().slice(0, 10),
  maxCapacity: 20,
});

const showEnrollModal = ref(false);
const enrollForm = ref({
  studentCustomerId: '',
  cohortId: '',
  scholarshipPct: 0,
  guardianName: '',
  guardianPhone: '',
  selectedMaterialProductId: '',
  notes: '',
});

const showQuickStudentModal = ref(false);
const studentForm = ref({
  firstName: '',
  lastName: '',
  identificationNumber: '',
  phoneNumber: '',
  email: '',
});

const estimatedEnrollmentTotal = computed(() => {
  const cohort = cohorts.value.find((c) => c.id === enrollForm.value.cohortId);
  const baseCourse = cohort?.course
    ? Number(cohort.course.tuitionFee ?? 0) + Number(cohort.course.monthlyFee ?? 0)
    : 0;
  const discPct = Math.min(100, Math.max(0, Number(enrollForm.value.scholarshipPct || 0)));
  const afterScholarship = Math.round(baseCourse * (1 - discPct / 100));

  const matProd = products.value.find(
    (p) => p.id === enrollForm.value.selectedMaterialProductId,
  );
  const matPrice = matProd ? Number(matProd.salePrice ?? 0) : 0;

  return afterScholarship + matPrice;
});

function formatCurrency(val: any): string {
  const num = Number(val ?? 0);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(val: string | Date): string {
  if (!val) return '-';
  return new Date(val).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

async function loadAll() {
  try {
    const orgId = authStore.user?.organizationId;
    const branchId = authStore.user?.branchId;
    const [coursesRes, cohortsRes, enrollRes] = await Promise.all([
      api.get('/academy/courses', { params: { organizationId: orgId } }),
      api.get('/academy/cohorts', { params: { organizationId: orgId, branchId } }),
      api.get('/academy/enrollments', {
        params: {
          organizationId: orgId,
          branchId,
          cohortId: filterCohortId.value || undefined,
        },
      }),
    ]);

    courses.value = Array.isArray(coursesRes.data) ? coursesRes.data : [];
    cohorts.value = Array.isArray(cohortsRes.data) ? cohortsRes.data : [];
    enrollments.value = Array.isArray(enrollRes.data) ? enrollRes.data : [];
  } catch (error) {
    console.error('Error cargando datos de academia:', error);
  }
}

async function loadCoreCatalogs() {
  try {
    const orgId = authStore.user?.organizationId;
    const [custRes, workRes, prodRes] = await Promise.all([
      api.get('/customers', { params: { organizationId: orgId } }),
      api.get('/service-workers', { params: { organizationId: orgId } }),
      api.get('/products', { params: { organizationId: orgId } }),
    ]);

    customers.value = Array.isArray(custRes.data)
      ? custRes.data
      : custRes.data?.data || [];
    workers.value = Array.isArray(workRes.data)
      ? workRes.data
      : workRes.data?.data || [];
    products.value = Array.isArray(prodRes.data)
      ? prodRes.data
      : prodRes.data?.data || [];
  } catch (error) {
    console.error('Error cargando catálogos Core para academia:', error);
  }
}

async function saveCourse() {
  if (!courseForm.value.name.trim()) {
    alert('Ingresa el nombre del curso o programa académico.');
    return;
  }
  submitting.value = true;
  try {
    await api.post('/academy/courses', {
      organizationId: authStore.user?.organizationId,
      ...courseForm.value,
    });
    showCourseModal.value = false;
    activeTab.value = 'courses';
    await loadAll();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al crear el programa académico.');
  } finally {
    submitting.value = false;
  }
}

function openCohortForCourse(courseId: string) {
  cohortForm.value.courseId = courseId;
  showCohortModal.value = true;
}

async function saveCohort() {
  if (!cohortForm.value.courseId || !cohortForm.value.name.trim()) {
    alert('Selecciona el curso y asigna un nombre al grupo.');
    return;
  }
  submitting.value = true;
  try {
    await api.post('/academy/cohorts', {
      organizationId: authStore.user?.organizationId,
      branchId: authStore.user?.branchId,
      ...cohortForm.value,
    });
    showCohortModal.value = false;
    activeTab.value = 'cohorts';
    await loadAll();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al abrir el grupo académico.');
  } finally {
    submitting.value = false;
  }
}

function openEnrollmentModal(preselectedCohortId?: string) {
  enrollForm.value = {
    studentCustomerId: '',
    cohortId: preselectedCohortId || (cohorts.value[0]?.id ?? ''),
    scholarshipPct: 0,
    guardianName: '',
    guardianPhone: '',
    selectedMaterialProductId: '',
    notes: '',
  };
  showEnrollModal.value = true;
}

async function saveEnrollment() {
  if (!enrollForm.value.studentCustomerId || !enrollForm.value.cohortId) {
    alert('Selecciona el estudiante y el grupo académico.');
    return;
  }
  submitting.value = true;
  try {
    const materials = enrollForm.value.selectedMaterialProductId
      ? [{ productId: enrollForm.value.selectedMaterialProductId, quantity: 1 }]
      : [];

    await api.post('/academy/enrollments', {
      organizationId: authStore.user?.organizationId,
      branchId: authStore.user?.branchId,
      cohortId: enrollForm.value.cohortId,
      studentCustomerId: enrollForm.value.studentCustomerId,
      scholarshipPct: Number(enrollForm.value.scholarshipPct || 0),
      guardianName: enrollForm.value.guardianName || undefined,
      guardianPhone: enrollForm.value.guardianPhone || undefined,
      notes: enrollForm.value.notes || undefined,
      materials,
    });
    showEnrollModal.value = false;
    activeTab.value = 'enrollments';
    await loadAll();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al registrar la matrícula.');
  } finally {
    submitting.value = false;
  }
}

async function changeEnrollmentStatus(enrollmentId: string, newStatus: string) {
  try {
    await api.patch(`/academy/enrollments/${enrollmentId}`, {
      organizationId: authStore.user?.organizationId,
      status: newStatus,
    });
    await loadAll();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'No se pudo actualizar el estado de la matrícula.');
  }
}

async function saveQuickStudent() {
  if (!studentForm.value.firstName.trim() || !studentForm.value.identificationNumber.trim()) {
    alert('Ingresa nombre y documento del estudiante.');
    return;
  }
  submitting.value = true;
  try {
    const res = await api.post('/customers', {
      organizationId: authStore.user?.organizationId,
      firstName: studentForm.value.firstName.trim(),
      lastName: studentForm.value.lastName.trim(),
      identificationType: 'CC',
      identificationNumber: studentForm.value.identificationNumber.trim(),
      phoneNumber: studentForm.value.phoneNumber.trim() || undefined,
      email: studentForm.value.email.trim() || undefined,
    });
    showQuickStudentModal.value = false;
    await loadCoreCatalogs();
    if (res.data?.id) {
      enrollForm.value.studentCustomerId = res.data.id;
    }
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al registrar estudiante.');
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadAll(), loadCoreCatalogs()]);
});
</script>

