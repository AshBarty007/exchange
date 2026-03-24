import axios from 'axios';

const API_BASE_URL = '/api';

export const orderService = {
  // 提交订单
  submitOrder: async (orderData) => {
    const response = await axios.post(`${API_BASE_URL}/orders`, orderData);
    return response.data;
  },

  // 取消订单
  cancelOrder: async (orderId) => {
    const response = await axios.delete(`${API_BASE_URL}/orders/${orderId}`);
    return response.data;
  },

  // 获取订单
  getOrder: async (orderId) => {
    const response = await axios.get(`${API_BASE_URL}/orders/${orderId}`);
    return response.data;
  },

  // 获取市场深度
  getMarketDepth: async (levels = 10) => {
    const response = await axios.get(`${API_BASE_URL}/orders/depth?levels=${levels}`);
    return response.data;
  },

  // 健康检查
  healthCheck: async () => {
    const response = await axios.get(`${API_BASE_URL}/orders/health`);
    return response.data;
  },

  // 获取最近成交记录
  getRecentTrades: async (limit = 50) => {
    const response = await axios.get(`${API_BASE_URL}/orders/trades/recent?limit=${limit}`);
    return response.data;
  },

  // 获取挂单摘要（按门票类型聚合）
  getListings: async () => {
    const response = await axios.get(`${API_BASE_URL}/orders/listings`);
    return response.data;
  },

  // 获取指定门票的订单簿（买卖挂单明细）
  getOrderBook: async (ticketType, scenicSpot) => {
    const params = new URLSearchParams({ ticketType });
    if (scenicSpot) params.append('scenicSpot', scenicSpot);
    const response = await axios.get(`${API_BASE_URL}/orders/orderbook?${params}`);
    return response.data;
  },

  // 获取做市商列表
  getMarketMakers: async () => {
    const response = await axios.get(`${API_BASE_URL}/orders/market-makers`);
    return response.data;
  },

  // 初始化做市商挂单
  initMarketMakers: async () => {
    const response = await axios.post(`${API_BASE_URL}/orders/market-makers/init`);
    return response.data;
  },

  // 获取景区列表
  getScenicSpots: async () => {
    const response = await axios.get(`${API_BASE_URL}/orders/scenic-spots`);
    return response.data;
  },
};
