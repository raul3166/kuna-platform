import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { OperatingExpensesController } from './operating-expenses.controller';
import { OperatingExpensesService } from './operating-expenses.service';

@Module({
  imports: [PrismaModule],
  controllers: [OperatingExpensesController],
  providers: [OperatingExpensesService],
  exports: [OperatingExpensesService],
})
export class OperatingExpensesModule {}

