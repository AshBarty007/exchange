import React from 'react';
import {
  AccountBalance as BankIcon,
  ShowChart as MarketMakerIcon,
  Park as VenueIcon,
  CurrencyExchange as ExchangeIcon,
  AdminPanelSettings as AdminIcon,
  Policy as RegulatorIcon,
  ConfirmationNumber as RetailIcon,
  Dashboard as DashboardIcon,
  AccountBalanceWallet as WalletIcon,
  LocalAtm as FiatMintIcon,
  SwapHoriz as TransactionIcon,
  Assignment as OrdersIcon,
  AccountBalance as AssetsIcon,
  LocalActivity as TicketMarketIcon,
  ConfirmationNumber as IssueIcon,
  VerifiedUser as VerifyIcon,
  Description as ContractIcon,
  ManageAccounts as AccountMgmtIcon,
  AdminPanelSettings as RoleIcon,
  ViewList as BlockchainIcon,
  Settings as SettingsIcon,
  Hub as HubIcon,
  SupervisorAccount as SupervisorAccountIcon,
  MonitorHeart as MonitorHeartIcon,
} from '@mui/icons-material';

export interface PortalMenuItem {
  text: string;
  icon: React.ReactElement;
  path: string;
}

export interface PortalConfig {
  id: string;
  name: string;
  subtitle: string;
  icon: React.ReactElement;
  color: string;
  gradient: string;
  basePath: string;
  defaultChild: string;
  menuItems: PortalMenuItem[];
}

export const portals: PortalConfig[] = [
  {
    id: 'bank',
    name: '银行管理',
    subtitle: '法币通证发行与钱包管理',
    icon: React.createElement(BankIcon, { sx: { fontSize: 48 } }),
    color: '#1565c0',
    gradient: 'linear-gradient(135deg, #1565c0 0%, #42a5f5 100%)',
    basePath: '/bank',
    defaultChild: 'wallets',
    menuItems: [
      { text: '钱包管理', icon: React.createElement(WalletIcon), path: 'wallets' },
      { text: '法币通证', icon: React.createElement(FiatMintIcon), path: 'fiat-mint' },
      { text: '交易记录', icon: React.createElement(TransactionIcon), path: 'transactions' },
    ],
  },
  {
    id: 'market-maker',
    name: '做市商管理',
    subtitle: '流动性管理与交易操作',
    icon: React.createElement(MarketMakerIcon, { sx: { fontSize: 48 } }),
    color: '#7b1fa2',
    gradient: 'linear-gradient(135deg, #7b1fa2 0%, #ce93d8 100%)',
    basePath: '/market-maker',
    defaultChild: 'exchange',
    menuItems: [
      { text: '交易所', icon: React.createElement(ExchangeIcon), path: 'exchange' },
      { text: '我的订单', icon: React.createElement(OrdersIcon), path: 'orders' },
      { text: '资产管理', icon: React.createElement(AssetsIcon), path: 'account' },
    ],
  },
  {
    id: 'venue',
    name: '景区管理',
    subtitle: '门票发行、核销与管理',
    icon: React.createElement(VenueIcon, { sx: { fontSize: 48 } }),
    color: '#2e7d32',
    gradient: 'linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)',
    basePath: '/venue',
    defaultChild: 'issue-ticket',
    menuItems: [
      { text: '门票发行', icon: React.createElement(IssueIcon), path: 'issue-ticket' },
      { text: '门票核销', icon: React.createElement(VerifyIcon), path: 'verify-ticket' },
      { text: '门票市场', icon: React.createElement(TicketMarketIcon), path: 'market' },
    ],
  },
  {
    id: 'exchange',
    name: '交易所',
    subtitle: '门票二级市场交易平台',
    icon: React.createElement(ExchangeIcon, { sx: { fontSize: 48 } }),
    color: '#e65100',
    gradient: 'linear-gradient(135deg, #e65100 0%, #ff9800 100%)',
    basePath: '/exchange',
    defaultChild: 'trading',
    menuItems: [
      { text: '交易所', icon: React.createElement(ExchangeIcon), path: 'trading' },
      { text: '门票市场', icon: React.createElement(TicketMarketIcon), path: 'market' },
      { text: '我的订单', icon: React.createElement(OrdersIcon), path: 'orders' },
      { text: '资产管理', icon: React.createElement(AssetsIcon), path: 'account' },
    ],
  },
  {
    id: 'admin',
    name: '交易所管理后台',
    subtitle: '系统管理与合约运维',
    icon: React.createElement(AdminIcon, { sx: { fontSize: 48 } }),
    color: '#c62828',
    gradient: 'linear-gradient(135deg, #c62828 0%, #ef5350 100%)',
    basePath: '/admin',
    defaultChild: 'dashboard',
    menuItems: [
      { text: '仪表盘', icon: React.createElement(DashboardIcon), path: 'dashboard' },
      { text: '合约交互', icon: React.createElement(ContractIcon), path: 'contracts' },
      { text: '账户管理', icon: React.createElement(AccountMgmtIcon), path: 'account-management' },
      { text: '角色权限', icon: React.createElement(RoleIcon), path: 'role-management' },
      { text: '钱包管理', icon: React.createElement(WalletIcon), path: 'wallets' },
      { text: '区块浏览器', icon: React.createElement(BlockchainIcon), path: 'blockchain' },
      { text: '系统设置', icon: React.createElement(SettingsIcon), path: 'settings' },
    ],
  },
  {
    id: 'regulator',
    name: '监管机构',
    subtitle: '链上数据监控与审计',
    icon: React.createElement(RegulatorIcon, { sx: { fontSize: 48 } }),
    color: '#37474f',
    gradient: 'linear-gradient(135deg, #37474f 0%, #78909c 100%)',
    basePath: '/regulator',
    defaultChild: 'dashboard',
    menuItems: [
      { text: '仪表盘', icon: React.createElement(DashboardIcon), path: 'dashboard' },
      { text: '区块浏览器', icon: React.createElement(BlockchainIcon), path: 'blockchain' },
      { text: '交易记录', icon: React.createElement(TransactionIcon), path: 'transactions' },
      { text: '账户管理', icon: React.createElement(AccountMgmtIcon), path: 'account-management' },
    ],
  },
  {
    id: 'retail',
    name: '散票销售平台',
    subtitle: '门票购买与订单管理',
    icon: React.createElement(RetailIcon, { sx: { fontSize: 48 } }),
    color: '#00838f',
    gradient: 'linear-gradient(135deg, #00838f 0%, #4dd0e1 100%)',
    basePath: '/retail',
    defaultChild: 'market',
    menuItems: [
      { text: '门票市场', icon: React.createElement(TicketMarketIcon), path: 'market' },
      { text: '我的订单', icon: React.createElement(OrdersIcon), path: 'orders' },
      { text: '资产管理', icon: React.createElement(AssetsIcon), path: 'account' },
    ],
  },
  {
    id: 'platform',
    name: '平台管理系统',
    subtitle: '账户生成、角色授权与网络监管',
    icon: React.createElement(HubIcon, { sx: { fontSize: 48 } }),
    color: '#283593',
    gradient: 'linear-gradient(135deg, #283593 0%, #5c6bc0 100%)',
    basePath: '/platform',
    defaultChild: 'overview',
    menuItems: [
      { text: '平台总览', icon: React.createElement(DashboardIcon), path: 'overview' },
      { text: '权限管理', icon: React.createElement(SupervisorAccountIcon), path: 'permissions' },
      { text: '系统配置', icon: React.createElement(SettingsIcon), path: 'config' },
      { text: '监控告警', icon: React.createElement(MonitorHeartIcon), path: 'monitoring' },
      { text: '资源管理', icon: React.createElement(BlockchainIcon), path: 'resources' },
      { text: '运营分析', icon: React.createElement(DashboardIcon), path: 'analytics' },
    ],
  },
];

export function getPortalById(id: string): PortalConfig | undefined {
  return portals.find((p) => p.id === id);
}
