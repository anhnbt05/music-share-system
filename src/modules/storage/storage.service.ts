import { Injectable, BadRequestException, Global } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { InjectSupabaseClient } from 'nestjs-supabase-js';

export interface UploadOptions {
    bucket: string;
    folder?: string;
    allowedMimeTypes?: string[];
    maxFileSize?: number;
}

@Injectable()
export class StorageService {
    constructor(
        @InjectSupabaseClient('adminClient')
        private readonly supabaseClient: SupabaseClient,
    ) { }

    async uploadFile(
        file: Express.Multer.File,
        options: UploadOptions
    ): Promise<{ url: string; fileName: string }> {
        try {
            await this.validateFile(file, options);

            const fileExt = file.originalname.split('.').pop();
            const fileName = `${options.folder || 'general'}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;

            const { error } = await this.supabaseClient
                .storage
                .from(options.bucket)
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                    upsert: false
                });

            if (error) {
                throw new BadRequestException(`Upload file thất bại: ${error.message}`);
            }

            const { data: { publicUrl } } = this.supabaseClient
                .storage
                .from(options.bucket)
                .getPublicUrl(fileName);

            return {
                url: publicUrl,
                fileName: fileName
            };

        } catch (error) {
            throw new BadRequestException(`File upload bị lỗi: ${error.message}`);
        }
    }

    async uploadMultipleFiles(
        files: Express.Multer.File[],
        options: UploadOptions
    ): Promise<{ url: string; fileName: string }[]> {
        const uploadPromises = files.map(file => this.uploadFile(file, options));
        return Promise.all(uploadPromises);
    }

    async deleteFile(bucket: string, fileUrl: string): Promise<boolean> {
        try {
            const filePath = this.extractFilePathFromUrl(fileUrl);

            const { error } = await this.supabaseClient
                .storage
                .from(bucket)
                .remove([filePath]);

            if (error) {
                console.error('Xảy ra lỗi xoá file :', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Xảy ra lỗi xoá file:', error);
            return false;
        }
    }

    async deleteFileByPath(bucket: string, filePath: string): Promise<boolean> {
        try {
            const { error } = await this.supabaseClient
                .storage
                .from(bucket)
                .remove([filePath]);

            if (error) {
                console.error('Xảy ra lỗi xoá file:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Xảy ra lỗi xoá file:', error);
            return false;
        }
    }

    private async validateFile(file: Express.Multer.File, options: UploadOptions): Promise<void> {
        if (!file) {
            throw new BadRequestException('Chưa có đính kèm file');
        }

        if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException(
                `Loại file không hợp lệ, chỉ cho phép các loại: ${options.allowedMimeTypes.join(', ')}`
            );
        }

        if (options.maxFileSize && file.size > options.maxFileSize) {
            const maxSizeMB = options.maxFileSize / (1024 * 1024);
            throw new BadRequestException(`Dung lượng file qúa lớn, dung lượng tối đa: ${maxSizeMB}MB`);
        }
    }

    private extractFilePathFromUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/');
            const publicIndex = pathParts.indexOf('object') + 2;
            return pathParts.slice(publicIndex).join('/');
        } catch (error) {
            const urlParts = url.split('/');
            return urlParts.slice(-2).join('/');
        }
    }
}