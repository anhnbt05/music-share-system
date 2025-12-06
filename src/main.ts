import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getCorsOptions } from './config/cors.config';
import { ConfigService } from '@nestjs/config';
import { setupSwagger } from './config/swagger.config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  setupSwagger(app, configService);

  app.enableCors(getCorsOptions(configService));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Server running on http://localhost:${process.env.PORT}`);
  console.log(`📘 Swagger docs available at http://localhost:${process.env.PORT}/api-docs`);

}
bootstrap();