import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SearchMusicDto {
    @ApiProperty({
        example: "love",
        description: "Chuỗi tìm kiếm: tên bài hát, nghệ sĩ, album"
    })
    @IsString()
    query: string;

    @ApiProperty({
        required: false,
        enum: ['TRACK', 'ARTIST', 'ALBUM'],
        description: "Loại tìm kiếm: bài hát, nghệ sĩ hoặc album"
    })
    @IsOptional()
    @IsEnum(['TRACK', 'ARTIST', 'ALBUM'])
    type?: 'TRACK' | 'ARTIST' | 'ALBUM';

    @ApiProperty({
        required: false,
        example: "Pop",
        description: "Thể loại nhạc để lọc"
    })
    @IsOptional()
    @IsString()
    genre?: string;

    @ApiProperty({
        required: false,
        example: 1,
        description: "Trang muốn lấy (pagination)"
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    page: number = 1;

    @ApiProperty({
        required: false,
        example: 10,
        description: "Số lượng kết quả mỗi trang"
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    limit: number = 10;
}

export class ShareMusicDto {
    @ApiProperty({
        example: 123,
        description: "ID bài hát cần chia sẻ"
    })
    @IsInt()
    trackId: number;

    @ApiProperty({
        required: false,
        enum: ['FACEBOOK', 'TWITTER', 'WHATSAPP', 'COPY'],
        description: "Nền tảng chia sẻ"
    })
    @IsOptional()
    @IsEnum(['FACEBOOK', 'TWITTER', 'WHATSAPP', 'COPY'])
    platform?: 'FACEBOOK' | 'TWITTER' | 'WHATSAPP' | 'COPY';
}
