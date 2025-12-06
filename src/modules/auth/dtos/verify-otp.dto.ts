import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Length } from 'class-validator';

export class VerifyOtpDto {
    @ApiProperty({ example: 'user@example.com', description: 'Email đã đăng ký' })
    @IsEmail({}, { message: 'Email không hợp lệ' })
    email: string;

    @ApiProperty({ example: '123456', description: 'Mã OTP xác minh' })
    @IsNotEmpty({ message: 'OTP không được để trống' })
    @Length(6, 6, { message: 'OTP phải có 6 chữ số' })
    otp: string;
}