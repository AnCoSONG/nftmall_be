# NFTMALL服务端

## Todo
- [x] Tag CRUD
- [x] Publisher CRUD
- [x] Product CRUD
- [x] Product Item CRUD
- [x] Order CRUD
- [x] Notice CRUD
- [x] Genre CRUD
- [x] Collector CRUD
- [x] Banner CRUD
- [x] 鉴权
- [x] 抽签
- [x] 抢购
- [x] 微信支付接口
- [x] 用户上链
- [x] 藏品上链
- [x] 短信接口
- [x] 实名认证接口
- [x] 接口限速
- [ ] nft查询相关接口（优先级低）


## Next
- [x] JSAPI支付
- [x] 秒杀创建藏品 or 提前创建藏品


## Problem
- [x] 取消订单后 product_item_id unique导致新订单无法购买该藏品item的问题

## Discussion
如何上传文件？
我的思路是：

* 前端选定文件后，点击上传，前端生成hash化后的key，获取文件类型，将文件上传，上传成功后，key作为src传到后端。
* 展示时，前端封装一个key -> objectUrl的方法
* 后端完全透明


## 转赠实现
- [x] 更新ProductItem实现
- [x] 增加转赠表
- [x] 转赠表CRUD
- [x] 转赠链路后端跑通
  - [x] 购买/平台赠送一个藏品X
  - [x] 调用接口将A用户的藏品X转赠给B用户
- [x] 实现productItem生产环境表的source初始化脚本

### ProductItem表
* 增加状态字段：默认、已锁定、已转赠
* 增加来源字段：待定、购买、平台赠送、交易转赠
* 更新购买和赠送藏品Dto和逻辑：购买时藏品来源为`购买`，平台赠送时藏品来源为`平台赠送`，用户转赠时藏品来源为`交易转赠`
* ProductItem表来源字段初始化脚本: 当来源为待定时，检查藏品是否为`赠品`，如果`藏品`为赠品则设置来源为`平台赠送`，否则设置为`购买`

### ProductItemTransfer 转赠表
#### 字段
```ts
declare type ProductItemTransfer {
  id: string, // uuid
  out_trade_id?: string, // 外部订单号
  launch_type: 'user' | 'dingblock' | 'other', // 转赠发起类型
  sender_id: string,
  receiver_id: string,
  nft_id: string,
  nft_class_id: string,
  original_product_item_id: string,
  original_product_item: ProductItem,
  target_product_item_id: string | null,
  target_product_item: ProductItem,
  operation_id: string,
  status: `pending` | `processing` | `success` | 'failed',
  tx_hash: string,
  tx_success_time: string
}
```

## 提交方式
采用远程仓库 + 共存SSH Key的方式实现。