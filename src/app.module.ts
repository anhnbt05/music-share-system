import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { SupabaseModule } from 'nestjs-supabase-js';

import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './config/redis.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: (configService.get<string>('jwt.accessTokenExpire') || '15m') as `${number}${'ms' | 's' | 'm' | 'h' | 'd'}`,
        },
      }),
    }),

    SupabaseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          name: 'adminClient',
          supabaseConfig: {
            supabaseKey: configService.get<string>(
              'supabase.serviceRoleKey',
              '',
            ),
            supabaseUrl: configService.get<string>('supabase.url', ''),
          },
        },
        {
          name: 'anonClient',
          supabaseConfig: {
            supabaseKey: configService.get<string>('supabase.anonKey', ''),
            supabaseUrl: configService.get<string>('supabase.url', ''),
          },
        },
      ],
    }),
    RedisModule,
    PrismaModule,
    AuthModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }