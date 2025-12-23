import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { StorageService } from '../storage/storage.service';
import { toCamelCase } from 'src/libs/common/utils/transform.util';
import {
    AssignRoleDto,
    SearchAccountDto,
    DeleteAccountDto,
    ArtistApplicationFilterDto,
    ProcessApplicationDto,
    ReportFilterDto,
    ResolveReportDto,
} from './dtos';

@Injectable()
export class AdminService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly mailService: MailService,
        private readonly storageService: StorageService,
    ) { }

    async assignRole(dto: AssignRoleDto) {
        const { userId, newRole } = dto;

        const user = await this.prisma.users.findUnique({
            where: { id: userId, is_deleted: false },
        });

        if (!user) {
            throw new NotFoundException('Người dùng không tồn tại');
        }

        if (user.role === 'USER' && newRole === 'ARTIST') {
            let artistProfile = await this.prisma.artist_profiles.findUnique({
                where: { user_id: userId },
            });

            if (!artistProfile) {
                artistProfile = await this.prisma.artist_profiles.create({
                    data: {
                        user_id: userId,
                        stage_name: user.name,
                        status: 'ACTIVE',
                        updated_at: new Date(),
                    },
                });
            } else if (artistProfile.status === 'INACTIVE') {
                artistProfile = await this.prisma.artist_profiles.update({
                    where: { id: artistProfile.id },
                    data: { status: 'ACTIVE', updated_at: new Date() },
                });
            }
        }

        if (user.role === 'ARTIST' && newRole === 'USER') {
            const artistProfile = await this.prisma.artist_profiles.findUnique({
                where: { user_id: userId },
            });

            if (artistProfile) {
                await this.prisma.artist_profiles.update({
                    where: { id: artistProfile.id },
                    data: { status: 'INACTIVE', updated_at: new Date() },
                });
            }
        }

        const updatedUser = await this.prisma.users.update({
            where: { id: userId },
            data: { role: newRole },
            include: {
                artist_profiles: true,
            },
        });

        return {
            message: 'Cập nhật vai trò thành công',
            user: updatedUser,
        };
    }

    async searchAccounts(dto: SearchAccountDto) {
        const { query, page = 1, limit = 10 } = dto;
        const skip = (page - 1) * limit;

        const where: Prisma.usersWhereInput = {
            is_deleted: false,
            OR: [
                { email: { contains: query, mode: 'insensitive' } },
                { name: { contains: query, mode: 'insensitive' } },
            ],
        };

        const [users, total] = await Promise.all([
            this.prisma.users.findMany({
                where,
                skip,
                take: limit,
                include: {
                    artist_profiles: true,
                },
                orderBy: { created_at: 'desc' },
            }),
            this.prisma.users.count({ where }),
        ]);

        return {
            data: toCamelCase(users),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async deleteAccount(userId: number, dto: DeleteAccountDto) {
        if (!dto.confirm) {
            throw new BadRequestException('Vui lòng xác nhận xóa tài khoản');
        }

        const user = await this.prisma.users.findFirst({
            where: { id: userId, is_deleted: false },
        });

        if (!user) {
            throw new NotFoundException('Người dùng không tồn tại');
        }

        await this.prisma.users.update({
            where: { id: userId },
            data: {
                is_deleted: true,
                is_active: false,
            },
        });

        return { message: 'Xóa tài khoản thành công' };
    }

    // async resetUserPassword(userId: number) {
    //     const user = await this.prisma.users.findUnique({
    //         where: { id: userId, is_deleted: false },
    //     });

    //     if (!user) {
    //         throw new NotFoundException('Người dùng không tồn tại');
    //     }

    //     const resetToken = Math.random().toString(36).substring(2, 15);
    //     const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    //     return {
    //         message: 'Email reset password đã được gửi',
    //         resetUrl,
    //     };
    // }

    async getArtistApplications(filter: ArtistApplicationFilterDto) {
        const {
            status = 'PENDING',
            page = 1,
            limit = 10,
            sortBy = 'created_at',
            order = 'desc',
        } = filter;

        const skip = (page - 1) * limit;

        const where = { status };

        const [applications, total] = await Promise.all([
            this.prisma.artist_applications.findMany({
                where,
                skip,
                take: limit,
                include: {
                    users: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            created_at: true,
                        },
                    },
                },
                orderBy: { [sortBy]: order },
            }),
            this.prisma.artist_applications.count({ where }),
        ]);

        return {
            data: toCamelCase(applications),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async processArtistApplication(applicationId: number, dto: ProcessApplicationDto) {
        const application = await this.prisma.artist_applications.findUnique({
            where: { id: applicationId },
            include: { users: true },
        });

        if (!application) {
            throw new NotFoundException('Yêu cầu không tồn tại');
        }

        if (application.status !== 'PENDING') {
            throw new BadRequestException('Yêu cầu đã được xử lý');
        }

        if (dto.action === 'APPROVE') {
            await this.prisma.$transaction(async (tx) => {

                await tx.users.update({
                    where: { id: application.user_id },
                    data: { role: 'ARTIST' },
                });

                await tx.artist_profiles.create({
                    data: {
                        user_id: application.user_id,
                        stage_name: application.stage_name,
                        bio: application.bio,
                        photo_url: application.photo_url,
                        social_links: application.social_links,
                        status: 'ACTIVE',
                        updated_at: new Date(),
                    },
                });

                await tx.artist_applications.update({
                    where: { id: applicationId },
                    data: {
                        status: 'APPROVED',
                    },
                });
            });

            return { message: 'Chấp nhận yêu cầu thành công' };
        } else {
            await this.prisma.artist_applications.update({
                where: { id: applicationId },
                data: {
                    status: 'REJECTED',
                    rejection_reason: dto.rejectionReason || 'Không đáp ứng yêu cầu',
                },
            });

            return { message: 'Từ chối yêu cầu thành công' };
        }
    }

    async getReports(filter: ReportFilterDto) {
        const {
            status,
            type,
            startDate,
            endDate,
            page = 1,
            limit = 10,
        } = filter;

        const skip = (page - 1) * limit;

        const where: any = {};

        if (status) where.status = status;
        if (type) where.report_type = type;
        if (startDate || endDate) {
            where.report_date = {};
            if (startDate) where.report_date.gte = new Date(startDate);
            if (endDate) where.report_date.lte = new Date(endDate);
        }

        const [reports, total] = await Promise.all([
            this.prisma.reports.findMany({
                where,
                skip,
                take: limit,
                include: {
                    users_reports_reporter_user_idTousers: {
                        select: { id: true, name: true, email: true },
                    },
                    users_reports_reported_user_idTousers: {
                        select: { id: true, name: true, email: true },
                    },
                    music: {
                        select: { id: true, title: true, artist_profiles: true },
                    },
                    artist_profiles: {
                        select: { id: true, stage_name: true },
                    },
                },
                orderBy: { report_date: 'desc' },
            }),
            this.prisma.reports.count({ where }),
        ]);

        return {
            data: toCamelCase(reports),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async resolveReport(reportId: number, dto: ResolveReportDto) {
        const report = await this.prisma.reports.findUnique({
            where: { id: reportId },
        });

        if (!report) {
            throw new NotFoundException('Báo cáo không tồn tại');
        }

        const updatedReport = await this.prisma.reports.update({
            where: { id: reportId },
            data: {
                status: 'RESOLVED',
                resolution_notes: dto.resolutionNotes,
            },
        });

        return {
            message: 'Xử lý báo cáo thành công',
            report: updatedReport,
        };
    }

    async deleteMusic(trackId: number) {
        const track = await this.prisma.music.findUnique({
            where: { id: trackId },
            include: {
                artist_profiles: true,
            },
        });

        if (!track) {
            throw new NotFoundException('Bài hát không tồn tại');
        }

        await this.storageService.deleteFile('music', track.file_url);

        await this.prisma.music.update({
            where: { id: trackId },
            data: { deleted_at: new Date() },
        });

        return { message: 'Xóa bài hát thành công' };
    }

    async getUserDetails(userId: number) {
        const user = await this.prisma.users.findUnique({
            where: { id: userId, is_deleted: false },
            include: {
                artist_profiles: true,
                playlists: {
                    include: {
                        playlist_tracks: {
                            include: {
                                music: true,
                            },
                        },
                    },
                },
                votes: {
                    include: {
                        music: true,
                    },
                    take: 10,
                    orderBy: { created_at: 'desc' },
                },
                activity_logs: {
                    take: 20,
                    orderBy: { timestamp: 'desc' },
                },
            },
        });

        if (!user) {
            throw new NotFoundException('Người dùng không tồn tại');
        }

        if (user.role === 'ARTIST' && user.artist_profiles) {
            const musicStats = await this.prisma.music.findMany({
                where: { artist_id: user.artist_profiles.id },
                include: {
                    music_stats: true,
                    votes: true,
                },
            });

            return {
                ...user,
                musicStats,
            };
        }

        return toCamelCase(user);
    }
}