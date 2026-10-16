import { Module } from '@nestjs/common';
import { AutomotiveController } from './automotive.controller';
import { AutomotiveService } from './automotive.service';
import { PrismaModule } from '../../core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AutomotiveController],
  providers: [AutomotiveService],
  exports: [AutomotiveService],
})
export class AutomotiveModule {}

