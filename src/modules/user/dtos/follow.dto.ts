import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class FollowArtistDto {
    @ApiProperty({
        example: 12,
        description: 'ID của artist cần theo dõi',
    })
    @IsInt()
    @Min(1)
    artistId: number;
}
