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
import { toCamelCase } from 'src/libs/common/utils/transform.util';
import { UpdateProfileDto } from './dtos/profile.dto';

@Injectable()
export class ArtistService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly storageService: StorageService,
    ) { }

    async uploadMusic(
        userId: number,
        dto: UploadMusicDto,
        file: Express.Multer.File,
    ) {
        const artistProfile = await this.prisma.artist_profiles.findUnique({
            where: { user_id: userId },
        });

        if (!artistProfile) {
            throw new ForbiddenException('Bạn không phải là artist');
        }

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
            throw new BadRequestException('File quá lớn. Kích thước tối đa 50MB');
        }

        const uploadResult = await this.storageService.uploadFile(file, {
            bucket: 'music',
            folder: 'tracks',
            allowedMimeTypes,
            maxFileSize: 50 * 1024 * 1024,
        });

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

    async updateMusic(
        userId: number,
        trackId: number,
        dto: UpdateMusicDto,
    ) {
        const artistProfile = await this.prisma.artist_profiles.findUnique({
            where: { user_id: userId },
        });

        if (!artistProfile) {
            throw new ForbiddenException('Bạn không phải là artist');
        }

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

    async deleteMusic(userId: number, trackId: number) {
        const artistProfile = await this.prisma.artist_profiles.findUnique({
            where: { user_id: userId },
        });

        if (!artistProfile) {
            throw new ForbiddenException('Bạn không phải là artist');
        }

        const track = await this.prisma.music.findFirst({
            where: {
                id: trackId,
                artist_id: artistProfile.id,
            },
        });

        if (!track) {
            throw new NotFoundException('Bài hát không tồn tại hoặc không thuộc về bạn');
        }

        await this.storageService.deleteFile('music', track.file_url);

        await this.prisma.music.delete({
            where: { id: trackId },
        });

        return { message: 'Xóa bài hát thành công' };
    }

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

        return toCamelCase(albums);
    }

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
            data: {
                title: dto.title,
                description: dto.description,
                cover_url: dto.coverUrl
            },
        });

        return {
            message: 'Cập nhật album thành công',
            album: updatedAlbum,
        };
    }

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

        await this.prisma.album_tracks.deleteMany({
            where: { album_id: albumId },
        });

        await this.prisma.albums.delete({
            where: { id: albumId },
        });

        return { message: 'Xóa album thành công' };
    }

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

        const album = await this.prisma.albums.findFirst({
            where: {
                id: albumId,
                artist_id: artistProfile.id,
            },
        });

        if (!album) {
            throw new NotFoundException('Album không tồn tại');
        }

        const tracks = await this.prisma.music.findMany({
            where: {
                id: { in: dto.trackIds },
                artist_id: artistProfile.id,
            },
        });

        if (tracks.length !== dto.trackIds.length) {
            throw new BadRequestException('Một số bài hát không thuộc về bạn');
        }

        const result = await this.prisma.$transaction(async (tx) => {
            const existingCount = await tx.album_tracks.count({
                where: { album_id: albumId },
            });

            const albumTracks: (album_tracks & { music: any })[] = [];

            for (let i = 0; i < dto.trackIds.length; i++) {
                const trackId = dto.trackIds[i];
                const trackOrder = dto.trackOrder?.[i] || existingCount + i + 1;

                const exists = await tx.album_tracks.findFirst({
                    where: { album_id: albumId, track_id: trackId },
                });

                if (exists) {
                    throw new BadRequestException(`Bài hát ID ${trackId} đã có trong album`);
                }

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

        const album = await this.prisma.albums.findFirst({
            where: {
                id: albumId,
                artist_id: artistProfile.id,
            },
        });

        if (!album) {
            throw new NotFoundException('Album không tồn tại');
        }

        await this.prisma.album_tracks.deleteMany({
            where: {
                album_id: albumId,
                track_id: trackId,
            },
        });

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
            if (filter.startDate) where.updated_at.gte = new Date(filter.startDate);
            if (filter.endDate) where.updated_at.lte = new Date(filter.endDate);
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

    async updateProfile(userId: number, dto: UpdateProfileDto) {
        const artistProfile = await this.prisma.artist_profiles.findUnique({
            where: { user_id: userId },
        });

        if (!artistProfile) {
            throw new ForbiddenException('Bạn không phải là artist');
        }

        const updatedProfile = await this.prisma.artist_profiles.update({
            where: { id: artistProfile.id },
            data: {
                bio: dto.bio,
                photo_url: dto.photoUrl,
                social_links: dto.socialLinks,
                stage_name: dto.stageName,
                updated_at: new Date(),
            },
        });

        return {
            message: 'Cập nhật profile thành công',
            profile: updatedProfile,
        };
    }

}