import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { InstructorPaymentModel } from '@prisma/client';

export class CreateInstructorDto {
  @IsString() @IsNotEmpty() organizationId: string;
  @IsOptional() @IsString() branchId?: string;
  @IsString() @IsNotEmpty() firstName: string;
  @IsOptional() @IsString() lastName?: string;
  @IsString() @IsNotEmpty() identification: string;
  @IsOptional() @IsString() phoneNumber?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() specialty?: string;
  @IsOptional() @IsString() businessType?: string;
  @IsEnum(InstructorPaymentModel) paymentModel: InstructorPaymentModel;
  @IsNumber() @Min(0) fixedClassRate: number;
  @IsNumber() @Min(0) perStudentRate: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateInstructorDto extends PartialType(CreateInstructorDto) {}
export class CreateInstructorOverrideDto {
  @IsString() @IsNotEmpty() organizationId: string;
  @IsString() @IsNotEmpty() studioScheduleId: string;
  @IsString() @IsNotEmpty() instructorId: string;
  @IsString() @IsNotEmpty() classDate: string;
  @IsOptional() @IsString() notes?: string;
}
