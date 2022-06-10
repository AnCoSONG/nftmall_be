import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { DayjsService } from '../lib/dayjs/dayjs.service';
import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { getIdepmotentValue } from '../common/utils';
import {
  Error,
  TxRes,
  GetAccountsRes,
  GetAccountsHistoryRes,
  GetTransactionRes,
  GetNftClassesRes,
  GetNftClassesDetailRes,
  GetNftRes,
  GetNftDetailRes,
  GetNftHistoryRes,
  CreateAccountRes,
} from './bsn.types.d';

@Injectable()
export class BsnService {
  private readonly logger = new Logger(BsnService.name);
  constructor(
    private readonly httpService: HttpService,
    private readonly dayjsService: DayjsService,
    private readonly configService: ConfigService,
  ) {}

  get_headers(
    path: string,
    query: Record<string, unknown>,
    data: Record<string, unknown>,
  ) {
    const timestamp_ms = this.dayjsService.gen_time_ms();
    const signature = this.get_signature(timestamp_ms, path, query, data);
    return {
      'X-Timestamp': timestamp_ms,
      'X-Signature': signature,
      'X-Api-Key': this.configService.get<string>('bsn.api_key'),
      'Content-Type': 'application/json',
    };
  }

  get_signature(
    timestamp: number,
    path: string,
    query: Record<string, unknown>,
    data: Record<string, unknown>,
  ) {
    const params = { path_url: path };
    for (const key in query) {
      params[`query_${key}`] = query[key];
    }
    for (const key in data) {
      params[`body_${key}`] = data[key];
    }
    // 对params按照key排序
    const keys = Object.keys(params).sort((a, b) => {
      return a.localeCompare(b);
    });
    const sorted_params = {};
    for (const key of keys) {
      sorted_params[key] = params[key];
    }
    const params_str = JSON.stringify(sorted_params);
    const intact_str =
      params_str +
      timestamp.toString() +
      this.configService.get<string>('bsn.api_secret');
    return createHash('sha256').update(intact_str).digest('hex');
  }

  async request(
    path: string,
    method: 'POST' | 'GET' | 'PATCH' | 'DELETE',
    query: Record<string, unknown>,
    data: Record<string, unknown>,
  ) {
    try {
      const headers = this.get_headers(path, query, data);
      const res = await this.httpService
        .request({
          url: path,
          method: method,
          headers: headers,
          params: query,
          data: data,
        })
        .toPromise();
      this.logger.log(`request-${path}-${method} success`);
      // console.log('request res.data', res.data);
      // console.log('request res.data.data', res.data.data);
      return res.data.data;
    } catch (err) {
      console.error(err);
      this.logger.error(
        `${path}-${method} failed: ${err.response.data.error.code_space} - ${err.response.data.error.code} - ${err.response.data.error.message}`,
        err.stack,
      );
      return err.response.data.error;
    }
  }

  async get_accounts(payload: {
    account?: string;
    offset?: number;
    limit?: number;
    sort_by?: 'DATE_ASC' | 'DATE_DESC';
    start_date?: string;
    end_date?: string;
    operation_id?: string;
  }): Promise<GetAccountsRes> {
    const query = {
      ...payload,
      offset: payload.offset && Math.max(payload.offset, 0).toString(),
      limit: payload.limit && Math.min(payload.limit, 50).toString(),
    };
    return await this.request('/v1beta1/accounts', 'GET', query, {});
  }

  async create_account(name: string): Promise<CreateAccountRes> {
    const data = { name, operation_id: getIdepmotentValue() };
    return await this.request('/v1beta1/account', 'POST', {}, data);
  }

  async create_accounts(count = 1): Promise<string[] & Error> {
    const data = { count, operation_id: getIdepmotentValue() };
    return await this.request('/v1beta1/accounts', 'POST', {}, data);
  }

  async get_accounts_history(
    account: string,
    offset = 0,
    limit = 10,
    sort_by: 'DATE_ASC' | 'DATE_DESC' = 'DATE_DESC',
    start_date?: string,
    end_date?: string,
  ): Promise<GetAccountsHistoryRes> {
    const query = {
      offset: Math.max(offset, 0).toString(),
      limit: Math.min(limit, 50).toString(),
      account,
      sort_by,
      start_date,
      end_date,
    };
    return await this.request('/v1beta1/accounts/history', 'GET', query, {});
  }

  async get_transactions(task_id: string): Promise<GetTransactionRes> {
    return await this.request(`/v1beta1/tx/${task_id}`, 'GET', {}, {});
  }

  async create_nft_class(data: {
    owner: string;
    name: string;
    symbol?: string;
    description?: string;
    uri?: string;
    uri_hash?: string;
    data?: string;
    tag?: Record<string, string>;
  }): Promise<TxRes> {
    // console.log(getIdepmotentValue());
    const data_ = {
      ...data,
      operation_id: getIdepmotentValue(),
    };
    return await this.request('/v1beta1/nft/classes', 'POST', {}, data_);
  }

  async get_nft_class(payload: {
    offset?: number;
    limit?: number;
    id?: string;
    name?: string;
    owner?: string;
    tx_hash?: string;
    start_date?: string;
    end_date?: string;
    sort_by?: 'DATE_ASC' | ' DATE_DESC';
  }): Promise<GetNftClassesRes> {
    const query = {
      ...payload,
      offset: payload.offset && Math.max(payload.offset, 0).toString(),
      limit: payload.limit && Math.min(payload.limit, 50).toString(),
    };
    console.log(query);
    return await this.request('/v1beta1/nft/classes', 'GET', query, {});
  }

  async get_nft_class_detail(id: string): Promise<GetNftClassesDetailRes> {
    return await this.request(`/v1beta1/nft/classes/${id}`, 'GET', {}, {});
  }

  async transfer_nft_class(
    class_id: string,
    owner: string,
    recipient: string,
    tag?: Record<string, string>,
  ): Promise<TxRes> {
    const data = {
      recipient,
      tag,
      operation_id: getIdepmotentValue(),
    };
    return await this.request(
      `/v1beta1/nft/class-transfers/${class_id}/${owner}`,
      'POST',
      {},
      data,
    );
  }

  async create_nft(payload: {
    class_id: string;
    name: string;
    uri?: string;
    uri_hash?: string;
    data?: string;
    recipient?: string;
    tag?: Record<string, string>;
  }): Promise<TxRes> {
    const data_ = {
      name: payload.name,
      uri: payload.uri,
      uri_hash: payload.uri_hash,
      data: payload.data,
      recipient: payload.recipient,
      tag: payload.tag,
      operation_id: getIdepmotentValue(),
    };
    return await this.request(
      `/v1beta1/nft/nfts/${payload.class_id}`,
      'POST',
      {},
      data_,
    );
  }

  async transfer_nft(
    class_id: string,
    owner: string,
    nft_id: string,
    recipient: string,
    tag?: Record<string, string>,
  ): Promise<TxRes> {
    const data = {
      recipient,
      operation_id: getIdepmotentValue(),
      tag,
    };
    return await this.request(
      `/v1beta1/nft/nft-transfers/${class_id}/${owner}/${nft_id}`,
      'POST',
      {},
      data,
    );
  }

  async patch_nft(
    class_id: string,
    owner: string,
    nft_id: string,
    name: string,
    uri?: string,
    data?: string,
    tag?: Record<string, string>,
  ): Promise<TxRes> {
    const data_ = {
      name,
      uri,
      data,
      tag,
    };
    return await this.request(
      `/v1beta1/nft/nfts/${class_id}/${owner}/${nft_id}`,
      'PATCH',
      {},
      data_,
    );
  }

  async delete_nft(
    class_id: string,
    owner: string,
    nft_id: string,
    tag?: Record<string, string>,
  ): Promise<TxRes> {
    const data_ = {
      tag,
    };
    return await this.request(
      `/v1beta1/nft/nfts/${class_id}/${owner}/${nft_id}`,
      'DELETE',
      {},
      data_,
    );
  }

  async get_nft(
    offset = 0,
    limit = 10,
    id: string,
    class_id: string,
    owner: string,
    tx_hash: string,
    start_date: string,
    end_date: string,
    sort_by: 'ID_ASC' | 'ID_DESC' | 'DATE_ASC' | 'DATE_DESC',
    status: 'active' | 'burned',
  ): Promise<GetNftRes> {
    const query = {
      offset: Math.max(offset, 0).toString(),
      limit: Math.min(limit, 50).toString(),
      id,
      class_id,
      owner,
      tx_hash,
      start_date,
      end_date,
      sort_by,
      status,
    };
    return await this.request('/v1beta1/nft/nfts', 'GET', query, {});
  }

  async get_nft_detail(
    class_id: string,
    nft_id: string,
  ): Promise<GetNftDetailRes> {
    return await this.request(
      `/v1beta1/nft/nfts/${class_id}/${nft_id}`,
      'GET',
      {},
      {},
    );
  }

  async get_nft_history(
    class_id: string,
    nft_id: string,
    offset = 0,
    limit = 10,
    signer?: string,
    tx_hash?: string,
    operation?: string,
    start_date?: string,
    end_date?: string,
    sort_by?: 'DATE_ASC' | 'DATE_DESC',
  ): Promise<GetNftHistoryRes> {
    const query = {
      offset: Math.max(offset, 0).toString(),
      limit: Math.min(limit, 50).toString(),
      signer,
      tx_hash,
      operation,
      start_date,
      end_date,
      sort_by,
    };
    return await this.request(
      `/v1beta1/nft/nfts/${class_id}/${nft_id}/history`,
      'GET',
      query,
      {},
    );
  }
}
