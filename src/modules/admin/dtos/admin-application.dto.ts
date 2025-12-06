export class ArtistApplicationFilterDto {
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    page?: number = 1;
    limit?: number = 10;
    sortBy?: 'created_at' | 'stage_name';
    order?: 'asc' | 'desc';
}

export class ProcessApplicationDto {
    applicationId: bigint;
    action: 'APPROVE' | 'REJECT';
    reason?: string;
}