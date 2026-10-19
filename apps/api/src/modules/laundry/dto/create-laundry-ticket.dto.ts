import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LaundryPricingMode } from '@prisma/client';

export class CreateLaundryTicketItemDto {
  @ApiPropertyOptional({ description: 'ID del servicio del catálogo (ServiceItem)' })
  @IsString()
  @IsOptional()
  serviceItemId?: string;

  @ApiProperty({ description: 'Tipo de prenda o lote', example: 'Camisa Manga Larga' })
  @IsString()
  @IsNotEmpty()
  garmentType: string;

  @ApiPropertyOptional({
    description: 'Proceso: WASH_AND_FOLD, DRY_CLEAN, IRON_ONLY, STAIN_REMOVAL, DYEING',
    default: 'WASH_AND_FOLD',
  })
  @IsString()
  @IsOptional()
  processType?: string;

  @ApiPropertyOptional({ description: 'Color de la prenda', example: 'Blanco' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: 'Marca de la prenda', example: 'Arturo Calle' })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional({ description: 'Observaciones / manchas previas / daños', example: 'Mancha de café en puño derecho' })
  @IsString()
  @IsOptional()
  defectsNotes?: string;

  @ApiPropertyOptional({ description: 'Cantidad de piezas', default: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ description: 'Peso en kg (si aplica por ítem)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  weightKg?: number;

  @ApiProperty({ description: 'Precio unitario o por línea', example: 8500 })
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class LaundryMaterialInputDto {
  @ApiProperty({ description: 'ID del insumo de inventario (detergente, suavizante, bolsa, gancho)' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Cantidad consumida', example: 1 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiPropertyOptional({ description: 'Precio unitario (0 si es insumo incluido en tarifa)' })
  @IsNumber()
  @IsOptional()
  unitPrice?: number;
}

export class CreateLaundryTicketDto {
  @ApiPropertyOptional({ description: 'ID de la organización' })
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'ID de la sucursal' })
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiProperty({ description: 'ID del cliente (Customer Core)' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiPropertyOptional({ description: 'ID del operario responsable (ServiceWorker Core)' })
  @IsString()
  @IsOptional()
  workerId?: string;

  @ApiPropertyOptional({ enum: LaundryPricingMode, default: LaundryPricingMode.MIXED })
  @IsEnum(LaundryPricingMode)
  @IsOptional()
  pricingMode?: LaundryPricingMode;

  @ApiPropertyOptional({ description: 'Peso total en kilogramos', example: 5.5 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalWeightKg?: number;

  @ApiPropertyOptional({ description: 'Tarifa por kilogramo aplicada', example: 6000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  pricePerKg?: number;

  @ApiPropertyOptional({ description: 'Ubicación en perchero o estante', example: 'Perchero A-14' })
  @IsString()
  @IsOptional()
  rackLocation?: string;

  @ApiPropertyOptional({ description: '¿Es servicio Express / Urgente?', default: false })
  @IsBoolean()
  @IsOptional()
  isExpress?: boolean;

  @ApiPropertyOptional({ description: 'Fecha y hora prometida de entrega (ISO)' })
  @IsDateString()
  @IsOptional()
  promisedAt?: string;

  @ApiPropertyOptional({ description: 'Notas generales del ticket' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Detalle de prendas o lotes recibidos', type: [CreateLaundryTicketItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLaundryTicketItemDto)
  @IsOptional()
  items?: CreateLaundryTicketItemDto[];

  @ApiPropertyOptional({ description: 'Insumos de lavado asociados (detergente, bolsas, ganchos)', type: [LaundryMaterialInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LaundryMaterialInputDto)
  @IsOptional()
  materials?: LaundryMaterialInputDto[];
}

