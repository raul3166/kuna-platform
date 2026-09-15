import { Module } from '@nestjs/common';
import { ServiceReportsService } from './service-reports.service';
import { ServiceReportsController } from './service-reports.controller';

@Module({
  controllers: [ServiceReportsController],
  providers: [ServiceReportsService],
})
export class ServiceReportsModule {}
