import {
    Body,
    Controller,
    Post,
    Get,
    Req,
    Res,
    ForbiddenException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
    ApiTags,
    ApiOperation,
    ApiOkResponse,
    ApiUnauthorizedResponse,
    ApiForbiddenResponse,
    ApiConflictResponse,
    ApiNotFoundResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
    LoginDto,
    RegisterDto,
    VerifyOtpDto,
    ForgotPasswordDto,
    ResetPasswordDto,
    VerifyResetOtpDto,
} from './dtos';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @ApiOperation({ summary: 'Đăng nhập người dùng' })
    @ApiOkResponse({
        description: 'Đăng nhập thành công, trả về access token.',
    })
    @ApiUnauthorizedResponse({
        description: 'Email hoặc mật khẩu không chính xác.',
    })
    @ApiForbiddenResponse({
        description: 'Tài khoản chưa xác minh email.',
    })
    async login(@Body() dto: LoginDto, @Res() res: Response) {
        const { accessToken, refreshToken } = await this.authService.login(dto);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.json({ accessToken });
    }

    @Get('refresh-token')
    @ApiOperation({ summary: 'Làm mới access token' })
    @ApiOkResponse({
        description: 'Access token mới được cấp thành công.',
    })
    @ApiForbiddenResponse({
        description: 'Refresh token không tồn tại hoặc không hợp lệ.',
    })
    @ApiNotFoundResponse({
        description: 'Người dùng không tồn tại.',
    })
    async refreshToken(@Req() req: Request) {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken)
            throw new ForbiddenException('Refresh token không tồn tại.');
        return this.authService.refreshAccessToken(refreshToken);
    }

    @Post('register')
    @ApiOperation({ summary: 'Đăng ký người dùng mới' })
    @ApiOkResponse({
        description: 'Đăng ký thành công, vui lòng xác minh OTP qua email.',
    })
    @ApiConflictResponse({
        description: 'Email đã tồn tại.',
    })
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('verify-otp')
    @ApiOperation({ summary: 'Xác minh OTP đăng ký tài khoản' })
    @ApiOkResponse({
        description: 'Xác minh thành công, bạn có thể đăng nhập.',
    })
    @ApiForbiddenResponse({
        description: 'OTP không hợp lệ, đã hết hạn, hoặc nhập sai quá nhiều lần.',
    })
    async verifyOtp(@Body() dto: VerifyOtpDto) {
        return this.authService.verifyOtp(dto);
    }

    @Post('forgot-password')
    @ApiOperation({ summary: 'Gửi OTP đặt lại mật khẩu' })
    @ApiOkResponse({
        description: 'OTP đặt lại mật khẩu đã được gửi qua email.',
    })
    @ApiNotFoundResponse({
        description: 'Email không tồn tại.',
    })
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto);
    }

    @Post('verify-reset-otp')
    @ApiOperation({ summary: 'Xác minh OTP để đặt lại mật khẩu' })
    @ApiOkResponse({
        description: 'OTP hợp lệ, người dùng có thể đặt lại mật khẩu.',
    })
    @ApiForbiddenResponse({
        description: 'OTP không hợp lệ, đã hết hạn, hoặc nhập sai quá nhiều lần.',
    })
    async verifyResetOtp(@Body() dto: VerifyResetOtpDto) {
        return this.authService.verifyResetOtp(dto);
    }

    @Post('reset-password')
    @ApiOperation({ summary: 'Đặt lại mật khẩu mới sau khi xác minh OTP' })
    @ApiOkResponse({
        description: 'Đặt lại mật khẩu thành công.',
    })
    @ApiForbiddenResponse({
        description: 'Chưa xác minh OTP hoặc OTP đã hết hạn.',
    })
    async resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto);
    }

    @Post('logout')
    @ApiOperation({ summary: 'Đăng xuất người dùng' })
    @ApiOkResponse({
        description: 'Đăng xuất thành công.',
    })
    async logout(@Res() res: Response) {
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'none'
        })
        return res.json({ message: 'Đăng xuất thành công.' });
    }
}