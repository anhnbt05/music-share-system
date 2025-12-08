import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';

export class DeleteAccountDto {

    @ApiProperty({
        example: false,
        description: 'Xác nhận xóa tài khoản',
        required: false
    })
    @IsOptional()
    @IsBoolean({ message: 'confirm phải là true hoặc false' })
    confirm: boolean = false;
}
