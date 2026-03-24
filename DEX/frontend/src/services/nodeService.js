import axios from 'axios';

const API_BASE_URL = '/api/nodes';
const BLOCKCHAIN_STATUS_API = '/api/blockchain/status';

const ROLE_NODE_LABELS = ['景区节点', '交易所节点', '做市商节点', '银行节点', '监管节点'];
const ROLE_NODE_TYPES = ['scenic_spot', 'exchange', 'market_maker', 'bank', 'regulator'];

const normalizeNodeList = (statusData) => {
  const nodes = Array.isArray(statusData?.nodes) ? statusData.nodes : [];
  const totalTx = Number(statusData?.txCount || 0);
  const perNodeTx = nodes.length > 0 ? Math.floor(totalTx / nodes.length) : 0;

  return nodes.map((node, index) => ({
    name: node?.name || ROLE_NODE_LABELS[index] || `扩展节点${index - ROLE_NODE_LABELS.length + 1}`,
    type: ROLE_NODE_TYPES[index] || `node_${index}`,
    online: !!node?.online,
    blockHeight: node?.blockHeight ?? statusData?.blockNumber ?? 0,
    txCount: perNodeTx,
    p2p: node?.p2p || '',
    rpc: node?.rpc || '',
  }));
};

const mergeRegulatorDataWithBlockchain = (baseData, statusData) => {
  if (!statusData || !Array.isArray(statusData.nodes)) return baseData;

  const nodeOverview = normalizeNodeList(statusData);
  const totalNodes = Number(statusData?.nodeCount ?? nodeOverview.length ?? 0);
  const totalTransactions = Number(statusData?.txCount ?? baseData.totalTransactions ?? 0);

  return {
    ...baseData,
    totalNodes,
    totalTransactions,
    nodeOverview,
  };
};

// 生成模拟时序数据
const generateTimeSeriesData = (points = 30, baseValue = 100, variance = 20) => {
  const now = Date.now();
  return Array.from({ length: points }, (_, i) => ({
    time: new Date(now - (points - i) * 10000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    value: Math.max(0, baseValue + (Math.random() - 0.5) * variance * 2),
  }));
};

// 模拟数据
const mockData = {
  nodeStatus: (nodeType) => ({
    nodeType,
    online: true,
    blockHeight: 12345 + Math.floor(Math.random() * 100),
    peers: nodeType === 'regulator' ? 4 : 3,
    consensusStatus: 'PBFT',
    pendingTx: Math.floor(Math.random() * 10),
    uptime: '72h 35m',
    version: 'FISCO BCOS v3.6.0',
  }),

  nodeMetrics: () => ({
    tps: generateTimeSeriesData(30, 120, 40),
    blockTime: generateTimeSeriesData(30, 1.5, 0.5),
    latency: generateTimeSeriesData(30, 50, 20),
  }),

  recentTransactions: (nodeType) => {
    const txTypes = {
      scenic_spot: ['NFT铸造', 'NFT转让', '门票验证', '门票退款'],
      exchange: ['订单提交', '订单撤销', '交易撮合', '手续费结算'],
      market_maker: ['挂单', '撤单', '撮合成交', '价格更新'],
      bank: ['凭证铸造', '凭证销毁', '存款证明', '提现处理'],
      regulator: ['审计查询', '合规检查', '告警处理', '节点审查'],
    };
    const types = txTypes[nodeType] || txTypes.regulator;
    return Array.from({ length: 15 }, (_, i) => ({
      txHash: `0x${Math.random().toString(16).slice(2, 14)}...`,
      type: types[Math.floor(Math.random() * types.length)],
      from: `0x${Math.random().toString(16).slice(2, 10)}...`,
      to: `0x${Math.random().toString(16).slice(2, 10)}...`,
      blockNumber: 12345 - i,
      timestamp: new Date(Date.now() - i * 60000).toLocaleString('zh-CN'),
      status: Math.random() > 0.05 ? '成功' : '失败',
    }));
  },

  scenicSpotData: () => ({
    totalTickets: 15680,
    ticketTypes: 8,
    soldTickets: 12340,
    revenue: 2468000,
    ticketsByType: [
      { name: '普通门票', issued: 5000, sold: 4200 },
      { name: 'VIP门票', issued: 2000, sold: 1800 },
      { name: '年卡', issued: 1000, sold: 850 },
      { name: '学生票', issued: 3000, sold: 2500 },
      { name: '团体票', issued: 2680, sold: 1990 },
      { name: '夜场票', issued: 1000, sold: 600 },
      { name: '节假日票', issued: 800, sold: 300 },
      { name: '体验票', issued: 200, sold: 100 },
    ],
    statusDistribution: [
      { name: '可用', value: 3340, color: '#52c41a' },
      { name: '已售', value: 12340, color: '#1890ff' },
      { name: '已过期', value: 0, color: '#ff4d4f' },
    ],
  }),

  exchangeData: () => ({
    volume24h: 3250000,
    activePairs: 12,
    onlineUsers: 386,
    feeRevenue: 16250,
    volumeTrend: Array.from({ length: 24 }, (_, i) => ({
      time: `${String(i).padStart(2, '0')}:00`,
      volume: Math.floor(80000 + Math.random() * 200000),
    })),
    feeTrend: Array.from({ length: 24 }, (_, i) => ({
      time: `${String(i).padStart(2, '0')}:00`,
      fee: Math.floor(400 + Math.random() * 1000),
    })),
  }),

  marketMakerData: () => ({
    activeOrders: 256,
    matchRate: 87.5,
    totalVolume: 1580000,
    currentSpread: 0.35,
    orderTrend: Array.from({ length: 20 }, (_, i) => ({
      time: `${String(i + 1).padStart(2, '0')}:00`,
      buyOrders: Math.floor(80 + Math.random() * 60),
      sellOrders: Math.floor(70 + Math.random() * 50),
    })),
    spreadHistory: Array.from({ length: 20 }, (_, i) => ({
      time: `${String(i + 1).padStart(2, '0')}:00`,
      spread: +(0.2 + Math.random() * 0.3).toFixed(2),
    })),
    currentOrders: Array.from({ length: 10 }, (_, i) => ({
      id: `ORD-${1000 + i}`,
      side: i % 2 === 0 ? '买入' : '卖出',
      price: +(100 + (Math.random() - 0.5) * 10).toFixed(2),
      quantity: Math.floor(10 + Math.random() * 90),
      filled: Math.floor(Math.random() * 50),
      status: ['挂单中', '部分成交'][Math.floor(Math.random() * 2)],
    })),
  }),

  bankData: () => ({
    totalMinted: 8500000,
    pendingProofs: 12,
    custodyAccounts: 45,
    custodyValue: 25600000,
    dailyMintBurn: Array.from({ length: 14 }, (_, i) => ({
      date: `${i + 1}日`,
      minted: Math.floor(50000 + Math.random() * 100000),
      burned: Math.floor(20000 + Math.random() * 60000),
    })),
    supplyTrend: Array.from({ length: 30 }, (_, i) => ({
      date: `${i + 1}日`,
      supply: 7000000 + i * 50000 + Math.floor(Math.random() * 30000),
    })),
    recentProofs: Array.from({ length: 8 }, (_, i) => ({
      id: `PROOF-${2000 + i}`,
      depositor: `0x${Math.random().toString(16).slice(2, 10)}...`,
      amount: Math.floor(100000 + Math.random() * 500000),
      status: ['待审核', '已通过', '已铸造'][Math.floor(Math.random() * 3)],
      timestamp: new Date(Date.now() - i * 3600000).toLocaleString('zh-CN'),
    })),
  }),

  regulatorData: () => ({
    totalNodes: 5,
    totalTransactions: 56789,
    alertCount: 3,
    complianceScore: 96.8,
    nodeOverview: [
      { name: '景区节点', type: 'scenic_spot', online: true, blockHeight: 12345, txCount: 15680 },
      { name: '交易所节点', type: 'exchange', online: true, blockHeight: 12345, txCount: 22150 },
      { name: '做市商节点', type: 'market_maker', online: true, blockHeight: 12345, txCount: 18920 },
      { name: '银行节点', type: 'bank', online: true, blockHeight: 12345, txCount: 12450 },
      { name: '监管节点', type: 'regulator', online: true, blockHeight: 12345, txCount: 9739 },
    ],
    networkTps: generateTimeSeriesData(30, 480, 100),
    txByType: [
      { type: 'NFT铸造/转让', count: 15680 },
      { type: '交易所撮合', count: 22150 },
      { type: '做市商订单', count: 18920 },
      { type: '凭证铸造/销毁', count: 12450 },
      { type: '存款证明', count: 5200 },
      { type: '审计查询', count: 4539 },
    ],
    alerts: [
      { id: 1, level: '警告', message: '做市商节点交易量异常增加 (+150%)', time: '10分钟前', resolved: false },
      { id: 2, level: '提示', message: '银行节点存款证明待处理数量超过阈值', time: '25分钟前', resolved: false },
      { id: 3, level: '严重', message: '检测到异常大额转账: 500,000 Token', time: '1小时前', resolved: false },
    ],
    auditLog: Array.from({ length: 20 }, (_, i) => ({
      id: `AUDIT-${3000 + i}`,
      action: ['交易审计', '节点检查', '合规验证', '告警处理', '权限变更'][Math.floor(Math.random() * 5)],
      operator: `监管员${Math.floor(Math.random() * 3) + 1}`,
      target: ['景点节点', '做市商节点', '银行节点', '全网'][Math.floor(Math.random() * 4)],
      result: Math.random() > 0.1 ? '通过' : '异常',
      timestamp: new Date(Date.now() - i * 1800000).toLocaleString('zh-CN'),
    })),
  }),
};

export const nodeService = {
  getNodeStatus: async (nodeType) => {
    if (nodeType === 'regulator') {
      try {
        const response = await axios.get(BLOCKCHAIN_STATUS_API);
        const status = response.data || {};
        return {
          nodeType,
          online: !!status.connected,
          blockHeight: status.blockNumber ?? 0,
          peers: Math.max((status.onlineCount ?? status.nodeCount ?? 0) - 1, 0),
          consensusStatus: status.consensusStatus || 'PBFT',
          pendingTx: 0,
          uptime: 'N/A',
          version: status.chainVersion || 'FISCO BCOS',
        };
      } catch {}
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/${nodeType}/status`);
      return response.data;
    } catch {
      return mockData.nodeStatus(nodeType);
    }
  },

  getNodeMetrics: async (nodeType) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/${nodeType}/metrics`);
      return response.data;
    } catch {
      return mockData.nodeMetrics();
    }
  },

  getRecentTransactions: async (nodeType, limit = 15) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/${nodeType}/transactions`, { params: { limit } });
      return response.data;
    } catch {
      return mockData.recentTransactions(nodeType);
    }
  },

  getScenicSpotData: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/scenic_spot/tickets`);
      return response.data;
    } catch {
      return mockData.scenicSpotData();
    }
  },

  getExchangeData: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/exchange/overview`);
      return response.data;
    } catch {
      return mockData.exchangeData();
    }
  },

  getMarketMakerData: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/market_maker/orders`);
      return response.data;
    } catch {
      return mockData.marketMakerData();
    }
  },

  getBankData: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/bank/assets`);
      return response.data;
    } catch {
      return mockData.bankData();
    }
  },

  getRegulatorData: async () => {
    const [overviewResult, blockchainStatusResult] = await Promise.allSettled([
      axios.get(`${API_BASE_URL}/regulator/overview`),
      axios.get(BLOCKCHAIN_STATUS_API),
    ]);

    const baseData = overviewResult.status === 'fulfilled'
      ? overviewResult.value.data
      : mockData.regulatorData();

    const blockchainStatus = blockchainStatusResult.status === 'fulfilled'
      ? blockchainStatusResult.value.data
      : null;

    return mergeRegulatorDataWithBlockchain(baseData, blockchainStatus);
  },
};
