import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AccountsPortfolioController } from './accounts-portfolio.controller';
import { AccountsPortfolioService } from './accounts-portfolio.service';

@Module({
  imports: [PrismaModule],
  controllers: [AccountsPortfolioController],
  providers: [AccountsPortfolioService],
  exports: [AccountsPortfolioService],
})
export class AccountsPortfolioModule {}

