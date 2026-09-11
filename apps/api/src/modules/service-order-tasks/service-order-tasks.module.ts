import { Module } from '@nestjs/common';
import { ServiceOrderTasksService } from './service-order-tasks.service';
import { ServiceOrderTasksController } from './service-order-tasks.controller';

@Module({
  controllers: [ServiceOrderTasksController],
  providers: [ServiceOrderTasksService],
})
export class ServiceOrderTasksModule {}
