import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, ArrayNotEmpty, IsInt } from 'class-validator';

export class CreateAlbumDto {
    @ApiProperty({
        example: 'Love & Life',
        description: 'Tiêu đề của album'
    })
    @IsString()
    title: string;

    @ApiProperty({
        required: false,
        example: 'Album nhạc nhẹ nhàng về tình yêu',
        description: 'Mô tả album'
    })
    @IsOptional()
    @IsString()
    description?: string;
}

export class UpdateAlbumDto {
    @ApiProperty({
        required: false,
        example: 'New Album Title',
        description: 'Tiêu đề mới của album'
    })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiProperty({
        required: false,
        example: 'Mô tả mới cho album',
        description: 'Mô tả album'
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        required: false,
        example: 'https://example.com/cover.jpg',
        description: 'URL ảnh bìa album'
    })
    @IsOptional()
    @IsString()
    coverUrl?: string;
}

export class AddTracksToAlbumDto {
    @ApiProperty({
        type: [Number],
        example: [12, 45, 78],
        description: 'Danh sách ID bài hát cần thêm vào album'
    })
    @IsArray()
    @ArrayNotEmpty()
    @IsInt({ each: true })
    trackIds: number[];

    @ApiProperty({
        required: false,
        type: [Number],
        example: [1, 2, 3],
        description: 'Thứ tự tương ứng của từng bài hát trong album'
    })
    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    trackOrder?: number[];
}
