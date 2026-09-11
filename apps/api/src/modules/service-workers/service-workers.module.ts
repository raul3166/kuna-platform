import { Module } from '@nestjs/common';
import { ServiceWorkersService } from './service-workers.service';
import { ServiceWorkersController } from './service-workers.controller';

@Module({
  controllers: [ServiceWorkersController],
  providers: [ServiceWorkersService],
})
export class ServiceWorkersModule {}
