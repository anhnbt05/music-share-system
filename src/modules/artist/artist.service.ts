// src/artist/artist.service.ts
import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
    UploadMusicDto,
    UpdateMusicDto,
    CreateAlbumDto,
    UpdateAlbumDto,
    AddTracksToAlbumDto,
    AnalyticsFilterDto,
} from './dtos';
import { album_tracks } from '@prisma/client';

@Injectable()
export class ArtistService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly storageService: StorageService,
    ) { }

    // Upload bài hát
    async uploadMusic(
        userId: number,
        dto: UploadMusicDto,
        file: Express.Multer.File,
    ) {
        // Lấy artist profile của user
        const artistProfile = await this.prisma.artist_profiles.findUnique({
            where: { user_id: userId },
        });

        if (!artistProfile) {
            throw new ForbiddenException('Bạn không phải là artist');
        }

        // Validate file
        if (!file) {
            throw new BadRequestException('Vui lòng chọn file âm nhạc');
        }

        const allowedMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException(
                'Định dạng file không được hỗ trợ. Chỉ chấp nhận MP3, WAV, M4A, OGG',
            );
        }

        if (file.size > 50 * 1024 * 1024) {
            // 50MB
            throw new BadRequestException('File quá lớn. Kích thước tối đa 50MB');
        }

        // Upload file lên storage
        const uploadResult = await this.storageService.uploadFile(file, {
            bucket: 'music',
            folder: 'tracks',
            allowedMimeTypes,
            maxFileSize: 50 * 1024 * 1024,
        });

        // Lưu vào database
        const music = await this.prisma.music.create({
            data: {
                artist_id: artistProfile.id,
                title: dto.title,
                genre: dto.genre,
                description: dto.description,
                file_url: uploadResult.url,
                vote_count: 0,
                created_at: new Date(),
            },
        });

        // Tạo music stats
        await this.prisma.music_stats.create({
            data: {
                music_id: music.id,
                listens: 0,
                shares: 0,
                updated_at: new Date(),
            },
        });

        return {
            message: 'Upload bài hát thành công',
            music,
        };
    }

    // Lấy danh sách bài hát của artist
    async getArtistMusic(userId: number) {
        const artistProfile = await this.prisma.artist_profiles.findUnique({
            where: { user_id: userId },
        });

        if (!artistProfile) {
            throw new ForbiddenException('Bạn không phải là artist');
        }

        const music = await this.prisma.music.findMany({
            where: { artist_id: artistProfile.id },
            include: {
                music_stats: true,
                votes: true,
                album_tracks: {
                    include: {
                        albums: true,
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        });

        return music;
    }

    // Cập nhật thông tin bài hát
    async updateMusic(
        userId: number,
        trackId: number,
        dto: UpdateMusicDto,
    ) {
        // Lấy artist profile
        const artistProfile = await this.prisma.artist_profiles.findUnique({
            where: { user_id: userId },
        });

        if (!artistProfile) {
            throw new ForbiddenException('Bạn không phải là artist');
        }

        // Kiểm tra bài hát thuộc về artist
        const track = await this.prisma.music.findFirst({
            where: {
                id: trackId,
                artist_id: artistProfile.id,
            },
        });

        if (!track) {
            throw new NotFoundException('Bài hát không tồn tại hoặc không thuộc về bạn');
        }

        const updatedTrack = await this.prisma.music.update({
            where: { id: trackId },
            data: dto,
        });

        return {
            message: 'Cập nhật bài hát thành công',
            track: updatedTrack,
        };
    }

    // Xóa bài hát
    async deleteMusic(userId: number, trackId: number) {
        // Lấy artist profile
        const artistProfile = await this.prisma.artist_profiles.findUnique({
            where: { user_id: userId },
        });

        if (!artistProfile) {
            throw new ForbiddenException('Bạn không phải là artist');
        }

        // Kiểm tra bài hát thuộc về artist
        const track = await this.prisma.music.findFirst({
            where: {
                id: trackId,
                artist_id: artistProfile.id,
            },
        });

        if (!track) {
            throw new NotFoundException('Bài hát không tồn tại hoặc không thuộc về bạn');
        }

        // Xóa file từ storage
        await this.storageService.deleteFile('music', track.file_url);

        // Xóa từ database (cascade sẽ xóa các bảng liên quan)
        await this.prisma.music.delete({
            where: { id: trackId },
        });

        return { message: 'Xóa bài hát thành công' };
    }

    // Tạo album
    async createAlbum(userId: number, dto: CreateAlbumDto) {
        const artistProfile = await this.prisma.artist_profiles.findUnique({
            where: { user_id: userId },
        });

        if (!artistProfile) {
            throw new ForbiddenException('Bạn không phải là artist');
        }

        const album = await this.prisma.albums.create({
            data: {
                artist_id: artistProfile.id,
                title: dto.title,
                description: dto.description,
                created_at: new Date(),
            },
        });

        return {
            message: 'Tạo album thành công',
            album,
        };
    }

    // Lấy danh sách album của artist
    async getArtistAlbums(userId: number) {
        const artistProfile = await this.prisma.artist_profiles.findUnique({
            where: { user_id: userId },
        });

        if (!artistProfile) {
            throw new ForbiddenException('Bạn không phải là artist');
        }

        const albums = await this.prisma.albums.findMany({
            where: { artist_id: artistProfile.id },
            include: {
                album_tracks: {
                    include: {
                        music: true,
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        });

        return albums;
    }

    // Lấy chi tiết album
    async getAlbumDetail(userId: number, albumId: number) {
        const artistProfile = await this.prisma.artist_profiles.findUnique({
            where: { user_id: userId },
        });

        if (!artistProfile) {
            throw new ForbiddenException('Bạn không phải là artist');
        }

        const album = await this.prisma.albums.findFirst({
            where: {
                id: albumId,
                artist_id: artistProfile.id,
            },
            include: {
                album_tracks: {
                    include: {
                        music: {
                            include: {
                                music_stats: true,
                                votes: true,
                            },
                        },
                    },
                    orderBy: { track_order: 'asc' },
                },
            },
        });

        if (!album) {
            throw new NotFoundException('Album không tồn tại');
        }

        return album;
    }

    // Cập nhật album
    async updateAlbum(
        userId: number,
        albumId: number,
        dto: UpdateAlbumDto,
    ) {
        const artistProfile = await this.prisma.artist_profiles.findUnique({
            where: { user_id: userId },
        });

        if (!artistProfile) {
            throw new ForbiddenException('Bạn không phải là artist');
        }

        const album = await this.prisma.albums.findFirst({
            where: {
                id: albumId,
                artist_id: artistProfile.id,
            },
        });

        if (!album) {
            throw new NotFoundException('Album không tồn tại');
        }

        const updatedAlbum = await this.prisma.albums.update({
            where: { id: albumId },
            data: dto,
        });

        return {
            message: 'Cập nhật album thành công',
            album: updatedAlbum,
        };
    }

    // Xóa album
    async deleteAlbum(userId: number, albumId: number) {
        const artistProfile = await this.prisma.artist_profiles.findUnique({
            where: { user_id: userId },
        });

        if (!artistProfile) {
            throw new ForbiddenException('Bạn không phải là artist');
        }

        const album = await this.prisma.albums.findFirst({
            where: {
                id: albumId,
                artist_id: artistProfile.id,
            },
        });

        if (!album) {
            throw new NotFoundException('Album không tồn tại');
        }

        // Xóa tất cả bài hát trong album trước
        await this.prisma.album_tracks.deleteMany({
            where: { album_id: albumId },
        });

        // Xóa album
        await this.prisma.albums.delete({
            where: { id: albumId },
        });

        return { message: 'Xóa album thành công' };
    }

    // Thêm bài hát vào album

    async addTracksToAlbum(
        userId: number,
        albumId: number,
        dto: AddTracksToAlbumDto,
    ) {
        const artistProfile = await this.prisma.artist_profiles.findUnique({
            where: { user_id: userId },
        });

        if (!artistProfile) {
            throw new ForbiddenException('Bạn không phải là artist');
        }

        // Kiểm tra album thuộc artist
        const album = await this.prisma.albums.findFirst({
            where: {
                id: albumId,
                artist_id: artistProfile.id,
            },
        });

        if (!album) {
            throw new NotFoundException('Album không tồn tại');
        }

        // Kiểm tra tất cả bài hát thuộc artist
        const tracks = await this.prisma.music.findMany({
            where: {
                id: { in: dto.trackIds },
                artist_id: artistProfile.id,
            },
        });

        if (tracks.length !== dto.trackIds.length) {
            throw new BadRequestException('Một số bài hát không thuộc về bạn');
        }

        // ================================
        // 🚀 Dùng transaction cho toàn bộ logic
        // ================================
        const result = await this.prisma.$transaction(async (tx) => {
            // Lấy số lượng bài hát hiện có
            const existingCount = await tx.album_tracks.count({
                where: { album_id: albumId },
            });

            const albumTracks: (album_tracks & { music: any })[] = [];

            for (let i = 0; i < dto.trackIds.length; i++) {
                const trackId = dto.trackIds[i];
                const trackOrder = dto.trackOrder?.[i] || existingCount + i + 1;

                // Kiểm tra trùng
                const exists = await tx.album_tracks.findFirst({
                    where: { album_id: albumId, track_id: trackId },
                });

                if (exists) {
                    throw new BadRequestException(`Bài hát ID ${trackId} đã có trong album`);
                }

                // Tạo mới album_track
                const albumTrack = await tx.album_tracks.create({
                    data: {
                        album_id: albumId,
                        track_id: trackId,
                        track_order: trackOrder,
                    },
                    include: { music: true },
                });

                albumTracks.push(albumTrack);
            }

            return albumTracks;
        });

        return {
            message: 'Thêm bài hát vào album thành công',
            albumTracks: result,
        };
    }


    // Xóa bài hát khỏi album
    async removeTrackFromAlbum(
        userId: number,
        albumId: number,
        trackId: number,
    ) {
        const artistProfile = await this.prisma.artist_profiles.findUnique({
            where: { user_id: userId },
        });

        if (!artistProfile) {
            throw new ForbiddenException('Bạn không phải là artist');
        }

        // Kiểm tra album tồn tại và thuộc về artist
        const album = await this.prisma.albums.findFirst({
            where: {
                id: albumId,
                artist_id: artistProfile.id,
            },
        });

        if (!album) {
            throw new NotFoundException('Album không tồn tại');
        }

        // Xóa liên kết
        await this.prisma.album_tracks.deleteMany({
            where: {
                album_id: albumId,
                track_id: trackId,
            },
        });

        // Cập nhật order của các bài hát còn lại
        const remainingTracks = await this.prisma.album_tracks.findMany({
            where: { album_id: albumId },
            orderBy: { track_order: 'asc' },
        });

        for (let i = 0; i < remainingTracks.length; i++) {
            await this.prisma.album_tracks.update({
                where: { id: remainingTracks[i].id },
                data: { track_order: i + 1 },
            });
        }

        return { message: 'Xóa bài hát khỏi album thành công' };
    }

    // Lấy thống kê
    async getAnalytics(userId: number, filter: AnalyticsFilterDto) {
        const artistProfile = await this.prisma.artist_profiles.findUnique({
            where: { user_id: userId },
        });

        if (!artistProfile) {
            throw new ForbiddenException('Bạn không phải là artist');
        }

        const where: any = {
            music: {
                artist_id: artistProfile.id,
            },
        };

        if (filter.startDate || filter.endDate) {
            where.updated_at = {};
            if (filter.startDate) where.updated_at.gte = filter.startDate;
            if (filter.endDate) where.updated_at.lte = filter.endDate;
        }

        if (filter.trackId) {
            where.music_id = filter.trackId;
        }

        const stats = await this.prisma.music_stats.findMany({
            where,
            include: {
                music: true,
            },
            orderBy: { updated_at: 'desc' },
        });

        // Tổng hợp thống kê
        const totalListens = stats.reduce((sum, stat) => sum + stat.listens, 0);
        const totalShares = stats.reduce((sum, stat) => sum + stat.shares, 0);
        const topTracks = [...stats]
            .sort((a, b) => b.listens - a.listens)
            .slice(0, 5);

        return {
            summary: {
                totalTracks: stats.length,
                totalListens,
                totalShares,
                averageListensPerTrack: stats.length > 0 ? totalListens / stats.length : 0,
            },
            topTracks,
            detailedStats: stats,
        };
    }

    // Cập nhật profile artist
    async updateProfile(userId: number, dto: UpdateAlbumDto) {
        const artistProfile = await this.prisma.artist_profiles.findUnique({
            where: { user_id: userId },
        });

        if (!artistProfile) {
            throw new ForbiddenException('Bạn không phải là artist');
        }

        const updatedProfile = await this.prisma.artist_profiles.update({
            where: { id: artistProfile.id },
            data: {
                ...dto,
                updated_at: new Date(),
            },
        });

        return {
            message: 'Cập nhật profile thành công',
            profile: updatedProfile,
        };
    }
}