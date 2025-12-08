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
    UploadedFile,
    UseInterceptors,
    ValidationPipe,
    UsePipes,
    Patch
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../libs/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../libs/common/guards/role.guard'
import { Roles } from '../../libs/common/decorators/role.decorator'
import { ArtistService } from './artist.service';
import { StorageService } from '../storage/storage.service';
import {
    UploadMusicDto,
    UpdateMusicDto,
    CreateAlbumDto,
    UpdateAlbumDto,
    AddTracksToAlbumDto,
    AnalyticsFilterDto,
} from './dtos';
import { UpdateProfileDto } from './dtos/profile.dto';

@ApiTags('Artist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ARTIST')
@Controller('artist')
export class ArtistController {
    constructor(
        private readonly artistService: ArtistService,
        private readonly storageService: StorageService,
    ) { }

    @Post('music')
    @ApiOperation({ summary: 'Upload bài hát mới' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                genre: { type: 'string' },
                description: { type: 'string' },
                file: {
                    type: 'string',
                    format: 'binary'
                }
            }
        }
    })
    @UseInterceptors(FileInterceptor('file'))
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }))
    async uploadMusic(
        @Req() req: any,
        @Body() dto: UploadMusicDto,
        @UploadedFile() file: Express.Multer.File,
    ) {
        const userId = req.user.id;
        return this.artistService.uploadMusic(userId, dto, file);
    }

    @Get('music')
    @ApiOperation({ summary: 'Lấy danh sách bài hát của artist' })
    async getArtistMusic(@Req() req: any) {
        const userId = req.user.id;
        return this.artistService.getArtistMusic(userId);
    }

    @Put('music/:trackId')
    @ApiOperation({ summary: 'Cập nhật thông tin bài hát' })
    async updateMusic(
        @Req() req: any,
        @Param('trackId') trackId: string,
        @Body() dto: UpdateMusicDto,
    ) {
        const userId = req.user.id;
        return this.artistService.updateMusic(userId, Number(trackId), dto);
    }

    @Delete('music/:trackId')
    @ApiOperation({ summary: 'Xóa bài hát' })
    async deleteMusic(
        @Req() req: any,
        @Param('trackId') trackId: string,
    ) {
        const userId = req.user.id;
        return this.artistService.deleteMusic(userId, Number(trackId));
    }

    @Post('albums')
    @ApiOperation({ summary: 'Tạo album mới' })
    async createAlbum(@Req() req: any, @Body() dto: CreateAlbumDto) {
        const userId = req.user.id;
        return this.artistService.createAlbum(userId, dto);
    }

    @Get('albums')
    @ApiOperation({ summary: 'Lấy danh sách album của artist' })
    async getArtistAlbums(@Req() req: any) {
        const userId = req.user.id;
        return this.artistService.getArtistAlbums(userId);
    }

    @Get('albums/:albumId')
    @ApiOperation({ summary: 'Lấy chi tiết album' })
    async getAlbumDetail(
        @Req() req: any,
        @Param('albumId') albumId: string,
    ) {
        const userId = req.user.id;
        return this.artistService.getAlbumDetail(userId, Number(albumId));
    }

    @Put('albums/:albumId')
    @ApiOperation({ summary: 'Cập nhật album' })
    async updateAlbum(
        @Req() req: any,
        @Param('albumId') albumId: string,
        @Body() dto: UpdateAlbumDto,
    ) {
        const userId = req.user.id;
        return this.artistService.updateAlbum(userId, Number(albumId), dto);
    }

    @Delete('albums/:albumId')
    @ApiOperation({ summary: 'Xóa album' })
    async deleteAlbum(
        @Req() req: any,
        @Param('albumId') albumId: string,
    ) {
        const userId = req.user.id;
        return this.artistService.deleteAlbum(userId, Number(albumId));
    }

    @Post('albums/:albumId/tracks')
    @ApiOperation({ summary: 'Thêm bài hát vào album' })
    async addTracksToAlbum(
        @Req() req: any,
        @Param('albumId') albumId: string,
        @Body() dto: AddTracksToAlbumDto,
    ) {
        const userId = req.user.id;
        return this.artistService.addTracksToAlbum(
            userId,
            Number(albumId),
            dto,
        );
    }

    @Delete('albums/:albumId/tracks/:trackId')
    @ApiOperation({ summary: 'Xóa bài hát khỏi album' })
    async removeTrackFromAlbum(
        @Req() req: any,
        @Param('albumId') albumId: string,
        @Param('trackId') trackId: string,
    ) {
        const userId = req.user.id;
        return this.artistService.removeTrackFromAlbum(
            userId,
            Number(albumId),
            Number(trackId),
        );
    }

    @Get('analytics')
    @ApiOperation({ summary: 'Lấy thống kê âm nhạc' })
    async getAnalytics(
        @Req() req: any,
        @Query() filter: AnalyticsFilterDto,
    ) {
        const userId = req.user.id;
        return this.artistService.getAnalytics(userId, filter);
    }

    @Patch('profile')
    @ApiOperation({ summary: 'Cập nhật profile artist' })
    async updateProfile(
        @Req() req: any,
        @Body() dto: UpdateProfileDto,
    ) {
        const userId = req.user.id;
        return this.artistService.updateProfile(userId, dto);
    }
}