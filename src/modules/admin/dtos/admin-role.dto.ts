import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, Min, IsOptional, IsString } from 'class-validator';

export class AssignRoleDto {
    @ApiProperty({ example: 1, description: 'ID của người dùng cần đổi role' })
    @IsInt({ message: 'userId phải là số' })
    userId: number;

    @ApiProperty({
        example: 'ARTIST',
        description: 'Role mới cần gán',
        enum: ['USER', 'ARTIST']
    })
    @IsEnum(['USER', 'ARTIST'], { message: 'Role không hợp lệ' })
    newRole: 'USER' | 'ARTIST';
}

export class SearchAccountDto {
    @ApiProperty({ example: 'john', description: 'Chuỗi tìm kiếm theo tên hoặc email' })
    @IsString({ message: 'query phải là chuỗi' })
    query: string;

    @ApiProperty({ example: 1, description: 'Trang hiện tại', required: false })
    @IsOptional()
    @IsInt({ message: 'page phải là số' })
    @Min(1, { message: 'page phải >= 1' })
    page: number = 1;

    @ApiProperty({ example: 10, description: 'Số lượng mỗi trang', required: false })
    @IsOptional()
    @IsInt({ message: 'limit phải là số' })
    @Min(1, { message: 'limit phải >= 1' })
    limit: number = 10;
}