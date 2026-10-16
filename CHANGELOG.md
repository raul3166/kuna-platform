# Changelog

Todas las modificaciones importantes de KUNA Platform serán documentadas en este archivo.

El formato está basado en Keep a Changelog.

Versionado basado en Semantic Versioning.

---
## [2.2.0-rc1] - 2026-10-16

### Added

#### Vertical VETERINARY / Clínica Veterinaria & Pet Shop (Fase 4)
* **Modelos clínicos y sanitarios (`schema.prisma`):** `Pet`, `VetMedicalRecord`, `PetVaccination` y enums `PetSpecies`, `PetGender`, `VetVisitType`, todos multi-tenant (`organizationId` y `branchId`).
* **Reutilización estricta del Core (sin duplicar entidades):**
  * Propietarios / Tutores = `Customer`
  * Médicos Veterinarios y Groomers = `ServiceWorker`
  * Catálogo de consultas, cirugías, vacunación y peluquería = `ServiceItem`
  * Medicamentos, biológicos, antiparasitarios, concentrados y accesorios Pet Shop = `Product`, `BranchProductStock`, `InventoryMovement`
  * Atención en clínica, descarga de insumos y comisiones = `ServiceOrder` (vinculada a `petId` y `VetMedicalRecord`)
  * Facturación y recaudo = POS (`Sale`, `CashSession`, `/pos?serviceOrderId=...`)
* **Módulo Backend `VeterinaryModule` (`/veterinary`, `@RequiresVertical('VETERINARY')`):**
  * `GET /veterinary/dashboard`: KPIs clínicos, pacientes activos en clínica/grooming con enlace directo a POS, alertas de próximos refuerzos de vacunación (30 días) y últimas historias clínicas.
  * `GET /veterinary/pets`, `GET /veterinary/pets/:id`, `POST /veterinary/pets`, `PATCH /veterinary/pets/:id`: Directorio de pacientes, validación de microchip único por organización y expediente clínico integral.
  * `POST /veterinary/medical-records`, `GET /veterinary/medical-records`: Registro de historia clínica con constantes fisiológicas (peso kg, temperatura °C, frecuencia cardíaca y respiratoria), actualización automática del peso en la ficha de la mascota y generación opcional de `ServiceOrder` con tareas e insumos médicos.
  * `POST /veterinary/vaccinations`, `GET /veterinary/vaccinations/upcoming`: Carnet sanitario de vacunación y desparasitación con recordatorios (`nextDueDate`) y opción de descuento inmediato de stock (`SERVICE_CONSUMPTION`).
  * `GET /veterinary/config`, `PATCH /veterinary/config`: Configuración operativa del vertical por organización (`vaccinationAlertDays`, `defaultConsultationMinutes`, `autoCreateOrderOnConsultation`, `enableGrooming`).
* **Vistas Frontend Vue 3 (`apps/web`):**
  * `VeterinaryDashboardView.vue` (`/veterinary-dashboard`): Hub operativo de clínica veterinaria y Pet Shop.
  * `PetsView.vue` (`/veterinary-pets`): Directorio de mascotas, búsqueda multicriterio, filtro por especie y modal de expediente clínico + carnet de vacunas.
  * `VeterinaryConsultationsView.vue` (`/veterinary-consultations`): Consola de consulta médica, grooming y aplicación de vacunas/antiparasitarios.
  * Integración en `navigation.ts` y `router/index.ts` protegida con `requiredVertical: 'VETERINARY'`.

---
## [2.1.0-rc1] - 2026-10-15

### Added

#### Vertical BEAUTY / Salón, Barbería y Spa (Fase 3)
* **Modelos nuevos mínimos:** `Appointment`, `AppointmentItem`, `BeautyWorkerSchedule`, `BeautyTimeOff`, `BeautyClientNote` y enum `AppointmentStatus`. Todos con `organizationId` (y `branchId` cuando aplica).
* **Reutilización del Core (sin duplicar):** estilistas = `ServiceWorker`, catálogo de servicios = `ServiceItem`, clientes = `Customer`, ejecución/comisiones = `ServiceOrder` + `ServiceOrderTask`, cobro = POS existente (`/pos?serviceOrderId=`).
* **Módulo backend `beauty`** (`@RequiresVertical('BEAUTY')`): dashboard diario, listado de citas, agendamiento, reprogramación, confirmar/cancelar/no-show, `start` (genera la Orden de Servicio con una tarea por servicio) y `complete` (reutiliza `ServiceOrdersService` para descontar insumos una sola vez).
* **Motor de disponibilidad:** valida horario semanal del profesional, ausencias y cruces de citas; endpoint `GET /beauty/availability` que devuelve huecos libres según la duración total de los servicios.
* **Horarios y ausencias por profesional**, **historial del cliente** (visitas, gasto, no-shows) y **notas/fórmulas** (color, preferencias, alergias).
* **Configuración por organización** (`slotMinutes`, `dayStart`, `dayEnd`, `allowOverlap`) persistida en `OrganizationVertical.config`.
* **Frontend:** `BeautyAgendaView.vue` (KPIs, columnas por profesional, nueva cita con huecos, reprogramar, cobrar en POS), `BeautyStaffView.vue` (horarios y ausencias), `BeautyClientsView.vue` (historial y fórmulas). Sección "Belleza / Salón / Spa" en el sidebar y rutas con `requiredVertical: 'BEAUTY'`.

### Changed
* `ServiceOrdersModule` ahora exporta `ServiceOrdersService` para que los verticales lo reutilicen.
* El seed activa `BEAUTY` por defecto en las organizaciones existentes (como el resto de verticales).

### Fixed
* Interpretación de fechas `YYYY-MM-DD` como fecha local en la agenda para evitar desfases de un día en zonas horarias UTC negativas.

---
## [2.0.0-rc1] - 2026-10-15

### Added

#### Arquitectura de Verticales de Negocio (Fase 0)
* **Catálogo Maestro de Verticales:** Modelos `Vertical` y `OrganizationVertical` en Prisma soportando 14 verticales de industria (Retail, Restaurant, Pharmacy, Gym, Studio, Services, Hotel, Automotive, Beauty, Veterinary, Laundry, Bakery, Academy, Real Estate).
* **Guarda de Acceso a Nivel de API:** Decorador `@RequiresVertical(code)` y `VerticalGuard` para proteger rutas del backend contra verticales no contratados o deshabilitados.
* **Store Reactivo y Menú Dinámico:** Store `useVerticalsStore` en Pinia y adaptación de `navigation.ts` para ocultar o mostrar dinámicamente opciones del Sidebar según los verticales habilitados para la organización activa.
* **Gobierno de Verticales por Organización:** Pestaña "Verticales de Negocio" en `OrganizationsView.vue` con interruptores de activación en tiempo real y modal de configuración JSON personalizada por vertical.

#### Vertical RETAIL / Tienda (Fase 1)
* **Controlador y Servicio Retail:** Endpoints `/retail/dashboard`, `/retail/config` con métricas de ventas minoristas, rotación de stock y ticket promedio.
* **Dashboard Retail:** Vista `RetailDashboardView.vue` con KPIs de retail, monitor de productos bajo stock mínimo, márgenes de ganancia y acceso rápido a terminal POS.
* **Multi-Tenancy Automático:** Interceptores de Axios para inyección de cabeceras `x-organization-id` y `x-branch-id`, y función `resolveOrganizationId` en el backend para resolución transparente del tenant.

#### Vertical AUTOMOTIVE / Taller Automotriz y Motos (Fase 2)
* **Modelos de Vehículos y Recepción Técnica:** Entidades `Vehicle` y `VehicleCheckIn` con soporte para tipos de vehículo (`CAR`, `MOTORCYCLE`, `VAN`, `TRUCK`) y niveles de combustible (`EMPTY`, `QUARTER`, `HALF`, `THREE_QUARTERS`, `FULL`).
* **Directorio y Hoja de Vida de Vehículos:** Vista `VehiclesView.vue` para administración de flota, asociación con clientes del CRM e historial clínico completo de mantenimientos pasados.
* **Hoja de Recepción Técnica (Check-In):** Vista `AutomotiveCheckInView.vue` con checklist de inventario físico (llaves, documentos, kit de carretera, gato, llanta de repuesto), registro de abolladuras o golpes preexistentes, y generación atómica de la orden de servicio (`ServiceOrder`).
* **Patio y Bahías de Taller (Kanban):** Vista `AutomotiveDashboardView.vue` con tablero visual de bahías (En Patio, En Diagnóstico/Proceso, Esperando Repuestos, Listo para Entrega, Entregado) y configuración de puestos de trabajo por sucursal.
* **Insignias en Órdenes de Servicio:** Identificación de placa del vehículo en `ServiceOrdersView.vue` con redirección contextual al detalle automotriz.

### Fixed
* **Protección contra Doble Descuento de Inventario:** Resolución del conflicto entre el consumo técnico de materiales en órdenes de trabajo (`completeOrder` en `ServiceOrdersService`) y la confirmación de facturación POS (`SalesService.confirm`). Si una orden ya consumió stock como `SERVICE_CONSUMPTION`, la factura de venta no descuenta doblemente los repuestos.
* **Tipado Estricto de Compilación:** Corrección de tipos TypeScript en `GoodsReceiptsView`, `InternalConsumptionsView`, `KardexView`, `PurchaseOrdersView` y `SaleReturnsView`, garantizando compilación limpia con `vue-tsc -b` y `vite build` en el frontend y `nest build` en el backend.

---
## [1.6.0-rc1] - 2026-10-01

### Added
* **Control de Lotes y Fechas de Vencimiento:** Módulo `product-lots` y vista `ExpiringLotsView.vue` con semáforos preventivos de caducidad a 30, 60 y 90 días.
* **Salud y Farmacia (PHARMACY):** Extensión de productos farmacéuticos (`product-pharmas`), control de registro sanitario Invima/FDA y recetas médicas (`MedicalPrescriptionsView.vue`).

---
## [1.5.0-rc1] - 2026-09-20

### Added
* **Vertical Hotel y Hospedaje (HOTEL):** Módulos `hotel-rooms` y `hotel-reservations` con interfaces `HotelRoomsView.vue`, `HotelReservationsView.vue`, `HotelDashboardView.vue` y `HotelReportsView.vue` para control de habitaciones, check-in, check-out y estados de limpieza.
* **Vertical Fitness y Gimnasios (GYM):** Módulos de planes de membresía (`gym-membership-plans`), suscripciones con fecha de expiración (`gym-subscriptions`), control de acceso en recepción (`GymCheckInView.vue`) y directorio de instructores (`GymInstructorsView.vue`).
* **Vertical Boutique Studios (STUDIO):** Paquetes de clases por créditos (`studio-plans`), agendamiento y aforos (`studio-schedules`), reserva de cupos (`studio-bookings`) y validación de asistencia (`StudioCheckInView.vue`).

---
## [1.4.0-rc1] - 2026-09-10

### Added
* **Módulo de Servicios Técnicos y Órdenes de Trabajo (SERVICES):** Módulos `service-orders`, `service-order-tasks`, `service-order-materials` y `service-workers`.
* **Comisiones y Rentabilidad:** Liquidación de comisiones por técnico (`ServiceCommissionsView.vue`) y reportes operativos de servicios (`ServiceReportsView.vue`).

---
## [1.3.0-rc1] - 2026-09-02

### Added
* **Dashboard Ejecutivo y Analítica Gerencial:** Vista `ExecutiveDashboardView.vue` con KPIs financieros en tiempo real (ingresos brutos, ticket promedio, ventas por categoría y márgenes).
* **Reportes de Ventas:** Vista `SalesPerformanceReportView.vue` para auditoría por canales, sucursales y medios de pago.
* **Resumen Fiscal:** Módulo `FiscalSummaryView.vue` e interfaz de impuestos `TaxesView.vue`.

---
## [1.2.0-rc1] - 2026-08-30

### Added
* **Salones y Mesas (RESTAURANT):** Vista `RoomLayoutView.vue` para distribución de salones y estado de mesas (`AVAILABLE`, `OCCUPIED`).
* **Comandero y Pantalla de Cocina (KDS):** Interfaz para meseros (`RestaurantOrderView.vue`) y monitor de cocina en tiempo real (`KitchenView.vue`) con semáforos de tiempo y notas de preparación.
* **Liberación Atómica de Mesa:** Integración directa con el punto de venta (POS) para cobrar la comanda, descontar el inventario y liberar la mesa en una sola transacción.

---
## [1.1.0-rc1] - 2026-08-29

### Added
* **Directorio de Clientes CRM:** Vista `CustomersView.vue` con filtrado dinámico, estado activo/inactivo y multicanales de contacto.
* **Asistente Upsert de Clientes:** Modal con validación de tipos de documento de identificación para Latinoamérica (Cédula, NIT, Pasaporte, RUT).

---
## [1.0.0-rc4] - 2026-08-28

### Added

#### KNA-067 / KNA-068 / KNA-069 / KNA-070 - Caja y Tesorería
* Alertas preventivas que congelan el POS si el operario no registra un monto inicial en efectivo.
* Modal de Arqueo de Cierre que contrasta la gaveta física contra el acumulado de ventas transaccionales en Postgres.

#### KNA-071 / KNA-072 / KNA-073 / KNA-074 - Notas de Crédito y Devoluciones
* Interfaz reactiva que unifica filas repetidas y calcula precios netos reales cobrados deduciendo descuentos del POS.
* Algoritmo cruzado de base de datos que descuenta devoluciones previas para impedir reembolsar más unidades de las vendidas.

#### KNA-075 / KNA-076 / KNA-077 / KNA-078 - Impresión de Comprobantes POS
* Maquetación tipográfica clásica monocromática adaptada para rollos de papel térmico de 80mm.
* Directivas `@media print` en el CSS raíz para aislar el ticket y omitir barras y botones del sistema operativo.
* Botón de acción en el Libro Auxiliar de Ventas para jalar metadatos históricos y disparar la reimpresión.


## [0.9.0-backend] - 2026-08-27

### Added

#### KNA-053 / KNA-054 / KNA-055 / KNA-056 - Sales API Core
* Endpoints comerciales granulares y aislados para `sales` y `sale-items` acoplados a Prisma.
* Lógica en el servicio para acumular subtotales netos deduciendo descuentos parciales por renglón.

#### KNA-057 / KNA-061 - Inventory ACID Protection
* Motor transaccional interactivo (`$transaction`) que bloquea las confirmaciones de folios si el stock de la sucursal es menor a la cantidad demandada.

#### KNA-058 / KNA-059 - Returns & Payments Logs
* Sub-módulos para notas de crédito de clientes y dispersión contable de métodos de pago (`CASH`, `CREDIT_CARD`, `TRANSFER`).

#### KNA-060 - Fiscal Billing Resolutions
* Tabla relacional para configurar prefijos y rangos autorizados por la entidad tributaria, automatizando el incremento secuencial del `saleNumber` en el POS.

## - 2026-08-26

### Added
* Módulo Comercial de Clientes integrado a `GET/POST /customers` con validación de correo único.
* Directorio de Talento Humano para altas y suspensiones de operarios ligados a sedes físicas de trabajo.
* Panel Avanzado de Gobierno de Privilegios con switches reactivos acoplados a transacciones ACID de NestJS.
* Mapeadores blindados para desestructurar respuestas JSON anidadas complejas de Prisma (`rolePermissions` y `userRoles`).


## - 2026-08-26

### Added

#### KNA-044 - Suppliers UI
* CRUD e historial transaccional de proveedores comerciales con validación cruzada anti-duplicados por número de identificación fiscal.

#### KNA-045 / KNA-046 - Purchase Orders Engine
* Tablero operativo de control de órdenes emitidas sincronizado con los estados del workflow nativo de NestJS.
* Formulario asíncrono maestro-detalle para guardar cabeceras en borrador e insertar ítems granulares controlando el costo pactado.

#### KNA-047 / KNA-048 / KNA-049 - Supply Chain & Accounts Payable
* Módulo logístico de actas de recibo e ingresos físicos a bodegas para órdenes aprobadas.
* Panel contable de radicación de facturas emitidas por proveedores con alarmas de vencimiento de crédito.
* Interfaz para emitir notas de devolución y mermas, bloqueando excesos sobre las cantidades recibidas en la orden original.


## - 2026-08-26

### Added

#### KNA-033 / KNA-035 - Frontend Foundation & Application Layout
* Base de SPA moderna con Vue 3, Vite, TypeScript y empaquetado ágil.
* Diseño responsivo corporativo con Tailwind CSS y control de estados activos.
* Estructuración del Layout maestro (`AppLayout.vue`) con Sidebar lateral y Topbar de sesión contextual.

#### KNA-034 / KNA-036 - Authentication & Authorization UI
* Formulario reactivo de Login con manejo asíncrono de errores y blindaje contra recargas HTML predeterminadas.
* Integración con Axios mediante interceptores automáticos para inyección del header `Authorization Bearer`.
* Control de expiración de sesión (Error 401) y protección estructural de rutas privadas usando Vue Router Guards.
* Decodificación en caliente del token JWT en el cliente mediante `jwt-decode` para el consumo secuencial de perfiles.

#### KNA-037 / KNA-038 - Corporate & Commercial Catalogs
* Pestañas dinámicas (Tabs) en Organizaciones para alternar entre empresas del SaaS y Sucursales físicas de NestJS.
* Tabla transaccional de Productos con control visual de SKU, códigos de barra y formateo monetario regional (Intl).

#### KNA-039 / KNA-043 - Inventory Suite UI
* Dashboard analítico de stock alimentado por el endpoint `/stock/balance` con cómputo automático de valoración financiera global de mercancías.
* Bitácora unificada de movimientos históricos mapeada a los tipos de transacción de la base de datos de Postgres.
* Formulario dinámico de Ajustes Manuales acoplado 1:1 a los validadores numéricos de strings del backend.
* Interfaz para emitir guías de despacho y transferencias entre sucursales autorizadas.
* Tarjeta analítica del Kardex por producto con semáforo de flujos (entradas/salidas) y auditoría de consistencia integrada.

### Changed
* Se migró la navegación de la aplicación de datos fijos (`mock`) a consumo interactivo directo de la API.
* Las vistas de movimientos logísticos se unificaron bajo interfaces multi-pestaña para mejorar la experiencia de usuario.
* Toda la lógica de negocio de compras e inventarios del backend ya tiene un reflejo operativo interactivo en la web.


## [0.5.0] - 2026-08-25

### Added

#### KNA-027 - Stock Adjustments

* Ajustes de inventario por producto y sucursal.
* Registro de movimientos de inventario tipo `ADJUSTMENT`.
* Cálculo de la diferencia entre stock anterior y stock físico.
* Actualización automática del stock.
* Registro del stock anterior y nuevo stock.
* Registro de la diferencia del ajuste.
* Registro del costo unitario utilizado en el ajuste.
* Trazabilidad mediante `InventoryMovement`.
* Validaciones de inventario.

#### KNA-028 - Inventory Transfers

* Transferencias de inventario entre sucursales.
* Validación de sucursal origen y sucursal destino.
* Validación para impedir transferencias entre la misma sucursal.
* Validación de stock disponible en la sucursal origen.
* Descuento automático del stock en la sucursal origen.
* Incremento automático del stock en la sucursal destino.
* Registro de movimientos `TRANSFER_OUT` y `TRANSFER_IN`.
* Integración transaccional mediante Prisma.
* Trazabilidad de las transferencias mediante `InventoryMovement`.

#### KNA-029 - Inventory Costing

* Implementación del costo promedio del inventario.
* Registro de `averageCost` por inventario de sucursal.
* Actualización del costo promedio mediante movimientos de inventario.
* Integración del costo con las operaciones de inventario.

#### KNA-030 - Stock Balance & Valuation

* Balance de inventario por sucursal.
* Control de stock por producto y sucursal.
* Valoración del inventario.
* Cálculo del valor del stock a partir de cantidad y costo promedio.
* Actualización automática del balance después de movimientos de inventario.

#### KNA-031 - Inventory History / Kardex

* Historial de movimientos de inventario.
* Kardex por producto.
* Consulta de movimientos por organización.
* Consulta de movimientos por producto.
* Consulta de movimientos por sucursal.
* Registro de entradas, salidas, ajustes y transferencias.
* Trazabilidad de las operaciones mediante `InventoryMovement`.

#### KNA-032 - Inventory Validation & Integrity

* Validación de stock disponible antes de realizar salidas.
* Prevención de stock insuficiente.
* Prevención de transferencias entre la misma sucursal.
* Validación de cantidades positivas en transferencias.
* Rechazo de cantidades cero o negativas.
* Validación de consistencia entre sucursal, producto y movimiento.
* Operaciones transaccionales para mantener la integridad del inventario.
* Protección de la consistencia del stock entre sucursales.

### Changed

* El inventario ahora se administra por sucursal.
* Las transferencias modifican automáticamente el stock de origen y destino.
* Los ajustes actualizan el stock a partir de la diferencia entre el stock actual y el conteo físico.
* El inventario mantiene un costo promedio por producto y sucursal.
* `InventoryMovement` se mantiene como fuente de verdad para las operaciones de inventario.
* Se fortalecieron las validaciones de integridad para las operaciones de inventario.
* El Kardex permite mantener la trazabilidad histórica de los movimientos.

### Security

* Las operaciones de inventario continúan protegidas mediante JWT.
* Control de acceso basado en roles y permisos (RBAC).
* Validación de organización y relaciones entre entidades.

---

## [0.4.0] - 2026-08-12

### Added

#### KNA-007 - Branches

* CRUD completo de sucursales.
* Validación de organización existente.
* Soft Delete.
* Swagger.
* Validaciones de negocio.

#### KNA-008 - Users

* CRUD completo de usuarios.
* Hash de contraseñas con bcrypt.
* Validación de email único.
* Validación Organization → Branch.
* Soft Delete.

#### KNA-009 - Authentication

* Login JWT.
* JwtStrategy.
* JwtAuthGuard.
* Passport JWT.
* Tokens Bearer.

#### KNA-010 - Roles

* CRUD completo de Roles.
* Validación de organización.
* Código único por organización.
* Soft Delete.

#### KNA-011 - Permissions

* CRUD completo de Permisos.
* Código único.
* Soft Delete.

#### KNA-012 - RolePermission

* Asignación de permisos a roles.
* Eliminación de permisos.
* Prevención de duplicados.
* Validaciones de existencia.

#### KNA-013 - UserRole

* Asignación de roles a usuarios.
* Eliminación de roles.
* Prevención de duplicados.
* Validaciones de existencia.

#### KNA-014 - Authorization

* Decorador `@Permissions()`.
* `PermissionsGuard`.
* Autorización basada en Roles + Permisos.
* Protección de endpoints mediante permisos.
* Integración completa con JWT.

#### KNA-020 - Purchase Order — Header

* CRUD de órdenes de compra.
* Numeración única por organización.
* Validación de proveedor existente.
* Estados de órdenes de compra.
* Control de modificación y cancelación según estado.
* Integración con Swagger.
* Protección mediante JWT.
* Control de acceso RBAC.

#### KNA-021 - Purchase Order — Items

* CRUD de ítems de órdenes de compra.
* Validación de producto existente.
* Validación de orden de compra existente.
* Restricción de modificación de ítems a órdenes DRAFT.
* Cálculo automático de subtotal.
* Recálculo automático de subtotal, impuestos y total de la orden.

#### KNA-022 - Receive Purchase Order

* Creación de Goods Receipts.
* Recepción de ítems de órdenes de compra.
* Validación de cantidades recibidas.
* Control de recepción parcial y completa.
* Actualización automática del stock.
* Registro de movimientos de inventario tipo `PURCHASE`.
* Actualización automática del estado de la orden de compra.
* Integración transaccional mediante Prisma.

#### KNA-023 - Purchase Invoice — Header

* CRUD de encabezados de facturas de compra.
* Relación con proveedores.
* Relación con órdenes de compra.
* Validaciones de documentos.
* Control de estados de factura.
* Protección mediante JWT y RBAC.

#### KNA-024 - Purchase Invoice — Items

* CRUD de ítems de facturas de compra.
* Relación con productos.
* Relación con facturas de compra.
* Cálculo de subtotales.
* Validaciones de cantidades y valores.

#### KNA-025 - Purchase Returns

* Creación de devoluciones a proveedores.
* Gestión de ítems de devolución.
* Actualización de stock.
* Registro de movimientos `PURCHASE_RETURN`.
* Relación con documentos de compra.
* Validaciones de cantidades devueltas.
* Integración transaccional mediante Prisma.

#### KNA-026 - Purchase Order Workflow

* Flujo de estados de órdenes de compra.
* `DRAFT → CONFIRMED`.
* `CONFIRMED → PARTIALLY_RECEIVED`.
* `CONFIRMED → RECEIVED`.
* Validación de órdenes antes de confirmar.
* Una orden no puede confirmarse sin ítems.
* Validación de cantidades recibidas contra cantidades ordenadas.
* Actualización automática del estado según recepción.
* Integración entre Purchase Orders, Goods Receipts e Inventory.
* Actualización transaccional del stock.
* Trazabilidad mediante `InventoryMovement`.

### Changed

* El Inventory Core ahora se integra directamente con el flujo de compras.
* Las recepciones de mercancía generan movimientos de inventario automáticamente.
* El stock de productos se actualiza mediante transacciones Prisma.
* Las órdenes de compra mantienen control sobre cantidades ordenadas y recibidas.

### Security

* Contraseñas almacenadas usando bcrypt.
* Endpoints protegidos mediante JWT.
* Control de acceso basado en permisos (RBAC).

---

## [0.3.0] - 2026-08-04

### Added

#### KNA-015 - Customers (Core)

* CRUD completo de clientes.
* Validación de organización.
* Soft Delete.
* Swagger.
* Validaciones de negocio.

#### KNA-016 - Suppliers (Core)

* CRUD completo de proveedores.
* Validación de organización.
* Validación de identificación única por organización.
* Soft Delete.
* Swagger.

#### KNA-017 - Product Categories (Core)

* CRUD completo de categorías de productos.
* Validación de organización.
* Nombre único por organización.
* Soft Delete.

#### KNA-018 - Products (Core)

* CRUD completo de productos.
* SKU único por organización.
* Relación con categorías.
* Relación con proveedores.
* Control de estado activo.
* Swagger.

#### KNA-019 - Inventory (Core)

* Modelo `InventoryMovement`.
* Control automático de stock.
* Movimientos:

  * `INITIAL_STOCK`
  * `PURCHASE`
  * `SALE`
  * `PURCHASE_RETURN`
  * `SALE_RETURN`
  * `ADJUSTMENT`
  * `TRANSFER_IN`
  * `TRANSFER_OUT`
* Validaciones de inventario.
* Transacciones mediante Prisma.
* Kardex por producto.
* Balance acumulado.
* Resumen de inventario.
* Swagger.

### Changed

* Los productos ahora administran stock automáticamente mediante `InventoryMovement`.
* Se centralizó toda la lógica del inventario en un único servicio.

---

## [0.2.0]

### Added

* Authentication.
* RBAC.
* Roles.
* Permissions.

---

## [0.1.0]

### Added

* Core Platform.
* Organizations.
* Branches.
