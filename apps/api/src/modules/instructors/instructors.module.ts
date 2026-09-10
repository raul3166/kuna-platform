import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { InstructorsController } from './instructors.controller';
import { InstructorsService } from './instructors.service';
@Module({ imports: [PrismaModule], controllers: [InstructorsController], providers: [InstructorsService] })
export class InstructorsModule {}
