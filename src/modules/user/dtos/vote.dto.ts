import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, Min } from 'class-validator';

export class VoteDto {
    @ApiProperty({
        example: 100,
        description: 'ID bài hát muốn vote',
    })
    @IsInt()
    @Min(1)
    trackId: number;

    @ApiProperty({
        enum: ['LIKE', 'UPVOTE'],
        example: 'LIKE',
        description: 'Loại vote: LIKE hoặc UPVOTE',
    })
    @IsEnum(['LIKE', 'UPVOTE'])
    voteType: 'LIKE' | 'UPVOTE';
}
