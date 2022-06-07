import { ApiProperty } from '@nestjs/swagger';

export class SeckillDto {
  @ApiProperty()
  product_id: string;
}

export class DrawDto {
  @ApiProperty()
  product_id: string;
}

export class WxCallbackDto {
  @ApiProperty({ example: 'EV-2018022511223320873' })
  id: string;
  @ApiProperty({ example: '2015-05-20T13:29:35+08:00' })
  create_time: string;
  @ApiProperty({ example: 'TRANSACTION.SUCCESS' })
  event_type: string;
  @ApiProperty({ example: 'encrypt-resource' })
  resource_type: string;
  @ApiProperty({ example: '支付成功' })
  summary: string;
  @ApiProperty({
    example: {
      algorithm: 'AEAD_AES_256_GCM',
      ciphertext: '',
      original_type: 'transaction',
      nonce: '',
      associated_data: '',
    },
  })
  resource: {
    algorithm: string;
    ciphertext: string;
    associated_data?: string;
    original_type: string;
    nonce: string;
  };
}

export class PayDto {
  @ApiProperty()
  order_id: string;

  @ApiProperty()
  openid?: string; // JSAPI支付必须携带

  @ApiProperty()
  type: 'jsapi' | 'h5' // 支付类型
}
