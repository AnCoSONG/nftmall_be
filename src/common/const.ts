export enum SupportPayment {
  WX = 'weixin',
  ALI = 'alipay',
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PAID = 'paid',
  CANCELED = 'canceled',
  PAYING = 'paying', // todo: remove
}

export enum SupportType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  D3 = '3D',
  HYBRID = 'hybrid',
}

export enum DisplayMode {
  LIGHT = 'light',
  DARK = 'dark',
}

export enum onChainStatus {
  SUCCESS = 'success', // 成功
  PROCESSING = 'processing', // 处理中
  FAILED = 'failed', // 上链失败
  PENDING = 'pending', // 待上链
}

export enum transferStatus {
  SUCCESS = 'success', // 成功
  PROCESSING = 'processing', // 处理中
  FAILED = 'failed', // 转赠失败
  PENDING = 'pending', // 待处理
}

export enum productItemStatus {
  DEFAULT = 'default',
  LOCKED = 'locked',
  TRANSFERED = 'transfered'
}

export enum productItemSource  {
  TBD = 'TBD',
  BUY = 'BUY',
  PLATFORM_GIFT = 'PLATFORM_GIFT',
  TRANSFER = 'TRANSFER'
}

export enum transferLaunchType {
  USER = 'user',
  DINGBLOCK = 'dingblock',
  OTHER = 'other'
}

export const phoneReg =
  /^1(3\d|4[5-9]|5[0-35-9]|6[2567]|7[0-8]|8\d|9[0-35-9])\d{8}$/;

export enum AuthError {
  OK = 0,
  REFRESHED = 1,
  OUTDATED = 2,
  INVALID = 3,
  UNKNOWN = 4
}

export type Tag = {
  name: string;
  mode?: DisplayMode;
};

export enum BSN_TX_STATUS {
  PROCESSING = 0,
  SUCCESS = 1,
  FAILED = 2,
  PENDING = 3,
}

export enum RefundStatus {
  NOREFUND = 'no_refund',
  PROCESSING = 'processing',
  FAILED = 'FAILED',
  SUCCESS = 'SUCCESS',
}

export type CallbackData = {
  mchid: string;
  appid: string;
  out_trade_no: string;
  transaction_id: string;
  trade_type: 'JSAPI' | 'NATIVE' | 'APP' | 'MICROPAY' | 'MWEB' | 'FACEPAY';
  trade_state: 'SUCCESS' | 'REFUND' | 'NOTPAY' | 'CLOSED' | 'REVOKED' | 'USERPAYING' | 'PAYERROR';
  trade_state_desc: string;
  bank_type: string;
  attach: string;
  sucess_time: string;
  payer: {
    openid: string;
  };
  amount: {
    total: number;
    payer_total: number;
    currency: string;
    payer_currency: string;
  }
}

export enum CollectorRole {
  normal = 'normal',
  official = 'official'
}

export enum ProductAttribute {
  normal = 'normal',
  gift = 'gift'
}