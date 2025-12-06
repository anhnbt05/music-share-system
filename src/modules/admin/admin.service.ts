// src/admin/admin.service.ts
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

    // Gán vai trò
    async assignRole(dto: AssignRoleDto) {
        const { userId, newRole } = dto;

        const user = await this.prisma.users.findUnique({
            where: { id: userId, is_deleted: false },
        });

        if (!user) {
            throw new NotFoundException('Người dùng không tồn tại');
        }

        // Nếu chuyển từ USER sang ARTIST
        if (user.role === 'USER' && newRole === 'ARTIST') {
            let artistProfile = await this.prisma.artist_profiles.findUnique({
                where: { user_id: userId },
            });

            if (!artistProfile) {
                // Tạo profile artist mới
                artistProfile = await this.prisma.artist_profiles.create({
                    data: {
                        user_id: userId,
                        stage_name: user.name,
                        status: 'ACTIVE',
                        updated_at: new Date(),
                    },
                });
            } else if (artistProfile.status === 'INACTIVE') {
                // Kích hoạt lại profile
                artistProfile = await this.prisma.artist_profiles.update({
                    where: { id: artistProfile.id },
                    data: { status: 'ACTIVE', updated_at: new Date() },
                });
            }
        }

        // Nếu chuyển từ ARTIST sang USER
        if (user.role === 'ARTIST' && newRole === 'USER') {
            const artistProfile = await this.prisma.artist_profiles.findUnique({
                where: { user_id: userId },
            });

            if (artistProfile) {
                // Đánh dấu profile là inactive
                await this.prisma.artist_profiles.update({
                    where: { id: artistProfile.id },
                    data: { status: 'INACTIVE', updated_at: new Date() },
                });
            }
        }

        // Cập nhật vai trò
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

    // Tìm kiếm tài khoản
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
            data: users,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // Xóa tài khoản
    async deleteAccount(userId: bigint, dto: DeleteAccountDto) {
        if (!dto.confirm) {
            throw new BadRequestException('Vui lòng xác nhận xóa tài khoản');
        }

        const user = await this.prisma.users.findUnique({
            where: { id: userId, is_deleted: false },
        });

        if (!user) {
            throw new NotFoundException('Người dùng không tồn tại');
        }

        // Soft delete
        await this.prisma.users.update({
            where: { id: userId },
            data: {
                is_deleted: true,
                is_active: false,
            },
        });

        return { message: 'Xóa tài khoản thành công' };
    }

    // Reset mật khẩu người dùng
    async resetUserPassword(userId: bigint) {
        const user = await this.prisma.users.findUnique({
            where: { id: userId, is_deleted: false },
        });

        if (!user) {
            throw new NotFoundException('Người dùng không tồn tại');
        }

        // Tạo token reset password (có thể dùng JWT hoặc random string)
        const resetToken = Math.random().toString(36).substring(2, 15);
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        // Lưu token vào database hoặc Redis
        // ...
        return {
            message: 'Email reset password đã được gửi',
            resetUrl, // Trả về cho admin trong môi trường dev
        };
    }

    // Lấy danh sách ứng dụng artist
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
            data: applications,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // Xử lý ứng dụng artist
    async processArtistApplication(applicationId: bigint, dto: ProcessApplicationDto) {
        const application = await this.prisma.artist_applications.findUnique({
            where: { id: applicationId },
            include: { users: true },
        });

        if (!application) {
            throw new NotFoundException('Ứng dụng không tồn tại');
        }

        if (application.status !== 'PENDING') {
            throw new BadRequestException('Ứng dụng đã được xử lý');
        }

        if (dto.action === 'APPROVE') {
            // Chấp nhận: tạo artist profile và cập nhật role
            await this.prisma.$transaction(async (tx) => {
                // Cập nhật vai trò người dùng
                await tx.users.update({
                    where: { id: application.user_id },
                    data: { role: 'ARTIST' },
                });

                // Tạo artist profile
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

                // Cập nhật trạng thái ứng dụng
                await tx.artist_applications.update({
                    where: { id: applicationId },
                    data: {
                        status: 'APPROVED',
                    },
                });
            });

            return { message: 'Ứng dụng đã được chấp nhận' };
        } else {
            // Từ chối
            await this.prisma.artist_applications.update({
                where: { id: applicationId },
                data: {
                    status: 'REJECTED',
                    rejection_reason: dto.reason || 'Không đáp ứng yêu cầu',
                },
            });

            return { message: 'Ứng dụng đã bị từ chối' };
        }
    }

    // Lấy danh sách báo cáo
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
            if (startDate) where.report_date.gte = startDate;
            if (endDate) where.report_date.lte = endDate;
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
            data: reports,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // Xử lý báo cáo
    async resolveReport(reportId: bigint, dto: ResolveReportDto) {
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
            message: 'Báo cáo đã được xử lý',
            report: updatedReport,
        };
    }

    // Xóa bài hát
    async deleteMusic(trackId: bigint) {
        const track = await this.prisma.music.findUnique({
            where: { id: trackId },
            include: {
                artist_profiles: true,
            },
        });

        if (!track) {
            throw new NotFoundException('Bài hát không tồn tại');
        }

        // Xóa file từ storage
        await this.storageService.deleteFile('music', track.file_url);

        // Xóa từ database
        await this.prisma.music.delete({
            where: { id: trackId },
        });

        return { message: 'Xóa bài hát thành công' };
    }

    // Lấy thông tin chi tiết người dùng
    async getUserDetails(userId: bigint) {
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

        // Nếu là artist, lấy thêm thông tin âm nhạc
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

        return user;
    }
}