import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Length } from 'class-validator';

export class VerifyResetOtpDto {
    @ApiProperty({ example: 'user@example.com', description: 'Email của người dùng' })
    @IsEmail({}, { message: 'Email không hợp lệ' })
    email: string;

    @ApiProperty({ example: '654321', description: 'Mã OTP đặt lại mật khẩu' })
    @IsNotEmpty({ message: 'OTP không được để trống' })
    @Length(6, 6, { message: 'OTP phải có 6 chữ số' })
    otp: string;
}