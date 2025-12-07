// src/user/user.service.ts
import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    CreatePlaylistDto,
    UpdatePlaylistDto,
    AddTrackToPlaylistDto,
    RemoveTrackFromPlaylistDto,
    VoteDto,
    FollowArtistDto,
    CreateReportDto,
} from './dtos';

@Injectable()
export class UserService {
    constructor(private readonly prisma: PrismaService) { }

    // Tạo playlist
    async createPlaylist(userId: number, dto: CreatePlaylistDto) {
        const playlist = await this.prisma.playlists.create({
            data: {
                name: dto.name,
                user_id: userId,
                creation_date: new Date(),
            },
        });

        return {
            message: 'Tạo playlist thành công',
            playlist,
        };
    }

    // Lấy danh sách playlist của user
    async getUserPlaylists(userId: number) {
        const playlists = await this.prisma.playlists.findMany({
            where: { user_id: userId },
            include: {
                playlist_tracks: {
                    include: {
                        music: {
                            include: {
                                artist_profiles: true,
                            },
                        },
                    },
                    take: 3, // Lấy 3 bài đầu tiên để preview
                },
            },
            orderBy: { creation_date: 'desc' },
        });

        return playlists;
    }

    // Lấy chi tiết playlist
    async getPlaylistDetail(userId: number, playlistId: number) {
        const playlist = await this.prisma.playlists.findFirst({
            where: {
                id: playlistId,
                user_id: userId,
            },
            include: {
                playlist_tracks: {
                    include: {
                        music: {
                            include: {
                                artist_profiles: true,
                                music_stats: true,
                                votes: true,
                            },
                        },
                    },
                    orderBy: { track_order: 'asc' },
                },
            },
        });

        if (!playlist) {
            throw new NotFoundException('Playlist không tồn tại');
        }

        return playlist;
    }

    // Cập nhật playlist
    async updatePlaylist(
        userId: number,
        playlistId: number,
        dto: UpdatePlaylistDto,
    ) {
        const playlist = await this.prisma.playlists.findFirst({
            where: {
                id: playlistId,
                user_id: userId,
            },
        });

        if (!playlist) {
            throw new NotFoundException('Playlist không tồn tại');
        }

        const updatedPlaylist = await this.prisma.playlists.update({
            where: { id: playlistId },
            data: dto,
        });

        return {
            message: 'Cập nhật playlist thành công',
            playlist: updatedPlaylist,
        };
    }

    // Xóa playlist
    async deletePlaylist(
        userId: number,
        playlistId: number,
        dto: RemoveTrackFromPlaylistDto,
    ) {
        if (!dto.confirm) {
            throw new BadRequestException('Vui lòng xác nhận xóa playlist');
        }

        const playlist = await this.prisma.playlists.findFirst({
            where: {
                id: playlistId,
                user_id: userId,
            },
        });

        if (!playlist) {
            throw new NotFoundException('Playlist không tồn tại');
        }

        // Xóa tất cả bài hát trong playlist trước
        await this.prisma.playlist_tracks.deleteMany({
            where: { playlist_id: playlistId },
        });

        // Xóa playlist
        await this.prisma.playlists.delete({
            where: { id: playlistId },
        });

        return { message: 'Xóa playlist thành công' };
    }

    // Thêm bài hát vào playlist
    async addTrackToPlaylist(
        userId: number,
        playlistId: number,
        dto: AddTrackToPlaylistDto,
    ) {
        // Kiểm tra playlist tồn tại và thuộc về user
        const playlist = await this.prisma.playlists.findFirst({
            where: {
                id: playlistId,
                user_id: userId,
            },
        });

        if (!playlist) {
            throw new NotFoundException('Playlist không tồn tại');
        }

        // Kiểm tra bài hát tồn tại
        const track = await this.prisma.music.findUnique({
            where: { id: dto.trackId },
        });

        if (!track) {
            throw new NotFoundException('Bài hát không tồn tại');
        }

        // Kiểm tra đã có trong playlist chưa
        const existing = await this.prisma.playlist_tracks.findFirst({
            where: {
                playlist_id: playlistId,
                track_id: dto.trackId,
            },
        });

        if (existing) {
            throw new BadRequestException('Bài hát đã có trong playlist');
        }

        // Lấy số lượng bài hát hiện tại để set order
        const trackCount = await this.prisma.playlist_tracks.count({
            where: { playlist_id: playlistId },
        });

        const playlistTrack = await this.prisma.playlist_tracks.create({
            data: {
                playlist_id: playlistId,
                track_id: dto.trackId,
                added_at: new Date(),
                track_order: trackCount + 1,
            },
            include: {
                music: {
                    include: {
                        artist_profiles: true,
                    },
                },
            },
        });

        return {
            message: 'Thêm bài hát vào playlist thành công',
            playlistTrack,
        };
    }

    // Xóa bài hát khỏi playlist
    async removeTrackFromPlaylist(
        userId: number,
        playlistId: number,
        trackId: number,
        dto: RemoveTrackFromPlaylistDto,
    ) {
        if (!dto.confirm) {
            throw new BadRequestException('Vui lòng xác nhận xóa bài hát');
        }

        // Kiểm tra playlist tồn tại và thuộc về user
        const playlist = await this.prisma.playlists.findFirst({
            where: {
                id: playlistId,
                user_id: userId,
            },
        });

        if (!playlist) {
            throw new NotFoundException('Playlist không tồn tại');
        }

        // Xóa liên kết
        await this.prisma.playlist_tracks.deleteMany({
            where: {
                playlist_id: playlistId,
                track_id: trackId,
            },
        });

        // Cập nhật order của các bài hát còn lại
        const remainingTracks = await this.prisma.playlist_tracks.findMany({
            where: { playlist_id: playlistId },
            orderBy: { track_order: 'asc' },
        });

        // Update order
        for (let i = 0; i < remainingTracks.length; i++) {
            await this.prisma.playlist_tracks.update({
                where: { id: remainingTracks[i].id },
                data: { track_order: i + 1 },
            });
        }

        return { message: 'Xóa bài hát khỏi playlist thành công' };
    }

    // Vote bài hát
    async voteTrack(userId: number, trackId: number, dto: VoteDto) {
        const track = await this.prisma.music.findUnique({
            where: { id: trackId },
        });

        if (!track) {
            throw new NotFoundException('Bài hát không tồn tại');
        }

        // Kiểm tra đã vote chưa
        const existingVote = await this.prisma.votes.findFirst({
            where: {
                user_id: userId,
                track_id: trackId,
            },
        });

        if (existingVote) {
            throw new BadRequestException('Bạn đã vote bài hát này');
        }

        // Tạo vote
        const vote = await this.prisma.votes.create({
            data: {
                user_id: userId,
                track_id: trackId,
                vote_type: dto.voteType,
                created_at: new Date(),
            },
        });

        // Tăng vote count
        await this.prisma.music.update({
            where: { id: trackId },
            data: {
                vote_count: { increment: 1 },
            },
        });

        return {
            message: 'Vote thành công',
            vote,
        };
    }

    // Hủy vote
    async unvoteTrack(userId: number, trackId: number) {
        const vote = await this.prisma.votes.findFirst({
            where: {
                user_id: userId,
                track_id: trackId,
            },
        });

        if (!vote) {
            throw new NotFoundException('Bạn chưa vote bài hát này');
        }

        await this.prisma.votes.delete({
            where: { id: vote.id },
        });

        // Giảm vote count
        await this.prisma.music.update({
            where: { id: trackId },
            data: {
                vote_count: { decrement: 1 },
            },
        });

        return { message: 'Hủy vote thành công' };
    }

    // Theo dõi artist
    async followArtist(userId: number, artistId: number, dto: FollowArtistDto) {
        const artistProfile = await this.prisma.artist_profiles.findUnique({
            where: { id: artistId },
        });

        if (!artistProfile) {
            throw new NotFoundException('Artist không tồn tại');
        }

        // Kiểm tra đã follow chưa
        const existingFollow = await this.prisma.follows.findFirst({
            where: {
                follower_user_id: userId,
                followed_artist_id: artistId,
            },
        });

        if (existingFollow) {
            throw new BadRequestException('Bạn đã theo dõi artist này');
        }

        const follow = await this.prisma.follows.create({
            data: {
                follower_user_id: userId,
                followed_artist_id: artistId,
                created_at: new Date(),
            },
        });

        return {
            message: 'Theo dõi artist thành công',
            follow,
        };
    }

    // Bỏ theo dõi artist
    async unfollowArtist(userId: number, artistId: number) {
        const follow = await this.prisma.follows.findFirst({
            where: {
                follower_user_id: userId,
                followed_artist_id: artistId,
            },
        });

        if (!follow) {
            throw new NotFoundException('Bạn chưa theo dõi artist này');
        }

        await this.prisma.follows.delete({
            where: { id: follow.id },
        });

        return { message: 'Bỏ theo dõi artist thành công' };
    }

    // Lấy danh sách artist đang theo dõi
    async getFollowingArtists(userId: number) {
        const follows = await this.prisma.follows.findMany({
            where: { follower_user_id: userId },
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
                        music: {
                            take: 3,
                            orderBy: { created_at: 'desc' },
                        },
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        });

        return follows.map((follow) => follow.artist_profiles);
    }

    // Tạo báo cáo
    async createReport(userId: number, dto: CreateReportDto) {
        // Kiểm tra target tồn tại
        let targetExists = false;
        switch (dto.targetType) {
            case 'MUSIC':
                const music = await this.prisma.music.findUnique({
                    where: { id: dto.targetId },
                });
                targetExists = !!music;
                break;
            case 'USER':
                const user = await this.prisma.users.findUnique({
                    where: { id: dto.targetId, is_deleted: false },
                });
                targetExists = !!user;
                break;
            case 'COMMENT':
                // Chưa có model comment trong schema
                targetExists = false;
                break;
            case 'PLAYLIST':
                const playlist = await this.prisma.playlists.findUnique({
                    where: { id: dto.targetId },
                });
                targetExists = !!playlist;
                break;
        }

        if (!targetExists) {
            throw new NotFoundException('Đối tượng báo cáo không tồn tại');
        }

        // Tạo báo cáo
        const report = await this.prisma.reports.create({
            data: {
                reporter_user_id: userId,
                report_type: dto.targetType,
                reason: dto.reason,
                resolution_notes: dto.resolutionNote,
                report_date: new Date(),
                status: 'PENDING',
                ...(dto.targetType === 'MUSIC' && { reported_music_id: dto.targetId }),
                ...(dto.targetType === 'USER' && { reported_user_id: dto.targetId }),
                ...(dto.targetType === 'PLAYLIST' && { reported_playlist_id: dto.targetId }),
            },
        });

        return {
            message: 'Báo cáo đã được gửi thành công',
            report,
        };
    }
}