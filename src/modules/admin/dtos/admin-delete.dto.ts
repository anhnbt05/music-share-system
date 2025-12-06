import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';

export class DeleteAccountDto {
    @ApiProperty({ example: 1, description: 'ID của tài khoản cần xóa' })
    @IsInt({ message: 'userId phải là số' })
    userId: number;

    @ApiProperty({
        example: false,
        description: 'Xác nhận xóa tài khoản',
        required: false
    })
    @IsOptional()
    @IsBoolean({ message: 'confirm phải là true hoặc false' })
    confirm: boolean = false;
}
