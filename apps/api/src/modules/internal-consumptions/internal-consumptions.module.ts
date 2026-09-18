import { Module } from '@nestjs/common';
import { InternalConsumptionsService } from './internal-consumptions.service';
import { InternalConsumptionsController } from './internal-consumptions.controller';
import { InventoryMovementsModule } from '../inventory-movements/inventory-movements.module'; // Ajusta la ruta relativa

@Module({
  imports: [InventoryMovementsModule], // Importa el módulo de movimientos de inventario
  controllers: [InternalConsumptionsController],
  providers: [InternalConsumptionsService],
  exports: [InternalConsumptionsService],
})
export class InternalConsumptionsModule {}
