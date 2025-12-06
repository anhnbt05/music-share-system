import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ArtistApplicationFilterDto {
    @ApiProperty({
        required: false,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        description: 'Trạng thái hồ sơ nghệ sĩ'
    })
    @IsOptional()
    @IsEnum(['PENDING', 'APPROVED', 'REJECTED'])
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';

    @ApiProperty({ required: false, example: 1 })
    @IsOptional()
    @IsInt()
    @Min(1)
    page: number = 1;

    @ApiProperty({ required: false, example: 10 })
    @IsOptional()
    @IsInt()
    @Min(1)
    limit: number = 10;

    @ApiProperty({
        required: false,
        enum: ['created_at', 'stage_name'],
        example: 'created_at'
    })
    @IsOptional()
    @IsEnum(['created_at', 'stage_name'])
    sortBy?: 'created_at' | 'stage_name';

    @ApiProperty({
        required: false,
        enum: ['asc', 'desc'],
        example: 'desc'
    })
    @IsOptional()
    @IsEnum(['asc', 'desc'])
    order?: 'asc' | 'desc';
}
export class ProcessApplicationDto {
    @ApiProperty({ example: 123 })
    @IsInt({ message: 'applicationId phải là số nguyên' })
    applicationId: number;

    @ApiProperty({
        enum: ['APPROVE', 'REJECT'],
        example: 'APPROVE'
    })
    @IsEnum(['APPROVE', 'REJECT'], { message: 'action không hợp lệ' })
    action: 'APPROVE' | 'REJECT';

    @ApiProperty({
        required: false,
        example: 'Không đủ điều kiện',
    })
    @IsOptional()
    @IsString()
    reason?: string;
}
