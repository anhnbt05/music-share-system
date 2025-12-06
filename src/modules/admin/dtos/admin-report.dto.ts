export class ReportFilterDto {
    status?: 'PENDING' | 'RESOLVED';
    type?: 'MUSIC' | 'USER' | 'COMMENT' | 'PLAYLIST';
    startDate?: Date;
    endDate?: Date;
    page?: number = 1;
    limit?: number = 10;
}
export class ResolveReportDto {
    reportId: bigint;
    resolutionNotes?: string;
}
