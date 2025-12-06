import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export function setupSwagger(app: INestApplication, configService: ConfigService) {
    const apiUrl = configService.get<string>('URL_BE') ?? 'http://localhost:3000';

    const config = new DocumentBuilder()
        .setTitle('API Documentation')
        .setDescription('Tài liệu API cho dự án Music Share')
        .setVersion('1.0.0')
        .addServer(apiUrl)
        .addBearerAuth()
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document, {
        swaggerOptions: { persistAuthorization: true },
    });
}