import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyArtistDto {
    @ApiProperty({
        example: 'Anh Hot',
        description: 'Nghệ danh của artist',
    })
    @IsNotEmpty()
    @IsString()
    stageName: string;

    @ApiPropertyOptional({
        example: 'Rapper underground, hoạt động từ năm 2020',
        description: 'Giới thiệu ngắn về artist',
    })
    @IsOptional()
    @IsString()
    bio?: string;

    @ApiPropertyOptional({
        example: 'https://res.cloudinary.com/demo/image/upload/artist.jpg',
        description: 'Ảnh đại diện của artist',
    })
    @IsOptional()
    @IsString()
    photoUrl?: string;

    @ApiPropertyOptional({
        example: 'facebook.com/anhhot | instagram.com/anhhot',
        description: 'Link mạng xã hội hoặc portfolio',
    })
    @IsOptional()
    @IsString()
    socialLinks?: string;
}
