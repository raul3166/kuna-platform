import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { VerticalsModule } from '../verticals/verticals.module';
import { RealEstateController } from './real-estate.controller';
import { RealEstateService } from './real-estate.service';

@Module({
  imports: [PrismaModule, VerticalsModule],
  controllers: [RealEstateController],
  providers: [RealEstateService],
  exports: [RealEstateService],
})
export class RealEstateModule {}

