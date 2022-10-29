import { ApiProperty } from "@nestjs/swagger";
import { transferLaunchType } from "../../common/const";

export class CreateProductItemTransferDto {
    @ApiProperty({description: '藏品卖家', example: 1})
    sender_id: number;

    @ApiProperty({ description: '藏品买家', example: 2})
    receiver_id: number;

    @ApiProperty({ description: '藏品系列链上ID', example: 'string'})
    nft_id: string;

    @ApiProperty({ description: '藏品链上ID', example: 'string'})
    nft_class_id: string;

    @ApiProperty({ description: '原始藏品ID', example: 'string'})
    original_product_item_id: string;

    @ApiProperty({ description: '转赠发起方式', example: transferLaunchType.USER })
    launch_type: transferLaunchType;

    @ApiProperty({ description: '转赠外部订单ID', example: 'string'})
    out_trade_id?: string;
}
