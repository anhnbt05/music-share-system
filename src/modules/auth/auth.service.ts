import { Injectable, UnauthorizedException, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from 'src/config/redis.service';
import bcryptUtil from '../../libs/common/utils/bcrypt.util';
import { MailService } from '../mail/mail.service';

import { LoginDto, RegisterDto, ResetPasswordDto, VerifyOtpDto, VerifyResetOtpDto, ForgotPasswordDto } from './dtos';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly redisService: RedisService,
        private readonly mailService: MailService,
    ) { }

    async login(dto: LoginDto) {
        const { email, password } = dto;
        const user = await this.prisma.users.findUnique({ where: { email } });

        if (!user || !(await bcryptUtil.comparePassword(password, user.password))) {
            throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
        }

        if (!user.is_active) {
            throw new ForbiddenException('Tài khoản chưa xác minh OTP.');
        }

        if (user.is_deleted) {
            throw new ForbiddenException('Tài khoản đã bị khóa.');
        }

        const payload = { id: user.id, email: user.email, role: user.role };
        const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
        const refreshToken = this.jwtService.sign({ id: user.id }, { expiresIn: '7d' });

        return { accessToken, refreshToken };
    }

    async refreshAccessToken(refreshToken: string) {
        try {
            const decoded = this.jwtService.verify<{ id: string }>(refreshToken);
            const user = await this.prisma.users.findUnique({ where: { id: BigInt(decoded.id) } });

            if (!user) throw new NotFoundException('Người dùng không tồn tại.');

            const payload = { id: user.id, email: user.email, role: user.role };
            return { accessToken: this.jwtService.sign(payload, { expiresIn: '15m' }) };
        } catch (error) {
            throw new ForbiddenException('Refresh token không hợp lệ.');
        }
    }

    async register(dto: RegisterDto) {
        const { email, password, name } = dto;
        const existing = await this.prisma.users.findUnique({ where: { email } });
        const hashed = await bcryptUtil.hashPassword(password);

        let user;
        if (existing) {
            if (existing.is_active) throw new ConflictException('Email đã tồn tại và đã kích hoạt.');
            user = await this.prisma.users.update({
                where: { email },
                data: { name, password: hashed, is_active: false, is_deleted: false },
            });
        } else {
            user = await this.prisma.users.create({
                data: { email, name, password: hashed, role: 'USER', is_active: false, is_deleted: false, created_at: new Date() },
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashOtp = await bcryptUtil.hashPassword(otp);

        await this.redisService.setEx(`otp:${email}`, 300, hashOtp);
        await this.redisService.setEx(`otp_attempts:${email}`, 300, '0');
        await this.mailService.sendOTPEmail(email, 'Xác minh tài khoản', otp, name, 'register');

        return { message: 'Đăng ký thành công, vui lòng xác minh OTP.' };
    }

    async verifyOtp(dto: VerifyOtpDto) {
        const { email, otp } = dto;
        const hashOtp = await this.redisService.get(`otp:${email}`);
        if (!hashOtp) throw new ForbiddenException('OTP không hợp lệ hoặc đã hết hạn.');

        let attempts = parseInt((await this.redisService.get(`otp_attempts:${email}`)) ?? '0');
        if (attempts >= 5) {
            await this.redisService.del(`otp:${email}`, `otp_attempts:${email}`);
            throw new ForbiddenException('Bạn đã nhập sai OTP quá nhiều lần.');
        }

        const match = await bcryptUtil.comparePassword(otp, hashOtp);
        if (!match) {
            await this.redisService.setEx(`otp_attempts:${email}`, 300, (attempts + 1).toString());
            throw new ForbiddenException(`OTP không đúng (${attempts + 1}/5 lần).`);
        }

        await this.prisma.users.update({
            where: { email },
            data: { is_active: true },
        });

        await this.redisService.del(`otp:${email}`, `otp_attempts:${email}`);
        return { message: 'Xác minh thành công, bạn có thể đăng nhập.' };
    }

    async forgotPassword(dto: ForgotPasswordDto) {
        const { email } = dto;
        const user = await this.prisma.users.findUnique({ where: { email } });
        if (!user) throw new NotFoundException('Email không tồn tại.');

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashOtp = await bcryptUtil.hashPassword(otp);

        await this.redisService.setEx(`reset_otp:${email}`, 300, hashOtp);
        await this.redisService.setEx(`reset_attempts:${email}`, 300, '0');
        await this.mailService.sendOTPEmail(email, 'Đặt lại mật khẩu', `${otp}`, user.name, 'forgot-password');

        return { message: 'OTP đặt lại mật khẩu đã được gửi qua email.' };
    }

    async verifyResetOtp(dto: VerifyResetOtpDto) {
        const { email, otp } = dto;
        const hashOtp = await this.redisService.get(`reset_otp:${email}`);
        if (!hashOtp) throw new ForbiddenException('OTP không hợp lệ hoặc đã hết hạn.');

        let attempts = parseInt((await this.redisService.get(`reset_attempts:${email}`)) ?? '0');
        if (attempts >= 5) {
            await this.redisService.del(`reset_otp:${email}`, `reset_attempts:${email}`);
            throw new ForbiddenException('Bạn đã nhập sai OTP quá nhiều lần, vui lòng thử lại.');
        }

        const match = await bcryptUtil.comparePassword(otp, hashOtp);
        if (!match) {
            await this.redisService.setEx(`reset_attempts:${email}`, 300, (attempts + 1).toString());
            throw new ForbiddenException(`OTP không đúng (${attempts + 1}/5 lần).`);
        }

        await this.redisService.setEx(`reset_verified:${email}`, 600, 'true');
        await this.redisService.del(`reset_otp:${email}`, `reset_attempts:${email}`);

        return { message: 'OTP hợp lệ, bạn có thể đặt lại mật khẩu.' };
    }

    async resetPassword(dto: ResetPasswordDto) {
        const { email, newPassword } = dto;
        const verified = await this.redisService.get(`reset_verified:${email}`);
        if (!verified) throw new ForbiddenException('Bạn chưa xác minh OTP.');

        const hashed = await bcryptUtil.hashPassword(newPassword);
        await this.prisma.users.update({ where: { email }, data: { password: hashed } });
        await this.redisService.del(`reset_verified:${email}`);

        return { message: 'Đặt lại mật khẩu thành công.' };
    }

    async logout() {
        return { message: 'Đăng xuất thành công.' };
    }
}
