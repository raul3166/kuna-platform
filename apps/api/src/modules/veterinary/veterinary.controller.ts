import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { VeterinaryService } from './veterinary.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import {
  CreateMedicalRecordDto,
  CreateVaccinationDto,
  UpdateVeterinaryConfigDto,
} from './dto/veterinary-misc.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { VerticalGuard } from '../auth/guards/vertical.guard';
import { RequiresVertical } from '../auth/decorators/requires-vertical.decorator';
import { PetSpecies, VetVisitType } from '@prisma/client';

@ApiTags('Veterinary (Clínica Veterinaria & Pet Shop)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, VerticalGuard)
@RequiresVertical('VETERINARY')
@Controller('veterinary')
export class VeterinaryController {
  constructor(private readonly veterinaryService: VeterinaryService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Obtener métricas y estado clínico del día (Veterinaria & Pet Shop)' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  getDashboard(
    @Query('organizationId') organizationId?: string,
    @Query('branchId') branchId?: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id || req?.user?.sub;
    const orgId = organizationId || req?.user?.organizationId;
    return this.veterinaryService.getDashboard(orgId, branchId, userId);
  }

  @Get('pets')
  @ApiOperation({ summary: 'Listar directorio de mascotas / pacientes' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'species', required: false, enum: PetSpecies })
  findAllPets(
    @Query('organizationId') organizationId?: string,
    @Query('search') search?: string,
    @Query('customerId') customerId?: string,
    @Query('species') species?: PetSpecies,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id || req?.user?.sub;
    const orgId = organizationId || req?.user?.organizationId;
    return this.veterinaryService.findAllPets(
      orgId,
      search,
      customerId,
      species,
      userId,
    );
  }

  @Get('pets/:id')
  @ApiOperation({ summary: 'Obtener ficha completa de mascota con historial clínico y carnet de vacunas' })
  @ApiQuery({ name: 'organizationId', required: false })
  findPetById(
    @Param('id') id: string,
    @Query('organizationId') organizationId?: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id || req?.user?.sub;
    const orgId = organizationId || req?.user?.organizationId;
    return this.veterinaryService.findPetById(id, orgId, userId);
  }

  @Post('pets')
  @ApiOperation({ summary: 'Registrar nueva mascota vinculada a un cliente tutor' })
  createPet(@Body() dto: CreatePetDto, @Req() req?: any) {
    const userId = req?.user?.id || req?.user?.sub;
    if (!dto.organizationId && req?.user?.organizationId) {
      dto.organizationId = req.user.organizationId;
    }
    return this.veterinaryService.createPet(dto, userId);
  }

  @Patch('pets/:id')
  @ApiOperation({ summary: 'Actualizar datos de mascota' })
  updatePet(
    @Param('id') id: string,
    @Body() dto: UpdatePetDto,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id || req?.user?.sub;
    if (!dto.organizationId && req?.user?.organizationId) {
      dto.organizationId = req.user.organizationId;
    }
    return this.veterinaryService.updatePet(id, dto, userId);
  }

  @Post('medical-records')
  @ApiOperation({ summary: 'Registrar consulta / atención clínica y generar orden de servicio opcional' })
  createMedicalRecord(@Body() dto: CreateMedicalRecordDto, @Req() req?: any) {
    const userId = req?.user?.id || req?.user?.sub;
    if (!dto.organizationId && req?.user?.organizationId) {
      dto.organizationId = req.user.organizationId;
    }
    return this.veterinaryService.createMedicalRecord(dto, userId);
  }

  @Get('medical-records')
  @ApiOperation({ summary: 'Listar atenciones e historias clínicas veterinarias' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'petId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'visitType', required: false, enum: VetVisitType })
  findMedicalRecords(
    @Query('organizationId') organizationId?: string,
    @Query('petId') petId?: string,
    @Query('branchId') branchId?: string,
    @Query('visitType') visitType?: VetVisitType,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id || req?.user?.sub;
    const orgId = organizationId || req?.user?.organizationId;
    return this.veterinaryService.findMedicalRecords(
      orgId,
      petId,
      branchId,
      visitType,
      userId,
    );
  }

  @Post('vaccinations')
  @ApiOperation({ summary: 'Registrar vacuna o desparasitación en el carnet sanitario' })
  createVaccination(@Body() dto: CreateVaccinationDto, @Req() req?: any) {
    const userId = req?.user?.id || req?.user?.sub;
    if (!dto.organizationId && req?.user?.organizationId) {
      dto.organizationId = req.user.organizationId;
    }
    return this.veterinaryService.createVaccination(dto, userId);
  }

  @Get('vaccinations/upcoming')
  @ApiOperation({ summary: 'Listar próximos refuerzos de vacunas y desparasitaciones' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'daysAhead', required: false })
  findUpcomingVaccinations(
    @Query('organizationId') organizationId?: string,
    @Query('daysAhead') daysAhead?: number,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id || req?.user?.sub;
    const orgId = organizationId || req?.user?.organizationId;
    return this.veterinaryService.findUpcomingVaccinations(
      orgId,
      daysAhead ? Number(daysAhead) : 30,
      userId,
    );
  }

  @Get('config')
  @ApiOperation({ summary: 'Obtener configuración del vertical VETERINARY' })
  @ApiQuery({ name: 'organizationId', required: false })
  getConfig(
    @Query('organizationId') organizationId?: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id || req?.user?.sub;
    const orgId = organizationId || req?.user?.organizationId;
    return this.veterinaryService.getConfig(orgId, userId);
  }

  @Patch('config')
  @ApiOperation({ summary: 'Actualizar configuración del vertical VETERINARY' })
  updateConfig(@Body() dto: UpdateVeterinaryConfigDto, @Req() req?: any) {
    const userId = req?.user?.id || req?.user?.sub;
    if (!dto.organizationId && req?.user?.organizationId) {
      dto.organizationId = req.user.organizationId;
    }
    return this.veterinaryService.updateConfig(dto, userId);
  }
}

