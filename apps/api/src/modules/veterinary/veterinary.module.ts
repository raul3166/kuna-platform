import { Module } from '@nestjs/common';
import { VeterinaryService } from './veterinary.service';
import { VeterinaryController } from './veterinary.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { VerticalsModule } from '../verticals/verticals.module';

@Module({
  imports: [PrismaModule, VerticalsModule],
  controllers: [VeterinaryController],
  providers: [VeterinaryService],
  exports: [VeterinaryService],
})
export class VeterinaryModule {}

