import axios from 'axios';

const API_BASE_URL = '/api';

export const assetService = {
  // 获取用户资产余额
  getBalance: async (userId) => {
    const response = await axios.get(`${API_BASE_URL}/assets/balance/${userId}`);
    return response.data;
  },

  // 获取特定资产余额
  getSpecificBalance: async (userId, contractAddress) => {
    const response = await axios.get(`${API_BASE_URL}/assets/balance/${userId}/${contractAddress}`);
    return response.data;
  },

  // 充值
  deposit: async (depositData) => {
    const response = await axios.post(`${API_BASE_URL}/assets/deposit`, depositData);
    return response.data;
  },

  // 提现
  withdraw: async (withdrawData) => {
    const response = await axios.post(`${API_BASE_URL}/assets/withdraw`, withdrawData);
    return response.data;
  },

  // 锁定资产
  lockAssets: async (lockData) => {
    const response = await axios.post(`${API_BASE_URL}/assets/lock`, lockData);
    return response.data;
  },

  // 解锁资产
  unlockAssets: async (unlockData) => {
    const response = await axios.post(`${API_BASE_URL}/assets/unlock`, unlockData);
    return response.data;
  },

  // 获取交易记录
  getTransactions: async (userId) => {
    const response = await axios.get(`${API_BASE_URL}/assets/transactions/${userId}`);
    return response.data;
  }
};
