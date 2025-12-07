import { Module } from '@nestjs/common';
import { ArtistController } from './artist.controller';
import { ArtistService } from './artist.service';
import { StorageModule } from '../storage/storage.module';

@Module({
    imports: [StorageModule],
    controllers: [ArtistController],
    providers: [ArtistService],
    exports: [ArtistService],
})
export class ArtistModule { }