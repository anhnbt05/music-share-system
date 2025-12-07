import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadMusicDto {
    @ApiProperty({
        example: 'My First Song',
        description: 'Tiêu đề bài nhạc'
    })
    @IsString()
    title: string;

    @ApiProperty({
        required: false,
        example: 'Pop',
        description: 'Thể loại nhạc'
    })
    @IsOptional()
    @IsString()
    genre?: string;

    @ApiProperty({
        required: false,
        example: 'Bài hát đầu tay của tôi',
        description: 'Mô tả bài nhạc'
    })
    @IsOptional()
    @IsString()
    description?: string;
}

export class UpdateMusicDto {
    @ApiProperty({
        required: false,
        example: 'New Title',
        description: 'Tiêu đề mới của bài nhạc'
    })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiProperty({
        required: false,
        example: 'Rock',
        description: 'Thể loại nhạc mới'
    })
    @IsOptional()
    @IsString()
    genre?: string;

    @ApiProperty({
        required: false,
        example: 'Mô tả mới cho bài nhạc',
        description: 'Mô tả bài nhạc'
    })
    @IsOptional()
    @IsString()
    description?: string;
}
