import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toCamelCase } from 'src/libs/common/utils/transform.util';
import {
    CreatePlaylistDto,
    UpdatePlaylistDto,
    AddTrackToPlaylistDto,
    RemoveTrackFromPlaylistDto,
    VoteDto,
    CreateReportDto,
    DeletePlaylistDto,
} from './dtos';

@Injectable()
export class UserService {
    constructor(private readonly prisma: PrismaService) { }

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
                    take: 3,
                },
            },
            orderBy: { creation_date: 'desc' },
        });

        return toCamelCase(playlists);
    }

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

        return toCamelCase(playlist);
    }

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

    async deletePlaylist(
        userId: number,
        playlistId: number,
        dto: DeletePlaylistDto,
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

        await this.prisma.playlist_tracks.deleteMany({
            where: { playlist_id: playlistId },
        });

        await this.prisma.playlists.delete({
            where: { id: playlistId },
        });

        return { message: 'Xóa playlist thành công' };
    }

    async addTrackToPlaylist(
        userId: number,
        playlistId: number,
        dto: AddTrackToPlaylistDto,
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

        const track = await this.prisma.music.findUnique({
            where: { id: dto.trackId },
        });

        if (!track) {
            throw new NotFoundException('Bài hát không tồn tại');
        }

        const existing = await this.prisma.playlist_tracks.findFirst({
            where: {
                playlist_id: playlistId,
                track_id: dto.trackId,
            },
        });

        if (existing) {
            throw new BadRequestException('Bài hát đã có trong playlist');
        }

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

    async removeTrackFromPlaylist(
        userId: number,
        playlistId: number,
        trackId: number,
        dto: RemoveTrackFromPlaylistDto,
    ) {
        if (!dto.confirm) {
            throw new BadRequestException('Vui lòng xác nhận xóa bài hát khỏi playlist');
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

        await this.prisma.playlist_tracks.deleteMany({
            where: {
                playlist_id: playlistId,
                track_id: trackId,
            },
        });

        const remainingTracks = await this.prisma.playlist_tracks.findMany({
            where: { playlist_id: playlistId },
            orderBy: { track_order: 'asc' },
        });

        for (let i = 0; i < remainingTracks.length; i++) {
            await this.prisma.playlist_tracks.update({
                where: { id: remainingTracks[i].id },
                data: { track_order: i + 1 },
            });
        }

        return { message: 'Xóa bài hát khỏi playlist thành công' };
    }

    async voteTrack(userId: number, trackId: number, dto: VoteDto) {
        const track = await this.prisma.music.findUnique({
            where: { id: trackId },
        });

        if (!track) {
            throw new NotFoundException('Bài hát không tồn tại');
        }

        const existingVote = await this.prisma.votes.findFirst({
            where: {
                user_id: userId,
                track_id: trackId,
            },
        });

        if (existingVote) {
            throw new BadRequestException('Bạn đã vote bài hát này');
        }

        const vote = await this.prisma.votes.create({
            data: {
                user_id: userId,
                track_id: trackId,
                vote_type: dto.voteType,
                created_at: new Date(),
            },
        });

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

        await this.prisma.music.update({
            where: { id: trackId },
            data: {
                vote_count: { decrement: 1 },
            },
        });

        return { message: 'Hủy vote thành công' };
    }

    async followArtist(userId: number, artistId: number) {
        const artistProfile = await this.prisma.artist_profiles.findUnique({
            where: { id: artistId },
        });

        if (!artistProfile) {
            throw new NotFoundException('Artist không tồn tại');
        }

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

    async createReport(userId: number, dto: CreateReportDto) {
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

        const report = await this.prisma.reports.create({
            data: {
                reporter_user_id: userId,
                report_type: dto.targetType,
                reason: dto.reason,
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