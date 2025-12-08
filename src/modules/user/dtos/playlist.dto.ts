import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length, IsInt, Min, IsBoolean } from 'class-validator';

export class CreatePlaylistDto {
    @ApiProperty({
        example: 'My Chill Playlist',
        description: 'Tên playlist do người dùng tạo',
    })
    @IsString()
    @Length(1, 100)
    name: string;

    // @ApiProperty({
    //     required: false,
    //     example: 'Những bài hát nghe lúc thư giãn',
    //     description: 'Mô tả ngắn về playlist',
    // })
    // @IsOptional()
    // @IsString()
    // description?: string;
}

export class UpdatePlaylistDto {
    @ApiProperty({
        required: false,
        example: 'Updated Playlist Name',
        description: 'Tên playlist mới',
    })
    @IsOptional()
    @IsString()
    @Length(1, 100)
    name?: string;

    // @ApiProperty({
    //     required: false,
    //     example: 'Mô tả mới cho playlist',
    //     description: 'Mô tả mới của playlist',
    // })
    // @IsOptional()
    // @IsString()
    // description?: string;
}

export class DeletePlaylistDto {
    @ApiProperty({
        required: false,
        example: true,
        description: 'Xác nhận xóa (bắt buộc đặt true)',
    })
    @IsOptional()
    @IsBoolean()
    confirm?: boolean = false;
}

export class AddTrackToPlaylistDto {
    @ApiProperty({
        example: 55,
        description: 'ID bài hát muốn thêm vào playlist',
    })
    @IsInt()
    @Min(1)
    trackId: number;
}

export class RemoveTrackFromPlaylistDto {

    @ApiProperty({
        required: false,
        example: true,
        description: 'Xác nhận xóa (bắt buộc đặt true)',
    })
    @IsOptional()
    @IsBoolean()
    confirm?: boolean = false;
}
