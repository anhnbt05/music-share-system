import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class RegisterDto {
    @ApiProperty({ example: 'user@example.com', description: 'Email đăng ký' })
    @IsEmail({}, { message: 'Email không hợp lệ' })
    email: string;

    @ApiProperty({ example: '123456', description: 'Mật khẩu đăng ký' })
    @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
    @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
    password: string;

    @ApiProperty({ example: 'Nguyễn Văn A', description: 'Họ tên đầy đủ của người dùng' })
    @IsNotEmpty({ message: 'Họ tên không được để trống' })
    name: string;
}