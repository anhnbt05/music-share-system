export class AssignRoleDto {
    userId: bigint;
    newRole: 'USER' | 'ARTIST';
}

export class SearchAccountDto {
    query: string;
    page?: number = 1;
    limit?: number = 10;
}