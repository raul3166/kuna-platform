import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('KUNA API')
    .setDescription('API de la plataforma KUNA')
    .setVersion('1.0.0')
    .addBearerAuth(
  {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  },
  'JWT-auth',
)
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);

  console.log(
    `🚀 API disponible en: http://localhost:${process.env.PORT ?? 3000}`,
  );
  console.log(
    `📖 Swagger disponible en: http://localhost:${process.env.PORT ?? 3000}/api`,
  );
}

bootstrap();
