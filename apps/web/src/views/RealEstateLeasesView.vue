<template>
  <AppLayout>
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- Encabezado -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-teal-100 text-teal-800 rounded-full">
              Captación, Contratos & Cánones
            </span>
            <span class="text-xs text-slate-400">Vinculado a Clientes Core (Propietarios e Inquilinos), Asesores y POS</span>
          </div>
          <h1 class="text-2xl font-bold text-slate-900 mt-1">Inmuebles, Contratos de Arrendamiento y Facturación Mensual</h1>
          <p class="text-sm text-slate-500">
            Capta propiedades con su propietario, formaliza contratos de arriendo y emite cánones mensuales conectados al POS.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <router-link
            to="/real-estate-dashboard"
            class="px-3.5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition"
          >
            ← Portafolio & Giros
          </router-link>
          <button
            @click="showQuickCustomerModal = true"
            class="px-3.5 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 transition"
          >
            + Crear Propietario / Inquilino
          </button>
          <button
            @click="showPropertyModal = true"
            class="px-3.5 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition"
          >
            + Captar Inmueble
          </button>
          <button
            @click="openLeaseModal()"
            class="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
          >
            📝 Nuevo Contrato Arriendo
          </button>
        </div>
      </div>

      <!-- Pestañas -->
      <div class="flex items-center gap-2 border-b border-slate-200">
        <button
          @click="activeTab = 'leases'"
          class="px-5 py-3 text-sm font-bold border-b-2 transition"
          :class="activeTab === 'leases' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'"
        >
          📝 Contratos de Arrendamiento ({{ leases.length }})
        </button>
        <button
          @click="activeTab = 'properties'"
          class="px-5 py-3 text-sm font-bold border-b-2 transition"
          :class="activeTab === 'properties' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'"
        >
          🏢 Catálogo de Inmuebles ({{ properties.length }})
        </button>
      </div>

      <!-- TAB 1: CONTRATOS DE ARRENDAMIENTO -->
      <div v-if="activeTab === 'leases'" class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-slate-900">Contratos de Arrendamiento Vigentes e Históricos</h2>
            <p class="text-xs text-slate-500">Emite el canon del mes en 1 clic para habilitar su recaudo en el POS y liquidar comisión.</p>
          </div>
        </div>

        <div v-if="leases.length === 0" class="p-12 text-center space-y-3">
          <div class="text-4xl">📝</div>
          <div class="font-bold text-slate-800">No hay contratos de arrendamiento registrados</div>
          <p class="text-xs text-slate-500">Capta un inmueble y formaliza tu primer contrato de arriendo.</p>
          <button
            @click="openLeaseModal()"
            class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
          >
            + Crear Primer Contrato
          </button>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                <th class="py-3 px-4">N° Contrato</th>
                <th class="py-3 px-4">Inmueble / Propietario</th>
                <th class="py-3 px-4">Inquilino (Arrendatario)</th>
                <th class="py-3 px-4">Vigencia / Día Pago</th>
                <th class="py-3 px-4">Canon + Admon</th>
                <th class="py-3 px-4">Comisión Agencia</th>
                <th class="py-3 px-4">Emitir Canon / Cobro POS</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr v-for="lease in leases" :key="lease.id" class="hover:bg-slate-50">
                <td class="py-3 px-4 font-mono text-xs font-bold text-indigo-700">
                  {{ lease.contractNumber }}
                  <span
                    class="block mt-1 px-2 py-0.5 rounded text-[10px] w-fit"
                    :class="lease.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'"
                  >
                    {{ lease.status }}
                  </span>
                </td>
                <td class="py-3 px-4">
                  <div class="font-bold text-slate-900">{{ lease.property?.title }}</div>
                  <div class="text-xs text-slate-500">
                    Prop: {{ lease.property?.ownerCustomer?.firstName }} {{ lease.property?.ownerCustomer?.lastName || '' }}
                  </div>
                </td>
                <td class="py-3 px-4">
                  <div class="font-bold text-slate-900">
                    {{ lease.tenantCustomer?.firstName }} {{ lease.tenantCustomer?.lastName || '' }}
                  </div>
                  <div class="text-xs text-slate-500">
                    Doc: {{ lease.tenantCustomer?.identificationNumber || '-' }}
                  </div>
                </td>
                <td class="py-3 px-4 text-xs text-slate-600">
                  <div>{{ formatDate(lease.startDate) }} → {{ formatDate(lease.endDate) }}</div>
                  <div class="font-bold text-teal-700">Corte: Día {{ lease.paymentDay }} de cada mes</div>
                </td>
                <td class="py-3 px-4">
                  <div class="font-extrabold text-slate-900">
                    {{ formatCurrency(Number(lease.monthlyRent) + Number(lease.adminFee)) }}
                  </div>
                  <div class="text-[11px] text-slate-400">
                    Canon: {{ formatCurrency(lease.monthlyRent) }} | Admon: {{ formatCurrency(lease.adminFee) }}
                  </div>
                </td>
                <td class="py-3 px-4">
                  <span class="font-bold text-emerald-700">{{ Number(lease.agencyCommissionPct) }}%</span>
                  <div class="text-[11px] text-slate-500">
                    {{ formatCurrency((Number(lease.monthlyRent) * Number(lease.agencyCommissionPct)) / 100) }}/mes
                  </div>
                </td>
                <td class="py-3 px-4">
                  <div class="flex flex-wrap items-center gap-2">
                    <button
                      @click="openGenerateChargeModal(lease)"
                      class="px-3 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition"
                    >
                      + Emitir Canon Mes
                    </button>
                    <router-link
                      v-if="lease.rentCharges?.[0]?.serviceOrder?.id && !lease.rentCharges?.[0]?.serviceOrder?.saleId"
                      :to="`/pos?serviceOrderId=${lease.rentCharges[0].serviceOrder.id}`"
                      class="px-3 py-1.5 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition"
                    >
                      💳 Cobrar {{ lease.rentCharges[0].periodLabel }}
                    </router-link>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 2: CATÁLOGO DE INMUEBLES -->
      <div v-if="activeTab === 'properties'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="prop in properties"
          :key="prop.id"
          class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4"
        >
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
                {{ prop.code }}
              </span>
              <select
                :value="prop.status"
                @change="changePropertyStatus(prop.id, ($event.target as HTMLSelectElement).value)"
                class="text-xs font-bold px-2 py-1 rounded-lg border border-slate-200"
              >
                <option value="AVAILABLE">🟢 Disponible</option>
                <option value="RESERVED">⏳ Reservado</option>
                <option value="RENTED">🔑 Arrendado</option>
                <option value="MAINTENANCE">🛠️ Mantenimiento</option>
                <option value="SOLD">🏷️ Vendido</option>
              </select>
            </div>

            <h3 class="text-base font-bold text-slate-900">{{ prop.title }}</h3>
            <p class="text-xs text-slate-500">📍 {{ prop.address }} — {{ prop.neighborhood || prop.city }}</p>

            <div class="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl text-xs">
              <div>
                <span class="text-slate-400 block text-[10px] uppercase">Canon Mensual</span>
                <span class="font-extrabold text-slate-900">{{ formatCurrency(prop.monthlyRentPrice) }}</span>
              </div>
              <div>
                <span class="text-slate-400 block text-[10px] uppercase">Administración</span>
                <span class="font-bold text-slate-700">{{ formatCurrency(prop.adminFeePrice) }}</span>
              </div>
              <div>
                <span class="text-slate-400 block text-[10px] uppercase">Propietario</span>
                <span class="font-semibold text-slate-800 truncate block">
                  {{ prop.ownerCustomer?.firstName }} {{ prop.ownerCustomer?.lastName || '' }}
                </span>
              </div>
              <div>
                <span class="text-slate-400 block text-[10px] uppercase">Características</span>
                <span class="font-semibold text-slate-700">
                  {{ Number(prop.areaM2 || 0) }}m² • {{ prop.bedrooms }} alc • {{ prop.bathrooms }} bañ
                </span>
              </div>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span class="text-xs text-teal-700 font-bold">Comisión Agencia: {{ Number(prop.agencyCommissionPct) }}%</span>
            <button
              v-if="prop.status !== 'RENTED'"
              @click="openLeaseModal(prop)"
              class="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
            >
              📝 Arrendar Inmueble
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL 1: CAPTAR NUEVO INMUEBLE -->
      <div
        v-if="showPropertyModal"
        class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      >
        <div class="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 class="text-lg font-bold text-slate-900">Captar Nuevo Inmueble / Propiedad</h3>
            <button @click="showPropertyModal = false" class="text-slate-400 hover:text-slate-600 text-xl">×</button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2">
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Título Comercial del Inmueble *</label>
              <input
                v-model="propertyForm.title"
                type="text"
                placeholder="Ej: Apartamento 802 Edificio Mirador del Parque"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Propietario (Core Customer) *</label>
              <select v-model="propertyForm.ownerCustomerId" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm">
                <option value="">-- Seleccionar Propietario --</option>
                <option v-for="c in customers" :key="c.id" :value="c.id">
                  {{ c.firstName }} {{ c.lastName || '' }} ({{ c.identificationNumber || 'Sin Doc' }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Tipo de Inmueble</label>
              <select v-model="propertyForm.propertyType" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm">
                <option value="APARTMENT">Apartamento</option>
                <option value="HOUSE">Casa</option>
                <option value="COMMERCIAL_LOCAL">Local Comercial</option>
                <option value="OFFICE">Oficina / Consultorio</option>
                <option value="WAREHOUSE">Bodega</option>
                <option value="LAND">Lote / Terreno</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Dirección Exacta *</label>
              <input
                v-model="propertyForm.address"
                type="text"
                placeholder="Ej: Cra 43A # 14-50 Apto 802"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Barrio / Sector</label>
              <input
                v-model="propertyForm.neighborhood"
                type="text"
                placeholder="Ej: El Poblado / Laureles"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div class="grid grid-cols-3 gap-2 sm:col-span-2">
              <div>
                <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Área (m²)</label>
                <input v-model.number="propertyForm.areaM2" type="number" min="0" class="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-sm" />
              </div>
              <div>
                <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Alcobas</label>
                <input v-model.number="propertyForm.bedrooms" type="number" min="0" class="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-sm" />
              </div>
              <div>
                <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Baños</label>
                <input v-model.number="propertyForm.bathrooms" type="number" min="0" class="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-sm" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Canon Mensual Sugerido (COP) *</label>
              <input
                v-model.number="propertyForm.monthlyRentPrice"
                type="number"
                min="0"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-teal-800"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Cuota Administración PH (COP)</label>
              <input
                v-model.number="propertyForm.adminFeePrice"
                type="number"
                min="0"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Comisión Inmobiliaria (%)</label>
              <input
                v-model.number="propertyForm.agencyCommissionPct"
                type="number"
                min="0"
                max="100"
                step="0.5"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Asesor Captador (ServiceWorker)</label>
              <select v-model="propertyForm.agentWorkerId" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm">
                <option value="">-- Sin asignar --</option>
                <option v-for="w in workers" :key="w.id" :value="w.id">
                  {{ w.firstName }} {{ w.lastName || '' }}
                </option>
              </select>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button @click="showPropertyModal = false" class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">
              Cancelar
            </button>
            <button
              @click="saveProperty"
              :disabled="submitting"
              class="px-5 py-2 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
            >
              Guardar Inmueble
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL 2: FORMALIZAR CONTRATO DE ARRENDAMIENTO -->
      <div
        v-if="showLeaseModal"
        class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      >
        <div class="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 class="text-lg font-bold text-slate-900">Formalizar Contrato de Arrendamiento</h3>
            <button @click="showLeaseModal = false" class="text-slate-400 hover:text-slate-600 text-xl">×</button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2">
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Inmueble a Arrendar *</label>
              <select
                v-model="leaseForm.propertyId"
                @change="onSelectLeaseProperty"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              >
                <option value="">-- Seleccionar Inmueble --</option>
                <option v-for="p in properties" :key="p.id" :value="p.id">
                  {{ p.code }} - {{ p.title }} (Canon: {{ formatCurrency(p.monthlyRentPrice) }})
                </option>
              </select>
            </div>

            <div class="sm:col-span-2">
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Inquilino / Arrendatario (Core Customer) *</label>
              <select v-model="leaseForm.tenantCustomerId" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm">
                <option value="">-- Seleccionar Arrendatario --</option>
                <option v-for="c in customers" :key="c.id" :value="c.id">
                  {{ c.firstName }} {{ c.lastName || '' }} ({{ c.identificationNumber || 'Sin Doc' }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Fecha de Inicio *</label>
              <input v-model="leaseForm.startDate" type="date" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm" />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Fecha de Vencimiento *</label>
              <input v-model="leaseForm.endDate" type="date" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm" />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Canon Mensual Pactado (COP) *</label>
              <input
                v-model.number="leaseForm.monthlyRent"
                type="number"
                min="0"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-indigo-800"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Administración Incluida (COP)</label>
              <input
                v-model.number="leaseForm.adminFee"
                type="number"
                min="0"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Día Límite de Pago Mensual</label>
              <input
                v-model.number="leaseForm.paymentDay"
                type="number"
                min="1"
                max="31"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Comisión Agencia (%)</label>
              <input
                v-model.number="leaseForm.agencyCommissionPct"
                type="number"
                min="0"
                max="100"
                step="0.5"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Codeudor / Aseguradora</label>
              <input
                v-model="leaseForm.coSignerName"
                type="text"
                placeholder="Ej: Seguros Bolívar / El Libertador"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Teléfono Codeudor / Póliza</label>
              <input
                v-model="leaseForm.coSignerPhone"
                type="text"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button @click="showLeaseModal = false" class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">
              Cancelar
            </button>
            <button
              @click="saveLease"
              :disabled="submitting"
              class="px-5 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              Activar Contrato y Generar 1er Canon
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL 3: EMITIR CANON MENSUAL DE ARRIENDO -->
      <div
        v-if="showChargeModal && selectedLease"
        class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <span class="text-xs font-bold uppercase text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                Cuenta de Cobro Mensual
              </span>
              <h3 class="text-lg font-bold text-slate-900 mt-1">{{ selectedLease.contractNumber }}</h3>
            </div>
            <button @click="showChargeModal = false" class="text-slate-400 hover:text-slate-600 text-xl">×</button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Periodo a Facturar (YYYY-MM) *</label>
              <input
                v-model="chargeForm.periodLabel"
                type="month"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Recargo por Mora (Opcional COP)</label>
              <input
                v-model.number="chargeForm.lateFeeAmount"
                type="number"
                min="0"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Observación</label>
              <input
                v-model="chargeForm.notes"
                type="text"
                placeholder="Ej: Canon mensual + cuota administración"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button @click="showChargeModal = false" class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">
              Cancelar
            </button>
            <button
              @click="confirmGenerateCharge"
              :disabled="submitting"
              class="px-5 py-2 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
            >
              Emitir Canon y Orden POS
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL RÁPIDO: CREAR PROPIETARIO / INQUILINO EN CUSTOMER CORE -->
      <div
        v-if="showQuickCustomerModal"
        class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 class="text-lg font-bold text-slate-900">Registrar Propietario o Inquilino (Core)</h3>
            <button @click="showQuickCustomerModal = false" class="text-slate-400 hover:text-slate-600 text-xl">×</button>
          </div>

          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Nombres *</label>
                <input v-model="customerForm.firstName" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm" />
              </div>
              <div>
                <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Apellidos</label>
                <input v-model="customerForm.lastName" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">CC / NIT *</label>
              <input v-model="customerForm.identificationNumber" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm" />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Teléfono / Celular</label>
              <input v-model="customerForm.phoneNumber" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm" />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Correo Electrónico</label>
              <input v-model="customerForm.email" type="email" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm" />
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button @click="showQuickCustomerModal = false" class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">
              Cancelar
            </button>
            <button
              @click="saveQuickCustomer"
              :disabled="submitting"
              class="px-5 py-2 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800"
            >
              Guardar en Directorio Core
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppLayout from '../components/AppLayout.vue';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();
const activeTab = ref<'leases' | 'properties'>('leases');
const submitting = ref(false);

const properties = ref<any[]>([]);
const leases = ref<any[]>([]);
const customers = ref<any[]>([]);
const workers = ref<any[]>([]);

const showPropertyModal = ref(false);
const propertyForm = ref({
  ownerCustomerId: '',
  agentWorkerId: '',
  title: '',
  propertyType: 'APARTMENT',
  address: '',
  neighborhood: '',
  areaM2: 75,
  bedrooms: 3,
  bathrooms: 2,
  monthlyRentPrice: 1800000,
  adminFeePrice: 250000,
  agencyCommissionPct: 10,
});

const showLeaseModal = ref(false);
const leaseForm = ref({
  propertyId: '',
  tenantCustomerId: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  paymentDay: 5,
  monthlyRent: 1800000,
  adminFee: 250000,
  agencyCommissionPct: 10,
  coSignerName: '',
  coSignerPhone: '',
});

const showChargeModal = ref(false);
const selectedLease = ref<any | null>(null);
const chargeForm = ref({
  periodLabel: new Date().toISOString().slice(0, 7),
  lateFeeAmount: 0,
  notes: '',
});

const showQuickCustomerModal = ref(false);
const customerForm = ref({
  firstName: '',
  lastName: '',
  identificationNumber: '',
  phoneNumber: '',
  email: '',
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
    const [propRes, leaseRes] = await Promise.all([
      api.get('/real-estate/properties', { params: { organizationId: orgId, branchId } }),
      api.get('/real-estate/leases', { params: { organizationId: orgId, branchId } }),
    ]);
    properties.value = Array.isArray(propRes.data) ? propRes.data : [];
    leases.value = Array.isArray(leaseRes.data) ? leaseRes.data : [];
  } catch (error) {
    console.error('Error cargando inmuebles y contratos:', error);
  }
}

async function loadCoreCatalogs() {
  try {
    const orgId = authStore.user?.organizationId;
    const [custRes, workRes] = await Promise.all([
      api.get('/customers', { params: { organizationId: orgId } }),
      api.get('/service-workers', { params: { organizationId: orgId } }),
    ]);
    customers.value = Array.isArray(custRes.data)
      ? custRes.data
      : custRes.data?.data || [];
    workers.value = Array.isArray(workRes.data)
      ? workRes.data
      : workRes.data?.data || [];
  } catch (error) {
    console.error('Error cargando catálogos Core para inmobiliaria:', error);
  }
}

async function saveProperty() {
  if (
    !propertyForm.value.ownerCustomerId ||
    !propertyForm.value.title.trim() ||
    !propertyForm.value.address.trim()
  ) {
    alert('Selecciona el propietario e ingresa título y dirección del inmueble.');
    return;
  }
  submitting.value = true;
  try {
    await api.post('/real-estate/properties', {
      organizationId: authStore.user?.organizationId,
      branchId: authStore.user?.branchId,
      ...propertyForm.value,
    });
    showPropertyModal.value = false;
    activeTab.value = 'properties';
    await loadAll();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al registrar el inmueble.');
  } finally {
    submitting.value = false;
  }
}

async function changePropertyStatus(propertyId: string, status: string) {
  try {
    await api.patch(`/real-estate/properties/${propertyId}/status`, {
      organizationId: authStore.user?.organizationId,
      status,
    });
    await loadAll();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al cambiar el estado del inmueble.');
  }
}

function openLeaseModal(preselectedProp?: any) {
  if (preselectedProp) {
    leaseForm.value.propertyId = preselectedProp.id;
    leaseForm.value.monthlyRent = Number(preselectedProp.monthlyRentPrice ?? 0);
    leaseForm.value.adminFee = Number(preselectedProp.adminFeePrice ?? 0);
    leaseForm.value.agencyCommissionPct = Number(preselectedProp.agencyCommissionPct ?? 10);
  }
  showLeaseModal.value = true;
}

function onSelectLeaseProperty() {
  const prop = properties.value.find((p) => p.id === leaseForm.value.propertyId);
  if (prop) {
    leaseForm.value.monthlyRent = Number(prop.monthlyRentPrice ?? 0);
    leaseForm.value.adminFee = Number(prop.adminFeePrice ?? 0);
    leaseForm.value.agencyCommissionPct = Number(prop.agencyCommissionPct ?? 10);
  }
}

async function saveLease() {
  if (!leaseForm.value.propertyId || !leaseForm.value.tenantCustomerId) {
    alert('Selecciona el inmueble y el arrendatario.');
    return;
  }
  submitting.value = true;
  try {
    await api.post('/real-estate/leases', {
      organizationId: authStore.user?.organizationId,
      branchId: authStore.user?.branchId,
      ...leaseForm.value,
      generateFirstMonthCharge: true,
    });
    showLeaseModal.value = false;
    activeTab.value = 'leases';
    await loadAll();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al crear el contrato de arrendamiento.');
  } finally {
    submitting.value = false;
  }
}

function openGenerateChargeModal(lease: any) {
  selectedLease.value = lease;
  chargeForm.value = {
    periodLabel: new Date().toISOString().slice(0, 7),
    lateFeeAmount: 0,
    notes: '',
  };
  showChargeModal.value = true;
}

async function confirmGenerateCharge() {
  if (!selectedLease.value || !chargeForm.value.periodLabel) return;
  submitting.value = true;
  try {
    await api.post('/real-estate/rent-charges', {
      organizationId: authStore.user?.organizationId,
      branchId: authStore.user?.branchId,
      leaseId: selectedLease.value.id,
      periodLabel: chargeForm.value.periodLabel,
      lateFeeAmount: Number(chargeForm.value.lateFeeAmount || 0),
      notes: chargeForm.value.notes || undefined,
    });
    showChargeModal.value = false;
    router.push('/real-estate-dashboard');
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al emitir el canon mensual.');
  } finally {
    submitting.value = false;
  }
}

async function saveQuickCustomer() {
  if (!customerForm.value.firstName.trim() || !customerForm.value.identificationNumber.trim()) {
    alert('Ingresa nombre y documento.');
    return;
  }
  submitting.value = true;
  try {
    await api.post('/customers', {
      organizationId: authStore.user?.organizationId,
      firstName: customerForm.value.firstName.trim(),
      lastName: customerForm.value.lastName.trim(),
      identificationType: 'CC',
      identificationNumber: customerForm.value.identificationNumber.trim(),
      phoneNumber: customerForm.value.phoneNumber.trim() || undefined,
      email: customerForm.value.email.trim() || undefined,
    });
    showQuickCustomerModal.value = false;
    await loadCoreCatalogs();
  } catch (error: any) {
    alert(error?.response?.data?.message || 'Error al registrar persona en Clientes.');
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadAll(), loadCoreCatalogs()]);
});
</script>

