import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum RetailSubtype {
  GENERAL = 'GENERAL',
  BOUTIQUE = 'BOUTIQUE',
  HARDWARE = 'HARDWARE',
  STATIONERY = 'STATIONERY',
  ELECTRONICS = 'ELECTRONICS',
  SPARE_PARTS = 'SPARE_PARTS',
  PET_SHOP = 'PET_SHOP',
}

export class UpdateRetailConfigDto {
  @ApiPropertyOptional({
    enum: RetailSubtype,
    example: RetailSubtype.GENERAL,
    description: 'Subtipo o giro específico del comercio minorista',
  })
  @IsOptional()
  @IsEnum(RetailSubtype)
  subtype?: RetailSubtype;

  @ApiPropertyOptional({
    example: true,
    description: 'Habilitar modo continuo para lector de código de barras en POS',
  })
  @IsOptional()
  @IsBoolean()
  enableBarcodeScanner?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Permitir ventas con existencias en negativo',
  })
  @IsOptional()
  @IsBoolean()
  allowNegativeStock?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Exigir selección obligatoria de cliente antes de cobrar en POS',
  })
  @IsOptional()
  @IsBoolean()
  requireCustomerOnCheckout?: boolean;

  @ApiPropertyOptional({
    example: 'CASH',
    description: 'Método de pago predeterminado en el punto de venta',
  })
  @IsOptional()
  @IsString()
  defaultPaymentMethod?: string;

  @ApiPropertyOptional({
    example: '¡Gracias por su compra en KUNA! Conserve su factura para garantías.',
    description: 'Mensaje personalizado impreso al pie de página del recibo/tirilla',
  })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  receiptFooterNote?: string;
}

