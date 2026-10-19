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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AcademyService } from './academy.service';
import {
  BatchRecordAttendanceDto,
  CreateAcademyCohortDto,
  CreateAcademyCourseDto,
  CreateAcademyEnrollmentDto,
  UpdateAcademyConfigDto,
  UpdateAcademyEnrollmentDto,
} from './dto/academy.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { VerticalGuard } from '../auth/guards/vertical.guard';
import { RequiresVertical } from '../auth/decorators/requires-vertical.decorator';

@ApiTags('Vertical: Academy & Education Center (Academia / Centro Educativo)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, VerticalGuard)
@RequiresVertical('ACADEMY')
@Controller('academy')
export class AcademyController {
  constructor(private readonly academyService: AcademyService) {}

  @Get('dashboard')
  @ApiOperation({
    summary:
      'Obtiene KPIs académicos, grupos activos y matrículas recientes con estado de cobro POS',
  })
  getDashboard(
    @Query('organizationId') organizationId?: string,
    @Query('branchId') branchId?: string,
    @Req() req?: any,
  ) {
    return this.academyService.getDashboard(
      organizationId,
      branchId,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Get('courses')
  @ApiOperation({
    summary: 'Lista programas y cursos académicos',
  })
  findAllCourses(
    @Query('organizationId') organizationId?: string,
    @Query('search') search?: string,
    @Req() req?: any,
  ) {
    return this.academyService.findAllCourses(
      organizationId,
      search,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Post('courses')
  @ApiOperation({
    summary: 'Crea un nuevo programa o curso académico',
  })
  createCourse(@Body() dto: CreateAcademyCourseDto, @Req() req?: any) {
    return this.academyService.createCourse(
      dto,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Get('cohorts')
  @ApiOperation({
    summary: 'Lista grupos/cohortes académicos con su docente y ocupación',
  })
  findAllCohorts(
    @Query('organizationId') organizationId?: string,
    @Query('branchId') branchId?: string,
    @Query('courseId') courseId?: string,
    @Req() req?: any,
  ) {
    return this.academyService.findAllCohorts(
      organizationId,
      branchId,
      courseId,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Get('cohorts/:id')
  @ApiOperation({
    summary:
      'Obtiene el detalle de un grupo/cohorte con su listado de estudiantes matriculados y asistencias',
  })
  findCohortById(
    @Param('id') id: string,
    @Query('organizationId') organizationId?: string,
    @Req() req?: any,
  ) {
    return this.academyService.findCohortById(
      id,
      organizationId,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Post('cohorts')
  @ApiOperation({
    summary: 'Abre un nuevo grupo/cohorte académico asignando docente y horario',
  })
  createCohort(@Body() dto: CreateAcademyCohortDto, @Req() req?: any) {
    return this.academyService.createCohort(
      dto,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Get('enrollments')
  @ApiOperation({
    summary: 'Lista matrículas de estudiantes con estado académico y de cobro',
  })
  findAllEnrollments(
    @Query('organizationId') organizationId?: string,
    @Query('branchId') branchId?: string,
    @Query('cohortId') cohortId?: string,
    @Query('status') status?: string,
    @Req() req?: any,
  ) {
    return this.academyService.findAllEnrollments(
      organizationId,
      branchId,
      cohortId,
      status,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Post('enrollments')
  @ApiOperation({
    summary:
      'Matricula un estudiante (Customer) en un grupo y genera automáticamente la ServiceOrder para cobro en POS',
  })
  createEnrollment(@Body() dto: CreateAcademyEnrollmentDto, @Req() req?: any) {
    return this.academyService.createEnrollment(
      dto,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Patch('enrollments/:id')
  @ApiOperation({
    summary: 'Actualiza el estado académico o calificación final de una matrícula',
  })
  updateEnrollment(
    @Param('id') id: string,
    @Body() dto: UpdateAcademyEnrollmentDto,
    @Req() req?: any,
  ) {
    return this.academyService.updateEnrollment(
      id,
      dto,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Post('attendance/batch')
  @ApiOperation({
    summary:
      'Registra asistencia y nota de sesión para los estudiantes de un grupo y recalcula promedios automáticamente',
  })
  recordCohortAttendance(
    @Body() dto: BatchRecordAttendanceDto,
    @Req() req?: any,
  ) {
    return this.academyService.recordCohortAttendance(
      dto,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Get('config')
  @ApiOperation({
    summary: 'Obtiene la configuración operativa del vertical ACADEMY',
  })
  getConfig(
    @Query('organizationId') organizationId?: string,
    @Req() req?: any,
  ) {
    return this.academyService.getConfig(
      organizationId,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Patch('config')
  @ApiOperation({
    summary: 'Actualiza la configuración operativa del vertical ACADEMY',
  })
  updateConfig(@Body() dto: UpdateAcademyConfigDto, @Req() req?: any) {
    return this.academyService.updateConfig(
      dto,
      req?.user?.id || req?.user?.sub,
    );
  }
}

