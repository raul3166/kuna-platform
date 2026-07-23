import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      application: 'KUNA Platform',
      version: '0.1.0',
      environment: process.env.NODE_ENV,
      database: process.env.DATABASE_NAME,
      timestamp: new Date().toISOString(),
    };
  }
}
