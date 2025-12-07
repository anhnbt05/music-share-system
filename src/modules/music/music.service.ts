// src/music/music.service.ts
import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SearchMusicDto, ShareMusicDto } from './dtos';


@Injectable()
export class MusicService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly storageService: StorageService,
    ) { }

    // Tìm kiếm âm nhạc
    async searchMusic(dto: SearchMusicDto) {
        const { query, type, genre, page = 1, limit = 10 } = dto;
        const skip = (page - 1) * limit;

        let where: any = {};
        let include: any = {
            artist_profiles: {
                include: {
                    users: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            },
            music_stats: true,
        };

        if (type === 'TRACK') {
            where.title = { contains: query, mode: 'insensitive' };
        } else if (type === 'ARTIST') {
            include = {
                ...include,
                artist_profiles: {
                    where: {
                        OR: [
                            { stage_name: { contains: query, mode: 'insensitive' } },
                            {
                                users: {
                                    name: { contains: query, mode: 'insensitive' },
                                },
                            },
                        ],
                    },
                },
            };
        } else if (type === 'ALBUM') {
            include = {
                ...include,
                album_tracks: {
                    include: {
                        albums: {
                            where: {
                                title: { contains: query, mode: 'insensitive' },
                            },
                        },
                    },
                },
            };
        } else {
            // Tìm kiếm tất cả
            where.OR = [
                { title: { contains: query, mode: 'insensitive' } },
                { genre: { contains: query, mode: 'insensitive' } },
                {
                    artist_profiles: {
                        OR: [
                            { stage_name: { contains: query, mode: 'insensitive' } },
                            {
                                users: {
                                    name: { contains: query, mode: 'insensitive' },
                                },
                            },
                        ],
                    },
                },
                {
                    album_tracks: {
                        some: {
                            albums: {
                                title: { contains: query, mode: 'insensitive' },
                            },
                        },
                    },
                },
            ];
        }

        if (genre) {
            where.genre = genre;
        }

        const [music, total] = await Promise.all([
            this.prisma.music.findMany({
                where,
                include,
                skip,
                take: limit,
                orderBy: { vote_count: 'desc' },
            }),
            this.prisma.music.count({ where }),
        ]);

        return {
            data: music,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // Lấy chi tiết bài hát
    async getMusicDetail(trackId: number) {
        const music = await this.prisma.music.findUnique({
            where: { id: trackId },
            include: {
                artist_profiles: {
                    include: {
                        users: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                music_stats: true,
                votes: {
                    take: 10,
                    include: {
                        users: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                album_tracks: {
                    include: {
                        albums: true,
                    },
                },
            },
        });

        if (!music) {
            throw new NotFoundException('Bài hát không tồn tại');
        }

        // Tăng số lượt nghe
        await this.prisma.music_stats.updateMany({
            where: { music_id: trackId },
            data: {
                listens: { increment: 1 },
                updated_at: new Date(),
            },
        });

        return music;
    }

    // Stream âm nhạc
    async streamMusic(trackId: number, res: Response) {
        const music = await this.prisma.music.findUnique({
            where: { id: trackId },
        });

        if (!music) {
            throw new NotFoundException('Bài hát không tồn tại');
        }

        // Lấy URL từ storage
        // Đây là nơi bạn sẽ tích hợp với storage service để stream file
        // Hiện tại trả về redirect URL

        // Tăng số lượt nghe
        await this.prisma.music_stats.updateMany({
            where: { music_id: trackId },
            data: {
                listens: { increment: 1 },
                updated_at: new Date(),
            },
        });

        // Redirect đến file URL
        return res.redirect(music.file_url);
    }

    // Chia sẻ bài hát
    async shareMusic(trackId: number, dto: ShareMusicDto) {
        const music = await this.prisma.music.findUnique({
            where: { id: trackId },
            include: {
                artist_profiles: true,
            },
        });

        if (!music) {
            throw new NotFoundException('Bài hát không tồn tại');
        }

        // Tăng số lượt chia sẻ
        await this.prisma.music_stats.updateMany({
            where: { music_id: trackId },
            data: {
                shares: { increment: 1 },
                updated_at: new Date(),
            },
        });

        // Tạo share URL
        const shareUrl = `${process.env.FRONTEND_URL}/music/${trackId}`;

        let platformUrl = shareUrl;
        switch (dto.platform) {
            case 'FACEBOOK':
                platformUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
                break;
            case 'TWITTER':
                platformUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(music.title)}`;
                break;
            case 'WHATSAPP':
                platformUrl = `https://wa.me/?text=${encodeURIComponent(`${music.title} - ${shareUrl}`)}`;
                break;
            case 'COPY':
            default:
                // Chỉ trả về URL để copy
                break;
        }

        return {
            message: 'Chia sẻ thành công',
            shareUrl,
            platformUrl: dto.platform !== 'COPY' ? platformUrl : undefined,
            track: {
                id: music.id,
                title: music.title,
                artist: music.artist_profiles?.stage_name,
            },
        };
    }

    // Lấy danh sách trending
    async getTrendingMusic(limit: number = 10) {
        const music = await this.prisma.music.findMany({
            include: {
                artist_profiles: {
                    include: {
                        users: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                music_stats: true,
            },
            orderBy: [
                { vote_count: 'desc' },
            ],
            take: limit,
        });

        return music;
    }

    // Lấy danh sách theo thể loại
    async getMusicByGenre(genre: string, page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;

        const where = { genre };

        const [music, total] = await Promise.all([
            this.prisma.music.findMany({
                where,
                include: {
                    artist_profiles: {
                        include: {
                            users: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                    music_stats: true,
                },
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
            }),
            this.prisma.music.count({ where }),
        ]);

        return {
            data: music,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
}