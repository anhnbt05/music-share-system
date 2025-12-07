// src/music/music.controller.ts
import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    UseGuards,
    Res,
    Header,
    Body
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../libs/common/guards/jwt-auth.guard';
import { MusicService } from './music.service';
import { SearchMusicDto, StreamMusicDto, ShareMusicDto } from './dtos';

@ApiTags('Music')
@Controller('music')
export class MusicController {
    constructor(private readonly musicService: MusicService) { }

    // Tìm kiếm âm nhạc
    @Get('search')
    @ApiOperation({ summary: 'Tìm kiếm âm nhạc' })
    async searchMusic(@Query() dto: SearchMusicDto) {
        return this.musicService.searchMusic(dto);
    }

    // Lấy chi tiết bài hát
    @Get(':trackId')
    @ApiOperation({ summary: 'Lấy thông tin chi tiết bài hát' })
    async getMusicDetail(@Param('trackId') trackId: string) {
        return this.musicService.getMusicDetail(Number(trackId));
    }

    // Stream âm nhạc
    @Get(':trackId/stream')
    @ApiOperation({ summary: 'Stream bài hát' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Header('Content-Type', 'audio/mpeg')
    @Header('Accept-Ranges', 'bytes')
    async streamMusic(
        @Param('trackId') trackId: string,
        @Query() dto: StreamMusicDto,
        @Res() res: Response,
    ) {
        return this.musicService.streamMusic(Number(trackId), res);
    }

    // Chia sẻ bài hát
    @Post(':trackId/share')
    @ApiOperation({ summary: 'Chia sẻ bài hát' })
    async shareMusic(
        @Param('trackId') trackId: string,
        @Body() dto: ShareMusicDto,
    ) {
        return this.musicService.shareMusic(Number(trackId), dto);
    }

    // Lấy danh sách bài hát trending
    @Get('trending')
    @ApiOperation({ summary: 'Lấy danh sách bài hát trending' })
    async getTrendingMusic(@Query('limit') limit: string = '10') {
        return this.musicService.getTrendingMusic(parseInt(limit));
    }

    // Lấy danh sách bài hát theo genre
    @Get('genre/:genre')
    @ApiOperation({ summary: 'Lấy danh sách bài hát theo thể loại' })
    async getMusicByGenre(
        @Param('genre') genre: string,
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
    ) {
        return this.musicService.getMusicByGenre(
            genre,
            parseInt(page),
            parseInt(limit),
        );
    }
}