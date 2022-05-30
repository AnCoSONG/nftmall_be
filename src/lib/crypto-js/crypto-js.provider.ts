import { Injectable, Provider } from '@nestjs/common';
import * as AES from 'crypto-js/aes';

// export const CRYPTOJS_SYMBOL = Symbol('CryptoJS')
export const CryptoJsProvider: Provider = {
    provide: 'lib:CryptoJs',
    useFactory: () => {
        return AES
    }
}
