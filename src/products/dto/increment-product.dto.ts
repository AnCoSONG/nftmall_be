import { ApiProperty } from "@nestjs/swagger";

export class IncrementProductDto { 
    @ApiProperty({
        description: '发行量',
        example: 10
    })
    count: number;

    @ApiProperty({
        description: '已发行量',
        example: 10
    })
    published_count: number;

    @ApiProperty({
        description: '抽签时间',
        example: new Date().toISOString()
    })
    draw_timestamp: string;

    @ApiProperty({
        description: '抽签结束时间',
        example: new Date().toISOString()
    })
    draw_end_timestamp: string;

    @ApiProperty({
        description: '抽签结束时间',
        example: new Date().toISOString()
    })
    sale_timestamp: string;
}