import axios from 'axios';

const API_BASE_URL = '/api';

export const blockchainService = {
  // 获取区块链状态（实时从链上获取）
  getBlockchainStatus: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/blockchain/status`);
      return response.data;
    } catch (error) {
      // 区块链服务未启动时返回未连接状态
      return {
        blockNumber: 0,
        nodeCount: 0,
        consensusStatus: 'N/A',
        txCount: 0,
        tps: 0,
        connected: false,
        error: error.message
      };
    }
  },

  // 获取合约信息
  getContractInfo: async (contractAddress) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/blockchain/contract/${contractAddress}`);
      return response.data;
    } catch (error) {
      return {
        address: contractAddress,
        name: 'Unknown Contract',
        connected: false,
        error: error.message
      };
    }
  },

  // 获取交易信息
  getTransaction: async (txHash) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/blockchain/transaction/${txHash}`);
      return response.data;
    } catch (error) {
      return {
        txHash: txHash,
        status: 'Unknown',
        connected: false,
        error: error.message
      };
    }
  },

  // 获取区块信息
  getBlock: async (blockNumber) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/blockchain/block/${blockNumber}`);
      return response.data;
    } catch (error) {
      return {
        blockNumber: blockNumber,
        connected: false,
        error: error.message
      };
    }
  },

  // 获取最近两个区块详情
  getRecentBlocks: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/blockchain/blocks/recent`);
      return response.data;
    } catch (error) {
      return { connected: false, error: error.message };
    }
  },

  // 获取所有合约地址
  getContractAddresses: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/blockchain/contracts`);
      return response.data.contracts || {};
    } catch (error) {
      return {};
    }
  }
};
