export enum SupportPayment {
  WX = 'weixin',
  ALI = 'alipay',
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

export const phoneReg =
  /^1(3\d|4[5-9]|5[0-35-9]|6[2567]|7[0-8]|8\d|9[0-35-9])\d{8}$/;

export enum AuthError {
  OK = 0,
  REFRESHED = 1,
  OUTDATED = 2,
  INVALID = 3,
  UNKNOWN = 4,
}
