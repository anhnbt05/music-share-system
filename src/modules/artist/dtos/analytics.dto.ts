import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsInt } from 'class-validator';

export class AnalyticsFilterDto {
    @ApiProperty({
        required: false,
        example: '2025-01-01',
        description: 'Ngày bắt đầu thống kê'
    })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiProperty({
        required: false,
        example: '2025-01-31',
        description: 'Ngày kết thúc thống kê'
    })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiProperty({
        required: false,
        example: 123,
        description: 'ID bài hát muốn thống kê'
    })
    @IsOptional()
    @IsInt()
    trackId?: number;
}
