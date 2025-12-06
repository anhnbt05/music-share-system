import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private client: RedisClientType;

    constructor(private readonly configService: ConfigService) { }

    async onModuleInit() {
        const redisConfig = this.configService.get('redis');
        const host = redisConfig.host || 'localhost';
        const port = redisConfig.port || '6379';
        const pass = redisConfig.password || '';
        const user = redisConfig.user || '';

        let url = `redis://${host}:${port}`;
        if (user && pass) {
            url = `redis://${user}:${pass}@${host}`;
        }

        this.client = createClient({ url });
        this.client.on('error', (err) => console.error('Redis Error:', err));

        try {
            await this.client.connect();
            console.log('Redis connected successfully!');
        } catch (err) {
            console.error('Failed to connect to Redis:', err);
        }
    }

    async onModuleDestroy() {
        if (this.client) {
            await this.client.quit();
            console.log('Redis connection closed');
        }
    }

    getClient(): RedisClientType {
        return this.client;
    }

    async setEx(key: string, ttl: number, value: string) {
        return this.client.setEx(key, ttl, value);
    }

    async get(key: string) {
        return this.client.get(key);
    }

    async del(...keys: string[]) {
        return this.client.del(keys);
    }
}