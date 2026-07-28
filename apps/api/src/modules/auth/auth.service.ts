import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../core/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
  const user = await this.prisma.user.findUnique({
    where: {
      email: loginDto.email,
    },
  });

  if (!user || !user.isActive) {
    throw new UnauthorizedException(
      'Invalid email or password',
    );
  }

  const passwordValid = await bcrypt.compare(
  loginDto.password,
  user.passwordHash,
);


if (!passwordValid) {
  throw new UnauthorizedException(
    'Invalid email or password',
  );
}

const payload: JwtPayload = {
  sub: user.id,
  email: user.email,
};

const accessToken = await this.jwtService.signAsync(
  payload,
);
  return {
  accessToken,
};
}
}
