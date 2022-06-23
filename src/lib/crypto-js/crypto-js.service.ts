import { Inject, Injectable } from '@nestjs/common';
import * as AES from 'crypto-js/aes';
import * as Utf8 from 'crypto-js/enc-utf8';
import * as Hex from 'crypto-js/enc-hex'
import * as ECB from 'crypto-js/mode-ecb';
import * as PKCS7 from 'crypto-js/pad-pkcs7';
import * as SHA1 from 'crypto-js/sha1'
// import { CRYPTOJS_SYMBOL } from './crypto-js.provider';
@Injectable()
export class CryptoJsService {
  constructor() {}

  decrypt(data: string) {
    return AES
      .decrypt(data, '8992c282-ddff-11ec-9d64-0242ac120002', {
        mode: ECB,
        padding: PKCS7,
      })
      .toString(Utf8);
  }

  sha1(data: string) {
    return SHA1(data).toString(Hex)
  }
}
