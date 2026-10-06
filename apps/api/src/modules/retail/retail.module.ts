import { Module } from '@nestjs/common';
import { RetailController } from './retail.controller';
import { RetailService } from './retail.service';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { VerticalGuard } from '../auth/guards/vertical.guard';

@Module({
  imports: [PrismaModule],
  controllers: [RetailController],
  providers: [RetailService, VerticalGuard],
  exports: [RetailService],
})
export class RetailModule {}

