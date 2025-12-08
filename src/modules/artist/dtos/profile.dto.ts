import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';

export class UpdateProfileDto {
    @ApiProperty({
        required: false,
        description: 'Tiểu sử của nghệ sĩ'
    })
    @IsOptional()
    @IsString()
    bio?: string;

    @ApiProperty({
        required: false,
        description: 'Ảnh đại diện nghệ sĩ'
    })
    @IsOptional()
    @IsString()
    photoUrl?: string;

    @ApiProperty({
        required: false,
        description: 'Liên kết mạng xã hội (JSON hoặc string)'
    })
    @IsOptional()
    @IsString()
    socialLinks?: string;

    @ApiProperty({
        required: false,
        description: 'Nghệ danh'
    })
    @IsOptional()
    @IsString()
    stageName?: string;

}
