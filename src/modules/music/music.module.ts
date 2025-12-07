import { Module } from '@nestjs/common';
import { MusicController } from './music.controller';
import { MusicService } from './music.service';
import { StorageModule } from '../storage/storage.module';

@Module({
    imports: [StorageModule],
    controllers: [MusicController],
    providers: [MusicService],
    exports: [MusicService],
})
export class MusicModule { }