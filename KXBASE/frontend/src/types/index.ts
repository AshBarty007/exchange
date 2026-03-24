/**
 * 交易回执
 */
export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: number;
  from: string;
  to: string;
  status: string;
  gasUsed: string;
  logs?: any[];
}

/**
 * 合约信息
 */
export interface ContractInfo {
  name: string;
  address: string;
  abi: any[];
}

/**
 * 合约地址映射
 */
export interface ContractAddressMap {
  [name: string]: string;
}

/**
 * 角色定义
 */
export enum Role {
  REGULATOR = 'REGULATOR_ROLE',
  BANK = 'BANK_ROLE',
  EXCHANGE_ADMIN = 'EXCHANGE_ADMIN_ROLE',
  SCENIC_OPERATOR = 'SCENIC_OPERATOR_ROLE',
  MARKET_MAKER = 'MARKET_MAKER_ROLE',
  CONSUMER = 'CONSUMER_ROLE',
  ADMIN = 'ADMIN_ROLE',
}

/**
 * 角色中文名称
 */
export const RoleNames: Record<Role, string> = {
  [Role.REGULATOR]: '监管节点',
  [Role.BANK]: '银行节点',
  [Role.EXCHANGE_ADMIN]: '交易所管理员',
  [Role.SCENIC_OPERATOR]: '景区运营',
  [Role.MARKET_MAKER]: '做市商',
  [Role.CONSUMER]: '消费者',
  [Role.ADMIN]: '系统管理员',
};

/**
 * 网络配置
 */
export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  chainId: string;
  groupId: string;
}

/**
 * 应用配置
 */
export interface AppConfig {
  network: NetworkConfig;
  contracts: Record<string, ContractInfo>;
}

/**
 * 订单类型
 */
export enum OrderType {
  BUY = 0,
  SELL = 1,
}

/**
 * 订单参数（签名前）
 */
export interface OrderParams {
  orderType: OrderType;
  ticketId: number;
  price: number;
  amount: number;
  nonce: number;
}

/**
 * 签名后的订单
 */
export interface SignedOrder {
  orderType: OrderType;
  ticketId: number;
  price: number;
  amount: number;
  nonce: number;
  orderHash: string;
  signature: string;
  signer: string;
}
