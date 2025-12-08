import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, Min } from 'class-validator';
import { VoteType } from 'src/libs/common/enums/vote-type.dto';

export class VoteDto {
    @ApiProperty({
        example: 'LIKE',
        description: 'Loại vote: LIKE hoặc UPVOTE',
    })
    @IsEnum(VoteType)
    voteType: VoteType;
}
