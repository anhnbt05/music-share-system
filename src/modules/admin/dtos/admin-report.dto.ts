import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, Min, IsString } from 'class-validator';

export class ReportFilterDto {
    @ApiProperty({
        example: 'PENDING',
        description: 'Lọc báo cáo theo trạng thái',
        required: false,
        enum: ['PENDING', 'RESOLVED']
    })
    @IsOptional()
    @IsEnum(['PENDING', 'RESOLVED'], { message: 'status không hợp lệ' })
    status?: 'PENDING' | 'RESOLVED';

    @ApiProperty({
        example: 'USER',
        description: 'Loại báo cáo',
        required: false,
        enum: ['MUSIC', 'USER', 'COMMENT', 'PLAYLIST']
    })
    @IsOptional()
    @IsEnum(['MUSIC', 'USER', 'COMMENT', 'PLAYLIST'], { message: 'type không hợp lệ' })
    type?: 'MUSIC' | 'USER' | 'COMMENT' | 'PLAYLIST';

    @ApiProperty({ example: '2025-01-01', description: 'Ngày bắt đầu lọc', required: false })
    @IsOptional()
    @IsDateString({}, { message: 'startDate phải là ngày hợp lệ (ISO)' })
    startDate?: string;

    @ApiProperty({ example: '2025-12-31', description: 'Ngày kết thúc lọc', required: false })
    @IsOptional()
    @IsDateString({}, { message: 'endDate phải là ngày hợp lệ (ISO)' })
    endDate?: string;

    @ApiProperty({ example: 1, required: false, description: 'Trang hiện tại' })
    @IsOptional()
    @IsInt()
    @Min(1)
    page: number = 1;

    @ApiProperty({ example: 10, required: false, description: 'Số lượng mỗi trang' })
    @IsOptional()
    @IsInt()
    @Min(1)
    limit: number = 10;
}

export class ResolveReportDto {
    @ApiProperty({
        example: 101,
        description: 'ID của báo cáo cần xử lý'
    })
    @IsInt({ message: 'reportId phải là số nguyên' })
    @Min(1, { message: 'reportId phải lớn hơn 0' })
    reportId: number;

    @ApiProperty({
        required: false,
        example: 'Báo cáo đã được xác minh và xử lý.',
        description: 'Ghi chú về quá trình xử lý báo cáo'
    })
    @IsOptional()
    @IsString({ message: 'resolutionNotes phải là chuỗi' })
    resolutionNotes?: string;
}
