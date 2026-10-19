import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AcademyAttendanceStatus,
  AcademyEnrollmentStatus,
} from '@prisma/client';

export class CreateAcademyCourseDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationWeeks?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalHours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tuitionFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyFee?: number;

  @IsOptional()
  @IsString()
  serviceItemId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateAcademyCohortDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  @IsNotEmpty()
  courseId: string;

  @IsOptional()
  @IsString()
  teacherWorkerId?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  classroom?: string;

  @IsString()
  @IsNotEmpty()
  scheduleLabel: string;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxCapacity?: number;
}

export class EnrollmentMaterialInputDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateAcademyEnrollmentDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  @IsNotEmpty()
  cohortId: string;

  @IsString()
  @IsNotEmpty()
  studentCustomerId: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  scholarshipPct?: number;

  @IsOptional()
  @IsString()
  guardianName?: string;

  @IsOptional()
  @IsString()
  guardianPhone?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  createServiceOrder?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnrollmentMaterialInputDto)
  materials?: EnrollmentMaterialInputDto[];
}

export class UpdateAcademyEnrollmentDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsEnum(AcademyEnrollmentStatus)
  status?: AcademyEnrollmentStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  finalGrade?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AttendanceRecordItemDto {
  @IsString()
  @IsNotEmpty()
  enrollmentId: string;

  @IsEnum(AcademyAttendanceStatus)
  status: AcademyAttendanceStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  gradeScore?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BatchRecordAttendanceDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsString()
  @IsNotEmpty()
  cohortId: string;

  @IsOptional()
  @IsString()
  sessionDate?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordItemDto)
  records: AttendanceRecordItemDto[];
}

export class UpdateAcademyConfigDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  gradingScaleMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPassingGrade?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  minAttendancePct?: number;

  @IsOptional()
  @IsBoolean()
  autoCreateServiceOrderOnEnrollment?: boolean;
}

