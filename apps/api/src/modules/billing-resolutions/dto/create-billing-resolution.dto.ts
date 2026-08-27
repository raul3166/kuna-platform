import { IsDateString, IsNotEmpty, IsNumber, IsString, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBillingResolutionDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'cmrxzuv8g0000e76onfchrz1e' })
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'cmrzecq840001e7iwwpzi0ins' })
  branchId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'KUNA' })
  prefix: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '18764000000123' })
  resolutionNumber: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @ApiProperty({ example: 1 })
  fromNumber: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @ApiProperty({ example: 10000 })
  toNumber: number;

  @Type(() => Number)
  @IsNumber()
  @ApiProperty({ example: 1 })
  currentNumber: number;

  @IsDateString()
  @ApiProperty({ example: '2027-12-31T00:00:00.000Z' })
  expiryDate: string;
}
