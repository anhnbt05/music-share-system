import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import nodemailer from 'nodemailer';
import { join } from 'path';

@Injectable()
export class MailService {
    private transporter;

    constructor(private readonly configService: ConfigService) {
        const smtpConfig = this.configService.get('smtp');
        this.transporter = nodemailer.createTransport({
            host: smtpConfig.host,
            port: smtpConfig.port,
            secure: false,
            auth: {
                user: smtpConfig.user,
                pass: smtpConfig.pass,
            },
        });
    }

    async sendOTPEmail(
        to: string,
        subject: string,
        otp: string,
        fullName: string,
        emailType: 'register' | 'forgot-password'
    ) {
        const smtpConfig = this.configService.get('smtp');

        const emailConfig = {
            'register': {
                template: 'email-verify-otp.hbs',
                title: 'Xác minh email',
                heading: 'Xác minh email',
                purpose: 'Mã OTP để xác minh tài khoản của bạn là',
                instruction: 'Mã OTP này dùng để xác nhận email khi đăng ký tài khoản mới.'
            },
            'forgot-password': {
                template: 'email-forgot-password-otp.hbs',
                title: 'Thay đổi mật khẩu',
                heading: 'Thay đổi mật khẩu',
                purpose: 'Mã OTP để xác minh tài khoản của bạn là',
                instruction: 'Mã OTP này dùng để thay đổi mật khẩu mới.'
            }
        };

        const config = emailConfig[emailType];

        const htmlTemplate = readFileSync(
            join(__dirname, '..', '..', '..', 'templates', 'email-otp.hbs'),
            'utf-8'
        );

        let htmlContent = htmlTemplate
            .replace('{{otp}}', otp)
            .replace('{{user_name}}', fullName)
            .replace('{{email_title}}', config.title)
            .replace('{{email_heading}}', config.heading)
            .replace('{{otp_purpose}}', config.purpose)
            .replace('{{instruction_text}}', config.instruction);

        await this.transporter.sendMail({
            from: `"Support" <${smtpConfig.from}>`,
            to,
            subject,
            html: htmlContent
        });
    }

}