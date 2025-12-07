import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateReportDto {
    @ApiProperty({
        enum: ['MUSIC', 'USER', 'COMMENT', 'PLAYLIST'],
        example: 'MUSIC',
        description: 'Loại đối tượng bị báo cáo',
    })
    @IsEnum(['MUSIC', 'USER', 'COMMENT', 'PLAYLIST'])
    targetType: 'MUSIC' | 'USER' | 'COMMENT' | 'PLAYLIST';

    @ApiProperty({
        example: 123,
        description: 'ID đối tượng bị báo cáo',
    })
    @IsInt()
    @Min(1)
    targetId: number;

    @ApiProperty({
        example: 'Nội dung không phù hợp',
        description: 'Lý do báo cáo',
    })
    @IsString()
    reason: string;

    @ApiProperty({
        required: false,
        example: 'Ghi chú xử lý hoặc mô tả thêm',
        description: 'Ghi chú bổ sung để người quản trị dễ xử lý',
    })
    @IsOptional()
    @IsString()
    resolutionNote?: string;
}
