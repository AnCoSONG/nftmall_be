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
- [ ] 微信支付接口
- [x] 用户上链
- [x] 藏品上链
- [ ] 短信接口
- [x] 实名认证接口
- [x] 接口限速
- [ ] nft查询相关接口（优先级低）


## Next
* 支付接口


## Problem
- [x] 取消订单后 product_item_id unique导致新订单无法购买该藏品item的问题

## Discussion
如何上传文件？
我的思路是：

* 前端选定文件后，点击上传，前端生成hash化后的key，获取文件类型，将文件上传，上传成功后，key作为src传到后端。
* 展示时，前端封装一个key -> objectUrl的方法
* 后端完全透明