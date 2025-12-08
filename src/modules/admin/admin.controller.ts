import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../libs/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../libs/common/guards/role.guard';
import { Roles } from '../../libs/common/decorators/role.decorator';
import {
    AssignRoleDto,
    SearchAccountDto,
    DeleteAccountDto,
    ArtistApplicationFilterDto,
    ProcessApplicationDto,
    ReportFilterDto,
    ResolveReportDto,
} from './dtos';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Post('accounts/assign-role')
    @ApiOperation({ summary: 'Gán vai trò cho tài khoản' })
    async assignRole(@Body() dto: AssignRoleDto) {
        return this.adminService.assignRole(dto);
    }

    @Get('accounts/search')
    @ApiOperation({ summary: 'Tìm kiếm tài khoản' })
    async searchAccounts(@Query() dto: SearchAccountDto) {
        return this.adminService.searchAccounts(dto);
    }

    @Delete('accounts/:userId')
    @ApiOperation({ summary: 'Xóa tài khoản' })
    async deleteAccount(
        @Param('userId') userId: string,
        @Body() dto: DeleteAccountDto,
    ) {
        return this.adminService.deleteAccount(Number(userId), dto);
    }

    // @Post('accounts/:userId/reset-password')
    // @ApiOperation({ summary: 'Reset mật khẩu người dùng' })
    // async resetUserPassword(@Param('userId') userId: string) {
    //     return this.adminService.resetUserPassword(Number(userId));
    // }

    @Get('artist-applications')
    @ApiOperation({ summary: 'Lấy danh sách yêu cầu làm artist' })
    async getArtistApplications(@Query() filter: ArtistApplicationFilterDto) {
        return this.adminService.getArtistApplications(filter);
    }

    @Patch('artist-applications/:id/process')
    @ApiOperation({ summary: 'Xử lý yêu cầu làm artist' })
    async processArtistApplication(
        @Param('id') id: string,
        @Body() dto: ProcessApplicationDto,
    ) {
        return this.adminService.processArtistApplication(Number(id), dto);
    }

    @Get('reports')
    @ApiOperation({ summary: 'Lấy danh sách báo cáo' })
    async getReports(@Query() filter: ReportFilterDto) {
        return this.adminService.getReports(filter);
    }

    @Patch('reports/:id/resolve')
    @ApiOperation({ summary: 'Xử lý báo cáo' })
    async resolveReport(
        @Param('id') id: string,
        @Body() dto: ResolveReportDto,
    ) {
        return this.adminService.resolveReport(Number(id), dto);
    }

    @Delete('music/:trackId')
    @ApiOperation({ summary: 'Xóa bài hát' })
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteMusic(@Param('trackId') trackId: string) {
        return this.adminService.deleteMusic(Number(trackId));
    }

    @Get('users/:userId/details')
    @ApiOperation({ summary: 'Lấy thông tin chi tiết người dùng' })
    async getUserDetails(@Param('userId') userId: string) {
        return this.adminService.getUserDetails(Number(userId));
    }
}