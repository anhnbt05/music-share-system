import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../libs/common/guards/jwt-auth.guard';
import { UserService } from './user.service';
import {
    CreatePlaylistDto,
    UpdatePlaylistDto,
    AddTrackToPlaylistDto,
    RemoveTrackFromPlaylistDto,
    VoteDto,
    CreateReportDto,
    DeletePlaylistDto,
} from './dtos';

@ApiTags('User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Post('playlists')
    @ApiOperation({ summary: 'Tạo playlist mới' })
    async createPlaylist(@Req() req: any, @Body() dto: CreatePlaylistDto) {
        const userId = req.user.id;
        return this.userService.createPlaylist(userId, dto);
    }

    @Get('playlists')
    @ApiOperation({ summary: 'Lấy danh sách playlist của người dùng' })
    async getPlaylists(@Req() req: any) {
        const userId = req.user.id;
        return this.userService.getUserPlaylists(userId);
    }

    @Get('playlists/:playlistId')
    @ApiOperation({ summary: 'Lấy chi tiết playlist' })
    async getPlaylistDetail(
        @Req() req: any,
        @Param('playlistId') playlistId: string,
    ) {
        const userId = req.user.id;
        return this.userService.getPlaylistDetail(userId, Number(playlistId));
    }

    @Put('playlists/:playlistId')
    @ApiOperation({ summary: 'Cập nhật playlist' })
    async updatePlaylist(
        @Req() req: any,
        @Param('playlistId') playlistId: string,
        @Body() dto: UpdatePlaylistDto,
    ) {
        const userId = req.user.id;
        return this.userService.updatePlaylist(userId, Number(playlistId), dto);
    }

    @Delete('playlists/:playlistId')
    @ApiOperation({ summary: 'Xóa playlist' })
    async deletePlaylist(
        @Req() req: any,
        @Param('playlistId') playlistId: string,
        @Body() dto: DeletePlaylistDto,
    ) {
        const userId = req.user.id;
        return this.userService.deletePlaylist(userId, Number(playlistId), dto);
    }

    @Post('playlists/:playlistId/tracks')
    @ApiOperation({ summary: 'Thêm bài hát vào playlist' })
    async addTrackToPlaylist(
        @Req() req: any,
        @Param('playlistId') playlistId: string,
        @Body() dto: AddTrackToPlaylistDto,
    ) {
        const userId = req.user.id;
        return this.userService.addTrackToPlaylist(
            userId,
            Number(playlistId),
            dto,
        );
    }

    @Delete('playlists/:playlistId/tracks/:trackId')
    @ApiOperation({ summary: 'Xóa bài hát khỏi playlist' })
    async removeTrackFromPlaylist(
        @Req() req: any,
        @Param('playlistId') playlistId: string,
        @Param('trackId') trackId: string,
        @Body() dto: RemoveTrackFromPlaylistDto,
    ) {
        const userId = req.user.id;
        return this.userService.removeTrackFromPlaylist(
            userId,
            Number(playlistId),
            Number(trackId),
            dto,
        );
    }

    @Post('music/:trackId/vote')
    @ApiOperation({ summary: 'Vote/Thích bài hát' })
    async voteTrack(
        @Req() req: any,
        @Param('trackId') trackId: string,
        @Body() dto: VoteDto,
    ) {
        const userId = req.user.id;
        return this.userService.voteTrack(userId, Number(trackId), dto);
    }

    @Delete('music/:trackId/vote')
    @ApiOperation({ summary: 'Hủy vote bài hát' })
    async unvoteTrack(
        @Req() req: any,
        @Param('trackId') trackId: string,
    ) {
        const userId = req.user.id;
        return this.userService.unvoteTrack(userId, Number(trackId));
    }

    @Post('artists/:artistId/follow')
    @ApiOperation({ summary: 'Theo dõi artist' })
    async followArtist(
        @Req() req: any,
        @Param('artistId') artistId: string,
    ) {
        const userId = req.user.id;
        return this.userService.followArtist(userId, Number(artistId));
    }

    @Delete('artists/:artistId/follow')
    @ApiOperation({ summary: 'Bỏ theo dõi artist' })
    async unfollowArtist(
        @Req() req: any,
        @Param('artistId') artistId: string,
    ) {
        const userId = req.user.id;
        return this.userService.unfollowArtist(userId, Number(artistId));
    }

    @Get('following')
    @ApiOperation({ summary: 'Lấy danh sách artist đang theo dõi' })
    async getFollowingArtists(@Req() req: any) {
        const userId = req.user.id;
        return this.userService.getFollowingArtists(userId);
    }

    @Post('reports')
    @ApiOperation({ summary: 'Tạo báo cáo' })
    async createReport(@Req() req: any, @Body() dto: CreateReportDto) {
        const userId = req.user.id;
        return this.userService.createReport(userId, dto);
    }
}