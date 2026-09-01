import { PartialType } from '@nestjs/swagger';
import { DashboardKpiQueryDto } from './create-analytics.dto';

export class UpdateAnalyticsDto extends PartialType(DashboardKpiQueryDto) {}
