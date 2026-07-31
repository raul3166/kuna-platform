import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { StringValue } from 'ms';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    PassportModule.register({
  defaultStrategy: 'jwt',
}),


    JwtModule.registerAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    secret: configService.get<string>('JWT_SECRET')!,

    signOptions: {
      expiresIn: configService.get<StringValue>('JWT_EXPIRES_IN') ?? '1d',
    },
  }),
}),
  ],

  controllers: [AuthController],

  providers: [
  AuthService,
  JwtStrategy,
  PermissionsGuard,
],
  exports: [JwtModule],
})
export class AuthModule {}
