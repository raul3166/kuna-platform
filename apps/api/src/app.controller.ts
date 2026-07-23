import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getRoot() {
    return {
      name: 'KUNA Platform',
      message: 'Bienvenido a la API de KUNA',
      version: '0.1.0',
      status: 'running',
    };
  }

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }
}
