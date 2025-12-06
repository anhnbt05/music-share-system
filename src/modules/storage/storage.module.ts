import { Module, Global } from '@nestjs/common';
import { StorageService } from './storage.service';
import { SupabaseModule } from 'nestjs-supabase-js';

@Global()
@Module({
    imports: [SupabaseModule.injectClient('adminClient')],
    providers: [StorageService],
    exports: [StorageService],
})
export class StorageModule { }