import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private prisma: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET,
        });
    }

    async validate(payload: any) {
        const user = await this.prisma.users.findUnique({
            where: { id: Number(payload.id) },
        });

        if (!user) {
            throw new UnauthorizedException('Token không hợp lệ hoặc người dùng không tồn tại.');
        }

        return {
            id: Number(user.id),
            email: user.email,
            role: user.role,
        };
    }
}
