import axios from 'axios';

const API_BASE_URL = '/api';

export const userService = {
  // 注册用户
  register: async (userData) => {
    const response = await axios.post(`${API_BASE_URL}/users/register`, userData);
    return response.data;
  },

  // 登录用户
  login: async (credentials) => {
    const response = await axios.post(`${API_BASE_URL}/users/login`, credentials);
    return response.data;
  },

  // 获取用户信息
  getUser: async (userId) => {
    const response = await axios.get(`${API_BASE_URL}/users/${userId}`);
    return response.data;
  },

  // 获取所有用户
  getAllUsers: async () => {
    const response = await axios.get(`${API_BASE_URL}/users`);
    return response.data;
  }
};
