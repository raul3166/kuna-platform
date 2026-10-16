import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import {
  CreateMedicalRecordDto,
  CreateVaccinationDto,
  UpdateVeterinaryConfigDto,
} from './dto/veterinary-misc.dto';
import {
  InventoryMovementType,
  PetGender,
  PetSpecies,
  ServiceOrderStatus,
  VetVisitType,
} from '@prisma/client';

@Injectable()
export class VeterinaryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resuelve el ID de organización con soporte a fallback por usuario o tenant activo
   */
  async resolveOrganizationId(
    organizationId?: string,
    userId?: string,
  ): Promise<string> {
    if (organizationId) {
      return organizationId;
    }

    if (userId) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      if (dbUser?.organizationId) {
        return dbUser.organizationId;
      }
    }

    const firstOrg = await this.prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true },
    });

    if (firstOrg?.id) {
      return firstOrg.id;
    }

    throw new BadRequestException(
      'No se pudo determinar la organización activa.',
    );
  }

  /**
   * Resuelve una sucursal válida para la organización si no se envía explícitamente
   */
  async resolveBranchId(
    organizationId: string,
    branchId?: string,
  ): Promise<string> {
    if (branchId) {
      return branchId;
    }

    const mainBranch = await this.prisma.branch.findFirst({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!mainBranch) {
      throw new BadRequestException(
        'No se encontró una sucursal activa para esta organización.',
      );
    }

    return mainBranch.id;
  }

  /**
   * Dashboard Operativo de Veterinaria & Pet Shop
   */
  async getDashboard(
    organizationId?: string,
    branchId?: string,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [
      totalPets,
      consultationsToday,
      activeOrders,
      recentMedicalRecords,
      upcomingVaccinations,
      speciesDistribution,
    ] = await Promise.all([
      this.prisma.pet.count({
        where: { organizationId: orgId, isActive: true },
      }),
      this.prisma.vetMedicalRecord.count({
        where: {
          organizationId: orgId,
          ...(branchId ? { branchId } : {}),
          visitDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      }),
      this.prisma.serviceOrder.findMany({
        where: {
          organizationId: orgId,
          ...(branchId ? { branchId } : {}),
          petId: { not: null },
          status: {
            in: [
              ServiceOrderStatus.PENDING,
              ServiceOrderStatus.IN_PROGRESS,
              ServiceOrderStatus.WAITING_PARTS,
              ServiceOrderStatus.COMPLETED,
            ],
          },
        },
        include: {
          pet: true,
          customer: true,
          assignedWorker: true,
          serviceItem: true,
          tasks: true,
          materials: {
            include: { product: true },
          },
          vetMedicalRecord: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.vetMedicalRecord.findMany({
        where: {
          organizationId: orgId,
          ...(branchId ? { branchId } : {}),
        },
        include: {
          pet: {
            include: { customer: true },
          },
          veterinarian: true,
          serviceOrder: true,
        },
        orderBy: { visitDate: 'desc' },
        take: 10,
      }),
      this.findUpcomingVaccinations(orgId, 30, userId),
      this.prisma.pet.groupBy({
        by: ['species'],
        where: { organizationId: orgId, isActive: true },
        _count: { id: true },
      }),
    ]);

    const pendingCheckoutOrders = activeOrders.filter(
      (o) =>
        o.status === ServiceOrderStatus.COMPLETED ||
        o.status === ServiceOrderStatus.IN_PROGRESS ||
        o.status === ServiceOrderStatus.PENDING,
    );

    const estimatedRevenueInClinic = activeOrders.reduce(
      (acc, o) => acc + Number(o.total || 0),
      0,
    );

    return {
      kpis: {
        totalPets,
        consultationsToday,
        activePatientsInClinic: activeOrders.length,
        upcomingVaccinationsCount: upcomingVaccinations.length,
        estimatedRevenueInClinic,
      },
      activeOrders,
      pendingCheckoutOrders,
      recentMedicalRecords,
      upcomingVaccinations,
      speciesDistribution: speciesDistribution.map((item) => ({
        species: item.species,
        count: item._count.id,
      })),
    };
  }

  /**
   * Directorio de Mascotas / Pacientes
   */
  async findAllPets(
    organizationId?: string,
    search?: string,
    customerId?: string,
    species?: PetSpecies,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    return this.prisma.pet.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
        ...(customerId ? { customerId } : {}),
        ...(species ? { species } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { breed: { contains: search, mode: 'insensitive' } },
                { microchipNumber: { contains: search, mode: 'insensitive' } },
                {
                  customer: {
                    firstName: { contains: search, mode: 'insensitive' },
                  },
                },
                {
                  customer: {
                    lastName: { contains: search, mode: 'insensitive' },
                  },
                },
                {
                  customer: {
                    companyName: { contains: search, mode: 'insensitive' },
                  },
                },
                {
                  customer: {
                    identificationNumber: { contains: search, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        customer: true,
        _count: {
          select: {
            medicalRecords: true,
            vaccinations: true,
            serviceOrders: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Detalle de mascota con expediente clínico completo, vacunas y órdenes
   */
  async findPetById(id: string, organizationId?: string, userId?: string) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    const pet = await this.prisma.pet.findFirst({
      where: { id, organizationId: orgId },
      include: {
        customer: true,
        medicalRecords: {
          include: {
            veterinarian: true,
            branch: true,
            serviceOrder: {
              include: {
                tasks: true,
                materials: { include: { product: true } },
              },
            },
          },
          orderBy: { visitDate: 'desc' },
        },
        vaccinations: {
          include: {
            veterinarian: true,
            product: true,
          },
          orderBy: { appliedAt: 'desc' },
        },
        serviceOrders: {
          include: {
            assignedWorker: true,
            serviceItem: true,
            sale: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 15,
        },
      },
    });

    if (!pet) {
      throw new NotFoundException(`Mascota con ID ${id} no encontrada.`);
    }

    return pet;
  }

  /**
   * Crear nueva mascota vinculada a un Customer (Propietario)
   */
  async createPet(dto: CreatePetDto, userId?: string) {
    const orgId = await this.resolveOrganizationId(dto.organizationId, userId);

    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, organizationId: orgId },
    });

    if (!customer) {
      throw new NotFoundException(
        'El cliente propietario seleccionado no existe en esta organización.',
      );
    }

    if (dto.microchipNumber && dto.microchipNumber.trim() !== '') {
      const existingChip = await this.prisma.pet.findFirst({
        where: {
          organizationId: orgId,
          microchipNumber: dto.microchipNumber.trim(),
        },
      });
      if (existingChip) {
        throw new ConflictException(
          `Ya existe una mascota registrada con el microchip ${dto.microchipNumber}.`,
        );
      }
    }

    return this.prisma.pet.create({
      data: {
        organizationId: orgId,
        customerId: dto.customerId,
        name: dto.name.trim(),
        species: dto.species || PetSpecies.CANINE,
        breed: dto.breed?.trim() || null,
        gender: dto.gender || PetGender.UNKNOWN,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        color: dto.color?.trim() || null,
        weightKg: dto.weightKg !== undefined ? dto.weightKg : null,
        microchipNumber: dto.microchipNumber?.trim() || null,
        isSterilized: dto.isSterilized ?? false,
        allergies: dto.allergies?.trim() || null,
        chronicIssues: dto.chronicIssues?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
      include: {
        customer: true,
      },
    });
  }

  /**
   * Actualizar datos de mascota
   */
  async updatePet(id: string, dto: UpdatePetDto, userId?: string) {
    const orgId = await this.resolveOrganizationId(dto.organizationId, userId);

    const existing = await this.prisma.pet.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      throw new NotFoundException(`Mascota con ID ${id} no encontrada.`);
    }

    return this.prisma.pet.update({
      where: { id },
      data: {
        ...(dto.customerId && { customerId: dto.customerId }),
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.species && { species: dto.species }),
        ...(dto.breed !== undefined && { breed: dto.breed?.trim() || null }),
        ...(dto.gender && { gender: dto.gender }),
        ...(dto.birthDate !== undefined && {
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        }),
        ...(dto.color !== undefined && { color: dto.color?.trim() || null }),
        ...(dto.weightKg !== undefined && { weightKg: dto.weightKg }),
        ...(dto.microchipNumber !== undefined && {
          microchipNumber: dto.microchipNumber?.trim() || null,
        }),
        ...(dto.isSterilized !== undefined && {
          isSterilized: dto.isSterilized,
        }),
        ...(dto.allergies !== undefined && {
          allergies: dto.allergies?.trim() || null,
        }),
        ...(dto.chronicIssues !== undefined && {
          chronicIssues: dto.chronicIssues?.trim() || null,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes?.trim() || null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        customer: true,
      },
    });
  }

  /**
   * Registrar Historia Clínica / Consulta Veterinaria
   * Actualiza automáticamente el peso actual de la mascota y opcionalmente
   * genera una ServiceOrder lista para cobro en POS (/pos?serviceOrderId=...)
   */
  async createMedicalRecord(dto: CreateMedicalRecordDto, userId?: string) {
    const orgId = await this.resolveOrganizationId(dto.organizationId, userId);
    const branchId = await this.resolveBranchId(orgId, dto.branchId);

    const pet = await this.prisma.pet.findFirst({
      where: { id: dto.petId, organizationId: orgId },
      include: { customer: true },
    });

    if (!pet) {
      throw new NotFoundException('La mascota indicada no existe.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Si se registró un nuevo peso en la consulta, actualizamos la ficha del paciente
      if (dto.weightKg !== undefined && dto.weightKg > 0) {
        await tx.pet.update({
          where: { id: pet.id },
          data: { weightKg: dto.weightKg },
        });
      }

      let createdOrderId: string | null = null;

      // 2. Crear Orden de Servicio automáticamente si se solicita (default: true)
      const shouldCreateOrder = dto.createServiceOrder ?? true;
      if (shouldCreateOrder) {
        let initialLabor = Number(dto.laborTotal || 0);
        let serviceItemName = `Atención Veterinaria (${dto.visitType || 'CONSULTATION'})`;

        if (dto.serviceItemId) {
          const sItem = await tx.serviceItem.findUnique({
            where: { id: dto.serviceItemId },
          });
          if (sItem) {
            serviceItemName = sItem.name;
            if (!dto.laborTotal) {
              initialLabor = Number(sItem.basePrice || 0);
            }
          }
        }

        let materialsTotal = 0;
        const materialCreates: Array<{
          productId: string;
          quantity: number;
          unitCost: number;
          unitPrice: number;
          total: number;
        }> = [];

        if (dto.materials && dto.materials.length > 0) {
          for (const mat of dto.materials) {
            const product = await tx.product.findFirst({
              where: { id: mat.productId, organizationId: orgId },
            });
            if (!product) {
              throw new NotFoundException(
                `El medicamento/insumo ${mat.productId} no fue encontrado.`,
              );
            }
            const qty = Number(mat.quantity);
            const uPrice =
              mat.unitPrice !== undefined
                ? Number(mat.unitPrice)
                : Number(product.salePrice || 0);
            const uCost = Number(product.costPrice || 0);
            const lineTotal = qty * uPrice;
            materialsTotal += lineTotal;

            materialCreates.push({
              productId: product.id,
              quantity: qty,
              unitCost: uCost,
              unitPrice: uPrice,
              total: lineTotal,
            });
          }
        }

        const orderNumber = `VET-${Date.now().toString().slice(-6)}`;
        const grandTotal = initialLabor + materialsTotal;

        const serviceOrder = await tx.serviceOrder.create({
          data: {
            organizationId: orgId,
            branchId,
            customerId: pet.customerId,
            petId: pet.id,
            assignedWorkerId: dto.veterinarianId || null,
            serviceItemId: dto.serviceItemId || null,
            orderNumber,
            assetName: `Mascota: ${pet.name} (${pet.species})`,
            assetIdentifier: pet.microchipNumber || pet.breed || pet.species,
            initialNotes: dto.reason,
            diagnosis: dto.diagnosis || null,
            status: ServiceOrderStatus.IN_PROGRESS,
            laborTotal: initialLabor,
            materialsTotal,
            total: grandTotal,
            ...( !dto.serviceItemId && initialLabor > 0
              ? {
                  tasks: {
                    create: [
                      {
                        description: `${serviceItemName} - ${pet.name}`,
                        price: initialLabor,
                        assignedWorkerId: dto.veterinarianId || null,
                      },
                    ],
                  },
                }
              : {}),
            ...(materialCreates.length > 0
              ? {
                  materials: {
                    create: materialCreates,
                  },
                }
              : {}),
          },
        });

        createdOrderId = serviceOrder.id;
      }

      // 3. Crear el registro clínico VetMedicalRecord
      const record = await tx.vetMedicalRecord.create({
        data: {
          organizationId: orgId,
          branchId,
          petId: pet.id,
          veterinarianId: dto.veterinarianId || null,
          serviceOrderId: createdOrderId,
          visitType: dto.visitType || VetVisitType.CONSULTATION,
          visitDate: dto.visitDate ? new Date(dto.visitDate) : new Date(),
          weightKg: dto.weightKg !== undefined ? dto.weightKg : pet.weightKg,
          temperatureC: dto.temperatureC !== undefined ? dto.temperatureC : null,
          heartRateBpm: dto.heartRateBpm !== undefined ? dto.heartRateBpm : null,
          respiratoryRate:
            dto.respiratoryRate !== undefined ? dto.respiratoryRate : null,
          reason: dto.reason.trim(),
          anamnesis: dto.anamnesis?.trim() || null,
          physicalExam: dto.physicalExam?.trim() || null,
          diagnosis: dto.diagnosis?.trim() || null,
          treatment: dto.treatment?.trim() || null,
          prescription: dto.prescription?.trim() || null,
          nextControlDate: dto.nextControlDate
            ? new Date(dto.nextControlDate)
            : null,
          notes: dto.notes?.trim() || null,
        },
        include: {
          pet: {
            include: { customer: true },
          },
          veterinarian: true,
          serviceOrder: {
            include: {
              tasks: true,
              materials: { include: { product: true } },
            },
          },
        },
      });

      return record;
    });
  }

  /**
   * Listar historias clínicas con filtros
   */
  async findMedicalRecords(
    organizationId?: string,
    petId?: string,
    branchId?: string,
    visitType?: VetVisitType,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    return this.prisma.vetMedicalRecord.findMany({
      where: {
        organizationId: orgId,
        ...(petId ? { petId } : {}),
        ...(branchId ? { branchId } : {}),
        ...(visitType ? { visitType } : {}),
      },
      include: {
        pet: {
          include: { customer: true },
        },
        veterinarian: true,
        branch: true,
        serviceOrder: {
          include: {
            tasks: true,
            materials: { include: { product: true } },
          },
        },
      },
      orderBy: { visitDate: 'desc' },
      take: 100,
    });
  }

  /**
   * Registrar Vacunación o Desparasitación en el carnet sanitario de la mascota
   */
  async createVaccination(dto: CreateVaccinationDto, userId?: string) {
    const orgId = await this.resolveOrganizationId(dto.organizationId, userId);
    const branchId = await this.resolveBranchId(orgId, dto.branchId);

    const pet = await this.prisma.pet.findFirst({
      where: { id: dto.petId, organizationId: orgId },
    });

    if (!pet) {
      throw new NotFoundException('La mascota indicada no existe.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Si se solicita descontar del inventario el biológico/antiparasitario directamente
      if (dto.deductStock && dto.productId) {
        const product = await tx.product.findFirst({
          where: { id: dto.productId, organizationId: orgId },
          include: { category: true },
        });

        if (product && (product.category?.trackStock ?? true)) {
          const branchStock = await tx.branchProductStock.findUnique({
            where: {
              branchId_productId: {
                branchId,
                productId: product.id,
              },
            },
          });

          if (!branchStock || Number(branchStock.stock) < 1) {
            throw new BadRequestException(
              `Stock insuficiente en sucursal para la vacuna/producto: ${product.name}`,
            );
          }

          await tx.branchProductStock.update({
            where: {
              branchId_productId: {
                branchId,
                productId: product.id,
              },
            },
            data: { stock: { decrement: 1 } },
          });

          await tx.product.update({
            where: { id: product.id },
            data: { stock: { decrement: 1 } },
          });

          await tx.inventoryMovement.create({
            data: {
              organizationId: orgId,
              branchId,
              productId: product.id,
              quantity: 1,
              unitCost: product.costPrice,
              reference: `VAC-${pet.name}`,
              notes: `Aplicación de ${dto.vaccineName} a mascota ${pet.name}`,
              movementType: InventoryMovementType.SERVICE_CONSUMPTION,
            } as any,
          });
        }
      }

      return tx.petVaccination.create({
        data: {
          organizationId: orgId,
          branchId,
          petId: pet.id,
          veterinarianId: dto.veterinarianId || null,
          productId: dto.productId || null,
          vaccineName: dto.vaccineName.trim(),
          type: dto.type || 'VACCINE',
          batchNumber: dto.batchNumber?.trim() || null,
          dose: dto.dose?.trim() || null,
          appliedAt: dto.appliedAt ? new Date(dto.appliedAt) : new Date(),
          nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : null,
          notes: dto.notes?.trim() || null,
        },
        include: {
          pet: {
            include: { customer: true },
          },
          veterinarian: true,
          product: true,
        },
      });
    });
  }

  /**
   * Obtener vacunas y desparasitaciones próximas a vencer o vencidas recientemente
   */
  async findUpcomingVaccinations(
    organizationId?: string,
    daysAhead = 30,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 15); // Incluye vencidas hace hasta 15 días

    const toDate = new Date();
    toDate.setDate(toDate.getDate() + Number(daysAhead || 30));

    return this.prisma.petVaccination.findMany({
      where: {
        organizationId: orgId,
        nextDueDate: {
          not: null,
          gte: fromDate,
          lte: toDate,
        },
      },
      include: {
        pet: {
          include: { customer: true },
        },
        veterinarian: true,
        product: true,
      },
      orderBy: { nextDueDate: 'asc' },
    });
  }

  /**
   * Configuración del vertical VETERINARY para el tenant
   */
  async getConfig(organizationId?: string, userId?: string) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    const vertical = await this.prisma.vertical.findUnique({
      where: { code: 'VETERINARY' },
    });

    if (!vertical) {
      throw new NotFoundException(
        'El vertical VETERINARY no está registrado en el catálogo maestro.',
      );
    }

    const orgVertical = await this.prisma.organizationVertical.findUnique({
      where: {
        organizationId_verticalId: {
          organizationId: orgId,
          verticalId: vertical.id,
        },
      },
    });

    const defaultSettings = {
      vaccinationAlertDays: 15,
      defaultConsultationMinutes: 30,
      autoCreateOrderOnConsultation: true,
      enableGrooming: true,
    };

    return {
      organizationId: orgId,
      verticalCode: 'VETERINARY',
      isActive: orgVertical?.isActive ?? false,
      settings: {
        ...defaultSettings,
        ...((orgVertical?.config as Record<string, any>) || {}),
      },
    };
  }

  /**
   * Actualizar configuración del vertical VETERINARY
   */
  async updateConfig(dto: UpdateVeterinaryConfigDto, userId?: string) {
    const orgId = await this.resolveOrganizationId(dto.organizationId, userId);

    const vertical = await this.prisma.vertical.findUnique({
      where: { code: 'VETERINARY' },
    });

    if (!vertical) {
      throw new NotFoundException(
        'El vertical VETERINARY no está registrado en el catálogo maestro.',
      );
    }

    const current = await this.getConfig(orgId, userId);
    const { organizationId: _ignored, ...newSettings } = dto;
    const mergedSettings = {
      ...current.settings,
      ...newSettings,
    };

    const updated = await this.prisma.organizationVertical.upsert({
      where: {
        organizationId_verticalId: {
          organizationId: orgId,
          verticalId: vertical.id,
        },
      },
      update: {
        config: mergedSettings,
      },
      create: {
        organizationId: orgId,
        verticalId: vertical.id,
        isActive: true,
        config: mergedSettings,
      },
    });

    return {
      organizationId: orgId,
      verticalCode: 'VETERINARY',
      isActive: updated.isActive,
      settings: updated.config,
    };
  }
}
