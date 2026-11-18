import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { PublicPortalController } from './public-portal.controller';
import { PublicPortalService } from './public-portal.service';

@Module({
  imports: [PrismaModule],
  controllers: [PublicPortalController],
  providers: [PublicPortalService],
  exports: [PublicPortalService],
})
export class PublicPortalModule {}
