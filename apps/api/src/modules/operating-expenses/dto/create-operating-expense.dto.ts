import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateOperatingExpenseDto {
  @ApiProperty({ example: 'cuid_org_123' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ example: 'cuid_branch_123', required: false })
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiProperty({ example: 'RENT', description: 'RENT, UTILITIES, PAYROLL, MARKETING, MAINTENANCE, SUPPLIES, TAXES, OTHER' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 'Pago de canon de arrendamiento local mes de noviembre' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'Inmobiliaria Central S.A.S.', required: false })
  @IsString()
  @IsOptional()
  beneficiaryName?: string;

  @ApiProperty({ example: 1850000 })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'TRANSFER', description: 'CASH, TRANSFER, NEQUI, CARD, PETTY_CASH' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({ example: 'PAID', description: 'PAID, PENDING' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ example: '2026-11-18', required: false })
  @IsDateString()
  @IsOptional()
  expenseDate?: string;

  @ApiProperty({ example: 'FAC-9910', required: false })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiProperty({ example: 'Transferencia Bancolombia #44912', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

