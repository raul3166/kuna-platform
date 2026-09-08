import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateProductPharmaDto } from './dto/create-product-pharma.dto';
import { UpdateProductPharmaDto } from './dto/update-product-pharma.dto';

@Injectable()
export class ProductPharmasService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrUpdate(createProductPharmaDto: CreateProductPharmaDto) {
    const { productId, ...data } = createProductPharmaDto;

    return this.prisma.productPharma.upsert({
      where: { productId },
      update: data,
      create: {
        productId,
        ...data,
      },
    });
  }

  async findByProductId(productId: string) {
    const pharmaDetail = await this.prisma.productPharma.findUnique({
      where: { productId },
    });

    if (!pharmaDetail) {
      throw new NotFoundException(`Detalle farmacéutico no encontrado para el producto ID ${productId}`);
    }

    return pharmaDetail;
  }

  async update(productId: string, updateProductPharmaDto: UpdateProductPharmaDto) {
    return this.prisma.productPharma.update({
      where: { productId },
      data: updateProductPharmaDto,
    });
  }

  async remove(productId: string) {
    return this.prisma.productPharma.delete({
      where: { productId },
    });
  }
}
