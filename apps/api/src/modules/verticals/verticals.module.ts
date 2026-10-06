import { Module } from '@nestjs/common';
import { VerticalsController } from './verticals.controller';
import { VerticalsService } from './verticals.service';
import { PrismaModule } from '../../core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VerticalsController],
  providers: [VerticalsService],
  exports: [VerticalsService],
})
export class VerticalsModule {}

