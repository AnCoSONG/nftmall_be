export type PostSuccess = { task_id: string; operation_id: string }; // task_id will be deprecated
export type Error = { code: string; codespace: string; message: string };
export type TxRes = PostSuccess & Error;

export type CreateAccountRes = {
  account: string;
  name: string;
  operation_id: string;
} & Error;

export type GetAccountsRes = {
  offset: number;
  limit: number;
  total_count: number;
  accounts: Array<{
    account: string;
    gas: number;
    business?: number;
    biz_fee: number;
    status: 0 | 1; // 0: not active, 1: active
    operation_id: string;
  }>;
} & Error;

export type GetAccountsHistoryRes = {
  offset: number;
  limit: number;
  total_count: number;
  operation_records: Array<{
    tx_hash: string;
    module: 'account' | 'nft';
    operation:
      | 'add_gas'
      | 'transfer_class'
      | 'mint'
      | 'edit'
      | 'transfer'
      | 'burn';
    signer: string;
    timestamp: string; // utc时间
    message: {
      account_add_gas?: {
        // 能量值充值
        recipient: string;
        amount: number;
      };
      nft_transfer_class?: {
        // NFT 类别转让
        id: string;
        name: string;
        symbol?: string;
        uri?: string;
        recipient: string;
      };
      nft_issue_class?: {
        // NFT 类别创建
        id: string;
        name: string;
        symbol?: string;
        uri?: string;
        recipient: string;
      };
      nft_mint?: {
        //NFT 发行
        id: string;
        name: string;
        class_id: string;
        class_name: string;
        class_symbol?: string;
        uri?: string;
        recipient: string;
      };
      nft_edit?: {
        //NFT 编辑
        id: string;
        name: string;
        class_id: string;
        class_name: string;
        class_symbol?: string;
        uri?: string;
      };
      nft_brun?: {
        // NFT 销毁
        id: string;
        name: string;
        class_id: string;
        class_name: string;
        class_symbol?: string;
        uri?: string;
      };
    };
  }>;
} & Error;

export type GetTransactionRes = {
  type: string;
  tx_hash: string;
  module: "nft" | 'mt';
  status: 0 | 1 | 2 | 3;
  timestamp: string,
  class_id?: string;
  nft_id?: string;
  message?: string;
  tag?: Record<string, string>;
} & Error;

export type GetNftClassesRes = {
  offset: number;
  limit: number;
  total_count: number;
  classes: Array<{
    id: string;
    name: string;
    symbol?: string;
    nft_count: number;
    uri: string;
    owner: string;
    tx_hash: string;
    timestamp: string; //utc
  }>;
} & Error;

export type GetNftClassesDetailRes = {
  id: string;
  name: string;
  symbol: string;
  description: string;
  nft_count: string;
  uri: string;
  uri_hash: string;
  data: string;
  owner: string;
  tx_hash: string;
  timestamp: string;
} & Error;

export type GetNftRes = {
  offset: number;
  limit: number;
  total_count: number;
  nfts: Array<{
    id: string;
    name: string;
    class_id: string;
    class_name: string;
    class_symbol?: string;
    uri?: string;
    owner: string;
    status: string;
    tx_hash: string;
    timestamp: string;
  }>;
} & Error;

export type GetNftDetailRes = {
  id: string;
  name: string;
  class_id: string;
  class_name: string;
  class_symbol?: string;
  uri?: string;
  uri_hash?: string;
  data?: string;
  owner: string;
  status: string;
  tx_hash: string;
  timestamp: string;
} & Error;

export type GetNftHistoryRes = {
  offset: number;
  limit: number;
  total_count: number;
  operation_records: Array<{
    tx_hash: string;
    operation: 'mint' | 'edit' | 'transfer' | 'burn';
    signer: string;
    recipent?: string;
    timestamp: string;
  }>;
} & Error;
