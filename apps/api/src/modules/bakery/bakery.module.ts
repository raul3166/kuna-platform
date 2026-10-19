import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { VerticalsModule } from '../verticals/verticals.module';
import { BakeryController } from './bakery.controller';
import { BakeryService } from './bakery.service';

@Module({
  imports: [PrismaModule, VerticalsModule],
  controllers: [BakeryController],
  providers: [BakeryService],
  exports: [BakeryService],
})
export class BakeryModule {}

