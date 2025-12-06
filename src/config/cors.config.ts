import { ConfigService } from '@nestjs/config';

export function getCorsOptions(configService: ConfigService) {
    const allowedOrigins = configService.get<string[]>('cors.allowedOrigins') ?? [];
    return {
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    };
}